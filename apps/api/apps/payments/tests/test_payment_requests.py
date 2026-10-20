"""Demandes de paiement (API-L3b.5, D52, C4) : création par l'enfant, relance limitée, annulation, refus, expiration."""

import threading
from datetime import timedelta

import pytest
from django.core import mail
from django.core.management import CommandError, call_command
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import ParentFactory, TeacherFactory
from apps.catalog.tests.factories import CourseFactory
from apps.learning.models import Enrollment
from apps.notifications.models import Notification
from apps.payments.models import Order, PaymentRequest
from apps.payments.requests import MAX_SENDS, create_request
from apps.payments.tasks import expire_payment_requests
from apps.shop.models import DeliveryAddress
from apps.shop.tests.factories import DeliveryZoneFactory, KitFactory

from .factories import link_child, load_referentials

pytestmark = pytest.mark.django_db
URL = "/api/payments/payment-requests/"


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


@pytest.fixture
def parent():
    return ParentFactory(first_name="Marie")


@pytest.fixture
def child(parent):
    return link_child(parent)


@pytest.fixture
def course():
    return CourseFactory(paid=True, price=15000, title="Robotique")


def ask(child, course, **extra):
    return client_for(child).post(
        URL, {"kind": "course", "courseSlug": course.slug, **extra}, format="json"
    )


def test_child_asks_the_parent_who_gets_an_sms_and_a_notification(sms, parent, child, course):
    resp = ask(child, course, amount=1)
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert (body["kind"], body["status"], body["amount"]) == ("course", "pending", 15000)
    assert body["course"] == {"slug": course.slug, "title": "Robotique"}
    assert body["parentFirstName"] == "Marie"
    assert body["learner"] == {"id": child.pk, "firstName": child.first_name}
    assert body["orderReference"] is None and body["nextResendAt"]
    text = sms.last(parent.phone)
    assert "Robotique" in text and "15000 FCFA" in text and f"/parent/demandes/{body['id']}" in text
    notification = Notification.objects.get(user=parent)
    assert notification.url == f"/parent/demandes/{body['id']}"
    request = PaymentRequest.objects.get()
    assert request.expires_at - request.created_at >= timedelta(days=6, hours=23)


def test_pending_request_for_the_same_course_is_reused(sms, child, course):
    first = ask(child, course).json()
    again = ask(child, course)
    assert again.status_code == 200 and again.json()["id"] == first["id"]


@pytest.mark.parametrize(
    ("course_kwargs", "code"),
    [({}, "COURSE_FREE"), ({"paid": True, "draft": True}, "NOT_FOUND")],
)
def test_course_must_be_buyable(child, course_kwargs, code):
    resp = ask(child, CourseFactory(**course_kwargs))
    assert resp.json()["fields"]["courseSlug"][0]["code"] == code


def test_kit_course_needs_a_kit_code(child):
    course = CourseFactory(paid=True, required_kit=KitFactory())
    assert ask(child, course).json()["fields"]["courseSlug"][0]["code"] == "KIT_CODE_REQUIRED"


def test_enrolled_learner_cannot_ask(child, course):
    Enrollment.objects.create(learner=child, course=course, source=Enrollment.Source.FREE)
    assert ask(child, course).json()["fields"]["courseSlug"][0]["code"] == "ALREADY_ENROLLED"


def test_child_asks_for_kits_without_reserving_stock(sms, parent, child):
    kit = KitFactory(price=35000, stock_quantity=1, name="Steamy Bot")
    resp = client_for(child).post(
        URL, {"kind": "kit", "items": [{"kitSlug": kit.slug, "quantity": 2}]}, format="json"
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["amount"] == 70000
    assert body["items"] == [
        {"kitSlug": kit.slug, "title": "Steamy Bot", "unitPrice": 35000, "quantity": 2}
    ]
    kit.refresh_from_db()
    assert kit.stock_quantity == 1
    assert "Steamy Bot × 2" in sms.last(parent.phone)


def ask_kits(child, *lines):
    items = [{"kitSlug": slug, "quantity": quantity} for slug, quantity in lines]
    return client_for(child).post(URL, {"kind": "kit", "items": items}, format="json")


@pytest.fixture
def kits():
    return KitFactory(slug="bot"), KitFactory(slug="lab")


def test_pending_request_for_the_same_kits_is_reused_whatever_the_order(sms, child, kits):
    first = ask_kits(child, ("bot", 2), ("lab", 1)).json()
    again = ask_kits(child, ("lab", 1), ("bot", 2))
    assert again.status_code == 200 and again.json()["id"] == first["id"]
    assert PaymentRequest.objects.count() == 1


@pytest.mark.parametrize(
    "lines",
    [
        [("bot", 3), ("lab", 1)],  # autre quantité
        [("bot", 2)],  # kit en moins
        [("bot", 2), ("lab", 1), ("kit3", 1)],  # kit en plus
    ],
)
def test_other_kits_or_quantities_make_a_new_request(sms, child, kits, lines):
    KitFactory(slug="kit3")
    first = ask_kits(child, ("bot", 2), ("lab", 1)).json()
    other = ask_kits(child, *lines)
    assert other.status_code == 201 and other.json()["id"] != first["id"]


def test_cancelled_kit_request_is_not_reused(sms, child, kits):
    first = ask_kits(child, ("bot", 2)).json()
    assert client_for(child).post(f"{URL}{first['id']}/cancel/").status_code == 200
    again = ask_kits(child, ("bot", 2))
    assert again.status_code == 201 and again.json()["id"] != first["id"]


def test_expired_but_still_pending_request_is_not_reused(sms, child, course, kits):
    course_request = ask(child, course).json()
    kit_request = ask_kits(child, ("bot", 2)).json()
    PaymentRequest.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
    assert ask(child, course).json()["id"] != course_request["id"]
    assert ask_kits(child, ("bot", 2)).json()["id"] != kit_request["id"]
    assert PaymentRequest.objects.filter(status=PaymentRequest.Status.PENDING).count() == 4


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("kind", ["course", "kit"])
def test_simultaneous_requests_create_one_request_and_one_sms(kind):
    """Deux demandes identiques simultanées : le verrou de l'apprenant n'en crée qu'une et n'envoie qu'un SMS."""
    load_referentials()
    parent = ParentFactory()
    child = link_child(parent)
    course = CourseFactory(paid=True, price=15000)
    kit = KitFactory(slug="bot", price=35000)
    if kind == "course":
        data = {"kind": "course", "amount": 15000, "course": course, "items": []}
    else:
        line = {"kit_slug": kit.slug, "title": kit.name, "unit_price": 35000, "quantity": 2}
        data = {"kind": "kit", "amount": 70000, "course": None, "items": [line]}
    barrier = threading.Barrier(2)
    created = []

    def ask_once():
        try:
            barrier.wait()
            created.append(create_request(child, **data)[1])
        finally:
            connection.close()

    threads = [threading.Thread(target=ask_once) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sorted(created) == [False, True]
    assert PaymentRequest.objects.count() == 1
    assert [m.to for m in mail.outbox] == [[f"{parent.phone}@sms.test"]]


def test_kit_request_of_another_learner_is_not_reused(sms, parent, child, kits):
    first = ask_kits(child, ("bot", 2)).json()
    again = ask_kits(link_child(parent), ("bot", 2))
    assert again.status_code == 201 and again.json()["id"] != first["id"]


@pytest.mark.parametrize(
    ("items", "code"),
    [
        ([], "INVALID"),
        ([{"kitSlug": "k"}, {"kitSlug": "k"}], "INVALID"),
        ([{"kitSlug": "absent"}], "NOT_FOUND"),
        ([{"kitSlug": "rupture"}], "OUT_OF_STOCK"),
    ],
)
def test_kit_request_validation(child, items, code):
    KitFactory(slug="k")
    KitFactory(slug="rupture", out_of_stock=True)
    resp = client_for(child).post(URL, {"kind": "kit", "items": items}, format="json")
    assert resp.json()["fields"]["items"][0]["code"] == code


def test_only_learners_ask(parent, course):
    assert (
        client_for(parent)
        .post(URL, {"kind": "course", "courseSlug": course.slug}, format="json")
        .status_code
        == 403
    )
    assert client_for(TeacherFactory()).get(URL).status_code == 403
    assert client_for().get(URL).status_code == 401


def test_scoping_child_and_parent(sms, parent, child, course):
    mine = ask(child, course).json()
    other_parent = ParentFactory()
    other_child = link_child(other_parent)
    ask(other_child, CourseFactory(paid=True))
    assert [r["id"] for r in client_for(child).get(URL).json()["results"]] == [mine["id"]]
    assert [r["id"] for r in client_for(parent).get(URL).json()["results"]] == [mine["id"]]
    assert client_for(parent).get(URL, {"status": "paid"}).json()["count"] == 0
    assert client_for(parent).get(URL, {"status": "bizarre"}).status_code == 400
    assert client_for(parent).get(f"{URL}{mine['id']}/").status_code == 200
    for user in (other_parent, other_child):
        assert client_for(user).get(f"{URL}{mine['id']}/").status_code == 404
        assert client_for(user).post(f"{URL}{mine['id']}/cancel/").status_code in (403, 404)


def test_resend_is_limited(sms, parent, child, course):
    request_id = ask(child, course).json()["id"]
    url = f"{URL}{request_id}/resend/"
    resp = client_for(child).post(url)
    assert resp.status_code == 429 and resp.json()["code"] == "THROTTLED"
    for sent in range(2, MAX_SENDS + 1):
        PaymentRequest.objects.filter(pk=request_id).update(
            last_sent_at=timezone.now() - timedelta(days=1)
        )
        body = client_for(child).post(url).json()
        assert PaymentRequest.objects.get().send_count == sent
    assert body["nextResendAt"] is None
    assert len(sms.messages(parent.phone)) == MAX_SENDS
    PaymentRequest.objects.filter(pk=request_id).update(
        last_sent_at=timezone.now() - timedelta(days=1)
    )
    assert client_for(child).post(url).status_code == 429
    assert client_for(parent).post(url).status_code == 403


def test_child_cancels_and_cannot_cancel_twice(sms, child, course):
    request_id = ask(child, course).json()["id"]
    resp = client_for(child).post(f"{URL}{request_id}/cancel/")
    assert resp.json()["status"] == "cancelled" and resp.json()["decidedAt"]
    again = client_for(child).post(f"{URL}{request_id}/cancel/")
    assert (again.status_code, again.json()["code"]) == (409, "PAYMENT_REQUEST_CLOSED")
    assert (
        client_for(child).post(f"{URL}{request_id}/resend/").json()["code"]
        == "PAYMENT_REQUEST_CLOSED"
    )


def test_parent_declines_and_the_child_is_told(sms, parent, child, course):
    request_id = ask(child, course).json()["id"]
    assert client_for(child).post(f"{URL}{request_id}/decline/").status_code == 403
    resp = client_for(parent).post(f"{URL}{request_id}/decline/")
    assert resp.json()["status"] == "declined"
    notification = Notification.objects.get(user=child, type="payment_request_declined")
    assert notification.url == f"/apprenant/demandes/{request_id}"


def test_parent_declines_with_an_optional_reason_told_to_the_child(sms, parent, child, course):
    request_id = ask(child, course).json()["id"]
    resp = client_for(parent).post(
        f"{URL}{request_id}/decline/",
        {"reason": "  On en reparle après les examens.  "},
        format="json",
    )
    assert resp.status_code == 200, resp.json()
    assert resp.json()["declineReason"] == "On en reparle après les examens."
    notification = Notification.objects.get(user=child, type="payment_request_declined")
    assert notification.message == "Robotique · « On en reparle après les examens. »"
    # L'enfant lit aussi le motif sur sa demande (WA02)
    assert (
        client_for(child).get(f"{URL}{request_id}/").json()["declineReason"]
        == "On en reparle après les examens."
    )


def test_decline_reason_refuses_control_characters(sms, parent, child, course):
    request_id = ask(child, course).json()["id"]
    resp = client_for(parent).post(
        f"{URL}{request_id}/decline/", {"reason": "Non\x07"}, format="json"
    )
    assert resp.status_code == 400
    assert resp.json()["fields"]["reason"][0]["code"] == "INVALID"
    ok = client_for(parent).post(
        f"{URL}{request_id}/decline/", {"reason": "Non,\nplus tard."}, format="json"
    )
    assert ok.json()["declineReason"] == "Non,\nplus tard."


def test_another_family_cannot_decline_even_with_an_invalid_reason(sms, child, course):
    request_id = ask(child, course).json()["id"]
    resp = client_for(ParentFactory()).post(
        f"{URL}{request_id}/decline/", {"reason": "x" * 600}, format="json"
    )
    assert resp.status_code == 404


def test_decline_reason_is_bounded_and_absent_on_cancel(sms, parent, child, course):
    request_id = ask(child, course).json()["id"]
    resp = client_for(parent).post(
        f"{URL}{request_id}/decline/", {"reason": "x" * 501}, format="json"
    )
    assert resp.status_code == 400
    other = ask(child, CourseFactory(paid=True, price=9000)).json()["id"]
    assert client_for(child).post(f"{URL}{other}/cancel/").json()["declineReason"] == ""


def test_requests_expire_after_seven_days(sms, child, course):
    request_id = ask(child, course).json()["id"]
    assert expire_payment_requests() == 0
    PaymentRequest.objects.filter(pk=request_id).update(
        expires_at=timezone.now() - timedelta(minutes=1)
    )
    assert (
        client_for(child).post(f"{URL}{request_id}/cancel/").json()["code"]
        == "PAYMENT_REQUEST_CLOSED"
    )
    call_command("expire_payment_requests")
    assert PaymentRequest.objects.get().status == PaymentRequest.Status.EXPIRED


def test_pay_payment_request_command_pays_a_course_like_the_parent(
    parent, child, course, django_capture_on_commit_callbacks
):
    request_id = ask(child, course).json()["id"]
    with django_capture_on_commit_callbacks(execute=True):
        call_command("pay_payment_request", request_id)
    request = PaymentRequest.objects.get()
    order = Order.objects.get()
    assert request.status == PaymentRequest.Status.PAID and order.payment_request == request
    assert (order.payer, order.beneficiary, order.status) == (parent, child, Order.Status.PAID)
    assert Enrollment.objects.filter(learner=child, course=course).exists()
    body = client_for(child).get(f"{URL}{request_id}/").json()
    assert body["orderReference"] == order.reference
    assert str(request).startswith("Demande")
    with pytest.raises(CommandError, match="Aucune demande"):
        call_command("pay_payment_request", request_id)


@pytest.mark.parametrize("saved_address", [True, False])
def test_pay_payment_request_command_ships_kits(parent, child, saved_address):
    kit = KitFactory(stock_quantity=3)
    zone = DeliveryZoneFactory()
    if saved_address:
        DeliveryAddress.objects.create(
            user=parent, zone=zone, recipient_name="Marie", city="Porto-Novo", address_line="Rue 3"
        )
    request_id = (
        client_for(child)
        .post(URL, {"kind": "kit", "items": [{"kitSlug": kit.slug}]}, format="json")
        .json()["id"]
    )
    call_command("pay_payment_request", request_id)
    order = Order.objects.get()
    assert order.status == Order.Status.PAID and order.delivery_zone == zone
    assert order.delivery_address["city"] == ("Porto-Novo" if saved_address else "Cotonou")


def test_pay_payment_request_command_needs_a_delivery_zone(child):
    kit = KitFactory()
    request_id = (
        client_for(child)
        .post(URL, {"kind": "kit", "items": [{"kitSlug": kit.slug}]}, format="json")
        .json()["id"]
    )
    with pytest.raises(CommandError, match="zone"):
        call_command("pay_payment_request", request_id)


def test_schema_generation_sees_no_request():
    from django.contrib.auth.models import AnonymousUser
    from rest_framework.test import APIRequestFactory

    from apps.payments.views import PaymentRequestViewSet

    view = PaymentRequestViewSet()
    view.request = APIRequestFactory().get(URL)
    view.request.user = AnonymousUser()
    assert not view.get_queryset().exists()
