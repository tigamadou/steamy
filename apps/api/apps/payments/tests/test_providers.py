"""Prestataires de paiement (S9, ADR 0003) : interface, faux prestataire pilotable, FedaPay."""

import hashlib
import hmac
import json
import time
from unittest import mock

import pytest
import requests
from django.core.exceptions import ImproperlyConfigured
from django.test import RequestFactory

from apps.payments.models import Order, Payment
from apps.payments.providers import (
    Charge,
    PaymentProvider,
    PaymentProviderError,
    PaymentStatus,
    PaymentTemporaryError,
    RefundOutcome,
    get_provider,
)
from apps.payments.providers.fake import FakePaymentProvider, outcome_for
from apps.payments.providers.fedapay import FedaPayProvider, national_number
from apps.payments.tasks import deliver_fake_webhook
from apps.payments.tests.factories import OrderFactory


def charge(msisdn="+2290197000001", **overrides):
    values = {
        "reference": "CM-0001",
        "amount": 5000,
        "currency": "XOF",
        "country": "BJ",
        "network": "mtn",
        "msisdn": msisdn,
        "description": "Parcours Robotique",
        "first_name": "Marie",
        "last_name": "Houngbo",
    }
    return Charge(**{**values, **overrides})


@pytest.fixture
def initiate(django_capture_on_commit_callbacks):
    """Initie un faux paiement puis valide la transaction : la notification part à ce moment-là."""

    def run(msisdn="+2290197000001"):
        with django_capture_on_commit_callbacks(execute=True):
            return FakePaymentProvider().initiate(charge(msisdn))

    return run


@pytest.fixture
def order(db):
    return OrderFactory(reference="CM-0001", subtotal=5000)


# --- Sélection ---------------------------------------------------------------------------------


def test_fake_provider_is_the_default_outside_deployed_environments():
    assert isinstance(get_provider(), FakePaymentProvider)


def test_provider_can_be_chosen_by_name(fedapay):
    assert isinstance(get_provider("fedapay"), FedaPayProvider)


def test_unknown_provider_is_refused(settings):
    settings.PAYMENT_PROVIDER = "kkiapay"
    with pytest.raises(ImproperlyConfigured, match="inconnu"):
        get_provider()


def test_fake_provider_can_never_run_when_deployed(settings):
    settings.DEPLOYED = True
    with pytest.raises(ImproperlyConfigured, match="interdit"):
        get_provider("fake")


def test_base_provider_defines_the_interface():
    provider = PaymentProvider()
    for call in (
        lambda: provider.initiate(charge()),
        lambda: provider.verify_webhook(None),
        lambda: provider.parse_event({}),
        lambda: provider.fetch_status("TX"),
    ):
        with pytest.raises(NotImplementedError):
            call()
    assert provider.refund("TX", 100) == RefundOutcome.UNSUPPORTED


# --- Faux prestataire --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("msisdn", "outcome"),
    [
        ("+2290197000001", PaymentStatus.SUCCEEDED),
        ("+2290197000002", PaymentStatus.FAILED),
        ("+2290197000003", PaymentStatus.PENDING),
        ("+2290197000042", PaymentStatus.SUCCEEDED),
    ],
)
def test_fake_outcome_depends_on_the_test_number(msisdn, outcome):
    assert outcome_for(msisdn) == outcome


def test_fake_success_posts_a_signed_webhook_after_commit(order, initiate):
    result = initiate()
    assert result.status == PaymentStatus.PENDING and result.redirect_url is None
    order.refresh_from_db()
    assert order.status == Order.Status.PAID
    payment = Payment.objects.get(order=order)
    assert payment.provider == "fake" and payment.provider_transaction_id == result.provider_tx_id
    assert FakePaymentProvider().fetch_status(result.provider_tx_id) == PaymentStatus.SUCCEEDED


def test_fake_failure_is_notified_with_a_reason(order, initiate):
    result = initiate("+2290197000002")
    order.refresh_from_db()
    assert order.status == Order.Status.PENDING
    assert Payment.objects.get(order=order).status == Payment.Status.FAILED
    assert FakePaymentProvider().fetch_status(result.provider_tx_id) == PaymentStatus.FAILED
    payload = FakePaymentProvider().settle(result.provider_tx_id, PaymentStatus.FAILED)
    assert payload["failureReason"]


def test_fake_pending_number_never_notifies(order, initiate):
    result = initiate("+2290197000003")
    assert not Payment.objects.exists()
    assert FakePaymentProvider().fetch_status(result.provider_tx_id) == PaymentStatus.PENDING


def test_fake_notification_waits_for_the_commit(order):
    FakePaymentProvider().initiate(charge())
    assert not Payment.objects.exists()


def test_fake_webhook_can_be_delivered_later_by_hand(order):
    result = FakePaymentProvider().initiate(charge("+2290197000003"))
    assert deliver_fake_webhook(result.provider_tx_id, "succeeded") == 200
    order.refresh_from_db()
    assert order.status == Order.Status.PAID


def test_fake_unknown_transaction(db):
    provider = FakePaymentProvider()
    with pytest.raises(PaymentProviderError, match="inconnue"):
        provider.fetch_status("fake-absent")
    with pytest.raises(PaymentProviderError):
        provider.refund("fake-absent", 100)


def test_fake_refund_is_immediate(order):
    result = FakePaymentProvider().initiate(charge())
    assert FakePaymentProvider().refund(result.provider_tx_id, 5000) == RefundOutcome.DONE


def test_fake_webhook_without_signature_is_not_authentic():
    request = RequestFactory().post("/", b"{}", content_type="application/json")
    assert FakePaymentProvider().verify_webhook(request) is False


# --- FedaPay -----------------------------------------------------------------------------------

WEBHOOK_SECRET = "wh_sandbox_test"


@pytest.fixture
def fedapay(settings):
    settings.FEDAPAY_SECRET_KEY = "sk_sandbox_test"
    settings.FEDAPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
    settings.FEDAPAY_ENVIRONMENT = "sandbox"
    return settings


def response(status_code, payload=None):
    resp = mock.Mock(status_code=status_code, ok=200 <= status_code < 300)
    if payload is None:
        resp.json.side_effect = ValueError
    else:
        resp.json.return_value = payload
    return resp


def test_fedapay_requires_its_credentials(settings):
    settings.FEDAPAY_SECRET_KEY = ""
    with pytest.raises(ImproperlyConfigured, match="obligatoires"):
        FedaPayProvider()


def test_fedapay_requires_a_known_environment(fedapay):
    fedapay.FEDAPAY_ENVIRONMENT = "prod"
    with pytest.raises(ImproperlyConfigured, match="FEDAPAY_ENVIRONMENT"):
        FedaPayProvider()


@pytest.mark.django_db
def test_fedapay_initiates_a_direct_debit_without_redirection(fedapay):
    calls = [
        response(200, {"v1/transaction": {"id": 1234, "status": "pending"}}),
        response(200, {"token": "tok_abc", "url": "https://checkout"}),
        response(200, {"v1/mtn_open": {}}),
    ]
    with mock.patch("requests.request", side_effect=calls) as request:
        result = FedaPayProvider().initiate(charge())
    assert result.provider_tx_id == "1234" and result.status == PaymentStatus.PENDING
    assert result.redirect_url is None
    (create, token, debit) = request.call_args_list
    assert create.args == ("POST", "https://sandbox-api.fedapay.com/v1/transactions")
    body = create.kwargs["json"]
    assert body["amount"] == 5000 and body["currency"] == {"iso": "XOF"}
    assert body["merchant_reference"] == "CM-0001"
    assert body["customer"]["phone_number"] == {"number": "0197000001", "country": "bj"}
    assert create.kwargs["headers"] == {"Authorization": "Bearer sk_sandbox_test"}
    assert token.args[1].endswith("/transactions/1234/token")
    assert debit.args[1].endswith("/mtn_open") and debit.kwargs["json"] == {"token": "tok_abc"}


def test_fedapay_refuses_an_unmapped_network(fedapay):
    with mock.patch("requests.request") as request:
        with pytest.raises(PaymentProviderError, match="Réseau non pris en charge"):
            FedaPayProvider().initiate(charge(network="wave"))
    request.assert_not_called()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "outcome",
    [
        requests.ConnectionError(),
        response(500),
        response(429),
        response(200),  # corps illisible
        response(200, {"v1/transaction": {"status": "pending"}}),  # sans identifiant
    ],
)
def test_fedapay_temporary_failures(fedapay, outcome):
    with mock.patch("requests.request", side_effect=[outcome]):
        with pytest.raises(PaymentTemporaryError):
            FedaPayProvider().initiate(charge())


@pytest.mark.django_db
def test_fedapay_missing_token_is_temporary(fedapay):
    calls = [response(200, {"v1/transaction": {"id": 1}}), response(200, {})]
    with mock.patch("requests.request", side_effect=calls):
        with pytest.raises(PaymentTemporaryError, match="Jeton"):
            FedaPayProvider().initiate(charge())


@pytest.mark.django_db
def test_fedapay_refusals_are_final(fedapay):
    with mock.patch("requests.request", return_value=response(422, {"message": "invalide"})):
        with pytest.raises(PaymentProviderError) as error:
            FedaPayProvider().initiate(charge())
    assert not isinstance(error.value, PaymentTemporaryError)


def signed_request(body: bytes, timestamp=None, secret=WEBHOOK_SECRET, header=None):
    timestamp = str(int(time.time()) if timestamp is None else timestamp)
    signature = hmac.new(
        secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256
    ).hexdigest()
    return RequestFactory().post(
        "/",
        body,
        content_type="application/json",
        headers={"X-FEDAPAY-SIGNATURE": header or f"t={timestamp},s={signature}"},
    )


def test_fedapay_webhook_signature(fedapay):
    body = b'{"name": "transaction.approved"}'
    provider = FedaPayProvider()
    assert provider.verify_webhook(signed_request(body)) is True
    assert provider.verify_webhook(signed_request(body, secret="autre")) is False
    assert provider.verify_webhook(signed_request(body, timestamp=int(time.time()) - 3600)) is False
    assert provider.verify_webhook(signed_request(body, header="s=abc")) is False
    assert provider.verify_webhook(signed_request(body, header="n'importe quoi")) is False


def transaction_event(**entity):
    values = {
        "id": 1234,
        "status": "approved",
        "amount": 5000,
        "merchant_reference": "CM-0001",
        "currency": {"iso": "xof"},
    }
    return {"name": "transaction.approved", "entity": {**values, **entity}}


def test_fedapay_parses_transaction_events(fedapay):
    event = FedaPayProvider().parse_event(transaction_event())
    assert (event.reference, event.provider_tx_id, event.amount, event.currency) == (
        "CM-0001",
        "1234",
        5000,
        "XOF",
    )
    assert event.status == PaymentStatus.SUCCEEDED and event.failure_reason == ""


def test_fedapay_reads_the_currency_id_and_failure_reason(fedapay):
    payload = transaction_event(status="declined", currency=None, currency_id=1)
    event = FedaPayProvider().parse_event(payload)
    assert event.currency == "XOF" and event.status == PaymentStatus.FAILED
    assert event.failure_reason == "Paiement refusé par l'opérateur."
    assert FedaPayProvider().parse_event(transaction_event(currency=None)).currency == ""


def test_fedapay_ignores_other_events(fedapay):
    assert FedaPayProvider().parse_event({"name": "customer.created", "entity": {}}) is None


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "transaction.approved"},
        transaction_event(status="bizarre"),
        transaction_event(merchant_reference=None),
        transaction_event(id=None),
        transaction_event(amount="cinq mille"),
    ],
)
def test_fedapay_rejects_incomplete_transactions(fedapay, payload):
    with pytest.raises(ValueError):
        FedaPayProvider().parse_event(payload)


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        ("approved", PaymentStatus.SUCCEEDED),
        ("pending", PaymentStatus.PENDING),
        ("canceled", PaymentStatus.FAILED),
        ("nouveau", PaymentStatus.PENDING),
    ],
)
def test_fedapay_fetches_the_transaction_status(fedapay, status, expected):
    payload = {"v1/transaction": {"id": 1234, "status": status}}
    with mock.patch("requests.request", return_value=response(200, payload)) as request:
        assert FedaPayProvider().fetch_status("1234") == expected
    assert request.call_args.args == ("GET", "https://sandbox-api.fedapay.com/v1/transactions/1234")


def test_fedapay_refunds_are_handled_by_finance(fedapay):
    assert FedaPayProvider().refund("1234", 5000) == RefundOutcome.PENDING_MANUAL


@pytest.mark.django_db
def test_national_number_without_known_country():
    assert national_number("+2290197000001", "BJ") == "0197000001"
    assert national_number("+33612345678", "FR") == "33612345678"


def test_fake_webhook_body_is_plain_json(order):
    result = FakePaymentProvider().initiate(charge())
    payload = FakePaymentProvider().settle(result.provider_tx_id, PaymentStatus.SUCCEEDED)
    assert json.loads(json.dumps(payload))["reference"] == "CM-0001"
