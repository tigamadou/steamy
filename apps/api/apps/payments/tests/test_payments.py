"""
Paiement et exécution post-paiement (API-L3b.2, §4.3, S9, C12, C17) : initiation par le serveur, webhook source de
vérité, exécution une seule fois, paiement tardif, réconciliation.
"""

import threading
from datetime import timedelta
from unittest import mock

import pytest
from django.core.management import CommandError, call_command
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.catalog.tests.factories import CourseFactory
from apps.core.models import AuditLog
from apps.learning.models import Enrollment
from apps.notifications.models import Notification
from apps.payments.checkout import reconcile_pending_payments
from apps.payments.fulfillment import refund
from apps.payments.models import Order, Payment, Refund
from apps.payments.providers import (
    PaymentEvent,
    PaymentProviderError,
    PaymentStatus,
    PaymentTemporaryError,
)
from apps.payments.providers.fake import FakePaymentProvider
from apps.payments.tasks import reconcile_pending_payments as reconcile_task
from apps.payments.utils import handle_payment_event
from apps.shop.models import Cart, CartItem, StockReservation
from apps.shop.tests.factories import DeliveryZoneFactory, KitFactory

from .factories import OrderFactory, PaymentFactory, link_child, load_referentials

pytestmark = pytest.mark.django_db

ORDERS = "/api/payments/orders/"
SUCCESS, FAILURE, PENDING = "+2290197000001", "+2290197000002", "+2290197000003"


def client_for(user=None, **kwargs):
    client = APIClient(**kwargs)
    if user is not None:
        client.force_authenticate(user)
    return client


def pay_body(msisdn=SUCCESS, **extra):
    return {"country": "BJ", "network": "mtn", "msisdn": msisdn, **extra}


@pytest.fixture
def commit(django_capture_on_commit_callbacks):
    """Exécute les tâches programmées après validation (le faux webhook) dans le bloc."""
    return lambda: django_capture_on_commit_callbacks(execute=True)


@pytest.fixture
def parent():
    return ParentFactory()


@pytest.fixture
def course_order(parent):
    child = link_child(parent)
    course = CourseFactory(paid=True, price=15000)
    resp = client_for(parent).post(
        ORDERS,
        {"kind": "course", "items": [{"courseSlug": course.slug}], "beneficiaryId": child.pk},
        format="json",
    )
    return Order.objects.get(reference=resp.json()["reference"])


def pay(user, order, msisdn=SUCCESS, commit=None, **kwargs):
    url = f"{ORDERS}{order.reference}/payments/"
    if commit is None:
        return client_for(user, **kwargs).post(url, pay_body(msisdn), format="json")
    with commit():
        return client_for(user, **kwargs).post(url, pay_body(msisdn), format="json")


# --- Parcours payé par le parent -------------------------------------------------------------


def test_parent_pays_and_the_child_is_enrolled_once(parent, course_order, commit):
    resp = pay(parent, course_order, commit=commit)
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert (body["status"], body["amount"], body["orderReference"]) == (
        "pending",
        15000,
        course_order.reference,
    )
    assert body["msisdnMasked"] == "+229 •• 01" and "msisdn" not in body
    course_order.refresh_from_db()
    assert course_order.status == Order.Status.PAID and course_order.paid_at
    enrollment = Enrollment.objects.get(learner=course_order.beneficiary)
    assert enrollment.source == Enrollment.Source.ORDER
    assert Notification.objects.filter(user=parent, type="order").exists()
    assert Notification.objects.get(user=course_order.beneficiary).type == "course_unlocked"

    payment = Payment.objects.get(pk=body["id"])
    assert payment.status == Payment.Status.SUCCEEDED and payment.confirmed_at
    read = client_for(parent).get(f"/api/payments/payments/{payment.pk}/").json()
    assert read["status"] == "succeeded"
    # Rejeu du même webhook : rien ne change
    event = PaymentEvent(
        course_order.reference,
        payment.provider_transaction_id,
        15000,
        "XOF",
        PaymentStatus.SUCCEEDED,
    )
    assert handle_payment_event("fake", event) is True
    assert Enrollment.objects.count() == 1 and not Refund.objects.exists()


def test_failed_payment_keeps_the_order_payable(parent, course_order, commit):
    body = pay(parent, course_order, FAILURE, commit=commit).json()
    payment = Payment.objects.get(pk=body["id"])
    assert (payment.status, payment.failure_code) == (Payment.Status.FAILED, "DECLINED")
    assert payment.failure_reason
    course_order.refresh_from_db()
    assert course_order.status == Order.Status.PENDING
    assert pay(parent, course_order, commit=commit).status_code == 201
    course_order.refresh_from_db()
    assert course_order.status == Order.Status.PAID


def test_pending_number_stays_pending(parent, course_order, commit):
    body = pay(parent, course_order, PENDING, commit=commit).json()
    assert Payment.objects.get(pk=body["id"]).status == Payment.Status.PENDING


@pytest.mark.parametrize(
    ("user_factory", "status", "code"),
    [
        (LearnerFactory, 403, "PARENT_APPROVAL_REQUIRED"),
        (TeacherFactory, 403, "PERMISSION_DENIED"),
        (ParentFactory, 404, "NOT_FOUND"),
    ],
)
def test_only_the_payer_can_pay(course_order, user_factory, status, code):
    resp = pay(user_factory(), course_order)
    assert (resp.status_code, resp.json()["code"]) == (status, code)
    assert not Payment.objects.exists()


def test_beneficiary_cannot_pay_their_own_order(course_order):
    resp = pay(course_order.beneficiary, course_order)
    assert resp.json()["code"] == "PARENT_APPROVAL_REQUIRED"


def test_anonymous_without_token_cannot_pay(course_order):
    assert pay(None, course_order).status_code == 404


@pytest.mark.parametrize(
    ("body", "field", "code"),
    [
        (
            {"network": "moov", "country": "TG", "msisdn": "+22890000001"},
            "network",
            "NETWORK_UNAVAILABLE",
        ),
        ({"network": "wave"}, "network", "NETWORK_UNAVAILABLE"),
        ({"msisdn": "+22890000001"}, "msisdn", "PHONE_INVALID"),
    ],
)
def test_network_and_number_must_match_the_country(parent, course_order, body, field, code):
    url = f"{ORDERS}{course_order.reference}/payments/"
    resp = client_for(parent).post(url, pay_body(**body), format="json")
    assert resp.status_code == 400
    assert resp.json()["fields"][field][0]["code"] == code


def test_paid_or_expired_orders_cannot_be_paid(parent, course_order):
    Order.objects.filter(pk=course_order.pk).update(
        expires_at=timezone.now() - timedelta(minutes=1)
    )
    assert pay(parent, course_order).json()["code"] == "ORDER_EXPIRED"
    Order.objects.filter(pk=course_order.pk).update(status=Order.Status.PAID)
    assert pay(parent, course_order).json()["code"] == "ORDER_ALREADY_PAID"


@pytest.mark.parametrize(
    ("error", "code"),
    [
        (PaymentTemporaryError("panne"), "PROVIDER_UNAVAILABLE"),
        (PaymentProviderError("non"), "PROVIDER_REFUSED"),
    ],
)
def test_provider_refusal_gives_a_failed_payment(parent, course_order, error, code):
    with mock.patch.object(FakePaymentProvider, "initiate", side_effect=error):
        body = pay(parent, course_order).json()
    assert (body["status"], body["failureCode"]) == ("failed", code)
    assert body["failureReason"]


def test_payment_initiation_is_throttled(monkeypatch, parent, course_order):
    from rest_framework.throttling import SimpleRateThrottle

    rates = {**SimpleRateThrottle.THROTTLE_RATES, "payments": "1/hour"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)
    assert pay(parent, course_order, PENDING).status_code == 201
    assert pay(parent, course_order, PENDING).status_code == 429


# --- Lecture d'un paiement -------------------------------------------------------------------


def test_payment_is_readable_by_its_payer_only(course_order):
    payment = PaymentFactory(order=course_order)
    url = f"/api/payments/payments/{payment.pk}/"
    assert client_for(course_order.payer).get(url).status_code == 200
    for user in (course_order.beneficiary, ParentFactory(), TeacherFactory(), None):
        assert client_for(user).get(url).status_code == 404
    assert client_for().get("/api/payments/payments/999999/").status_code == 404


# --- Invité ----------------------------------------------------------------------------------


class SmsInbox:
    """Faux SMS reçus (e-mails à `<e164>@sms.test`), sans exécution immédiate des `on_commit` (fixture `sms`)."""

    def last(self, phone):
        from django.core import mail

        return [m.body for m in mail.outbox if m.to == [f"{phone}@sms.test"]][-1]


@pytest.fixture
def sms_inbox():
    return SmsInbox()


@pytest.fixture
def guest_order(commit):
    kit = KitFactory(stock_quantity=2)
    zone = DeliveryZoneFactory()
    with commit():
        body = (
            client_for()
            .post(
                ORDERS,
                {
                    "kind": "kit",
                    "items": [{"kitSlug": kit.slug}],
                    "guest": {"firstName": "Awa", "lastName": "Dossou", "phone": "0197000055"},
                    "deliveryAddress": {
                        "zoneId": zone.pk,
                        "recipientName": "Awa",
                        "city": "Cotonou",
                        "addressLine": "Rue 1",
                    },
                },
                format="json",
            )
            .json()
        )
    return Order.objects.get(reference=body["reference"]), body["guestToken"]


def test_guest_receives_a_tracking_link_by_sms(sms_inbox, guest_order):
    order, token = guest_order
    text = sms_inbox.last("+2290197000055")
    assert f"/boutique/commandes/{order.reference}#jeton={token}" in text


def test_guest_pays_with_the_token_and_gets_an_sms(sms_inbox, guest_order, commit):
    order, token = guest_order
    headers = {"X-Guest-Token": token}
    with commit():
        resp = client_for().post(
            f"{ORDERS}{order.reference}/payments/", pay_body(), format="json", headers=headers
        )
    assert resp.status_code == 201
    order.refresh_from_db()
    assert order.status == Order.Status.PAID
    assert StockReservation.objects.get().confirmed_at is not None
    assert "réglée" in sms_inbox.last("+2290197000055")
    url = f"/api/payments/payments/{resp.json()['id']}/"
    assert client_for().get(url, headers=headers).status_code == 200
    assert client_for().get(url, headers={"X-Guest-Token": "faux"}).status_code == 404


def test_guest_payment_requires_csrf(guest_order):
    order, token = guest_order
    client = client_for(enforce_csrf_checks=True)
    resp = client.post(
        f"{ORDERS}{order.reference}/payments/",
        pay_body(),
        format="json",
        headers={"X-Guest-Token": token},
    )
    assert resp.status_code == 403


# --- Kits payés par le parent ----------------------------------------------------------------


def test_paid_kits_leave_the_cart_and_confirm_the_stock(parent, commit):
    kit = KitFactory(stock_quantity=3)
    other = KitFactory()
    cart = Cart.objects.create(user=parent)
    CartItem.objects.create(cart=cart, kit=kit, quantity=2)
    CartItem.objects.create(cart=cart, kit=other)
    child = link_child(parent)
    body = (
        client_for(parent)
        .post(
            ORDERS,
            {
                "kind": "kit",
                "items": [{"kitSlug": kit.slug, "quantity": 2}],
                "beneficiaryId": child.pk,
                "deliveryAddress": {
                    "zoneId": DeliveryZoneFactory().pk,
                    "recipientName": "M",
                    "city": "C",
                    "addressLine": "R",
                },
            },
            format="json",
        )
        .json()
    )
    order = Order.objects.get(reference=body["reference"])
    pay(parent, order, commit=commit)
    assert list(cart.items.values_list("kit", flat=True)) == [other.pk]
    assert Notification.objects.get(user=child).type == "kit_ordered"
    kit.refresh_from_db()
    assert kit.stock_quantity == 1


# --- Concurrence, doublons, paiement tardif --------------------------------------------------


@pytest.mark.django_db(transaction=True, serialized_rollback=True)
def test_concurrent_webhooks_fulfil_the_order_once():
    """Deux notifications identiques simultanées : le verrou de la commande n'exécute la commande qu'une fois."""
    load_referentials()
    order = OrderFactory()
    payment = PaymentFactory(order=order, provider_transaction_id="TX-1")
    event = PaymentEvent(order.reference, "TX-1", order.total, "XOF", PaymentStatus.SUCCEEDED)
    barrier = threading.Barrier(2)

    def deliver():
        try:
            barrier.wait()
            handle_payment_event("fake", event)
        finally:
            connection.close()

    threads = [threading.Thread(target=deliver) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    order.refresh_from_db()
    payment.refresh_from_db()
    assert order.status == Order.Status.PAID and payment.status == Payment.Status.SUCCEEDED
    assert Enrollment.objects.filter(learner=order.beneficiary).count() == 1
    assert Notification.objects.filter(user=order.payer, type="order").count() == 1
    assert not Refund.objects.exists()


def test_second_successful_payment_is_refunded(course_order):
    first = PaymentFactory(order=course_order)
    second = PaymentFactory(order=course_order)
    for payment in (first, second):
        handle_payment_event(
            "fake",
            PaymentEvent(
                course_order.reference,
                payment.provider_transaction_id,
                15000,
                "XOF",
                PaymentStatus.SUCCEEDED,
            ),
        )
    course_order.refresh_from_db()
    assert course_order.status == Order.Status.PAID
    refund_ = Refund.objects.get()
    assert refund_.payment == second and refund_.amount == 15000
    assert AuditLog.objects.filter(action="payment.refunded").exists()


def test_notification_for_an_unknown_transaction_is_recorded(course_order):
    event = PaymentEvent(course_order.reference, "TX-HORS", 15000, "XOF", PaymentStatus.PENDING)
    assert handle_payment_event("fake", event) is True
    assert Payment.objects.get().status == Payment.Status.PENDING


def expire(order):
    from apps.payments.orders import release_expired_orders

    Order.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    release_expired_orders()
    order.refresh_from_db()
    assert order.status == Order.Status.CANCELLED


def kit_order_for(parent, kit):
    body = (
        client_for(parent)
        .post(
            ORDERS,
            {
                "kind": "kit",
                "items": [{"kitSlug": kit.slug}],
                "deliveryAddress": {
                    "zoneId": DeliveryZoneFactory().pk,
                    "recipientName": "M",
                    "city": "C",
                    "addressLine": "R",
                },
            },
            format="json",
        )
        .json()
    )
    return Order.objects.get(reference=body["reference"])


def test_late_payment_is_honoured_when_the_kit_is_still_available(parent):
    kit = KitFactory(stock_quantity=2)
    order = kit_order_for(parent, kit)
    payment = PaymentFactory(order=order)
    expire(order)
    handle_payment_event(
        "fake",
        PaymentEvent(
            order.reference,
            payment.provider_transaction_id,
            order.total,
            "XOF",
            PaymentStatus.SUCCEEDED,
        ),
    )
    order.refresh_from_db()
    kit.refresh_from_db()
    assert order.status == Order.Status.PAID and kit.stock_quantity == 1
    reservation = StockReservation.objects.get()
    assert reservation.released_at is None and reservation.confirmed_at is not None
    assert AuditLog.objects.filter(action="payment.late_honored").exists()


def test_late_payment_is_refunded_when_the_kit_is_gone(parent):
    kit = KitFactory(stock_quantity=1)
    order = kit_order_for(parent, kit)
    payment = PaymentFactory(order=order)
    expire(order)
    kit_order_for(ParentFactory(), kit)  # le dernier kit est parti ailleurs
    handle_payment_event(
        "fake",
        PaymentEvent(
            order.reference,
            payment.provider_transaction_id,
            order.total,
            "XOF",
            PaymentStatus.SUCCEEDED,
        ),
    )
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED
    refund_ = Refund.objects.get()
    assert refund_.payment == payment
    notification = Notification.objects.get(user=parent, type="order")
    assert notification.title == "Paiement remboursé"


def test_late_payment_of_a_course_is_honoured(course_order):
    payment = PaymentFactory(order=course_order)
    expire(course_order)
    handle_payment_event(
        "fake",
        PaymentEvent(
            course_order.reference,
            payment.provider_transaction_id,
            15000,
            "XOF",
            PaymentStatus.SUCCEEDED,
        ),
    )
    course_order.refresh_from_db()
    assert course_order.status == Order.Status.PAID


def test_refund_left_to_finance_when_the_provider_cannot(course_order, settings):
    payment = PaymentFactory(order=course_order, provider="fedapay", provider_transaction_id="42")
    settings.FEDAPAY_SECRET_KEY, settings.FEDAPAY_WEBHOOK_SECRET = "sk", "wh"
    assert refund(payment, "test").processed is False
    fake = PaymentFactory(order=course_order, provider_transaction_id="fake-absent")
    assert refund(fake, "test").processed is False  # transaction inconnue du faux prestataire


def test_guest_without_payer_and_learnerless_order_are_notified_quietly():
    order = OrderFactory(
        payer=None, beneficiary=TeacherFactory(), guest_phone="", kind="kit", items=[]
    )
    payment = PaymentFactory(order=order)
    handle_payment_event(
        "fake",
        PaymentEvent(
            order.reference,
            payment.provider_transaction_id,
            order.total,
            "XOF",
            PaymentStatus.SUCCEEDED,
        ),
    )
    order.refresh_from_db()
    assert order.status == Order.Status.PAID and not Notification.objects.exists()


# --- Réconciliation et outillage -------------------------------------------------------------


def age(payment, minutes=11):
    Payment.objects.filter(pk=payment.pk).update(
        created_at=timezone.now() - timedelta(minutes=minutes)
    )


def test_reconciliation_settles_lost_webhooks(parent, course_order):
    body = pay(parent, course_order, PENDING).json()
    payment = Payment.objects.get(pk=body["id"])
    assert reconcile_pending_payments() == 0  # trop récent
    age(payment)
    assert reconcile_task() == 0  # toujours en attente chez le prestataire
    FakePaymentProvider().settle(payment.provider_transaction_id, PaymentStatus.SUCCEEDED)
    call_command("reconcile_pending_payments")
    course_order.refresh_from_db()
    assert course_order.status == Order.Status.PAID


def test_reconciliation_fails_lost_initiations_and_skips_unknown_transactions(course_order):
    lost = PaymentFactory(
        order=course_order, provider_transaction_id=None, status=Payment.Status.INITIATED
    )
    unknown = PaymentFactory(order=course_order, provider_transaction_id="fake-absent")
    age(lost)
    age(unknown)
    assert reconcile_pending_payments() == 1
    lost.refresh_from_db()
    unknown.refresh_from_db()
    assert (lost.status, lost.failure_code) == (Payment.Status.FAILED, "INITIATION_LOST")
    assert unknown.status == Payment.Status.PENDING


def test_simulate_payment_command(parent, course_order):
    with pytest.raises(CommandError, match="Aucun paiement"):
        call_command("simulate_payment", course_order.reference, "success")
    pay(parent, course_order, PENDING)
    call_command("simulate_payment", course_order.reference, "success")
    course_order.refresh_from_db()
    assert course_order.status == Order.Status.PAID
