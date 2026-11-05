"""
`/api/backoffice/payments/` (ADR 0008 § 9, WAD11) : accès Finance, lignes sans fuite (numéro masqué, pas de `payload`),
filtres, recherche, totaux sur tout le filtre, requêtes en nombre constant, détail, relecture et remboursement.
"""

import datetime
import json
from unittest import mock

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import ParentFactory
from apps.core.audit import audit
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import staff_member, verified_client
from apps.payments import backoffice
from apps.payments.models import Order, Payment, Refund
from apps.payments.providers import PaymentStatus

from .factories import OrderFactory, PaymentFactory, RefundFactory, fake_transaction

pytestmark = pytest.mark.django_db

PAYMENTS = "/api/backoffice/payments/"


@pytest.fixture
def finance(client):
    verified_client(client, FINANCE)
    return client


def stamp(payment, **when):
    """Date de création voulue (le champ est automatique)."""
    Payment.objects.filter(pk=payment.pk).update(
        created_at=timezone.now() - datetime.timedelta(**when)
    )
    payment.refresh_from_db()
    return payment


# --- Accès (D72) ---------------------------------------------------------------------------------------------


def test_anonymous_persona_and_unverified_staff_are_refused():
    assert APIClient().get(PAYMENTS).status_code in (401, 403)
    persona = APIClient()
    persona.force_authenticate(ParentFactory())
    assert persona.get(PAYMENTS).json()["code"] == "PERMISSION_DENIED"
    staff = APIClient()
    staff.force_authenticate(staff_member(SUPER_ADMIN))
    response = staff.get(PAYMENTS)
    assert (response.status_code, response.json()["code"]) == (403, "OTP_REQUIRED")


@pytest.mark.parametrize(
    ("group", "expected"),
    [(CONTENT, 403), (SUPPORT, 403), (FINANCE, 200), (SUPER_ADMIN, 200)],
)
def test_access_by_group(client, group, expected):
    verified_client(client, group)
    assert client.get(PAYMENTS).status_code == expected


# --- Lignes --------------------------------------------------------------------------------------------------


def test_a_row_has_the_exact_contract_fields_and_leaks_nothing(finance):
    payment = PaymentFactory(
        succeeded=True,
        payload={"event": "secret"},
        msisdn="+2290197123456",
        provider_transaction_id="tx-77",
    )
    body = finance.get(PAYMENTS)
    raw = body.content.decode()
    assert "+2290197123456" not in raw and "secret" not in raw and "payload" not in raw
    row = body.json()["results"][0]
    order = payment.order
    assert row == {
        "id": payment.pk,
        "createdAt": row["createdAt"],
        "orderReference": order.reference,
        "merchantReference": f"{order.reference}-1",
        "providerTransactionId": "tx-77",
        "payer": order.payer.get_full_name(),
        "beneficiary": order.beneficiary.get_full_name(),
        "kind": "course",
        "country": "BJ",
        "network": "mtn",
        "maskedMsisdn": backoffice.masked("+2290197123456"),
        "amount": 15000,
        "currency": "XOF",
        "status": "succeeded",
        "providerStatus": "approved",
        "failureCode": "",
        "failureReason": "",
    }


def test_payer_is_named_for_a_guest_and_empty_for_an_anonymised_account(finance):
    named = OrderFactory(guest=True, items=[])
    anonymous_guest = OrderFactory(guest=True, items=[], guest_first_name="", guest_last_name="")
    anonymised = OrderFactory(payer=None, beneficiary=None)
    for order in (named, anonymous_guest, anonymised):
        PaymentFactory(order=order)
    payers = {
        row["orderReference"]: (row["payer"], row["beneficiary"])
        for row in finance.get(PAYMENTS).json()["results"]
    }
    assert payers[named.reference] == (
        f"{named.guest_first_name} {named.guest_last_name} (invité)",
        None,
    )
    assert payers[anonymous_guest.reference] == ("Invité", None)
    assert payers[anonymised.reference] == ("", None)


def test_a_payer_whose_account_is_anonymised_shows_an_empty_name(finance):
    from apps.accounts.models import User

    order = OrderFactory()
    User.objects.filter(pk=order.payer_id).update(status=User.Status.ANONYMIZED, is_active=False)
    PaymentFactory(order=order)
    assert finance.get(PAYMENTS).json()["results"][0]["payer"] == ""


def test_payments_are_newest_first_and_paginated(finance):
    old = stamp(PaymentFactory(), days=3)
    recent = stamp(PaymentFactory(), days=1)
    newest = PaymentFactory()
    ids = [row["id"] for row in finance.get(PAYMENTS).json()["results"]]
    assert ids == [newest.pk, recent.pk, old.pk]
    page = finance.get(PAYMENTS, {"pageSize": 2, "page": 2}).json()
    assert page["count"] == 3 and [row["id"] for row in page["results"]] == [old.pk]
    assert page["previous"] is not None and page["next"] is None


# --- Filtres et recherche ------------------------------------------------------------------------------------


def ids(client, **params):
    return {row["id"] for row in client.get(PAYMENTS, params).json()["results"]}


def test_each_filter_selects_its_payments(finance):
    base = PaymentFactory(succeeded=True)
    failed = PaymentFactory(failed=True, network="moov", country="TG")
    kit = PaymentFactory(order=OrderFactory(kind=Order.Kind.KIT, items=[]))
    assert ids(finance, status="failed") == {failed.pk}
    assert ids(finance, network="moov") == {failed.pk}
    assert ids(finance, country="TG") == {failed.pk}
    assert ids(finance, kind="kit") == {kit.pk}
    assert ids(finance, kind="course", status="succeeded") == {base.pk}
    assert ids(finance, status="succeeded", network="moov") == set()


def test_date_bounds_are_inclusive(finance):
    day = datetime.date(2026, 3, 10)

    def at(hour):
        payment = PaymentFactory()
        moment = timezone.make_aware(datetime.datetime.combine(day, datetime.time(hour, 0)))
        Payment.objects.filter(pk=payment.pk).update(created_at=moment)
        return payment.pk

    first, last = at(0), at(23)
    before = PaymentFactory()
    Payment.objects.filter(pk=before.pk).update(
        created_at=timezone.make_aware(datetime.datetime(2026, 3, 9, 23, 0))
    )
    assert ids(finance, **{"from": "2026-03-10", "to": "2026-03-10"}) == {first, last}
    assert ids(finance, **{"from": "2026-03-10"}) == {first, last}
    assert ids(finance, to="2026-03-09") == {before.pk}


@pytest.mark.parametrize(
    "params",
    [{"status": "bogus"}, {"kind": "bogus"}, {"from": "hier"}, {"to": "2026-13-01"}],
)
def test_an_invalid_filter_is_a_400_with_its_field(finance, params):
    response = finance.get(PAYMENTS, params)
    body = response.json()
    assert response.status_code == 400 and body["code"] == "VALIDATION_ERROR"
    assert next(iter(params)) in body["fields"]


def test_search_matches_order_merchant_reference_and_transaction_id(finance):
    target = PaymentFactory(provider_transaction_id="TX-AbC-999")
    other = PaymentFactory(provider_transaction_id="zzz")
    assert ids(finance, q=target.order.reference.lower()) == {target.pk}
    assert ids(finance, q=target.merchant_reference) == {target.pk}
    assert ids(finance, q="abc-9") == {target.pk}
    assert ids(finance, q="introuvable") == set()
    assert other.pk not in ids(finance, q="tx-")


# --- Totaux --------------------------------------------------------------------------------------------------


def test_totals_cover_the_whole_filter_not_the_page(finance):
    PaymentFactory(succeeded=True, amount=15000)
    PaymentFactory(succeeded=True, amount=20000, order=OrderFactory(kind=Order.Kind.KIT, items=[]))
    PaymentFactory(failed=True)
    PaymentFactory()
    body = finance.get(PAYMENTS, {"pageSize": 1}).json()
    assert len(body["results"]) == 1
    assert body["totals"] == {
        "volume": 35000,
        "count": 4,
        "succeeded": 2,
        "failed": 1,
        "failureRate": 33.3,
    }
    assert body["totals"] == {
        key: backoffice.payment_totals(Payment.objects.all())[snake]
        for key, snake in (
            ("volume", "volume"),
            ("count", "count"),
            ("succeeded", "succeeded"),
            ("failed", "failed"),
            ("failureRate", "failure_rate"),
        )
    }
    assert finance.get(PAYMENTS, {"kind": "kit"}).json()["totals"]["volume"] == 20000


def test_failure_rate_is_null_without_a_settled_payment_and_refunds_do_not_reduce_the_volume(
    finance,
):
    PaymentFactory()
    assert finance.get(PAYMENTS).json()["totals"]["failureRate"] is None
    paid = PaymentFactory(succeeded=True, amount=15000)
    Refund.objects.create(payment=paid, amount=15000)
    assert finance.get(PAYMENTS).json()["totals"]["volume"] == 15000


def test_the_list_does_not_query_per_row(finance):
    def count():
        finance.get(PAYMENTS)
        with CaptureQueriesContext(connection) as queries:
            assert finance.get(PAYMENTS).status_code == 200
        return len(queries)

    for _ in range(2):
        PaymentFactory(succeeded=True)
    few = count()
    for _ in range(8):
        PaymentFactory(failed=True)
    assert count() == few


# --- Détail --------------------------------------------------------------------------------------------------


def detail_url(payment, suffix=""):
    return f"{PAYMENTS}{payment.pk}/{suffix}"


def test_the_detail_has_the_exact_contract_fields(finance):
    staff = staff_member(FINANCE)
    payment = PaymentFactory(
        succeeded=True,
        payload={"event": "secret"},
        msisdn="+2290197123456",
        provider_fees=150,
        provider_transaction_id="tx-1",
    )
    refund = RefundFactory(payment=payment, amount=5000, reason="Geste", processed_by=staff)
    refund.refresh_from_db()
    response = finance.get(detail_url(payment))
    raw = response.content.decode()
    assert "+2290197123456" not in raw and "secret" not in raw and "payload" not in raw
    body = response.json()
    order = payment.order
    assert set(body) == {
        *finance.get(PAYMENTS).json()["results"][0],
        "provider",
        "providerFees",
        "checkedAt",
        "confirmedAt",
        "refundable",
        "order",
        "attempts",
        "refunds",
        "auditLog",
    }
    assert body["provider"] == "fake" and body["providerFees"] == 150
    assert body["checkedAt"] and body["confirmedAt"]
    assert body["refundable"] == 10000
    assert body["order"] == {
        "id": order.pk,
        "reference": order.reference,
        "kind": "course",
        "status": "pending",
        "total": 15000,
        "currency": "XOF",
        "payer": order.payer.get_full_name(),
        "beneficiary": order.beneficiary.get_full_name(),
    }
    assert body["refunds"] == [
        {
            "id": refund.pk,
            "createdAt": body["refunds"][0]["createdAt"],
            "amount": 5000,
            "reason": "Geste",
            "processed": False,
            "processedAt": None,
            "processedBy": staff.get_full_name(),
            "reference": "",
        }
    ]


def test_attempts_are_the_other_payments_of_the_order_oldest_first(finance):
    order = OrderFactory()
    first = stamp(PaymentFactory(order=order, failed=True), minutes=30)
    second = stamp(PaymentFactory(order=order, failed=True), minutes=20)
    current = PaymentFactory(order=order)
    PaymentFactory()
    body = finance.get(detail_url(current)).json()
    assert [a["id"] for a in body["attempts"]] == [first.pk, second.pk]
    assert body["attempts"][0] == {
        "id": first.pk,
        "createdAt": body["attempts"][0]["createdAt"],
        "merchantReference": first.merchant_reference,
        "providerTransactionId": first.provider_transaction_id,
        "status": "failed",
        "providerStatus": "declined",
        "failureCode": "DECLINED",
        "amount": 15000,
    }


def test_refundable_is_the_remaining_amount_and_zero_when_not_succeeded(finance):
    paid = PaymentFactory(succeeded=True, amount=15000)
    RefundFactory(payment=paid, amount=4000)
    assert finance.get(detail_url(paid)).json()["refundable"] == 11000
    assert finance.get(detail_url(PaymentFactory(failed=True))).json()["refundable"] == 0


def test_refunds_are_listed_oldest_first_with_who_did_them(finance):
    payment = PaymentFactory(succeeded=True, amount=15000)
    done = RefundFactory(payment=payment, amount=1000, done=True)
    Refund.objects.filter(pk=done.pk).update(created_at=timezone.now() - datetime.timedelta(days=1))
    waiting = RefundFactory(payment=payment, amount=2000)
    refunds = finance.get(detail_url(payment)).json()["refunds"]
    assert [r["id"] for r in refunds] == [done.pk, waiting.pk]
    assert refunds[0]["processed"] and refunds[0]["reference"] == done.reference
    assert refunds[0]["processedBy"] == done.processed_by.get_full_name()
    assert refunds[0]["processedAt"] is not None


def test_the_audit_log_holds_the_entries_of_the_payment_and_of_its_order_only(finance):
    payment = PaymentFactory()
    other_payment = PaymentFactory()
    staff = staff_member(FINANCE)
    first = audit("payment.rechecked", actor=staff, target=payment, data={"before": "pending"})
    system = audit("order.expired", target=payment.order, data={"order_refunded": True})
    audit("payment.rechecked", target=other_payment)
    audit("order.expired", target=other_payment.order)
    audit("user.created", target=staff)
    AuditLog.objects.filter(pk=first.pk).update(
        created_at=timezone.now() - datetime.timedelta(hours=1)
    )
    entries = finance.get(detail_url(payment)).json()["auditLog"]
    assert [e["id"] for e in entries] == [first.pk, system.pk]
    assert entries[0] == {
        "id": first.pk,
        "createdAt": entries[0]["createdAt"],
        "action": "payment.rechecked",
        "actor": staff.get_full_name(),
        "target": "payment",
        "data": {"before": "pending"},
    }
    assert (entries[1]["actor"], entries[1]["target"]) == (None, "order")


def test_an_unknown_payment_is_a_404(finance):
    response = finance.get(f"{PAYMENTS}999999/")
    assert (response.status_code, response.json()["code"]) == (404, "NOT_FOUND")


def test_the_detail_is_refused_to_support(client):
    verified_client(client, SUPPORT)
    assert client.get(detail_url(PaymentFactory())).status_code == 403


def test_the_detail_query_count_does_not_grow_with_the_audit_log(finance):
    payment = PaymentFactory(succeeded=True)

    def count():
        finance.get(detail_url(payment))
        with CaptureQueriesContext(connection) as queries:
            assert finance.get(detail_url(payment)).status_code == 200
        return len(queries)

    audit("payment.rechecked", actor=staff_member(FINANCE), target=payment)
    few = count()
    for _ in range(6):
        audit("payment.rechecked", actor=staff_member(FINANCE), target=payment)
        audit("order.expired", target=payment.order)
        RefundFactory(payment=payment, amount=100, done=True)
        PaymentFactory(order=payment.order, failed=True)
    assert count() == few


# --- Relecture chez le prestataire ------------------------------------------------------------------------------


def test_recheck_applies_the_provider_outcome_and_is_audited(finance):
    order = OrderFactory()
    payment = PaymentFactory(order=order)
    fake_transaction(payment, PaymentStatus.SUCCEEDED)
    response = finance.post(detail_url(payment, "recheck/"))
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == payment.pk and body["status"] == "succeeded"
    assert body["order"]["status"] == "paid"
    entry = AuditLog.objects.get(action="payment.rechecked")
    assert entry.target_id == str(payment.pk) and entry.actor is not None
    assert entry.data == {"before": "pending", "after": "succeeded"}
    assert [e["action"] for e in body["auditLog"]].count("payment.rechecked") == 1


def test_recheck_of_a_succeeded_payment_changes_nothing_but_is_audited(finance):
    payment = PaymentFactory(succeeded=True)
    fake_transaction(payment, PaymentStatus.SUCCEEDED)
    body = finance.post(detail_url(payment, "recheck/")).json()
    assert body["status"] == "succeeded"
    assert AuditLog.objects.get(action="payment.rechecked").data == {
        "before": "succeeded",
        "after": "succeeded",
    }


def test_recheck_without_a_transaction_id_is_a_409(finance):
    payment = PaymentFactory(unsent=True)
    with mock.patch("apps.payments.checkout.verify_payment") as verify:
        response = finance.post(detail_url(payment, "recheck/"))
    assert (response.status_code, response.json()["code"]) == (409, "VALIDATION_ERROR")
    verify.assert_not_called()
    assert not AuditLog.objects.filter(action="payment.rechecked").exists()


@pytest.mark.parametrize("deployed", [False, True])
def test_recheck_when_the_provider_is_unreachable_is_a_502(finance, settings, deployed):
    # Faux prestataire : transaction inconnue → erreur du prestataire ; en production simulée : prestataire non configuré
    settings.DEPLOYED = deployed
    payment = PaymentFactory(provider_transaction_id="inconnue")
    response = finance.post(detail_url(payment, "recheck/"))
    body = response.json()
    assert (response.status_code, body["code"]) == (502, "SERVER_ERROR")
    assert "n'a pas répondu" in body["message"]
    payment.refresh_from_db()
    assert payment.status == Payment.Status.PENDING
    assert not AuditLog.objects.filter(action="payment.rechecked").exists()


def test_recheck_of_an_unknown_payment_is_a_404_and_refused_to_support(finance, client):
    assert finance.post(f"{PAYMENTS}999999/recheck/").status_code == 404
    support = APIClient()
    verified_client(support, SUPPORT)
    assert support.post(detail_url(PaymentFactory(), "recheck/")).status_code == 403


# --- Demande de remboursement ------------------------------------------------------------------------------------


def request_refund(client, payment, **body):
    return client.post(
        detail_url(payment, "refunds/"), json.dumps(body), content_type="application/json"
    )


def test_a_refund_request_is_created_and_audited(finance):
    payment = PaymentFactory(succeeded=True, amount=15000, msisdn="+2290197123456")
    response = request_refund(finance, payment, amount=5000, reason="Kit abîmé")
    assert response.status_code == 201
    body = response.json()
    refund = Refund.objects.get()
    assert "+2290197123456" not in response.content.decode()
    assert body == {
        "id": refund.pk,
        "createdAt": body["createdAt"],
        "amount": 5000,
        "reason": "Kit abîmé",
        "processed": False,
        "processedAt": None,
        "processedBy": None,
        "reference": "",
        "paymentId": payment.pk,
        "orderReference": payment.order.reference,
        "merchantReference": payment.merchant_reference,
        "providerTransactionId": payment.provider_transaction_id,
        "network": "mtn",
        "maskedMsisdn": backoffice.masked("+2290197123456"),
        "paymentAmount": 15000,
        "payer": payment.order.payer.get_full_name(),
        "beneficiary": payment.order.beneficiary.get_full_name(),
    }
    assert AuditLog.objects.filter(action="refund.requested", target_id=str(payment.pk)).exists()
    # Un second remboursement dans la limite du reste est accepté
    assert request_refund(finance, payment, amount=10000, reason="Solde").status_code == 201


def test_a_refund_above_the_remainder_or_on_an_unsuccessful_payment_is_a_409(finance):
    payment = PaymentFactory(succeeded=True, amount=15000)
    response = request_refund(finance, payment, amount=20000, reason="Trop")
    assert (response.status_code, response.json()["code"]) == (409, "VALIDATION_ERROR")
    assert response.json()["message"] == "Montant remboursable : 15000 FCFA au plus."
    failed = request_refund(finance, PaymentFactory(failed=True), amount=100, reason="x")
    assert failed.status_code == 409 and "paiement réussi" in failed.json()["message"]
    assert not Refund.objects.exists()


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"amount": 0, "reason": "x"}, "amount"),
        ({"amount": -5, "reason": "x"}, "amount"),
        ({"reason": "x"}, "amount"),
        ({"amount": 100, "reason": ""}, "reason"),
        ({"amount": 100, "reason": "   "}, "reason"),
        ({"amount": 100}, "reason"),
    ],
)
def test_an_invalid_refund_body_is_a_400_with_its_field(finance, body, field):
    response = request_refund(finance, PaymentFactory(succeeded=True), **body)
    assert (response.status_code, response.json()["code"]) == (400, "VALIDATION_ERROR")
    assert field in response.json()["fields"] and not Refund.objects.exists()


def test_a_refund_request_on_an_unknown_payment_is_a_404_and_refused_to_support(finance):
    assert (
        finance.post(f"{PAYMENTS}999999/refunds/", {"amount": 1, "reason": "x"}).status_code == 404
    )
    support = APIClient()
    verified_client(support, SUPPORT)
    payment = PaymentFactory(succeeded=True)
    assert request_refund(support, payment, amount=1, reason="x").status_code == 403
