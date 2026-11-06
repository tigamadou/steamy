"""FedaPay : réglages, mode de débit, numéro, références et erreurs à l'initiation (ADR 0008 §1 à §3)."""

from unittest import mock

import pytest
import requests
from django.conf import settings as django_settings

from apps.payments.providers import PaymentProviderError, PaymentStatus, PaymentTemporaryError
from apps.payments.providers.fedapay import FedaPayProvider

from .test_fedapay_support import SECRET_KEY, charge, configure, response

pytestmark = pytest.mark.django_db


@pytest.fixture
def fedapay(settings):
    return configure(settings, "sandbox")


@pytest.fixture
def live(settings):
    return configure(settings, "live")


def test_default_live_modes_follow_the_adr_table():
    assert django_settings.FEDAPAY_MODES == {
        "BJ:mtn": "mtn_open",
        "BJ:moov": "moov",
        "BJ:celtiis": "sbin",
        "TG:moov": "moov_tg",
        "TG:togocel": "togocel",
        "CI:mtn": "mtn_ci",
    }


def test_sandbox_mode_defaults_to_momo_test():
    assert django_settings.FEDAPAY_SANDBOX_MODE == "momo_test"


# --- Mode, `supports`, numéro ------------------------------------------------------------------

SANDBOX = "https://sandbox-api.fedapay.com/v1"
LIVE = "https://api.fedapay.com/v1"


def happy_calls(mode_key="v1/momo_test"):
    return [
        response(200, {"v1/transaction": {"id": 1234, "status": "pending"}}),
        response(200, {"token": "tok_abc", "url": "https://checkout"}),
        response(200, {mode_key: {}}),
    ]


@pytest.fixture(autouse=True)
def no_real_call(monkeypatch):
    monkeypatch.setattr(
        requests.Session,
        "send",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("appel réseau réel")),
    )


@pytest.mark.parametrize(
    ("country", "network"),
    [("BJ", "mtn"), ("BJ", "moov"), ("BJ", "celtiis"), ("TG", "togocel"), ("BJ", "wave")],
)
def test_sandbox_debits_every_network_with_momo_test(fedapay, country, network):
    with mock.patch("requests.request", side_effect=happy_calls()) as request:
        FedaPayProvider().initiate(charge(country=country, network=network))
    debit = request.call_args_list[2]
    assert debit.args == ("POST", f"{SANDBOX}/momo_test")


@pytest.mark.parametrize(
    ("country", "network", "mode"),
    [
        ("BJ", "mtn", "mtn_open"),
        ("BJ", "celtiis", "sbin"),
        ("TG", "togocel", "togocel"),
        ("CI", "mtn", "mtn_ci"),
    ],
)
def test_live_uses_the_mode_table(live, country, network, mode):
    with mock.patch("requests.request", side_effect=happy_calls()) as request:
        FedaPayProvider().initiate(charge(country=country, network=network))
    assert request.call_args_list[0].args == ("POST", f"{LIVE}/transactions")
    assert request.call_args_list[2].args == ("POST", f"{LIVE}/{mode}")


def test_supports_is_always_true_in_the_sandbox(fedapay):
    provider = FedaPayProvider()
    assert provider.supports("BJ", "mtn") and provider.supports("CI", "wave")


def test_supports_follows_the_table_in_live(live):
    provider = FedaPayProvider()
    assert provider.supports("BJ", "mtn") and provider.supports("TG", "togocel")
    assert not provider.supports("CI", "wave") and not provider.supports("BJ", "inconnu")


def test_live_refuses_a_network_without_mode_before_any_call(live):
    with mock.patch("requests.request") as request:
        with pytest.raises(PaymentProviderError, match="Réseau non pris en charge") as error:
            FedaPayProvider().initiate(charge(network="wave"))
    request.assert_not_called()
    assert error.value.provider_tx_id is None


@pytest.mark.parametrize(
    ("msisdn", "number"), [("+2290164000001", "64000001"), ("+2290197000001", "97000001")]
)
def test_sandbox_sends_the_last_eight_digits(fedapay, msisdn, number):
    with mock.patch("requests.request", side_effect=happy_calls()) as request:
        FedaPayProvider().initiate(charge(msisdn=msisdn))
    customer = request.call_args_list[0].kwargs["json"]["customer"]
    assert customer["phone_number"] == {"number": number, "country": "bj"}


def test_live_sends_the_full_national_number(live):
    with mock.patch("requests.request", side_effect=happy_calls()) as request:
        FedaPayProvider().initiate(charge())
    customer = request.call_args_list[0].kwargs["json"]["customer"]
    assert customer["phone_number"] == {"number": "0164000001", "country": "bj"}


# --- Corps de la transaction et enchaînement ---------------------------------------------------


def test_the_transaction_carries_the_merchant_reference_and_metadata(fedapay):
    with mock.patch("requests.request", side_effect=happy_calls()) as request:
        result = FedaPayProvider().initiate(charge())
    assert result.provider_tx_id == "1234" and result.status == PaymentStatus.PENDING
    assert result.redirect_url is None
    (create, token, debit) = request.call_args_list
    body = create.kwargs["json"]
    assert body["merchant_reference"] == "CM-0001-1" and body["merchant_reference"] != "CM-0001"
    assert body["custom_metadata"] == {"order": "CM-0001", "payment": "7"}
    assert body["amount"] == 5000 and body["currency"] == {"iso": "XOF"}
    assert body["callback_url"] and body["description"] == "Parcours Robotique"
    assert create.kwargs["headers"] == {"Authorization": f"Bearer {SECRET_KEY}"}
    assert token.args[1].endswith("/transactions/1234/token")
    assert debit.kwargs["json"] == {"token": "tok_abc"}


def test_the_description_falls_back_to_the_order_reference(fedapay):
    with mock.patch("requests.request", side_effect=happy_calls()) as request:
        FedaPayProvider().initiate(charge(description=""))
    assert request.call_args_list[0].kwargs["json"]["description"] == "Commande CM-0001"


def test_the_response_can_be_the_bare_transaction(fedapay):
    calls = happy_calls()
    calls[0] = response(200, {"id": 99, "status": "pending"})
    with mock.patch("requests.request", side_effect=calls):
        assert FedaPayProvider().initiate(charge()).provider_tx_id == "99"


# --- Erreurs avant la création -----------------------------------------------------------------


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
def test_failures_before_creation_are_temporary_without_identifier(fedapay, outcome):
    with mock.patch("requests.request", side_effect=[outcome]):
        with pytest.raises(PaymentTemporaryError) as error:
            FedaPayProvider().initiate(charge())
    assert error.value.provider_tx_id is None


def test_a_refused_creation_is_final_without_identifier(fedapay):
    with mock.patch("requests.request", return_value=response(422, {"message": "invalide"})):
        with pytest.raises(PaymentProviderError) as error:
            FedaPayProvider().initiate(charge())
    assert not isinstance(error.value, PaymentTemporaryError)
    assert error.value.provider_tx_id is None


# --- Erreurs après la création -----------------------------------------------------------------

CREATED = response(200, {"v1/transaction": {"id": 1234}})
TOKEN = response(200, {"token": "tok_secret_abc"})


def failure(calls):
    with mock.patch("requests.request", side_effect=calls):
        with pytest.raises(PaymentProviderError) as error:
            FedaPayProvider().initiate(charge())
    return error.value


@pytest.mark.parametrize("status", [400, 403, 422])
def test_a_refused_debit_is_final_and_keeps_the_identifier(fedapay, status):
    error = failure([CREATED, TOKEN, response(status, {"message": "refusé"})])
    assert not isinstance(error, PaymentTemporaryError)
    assert error.provider_tx_id == "1234"


@pytest.mark.parametrize(
    "outcome", [requests.ConnectionError(), response(500), response(429), response(200)]
)
def test_an_uncertain_debit_is_temporary_and_keeps_the_identifier(fedapay, outcome):
    error = failure([CREATED, TOKEN, outcome])
    assert isinstance(error, PaymentTemporaryError) and error.provider_tx_id == "1234"


@pytest.mark.parametrize(
    "outcome",
    [
        response(200, {}),  # jeton absent
        response(404, {"message": "inconnue"}),
        response(422, {"message": "refusé"}),
        response(500),
        requests.ConnectionError(),
    ],
)
def test_any_token_failure_is_temporary_and_keeps_the_identifier(fedapay, outcome):
    error = failure([CREATED, outcome])
    assert isinstance(error, PaymentTemporaryError) and error.provider_tx_id == "1234"


def test_error_messages_leak_neither_key_token_nor_number(fedapay):
    for calls in (
        [CREATED, TOKEN, response(422, {"message": "refusé"})],
        [CREATED, TOKEN, response(500)],
        [CREATED, response(200, {})],
    ):
        message = str(failure(calls))
        assert SECRET_KEY not in message and "tok_secret_abc" not in message
        assert "64000001" not in message
