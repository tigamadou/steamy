"""Initiation d'un paiement (ADR 0008 §3) : prestataire disponible, réseau pris en charge, référence marchande
unique par tentative, identifiant de transaction jamais perdu."""

import threading
from unittest import mock

import pytest
from rest_framework.test import APIClient

from apps.payments.checkout import initiate_payment
from apps.payments.models import Payment
from apps.payments.providers import PaymentProviderError, PaymentStatus, PaymentTemporaryError
from apps.payments.providers.fake import FakePaymentProvider
from libs.errors import ApiError

from .factories import OrderFactory, load_referentials
from .test_flux_support import run_concurrently

pytestmark = pytest.mark.django_db

SUCCESS, PENDING = "+2290197000001", "+2290197000003"


@pytest.fixture
def order():
    return OrderFactory()


def pay(order, msisdn=PENDING):
    client = APIClient()
    client.force_authenticate(order.payer)
    return client.post(
        f"/api/payments/orders/{order.reference}/payments/",
        {"country": "BJ", "network": "mtn", "msisdn": msisdn},
        format="json",
    )


def initiate(order, msisdn=PENDING):
    return initiate_payment(order, country="BJ", network="mtn", msisdn=msisdn)


def created_then(error_class, *, tx_id="fake-cree"):
    """`initiate` qui crée la transaction chez le prestataire puis échoue."""

    def fail(self, charge):
        raise error_class("échec après création", provider_tx_id=tx_id)

    return mock.patch.object(FakePaymentProvider, "initiate", fail)


# --- Prestataire et réseau ------------------------------------------------------------------


def test_missing_fedapay_keys_make_payment_unavailable(order, settings):
    settings.PAYMENT_PROVIDER = "fedapay"
    settings.FEDAPAY_SECRET_KEY = settings.FEDAPAY_WEBHOOK_SECRET = ""
    resp = pay(order)
    assert resp.status_code == 503 and resp.json()["code"] == "PAYMENT_UNAVAILABLE"
    assert Payment.objects.count() == 0


def test_fake_provider_is_unavailable_when_deployed(order, settings):
    settings.DEPLOYED = True
    resp = pay(order)
    assert resp.status_code == 503 and resp.json()["code"] == "PAYMENT_UNAVAILABLE"
    assert Payment.objects.count() == 0


def test_network_unsupported_by_the_provider_is_refused_before_any_debit(order, monkeypatch):
    monkeypatch.setattr(FakePaymentProvider, "UNSUPPORTED", frozenset({("BJ", "mtn")}))
    with mock.patch.object(FakePaymentProvider, "initiate") as initiate_mock:
        resp = pay(order)
    assert resp.status_code == 400
    assert resp.json()["fields"]["network"][0]["code"] == "NETWORK_UNAVAILABLE"
    initiate_mock.assert_not_called()
    assert Payment.objects.count() == 0


# --- Référence marchande --------------------------------------------------------------------


def test_each_attempt_gets_its_own_merchant_reference(order):
    charges = []
    real = FakePaymentProvider.initiate

    def spy(self, charge):
        charges.append(charge)
        return real(self, charge)

    with mock.patch.object(FakePaymentProvider, "initiate", spy):
        first = initiate(order, "+2290197000002")
        Payment.objects.filter(pk=first.pk).update(status=Payment.Status.FAILED)
        second = initiate(order)
    assert [first.merchant_reference, second.merchant_reference] == [
        f"{order.reference}-1",
        f"{order.reference}-2",
    ]
    assert [c.merchant_reference for c in charges] == [
        first.merchant_reference,
        second.merchant_reference,
    ]
    assert charges[1].metadata == {"order": order.reference, "payment": second.pk}


@pytest.mark.django_db(transaction=True)
def test_simultaneous_attempts_never_share_a_merchant_reference():
    load_referentials()
    order = OrderFactory()
    results = run_concurrently(lambda: initiate(order), lambda: initiate(order))
    created = [r for r in results if isinstance(r, Payment)]
    refused = [r for r in results if isinstance(r, ApiError)]
    assert len(created) == 1 and len(refused) == 1
    assert [p.merchant_reference for p in Payment.objects.all()] == [f"{order.reference}-1"]


# --- Échecs de l'initiation -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("error", "code"),
    [
        (PaymentTemporaryError("panne"), "PROVIDER_UNAVAILABLE"),
        (PaymentProviderError("non"), "PROVIDER_REFUSED"),
    ],
)
def test_failure_before_creation_leaves_no_transaction_id(order, error, code):
    with mock.patch.object(FakePaymentProvider, "initiate", side_effect=error):
        payment = initiate(order)
    assert (payment.status, payment.failure_code) == (Payment.Status.FAILED, code)
    assert payment.provider_transaction_id is None


def test_definitive_refusal_after_creation_keeps_the_transaction_id(order):
    with created_then(PaymentProviderError):
        payment = initiate(order)
    payment.refresh_from_db()
    assert (payment.status, payment.failure_code) == (Payment.Status.FAILED, "PROVIDER_REFUSED")
    assert payment.provider_transaction_id == "fake-cree"
    assert initiate(order).status == Payment.Status.PENDING  # pas de PAYMENT_IN_PROGRESS


def test_temporary_failure_after_creation_leaves_the_payment_to_reconciliation(order):
    with created_then(PaymentTemporaryError):
        resp = pay(order)
    assert resp.status_code == 201 and resp.json()["status"] == "pending"
    payment = Payment.objects.get()
    assert payment.provider_transaction_id == "fake-cree"
    assert (payment.status, payment.failure_code) == (Payment.Status.PENDING, "")


@pytest.mark.parametrize(
    ("suffix", "status", "code"),
    [("04", Payment.Status.FAILED, "PROVIDER_REFUSED"), ("05", Payment.Status.PENDING, "")],
)
def test_fake_provider_created_then_failed_numbers(order, suffix, status, code):
    payment = initiate(order, f"+22901970000{suffix}")
    assert payment.provider_transaction_id.startswith("fake-")
    assert (payment.status, payment.failure_code) == (status, code)
    assert FakePaymentProvider().fetch_transaction(payment.provider_transaction_id).status == (
        PaymentStatus.PENDING
    )
