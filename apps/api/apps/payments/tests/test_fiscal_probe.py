"""Sonde `emecef_probe` : serveur de test seulement, factures d'essai toujours annulées, aucun secret affiché."""

from io import StringIO
from unittest import mock

import pytest
import requests
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.payments.fiscal import FiscalError
from apps.payments.fiscal.fake import FakeFiscalProvider

from .test_fiscal import DGI_INFO_STATUS, DGI_INVOICE, DGI_SECURITY, DGI_TAX_GROUPS, response

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    monkeypatch.setattr(
        requests.Session,
        "send",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("appel réseau réel")),
    )


def run(**options):
    out = StringIO()
    call_command("emecef_probe", stdout=out, **options)
    return out.getvalue()


def test_the_probe_needs_the_explicit_confirmation():
    with pytest.raises(CommandError, match="--yes-test"):
        run()


def test_the_probe_refuses_anything_but_the_test_server(settings):
    settings.FISCAL_PROVIDER = "emecef"
    settings.EMECEF_TOKEN, settings.EMECEF_IFU = "jeton-secret", "9999900000001"
    settings.EMECEF_ENVIRONMENT = "production"
    with mock.patch("requests.request") as request, pytest.raises(CommandError, match="TEST"):
        run(yes_test=True)
    assert not request.called


def test_the_probe_reports_groups_aib_and_rounding_with_the_fake_server():
    report = run(yes_test=True)
    assert "Serveur : fake" in report and "À rapporter" in report
    assert "'B': 18" in report and "lignes de 1000 par groupe" in report
    assert '"total inclut l\'AIB": False' in report  # faux fournisseur : AIB hors total par défaut
    assert "arrondi : 3 x 101 en groupe B" in report and "'TVA': 46" in report
    assert "AIB A sur 11800 en groupe B" in report and "AIB B sur 11800 en groupe B" in report


def test_the_probe_sees_an_aib_included_in_the_total(settings):
    settings.EMECEF_AIB_IN_TOTAL = True
    assert '"total inclut l\'AIB": True' in run(yes_test=True)


def test_every_probe_invoice_is_cancelled_even_when_a_step_fails():
    cancelled = []
    real_cancel = FakeFiscalProvider.cancel

    def cancel(self, uid):
        cancelled.append(uid)
        return real_cancel(self, uid)

    created = []
    real_request = FakeFiscalProvider.request_invoice

    def request(self, req):
        totals = real_request(self, req)
        created.append(totals.uid)
        return totals

    with (
        mock.patch.object(FakeFiscalProvider, "cancel", cancel),
        mock.patch.object(FakeFiscalProvider, "request_invoice", request),
    ):
        run(yes_test=True)
    assert created and cancelled == created


def test_an_unusable_token_or_an_api_error_stops_the_probe(settings):
    class Expired(FakeFiscalProvider):
        def status(self):
            return super().status().__class__(token_valid_until=None)

    with mock.patch(
        "apps.payments.management.commands.emecef_probe.get_fiscal_provider", return_value=Expired()
    ):
        with pytest.raises(CommandError, match="expiré"):
            run(yes_test=True)
    with mock.patch.object(FakeFiscalProvider, "tax_groups", side_effect=FiscalError("refusé")):
        with pytest.raises(CommandError, match="refusé"):
            run(yes_test=True)
    with mock.patch(
        "apps.payments.management.commands.emecef_probe.get_fiscal_provider",
        side_effect=ValueError("config"),
    ):
        with pytest.raises(CommandError, match="config"):
            run(yes_test=True)


def test_the_probe_on_the_test_server_never_prints_the_token_and_cancels_with_put(settings):
    settings.FISCAL_PROVIDER = "emecef"
    settings.EMECEF_TOKEN, settings.EMECEF_IFU = "jeton-secret", "9999900000001"
    settings.EMECEF_ENVIRONMENT = "test"
    cancelled = {**DGI_SECURITY, "qrCode": "", "codeMECeFDGI": ""}

    def reply(method, url, **kwargs):
        if url.endswith("/info/status"):
            return response(DGI_INFO_STATUS)
        if url.endswith("/info/taxGroups"):
            return response(DGI_TAX_GROUPS)
        if method == "POST":
            return response(DGI_INVOICE)
        assert method == "PUT" and url.endswith("/cancel")
        return response(cancelled)

    with mock.patch("requests.request", side_effect=reply) as request:
        report = run(yes_test=True)
    methods = [call.args[0] for call in request.call_args_list]
    assert methods.count("POST") == 5 and methods.count("PUT") == methods.count("POST")
    assert (
        "Serveur : test" in report
        and "jeton-secret" not in report
        and "9999900000001" not in report
    )


def test_the_probe_checks_the_provider_environment_itself():
    class Production(FakeFiscalProvider):
        environment = "production"

    with mock.patch(
        "apps.payments.management.commands.emecef_probe.get_fiscal_provider",
        return_value=Production(),
    ):
        with pytest.raises(CommandError, match="TEST"):
            run(yes_test=True)
