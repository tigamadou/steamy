"""FedaPay : relecture normalisée d'une transaction (ADR 0008 §4)."""

from unittest import mock

import pytest
import requests

from apps.payments.providers import (
    PaymentProviderError,
    PaymentStatus,
    PaymentTemporaryError,
    ProviderTransaction,
)
from apps.payments.providers.fedapay import FedaPayProvider

from .test_fedapay_support import SECRET_KEY, configure, response

URL = "https://sandbox-api.fedapay.com/v1/transactions/1234"


@pytest.fixture
def fedapay(settings):
    return configure(settings, "sandbox")


def transaction(**overrides):
    return {
        "id": 1234,
        "status": "approved",
        "amount": 5000,
        "currency": {"iso": "xof"},
        "merchant_reference": "CM-0001-1",
        "fees": 150,
        **overrides,
    }


def fetch(payload, tx_id="1234"):
    with mock.patch("requests.request", return_value=response(200, payload)) as request:
        return FedaPayProvider().fetch_transaction(tx_id), request


def test_the_call_is_an_authenticated_get(fedapay):
    _, request = fetch({"v1/transaction": transaction()})
    assert request.call_args.args == ("GET", URL)
    assert request.call_args.kwargs["headers"] == {"Authorization": f"Bearer {SECRET_KEY}"}


def test_envelope_and_bare_transaction_give_the_same_result(fedapay):
    wrapped, _ = fetch({"v1/transaction": transaction()})
    bare, _ = fetch(transaction())
    assert (
        wrapped
        == bare
        == ProviderTransaction(
            provider_tx_id="1234",
            status=PaymentStatus.SUCCEEDED,
            provider_status="approved",
            amount=5000,
            currency="XOF",
            merchant_reference="CM-0001-1",
            fees=150,
        )
    )


@pytest.mark.parametrize("amount", [100, 100.0, "100"])
def test_the_amount_is_an_integer(fedapay, amount):
    fetched, _ = fetch(transaction(amount=amount))
    assert fetched.amount == 100 and isinstance(fetched.amount, int)


@pytest.mark.parametrize(
    ("fees", "expected"),
    [(5, 5), (5.0, 5), (None, None), ("abc", None), (True, None)],
)
def test_the_fees_are_an_integer_or_none(fedapay, fees, expected):
    assert fetch(transaction(fees=fees))[0].fees == expected


def test_missing_fees_are_none(fedapay):
    payload = transaction()
    del payload["fees"]
    assert fetch(payload)[0].fees is None


@pytest.mark.parametrize(
    ("extra", "currency"),
    [
        ({"currency": {"iso": "xof"}}, "XOF"),
        ({"currency": None, "currency_id": 1}, "XOF"),
        ({"currency": None}, ""),
        ({"currency": None, "currency_id": 99}, ""),
    ],
)
def test_the_currency_comes_from_the_iso_then_the_id(fedapay, extra, currency):
    assert fetch(transaction(**extra))[0].currency == currency


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("pending", PaymentStatus.PENDING),
        ("approved", PaymentStatus.SUCCEEDED),
        ("transferred", PaymentStatus.SUCCEEDED),
        ("declined", PaymentStatus.FAILED),
        ("canceled", PaymentStatus.FAILED),
        ("expired", PaymentStatus.FAILED),
        ("refunded", PaymentStatus.FAILED),
        ("partially_refunded", PaymentStatus.FAILED),
        ("refunded_partially", PaymentStatus.FAILED),
        ("nouveau", PaymentStatus.PENDING),
        (None, PaymentStatus.PENDING),
    ],
)
def test_statuses_are_normalised_and_the_raw_one_is_kept(fedapay, raw, expected):
    fetched, _ = fetch(transaction(status=raw))
    assert fetched.status == expected and fetched.provider_status == (raw or "")


def test_a_missing_reference_is_empty(fedapay):
    assert fetch(transaction(merchant_reference=None))[0].merchant_reference == ""


def test_a_missing_transaction_is_final(fedapay):
    with mock.patch("requests.request", return_value=response(404, {"message": "absente"})):
        with pytest.raises(PaymentProviderError) as error:
            FedaPayProvider().fetch_transaction("1234")
    assert not isinstance(error.value, PaymentTemporaryError)


@pytest.mark.parametrize(
    "outcome",
    [
        response(500),
        response(429),
        response(200),
        response(200, {"v1/transaction": {"status": "approved"}}),  # sans identifiant
        response(200, {"v1/transaction": transaction(amount="cinq mille")}),
        response(200, {"v1/transaction": {"id": 1}}),  # sans montant
        requests.ConnectionError(),
    ],
)
def test_uncertain_failures_are_temporary(fedapay, outcome):
    with mock.patch("requests.request", side_effect=[outcome]):
        with pytest.raises(PaymentTemporaryError):
            FedaPayProvider().fetch_transaction("1234")


def test_the_raw_transaction_is_returned_untouched(fedapay):
    payload = {"v1/transaction": transaction(extra="valeur")}
    with mock.patch("requests.request", return_value=response(200, payload)) as request:
        assert FedaPayProvider().raw_transaction("1234") == payload
    assert request.call_args.args == ("GET", URL)
