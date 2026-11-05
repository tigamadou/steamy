"""Sonde `fedapay_probe` : bac à sable seulement, relecture bornée, aucun effet Steamy, aucun secret affiché."""

from io import StringIO
from unittest import mock

import pytest
import requests
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.payments.management.commands import fedapay_probe
from apps.payments.models import Order, Payment

from .test_fedapay_support import SECRET_KEY, configure, response

pytestmark = pytest.mark.django_db

PAYMENT_TOKEN = "tok_secret_probe"


@pytest.fixture
def fedapay(settings):
    return configure(settings, "sandbox")


@pytest.fixture(autouse=True)
def no_real_call(monkeypatch):
    monkeypatch.setattr(
        requests.Session,
        "send",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("appel réseau réel")),
    )


@pytest.fixture
def sleep():
    with mock.patch.object(fedapay_probe.time, "sleep") as fake:
        yield fake


def run():
    out = StringIO()
    call_command("fedapay_probe", stdout=out)
    return out.getvalue()


def created():
    return [
        response(200, {"v1/transaction": {"id": 4321, "status": "pending"}}),
        response(200, {"token": PAYMENT_TOKEN}),
        response(200, {"v1/momo_test": {}}),
    ]


def read(status, fees=None, wrapped=True):
    transaction = {
        "id": 4321,
        "status": status,
        "amount": 100,
        "currency": {"iso": "XOF"},
        "merchant_reference": "SONDE-x",
        "fees": fees,
    }
    return response(200, {"v1/transaction": transaction} if wrapped else transaction)


def no_effect():
    assert Order.objects.count() == 0 and Payment.objects.count() == 0


@pytest.mark.parametrize("environment", ["live", "prod"])
def test_the_probe_refuses_anything_but_the_sandbox(settings, environment):
    configure(settings, environment)
    with (
        mock.patch("requests.request") as request,
        pytest.raises(CommandError, match="bac à sable"),
    ):
        run()
    assert not request.called


def test_the_probe_reports_missing_keys_without_values(settings):
    configure(settings, "sandbox")
    settings.FEDAPAY_SECRET_KEY = ""
    with (
        mock.patch("requests.request") as request,
        pytest.raises(CommandError, match="obligatoires"),
    ):
        run()
    assert not request.called


def test_the_probe_runs_the_whole_sandbox_path(fedapay, sleep):
    calls = created() + [read("pending"), read("approved", fees=2), read("approved", fees=2)]
    with mock.patch("requests.request", side_effect=calls) as request:
        report = run()
    create, token, debit = request.call_args_list[:3]
    body = create.kwargs["json"]
    assert body["amount"] == 100 and body["currency"] == {"iso": "XOF"}
    assert body["merchant_reference"].startswith("SONDE-")
    assert body["customer"]["phone_number"]["number"] == "64000001"
    assert debit.args[1].endswith("/momo_test")
    assert [c.args[0] for c in request.call_args_list[3:]] == ["GET", "GET", "GET"]
    sleep.assert_called_once_with(fedapay_probe.POLL_INTERVAL_SECONDS)
    for expected in (
        "4321",
        "approved",
        "succeeded",
        "v1/transaction",
        "merchant_reference",
        "momo_test",
    ):
        assert expected in report
    assert "frais : 2" in report and "relectures : 2" in report
    no_effect()


def test_the_probe_reports_a_bare_transaction(fedapay, sleep):
    calls = created() + [read("approved", wrapped=False), read("approved", wrapped=False)]
    with mock.patch("requests.request", side_effect=calls):
        report = run()
    assert "racine" in report and "v1/transaction" not in report
    sleep.assert_not_called()
    no_effect()


def test_the_polling_is_bounded_and_not_an_error(fedapay, sleep):
    calls = created() + [read("pending")] * (fedapay_probe.MAX_POLLS + 1)
    with mock.patch("requests.request", side_effect=calls) as request:
        report = run()
    assert len(request.call_args_list) == 3 + fedapay_probe.MAX_POLLS + 1
    assert f"non finale après {fedapay_probe.MAX_POLLS} relectures" in report
    assert sleep.call_count == fedapay_probe.MAX_POLLS - 1
    no_effect()


def test_a_final_failure_is_displayed_without_error(fedapay, sleep):
    calls = created() + [read("declined"), read("declined")]
    with mock.patch("requests.request", side_effect=calls):
        report = run()
    assert "declined" in report and "failed" in report
    no_effect()


def test_a_provider_error_is_a_command_error_with_the_identifier(fedapay, sleep):
    calls = [created()[0], created()[1], response(422, {"message": "refusé"})]
    with mock.patch("requests.request", side_effect=calls):
        with pytest.raises(CommandError, match="4321"):
            run()
    no_effect()


def test_a_refusal_before_creation_is_a_command_error(fedapay, sleep):
    with mock.patch("requests.request", side_effect=[response(422, {"message": "invalide"})]):
        with pytest.raises(CommandError, match="422"):
            run()
    no_effect()


def test_a_reading_error_is_a_command_error_with_the_identifier(fedapay, sleep):
    with mock.patch("requests.request", side_effect=created() + [response(500)]):
        with pytest.raises(CommandError, match="4321"):
            run()
    no_effect()


def test_the_output_leaks_no_secret(fedapay, sleep):
    calls = created() + [read("approved", fees=2), read("approved", fees=2)]
    with mock.patch("requests.request", side_effect=calls):
        report = run()
    assert SECRET_KEY not in report and PAYMENT_TOKEN not in report
    assert "+2290164000001" not in report and "0164000001" not in report
