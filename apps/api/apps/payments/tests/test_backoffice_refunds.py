"""
Traitement des remboursements par la Finance (ADR 0008 § 8) : référence obligatoire, `processed_at`/`processed_by`,
commande annulée soldée quand tous ses remboursements sont faits, message au payeur à chaque marquage.
"""

import json
from datetime import timedelta
from unittest import mock

import pytest
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import StaffFactory
from apps.core.groups import FINANCE, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import staff_member, verified_client
from apps.notifications.models import Notification
from apps.payments import backoffice
from apps.payments.models import KitCode, Order, Refund

from .factories import OrderFactory, OrderItemFactory, PaymentFactory, RefundFactory

pytestmark = pytest.mark.django_db


def process(refund, reference="RMB-001", user=None):
    # Le message au payeur part après la transaction (`on_commit`) : exécuté ici comme en production
    with TestCase.captureOnCommitCallbacks(execute=True):
        return backoffice.process_refund(refund, reference, user or StaffFactory())


@pytest.mark.parametrize("reference", ["", "   "])
def test_an_empty_reference_is_refused_and_nothing_is_written(reference):
    refund = RefundFactory()
    with pytest.raises(backoffice.BackofficeError, match="référence"):
        process(refund, reference)
    refund.refresh_from_db()
    assert not refund.processed and refund.reference == "" and refund.processed_at is None
    assert not AuditLog.objects.filter(action="refund.processed").exists()


def test_marking_a_refund_done_stores_who_when_and_the_reference():
    staff = StaffFactory()
    refund = RefundFactory(payment__order=OrderFactory(paid=True))
    before = timezone.now()
    assert process(refund, "  RMB-42  ", staff) is True
    refund.refresh_from_db()
    assert refund.processed and refund.reference == "RMB-42" and refund.processed_by == staff
    assert before <= refund.processed_at <= timezone.now()
    log = AuditLog.objects.get(action="refund.processed")
    assert log.actor == staff and log.data["reference"] == "RMB-42"


def test_a_second_marking_is_refused_and_keeps_the_first_reference():
    refund = RefundFactory(payment__order=OrderFactory(paid=True))
    process(refund, "RMB-1")
    refund.refresh_from_db()
    first_at = refund.processed_at
    with pytest.raises(backoffice.AlreadyProcessedError, match="déjà traité"):
        process(refund, "RMB-2")
    refund.refresh_from_db()
    assert refund.reference == "RMB-1" and refund.processed_at == first_at
    assert issubclass(backoffice.AlreadyProcessedError, backoffice.BackofficeError)


def test_a_total_refund_of_a_paid_order_makes_it_refunded_and_tells_the_payer():
    refund = RefundFactory(payment__order=OrderFactory(paid=True))
    assert process(refund) is True
    order = refund.payment.order
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED
    assert Notification.objects.filter(user=order.payer, title="Remboursement effectué").exists()


def test_a_guest_payer_is_told_by_sms():
    from django.core import mail

    order = OrderFactory(guest=True, paid=True, items=[])
    refund = RefundFactory(payment__order=order)
    process(refund)
    assert any(m.to == ["+2290197000001@sms.test"] and "remboursé" in m.body for m in mail.outbox)


def kit_order(**fields):
    from apps.shop.tests.factories import KitFactory

    order = OrderFactory(kind=Order.Kind.KIT, items=[], shipping_status="preparing", **fields)
    OrderItemFactory(order=order, course=None, kit=KitFactory(), title="Kit robot")
    return order


def test_a_duplicate_payment_refund_keeps_the_order_paid():
    order = OrderFactory(paid=True)
    PaymentFactory(order=order, succeeded=True)
    duplicate = PaymentFactory(order=order, succeeded=True)
    assert process(RefundFactory(payment=duplicate)) is False
    order.refresh_from_db()
    assert order.status == Order.Status.PAID


def test_a_partial_refund_keeps_the_order_paid_until_the_total_is_covered():
    order = kit_order(paid=True)
    item = order.items.get()
    unused = KitCode.objects.create(kit=item.kit, order_item=item, code="STEAMY-AAAA-BBBB")
    used = KitCode.objects.create(
        kit=item.kit, order_item=item, code="STEAMY-CCCC-DDDD", redeemed_at=timezone.now()
    )
    payment = PaymentFactory(order=order, succeeded=True, amount=order.total)
    assert process(RefundFactory(payment=payment, amount=order.total - 5000)) is False
    order.refresh_from_db()
    unused.refresh_from_db()
    assert order.status == Order.Status.PAID and unused.revoked_at is None

    assert process(RefundFactory(payment=payment, amount=5000)) is True
    order.refresh_from_db()
    unused.refresh_from_db()
    used.refresh_from_db()
    assert order.status == Order.Status.REFUNDED
    assert unused.revoked_at is not None and used.revoked_at is None


def cancelled_order_with_late_payments(count):
    order = OrderFactory(cancelled=True)
    return order, [
        RefundFactory(payment=PaymentFactory(order=order, succeeded=True)) for _ in range(count)
    ]


def test_a_cancelled_order_is_settled_when_its_last_refund_is_done():
    order, (first, last) = cancelled_order_with_late_payments(2)
    assert process(first) is False
    order.refresh_from_db()
    assert order.status == Order.Status.CANCELLED
    assert Notification.objects.filter(user=order.payer, title="Remboursement effectué").exists()
    assert process(last) is True
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED


def test_a_cancelled_order_with_a_single_refund_is_settled_at_once():
    order, (only,) = cancelled_order_with_late_payments(1)
    assert process(only) is True
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED


def test_a_cancelled_order_revokes_its_unused_codes_when_settled():
    order = kit_order(cancelled=True)
    item = order.items.get()
    code = KitCode.objects.create(kit=item.kit, order_item=item, code="STEAMY-AAAA-BBBB")
    assert process(RefundFactory(payment=PaymentFactory(order=order, succeeded=True))) is True
    code.refresh_from_db()
    assert code.revoked_at is not None


# --- API : liste et marquage « fait » --------------------------------------------------------------------------

REFUNDS = "/api/backoffice/refunds/"


@pytest.fixture
def finance(client):
    verified_client(client, FINANCE)
    return client


def process_url(refund):
    return f"{REFUNDS}{refund.pk}/process/"


def post_reference(client, refund, **body):
    return client.post(process_url(refund), json.dumps(body), content_type="application/json")


def test_the_refund_endpoints_are_for_finance_only(client):
    assert APIClient().get(REFUNDS).status_code in (401, 403)
    unverified = APIClient()
    unverified.force_authenticate(staff_member(FINANCE))
    assert unverified.get(REFUNDS).json()["code"] == "OTP_REQUIRED"
    verified_client(client, SUPPORT)
    refund = RefundFactory()
    assert client.get(REFUNDS).status_code == 403
    assert post_reference(client, refund, reference="X").status_code == 403


def test_the_list_defaults_to_pending_refunds_oldest_first(finance):
    newer = RefundFactory()
    older = RefundFactory()
    Refund.objects.filter(pk=older.pk).update(created_at=timezone.now() - timedelta(days=2))
    RefundFactory(done=True)
    body = finance.get(REFUNDS).json()
    assert body["count"] == 2 and [r["id"] for r in body["results"]] == [older.pk, newer.pk]


def test_the_processed_list_is_most_recently_processed_first(finance):
    early = RefundFactory(done=True)
    late = RefundFactory(done=True)
    Refund.objects.filter(pk=early.pk).update(processed_at=timezone.now() - timedelta(days=3))
    RefundFactory()
    results = finance.get(REFUNDS, {"processed": "true"}).json()["results"]
    assert [r["id"] for r in results] == [late.pk, early.pk]
    assert results[0]["processed"] is True and results[0]["reference"] == late.reference
    assert results[0]["processedBy"] == late.processed_by.get_full_name()


def test_a_listed_refund_has_the_exact_contract_fields_and_no_full_number(finance):
    payment = PaymentFactory(
        succeeded=True, msisdn="+2290197123456", provider_transaction_id="tx-9"
    )
    refund = RefundFactory(payment=payment, amount=4000, reason="Geste")
    response = finance.get(REFUNDS)
    assert "+2290197123456" not in response.content.decode()
    row = response.json()["results"][0]
    assert row == {
        "id": refund.pk,
        "createdAt": row["createdAt"],
        "amount": 4000,
        "reason": "Geste",
        "processed": False,
        "processedAt": None,
        "processedBy": None,
        "reference": "",
        "paymentId": payment.pk,
        "orderReference": payment.order.reference,
        "merchantReference": payment.merchant_reference,
        "providerTransactionId": "tx-9",
        "network": "mtn",
        "maskedMsisdn": backoffice.masked("+2290197123456"),
        "paymentAmount": 15000,
        "payer": payment.order.payer.get_full_name(),
        "beneficiary": payment.order.beneficiary.get_full_name(),
    }


def test_the_list_is_paginated_and_rejects_an_invalid_filter(finance):
    for _ in range(3):
        RefundFactory()
    page = finance.get(REFUNDS, {"pageSize": 2}).json()
    assert page["count"] == 3 and len(page["results"]) == 2 and page["next"]
    response = finance.get(REFUNDS, {"processed": "peut-etre"})
    assert (response.status_code, response.json()["code"]) == (400, "VALIDATION_ERROR")
    assert "processed" in response.json()["fields"]


def test_the_list_does_not_query_per_row(finance):
    def count():
        finance.get(REFUNDS)
        with CaptureQueriesContext(connection) as queries:
            assert finance.get(REFUNDS, {"processed": "true"}).status_code == 200
            assert finance.get(REFUNDS).status_code == 200
        return len(queries)

    RefundFactory(done=True)
    RefundFactory()
    few = count()
    for _ in range(6):
        RefundFactory(done=True)
        RefundFactory()
    assert count() == few


def test_processing_a_total_refund_settles_the_order_and_tells_the_payer(finance):
    refund = RefundFactory(payment__order=OrderFactory(paid=True))
    with TestCase.captureOnCommitCallbacks(execute=True):
        response = post_reference(finance, refund, reference=" RMB-9 ")
    assert response.status_code == 200
    body = response.json()
    assert body["orderRefunded"] is True
    assert body["refund"]["processed"] is True and body["refund"]["reference"] == "RMB-9"
    assert body["refund"]["processedBy"] and body["refund"]["processedAt"]
    refund.payment.order.refresh_from_db()
    assert refund.payment.order.status == Order.Status.REFUNDED
    assert Notification.objects.filter(
        user=refund.payment.order.payer, title="Remboursement effectué"
    ).exists()
    entry = AuditLog.objects.get(action="refund.processed")
    assert entry.actor is not None and entry.data["reference"] == "RMB-9"


def test_a_duplicate_and_a_partial_refund_leave_the_order_paid(finance):
    order = OrderFactory(paid=True)
    PaymentFactory(order=order, succeeded=True)
    duplicate = RefundFactory(payment=PaymentFactory(order=order, succeeded=True))
    partial_order = OrderFactory(paid=True)
    partial = RefundFactory(payment=PaymentFactory(order=partial_order, succeeded=True), amount=100)
    for refund in (duplicate, partial):
        body = post_reference(finance, refund, reference="R").json()
        assert body["orderRefunded"] is False
    order.refresh_from_db()
    partial_order.refresh_from_db()
    assert order.status == partial_order.status == Order.Status.PAID


def test_a_cancelled_order_is_settled_by_its_last_refund_only(finance):
    order, (first, last) = cancelled_order_with_late_payments(2)
    assert post_reference(finance, first, reference="A").json()["orderRefunded"] is False
    assert post_reference(finance, last, reference="B").json()["orderRefunded"] is True
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED


@pytest.mark.parametrize(
    "body", [{}, {"reference": ""}, {"reference": "   "}, {"reference": "x" * 129}]
)
def test_an_invalid_reference_is_a_400_and_changes_nothing(finance, body):
    refund = RefundFactory()
    response = post_reference(finance, refund, **body)
    assert (response.status_code, response.json()["code"]) == (400, "VALIDATION_ERROR")
    assert "reference" in response.json()["fields"]
    refund.refresh_from_db()
    assert not refund.processed and refund.reference == ""


def test_a_second_call_is_a_409_and_keeps_the_first_reference(finance):
    refund = RefundFactory(payment__order=OrderFactory(paid=True))
    assert post_reference(finance, refund, reference="R1").status_code == 200
    response = post_reference(finance, refund, reference="R2")
    assert (response.status_code, response.json()["code"]) == (409, "VALIDATION_ERROR")
    assert response.json()["message"] == f"Remboursement n° {refund.pk} : déjà traité."
    refund.refresh_from_db()
    assert refund.reference == "R1"


def test_an_unknown_refund_is_a_404(finance):
    assert (
        finance.post(
            f"{REFUNDS}999999/process/",
            json.dumps({"reference": "R"}),
            content_type="application/json",
        ).status_code
        == 404
    )


def test_the_http_path_never_makes_an_order_paid(finance):
    order = OrderFactory()
    refund = RefundFactory(payment=PaymentFactory(order=order, succeeded=True))
    post_reference(finance, refund, reference="R")
    order.refresh_from_db()
    assert order.status == Order.Status.PENDING


def test_another_business_error_from_the_service_is_a_400(finance):
    refund = RefundFactory()
    with mock.patch.object(
        backoffice, "process_refund", side_effect=backoffice.BackofficeError("Référence refusée.")
    ):
        response = post_reference(finance, refund, reference="R")
    assert (response.status_code, response.json()["code"]) == (400, "VALIDATION_ERROR")
    assert response.json()["message"] == "Référence refusée."
