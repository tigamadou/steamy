"""
`/api/backoffice/payments/` (ADR 0008 § 9, WAD11) : accès Finance, lignes sans fuite (numéro masqué, pas de `payload`),
filtres, recherche, totaux sur tout le filtre, requêtes en nombre constant, détail, relecture et remboursement.
"""

import datetime

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import ParentFactory
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.core.tests.staff import staff_member, verified_client
from apps.payments import backoffice
from apps.payments.models import Order, Payment, Refund

from .factories import OrderFactory, PaymentFactory

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
