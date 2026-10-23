"""
Facture normalisée e-MECeF (ADR 0006, C26) : interface, faux fournisseur, client e-MCF (transport simulé : aucun appel
réseau réel), garde-fou des taux et activation depuis l'admin.
"""

from decimal import Decimal
from unittest import mock

import pytest
import requests
from django.core.exceptions import ImproperlyConfigured, ValidationError

from apps.core.groups import SUPER_ADMIN
from apps.core.models import PlatformSettings
from apps.core.tests.staff import verified_client
from apps.payments.fiscal import (
    PROVIDERS,
    FiscalClient,
    FiscalError,
    FiscalItem,
    FiscalPayment,
    FiscalTemporaryError,
    InvoiceRequest,
    TaxGroups,
    get_fiscal_provider,
)
from apps.payments.fiscal.base import FiscalInvoiceProvider
from apps.payments.fiscal.emecef import EmecefProvider
from apps.payments.fiscal.fake import FakeFiscalProvider
from apps.payments.fiscal.guard import activation_errors, aib_letter

pytestmark = pytest.mark.django_db

SETTINGS_URL = "/admin/core/platformsettings/"


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    """Aucun appel HTTP réel : un test qui n'a pas simulé son transport échoue."""

    def refuse(*args, **kwargs):
        raise AssertionError("appel réseau réel")

    monkeypatch.setattr(requests.Session, "send", refuse)


@pytest.fixture
def emecef(settings):
    settings.EMECEF_API_URL = "https://dgi.test/sygmef-emcf/"
    settings.EMECEF_TOKEN = "jeton-de-test"
    settings.EMECEF_IFU = "0000000000001"
    return EmecefProvider()


def invoice_request(reference="CMD-1", aib=None):
    return InvoiceRequest(
        type="FV",
        reference=reference,
        items=[
            FiscalItem("C1", "Parcours robotique", 10000, Decimal(2), "B"),
            FiscalItem("L", "Livraison", 2000, Decimal(1), "A", tax_specific=0),
        ],
        client=FiscalClient(name="Marie Houngbo", contact="+2290197000001"),
        payments=[FiscalPayment("MOBILEMONEY", 22000)],
        aib=aib,
        operator_id="steamy",
        operator_name="Steamy",
    )


def response(payload, status=200):
    resp = mock.Mock(status_code=status, ok=200 <= status < 300)
    resp.json.return_value = payload
    return resp


# --- Choix du fournisseur ------------------------------------------------------------------------------------------


def test_the_provider_is_chosen_by_setting_and_unknown_names_are_refused(settings):
    assert set(PROVIDERS) == {"fake", "emecef"}
    assert isinstance(get_fiscal_provider(), FakeFiscalProvider)
    with pytest.raises(ImproperlyConfigured, match="inconnu"):
        get_fiscal_provider("dgi")


def test_the_fake_provider_is_refused_when_deployed(settings):
    settings.DEPLOYED = True
    with pytest.raises(ImproperlyConfigured, match="interdit"):
        FakeFiscalProvider()


def test_the_interface_is_abstract():
    provider = FiscalInvoiceProvider()
    for call in (
        provider.status,
        provider.tax_groups,
        lambda: provider.request_invoice(invoice_request()),
        lambda: provider.confirm("x"),
        lambda: provider.cancel("x"),
    ):
        with pytest.raises(NotImplementedError):
            call()


# --- Faux fournisseur ----------------------------------------------------------------------------------------------


def test_fake_flow_request_then_confirm_with_security_elements():
    provider = FakeFiscalProvider()
    assert provider.status().token_valid and provider.tax_groups().rates["B"] == 18
    totals = provider.request_invoice(invoice_request(aib="B"))
    assert totals.total == 22000 + 1100 and totals.aib == 1100
    elements = provider.confirm(totals.uid)
    assert (
        elements.code.startswith("FAKE-") and elements.qr_code.endswith(totals.uid) and elements.nim
    )
    assert provider.request_invoice(invoice_request()).aib == 0


def test_fake_cancel_and_unknown_uid():
    provider = FakeFiscalProvider()
    uid = provider.request_invoice(invoice_request()).uid
    assert provider.cancel(uid).qr_code.startswith("X;")
    with pytest.raises(FiscalError) as error:
        provider.confirm("inconnu")
    assert error.value.code == "FAKE_UNKNOWN"


def test_fake_is_driven_by_the_order_reference():
    provider = FakeFiscalProvider()
    with pytest.raises(FiscalError) as refused:
        provider.request_invoice(invoice_request("CMD-1-REFUSED"))
    assert refused.value.code == "FAKE_REFUSED" and not isinstance(
        refused.value, FiscalTemporaryError
    )
    with pytest.raises(FiscalTemporaryError):
        provider.request_invoice(invoice_request("CMD-1-DOWN"))


# --- Client e-MCF (transport simulé) -------------------------------------------------------------------------------


def test_emecef_requires_its_environment(settings):
    settings.EMECEF_API_URL = settings.EMECEF_TOKEN = settings.EMECEF_IFU = ""
    with pytest.raises(ImproperlyConfigured):
        EmecefProvider()


def test_emecef_status_and_tax_groups(emecef):
    payload = {
        "status": True,
        "ifu": "0000000000001",
        "nim": "NIM1",
        "version": "1.0",
        "tokenValid": "true",
        "pendingRequestsList": [{"uid": "u-1", "date": "x"}, {"date": "sans uid"}, "bruit"],
    }
    with mock.patch("requests.request", return_value=response(payload)) as request:
        status = emecef.status()
    assert request.call_args.args == ("GET", "https://dgi.test/sygmef-emcf/api/info/status")
    assert request.call_args.kwargs["headers"] == {"Authorization": "Bearer jeton-de-test"}
    assert (status.token_valid, status.ifu, status.nim, status.pending) == (
        True,
        "0000000000001",
        "NIM1",
        ["u-1"],
    )
    with mock.patch("requests.request", return_value=response({"tokenValid": "false"})):
        assert emecef.status().token_valid is False
    groups = {"a": 0, "b": 18, "c": 0, "d": 0, "e": 3, "f": 0, "aibA": 1, "aibB": 5}
    with mock.patch("requests.request", return_value=response(groups)):
        assert emecef.tax_groups() == TaxGroups(
            rates={"A": 0, "B": 18, "C": 0, "D": 0, "E": 3, "F": 0}, aib_a=1, aib_b=5
        )
    with (
        mock.patch("requests.request", return_value=response({"a": 0})),
        pytest.raises(FiscalTemporaryError),
    ):
        emecef.tax_groups()


def test_emecef_requests_then_confirms_an_invoice(emecef):
    created = {"uid": "u-1", "total": 23100, "aib": 1100, "ta": 0, "errorCode": None}
    with mock.patch("requests.request", return_value=response(created)) as request:
        totals = emecef.request_invoice(invoice_request(aib="B"))
    assert (totals.uid, totals.total, totals.aib) == ("u-1", 23100, 1100)
    assert request.call_args.args == ("POST", "https://dgi.test/sygmef-emcf/api/invoice")
    body = request.call_args.kwargs["json"]
    assert body["ifu"] == "0000000000001" and body["type"] == "FV" and body["reference"] == "CMD-1"
    assert body["aib"] == "B" and body["operator"] == {"id": "steamy", "name": "Steamy"}
    assert body["items"][0] == {
        "code": "C1",
        "name": "Parcours robotique",
        "price": 10000,
        "quantity": 2.0,
        "taxGroup": "B",
    }
    assert body["items"][1]["taxSpecific"] == 0
    assert body["client"] == {"name": "Marie Houngbo", "contact": "+2290197000001"}
    assert body["payment"] == [{"name": "MOBILEMONEY", "amount": 22000}]

    security = {
        "dateTime": "23/10/2026 15:00:00",
        "qrCode": "F;NIM1;u-1",
        "codeMECeFDGI": "AAAA-BBBB",
        "counters": "5/5 FV",
        "nim": "NIM1",
    }
    with mock.patch("requests.request", return_value=response(security)) as request:
        elements = emecef.confirm("u-1")
    assert request.call_args.args == ("PUT", "https://dgi.test/sygmef-emcf/api/invoice/u-1/confirm")
    assert (elements.code, elements.qr_code, elements.counters, elements.nim) == (
        "AAAA-BBBB",
        "F;NIM1;u-1",
        "5/5 FV",
        "NIM1",
    )
    with mock.patch("requests.request", return_value=response(security)) as request:
        emecef.cancel("u-1")
    assert request.call_args.args[1].endswith("/api/invoice/u-1/cancel")


def test_emecef_omits_the_optional_request_fields(emecef):
    plain = InvoiceRequest(
        type="FV",
        reference="CMD-2",
        items=[FiscalItem("C1", "Parcours", 100, Decimal(1), "A")],
        client=FiscalClient(name="Awa", ifu="123"),
        payments=[],
    )
    with mock.patch(
        "requests.request", return_value=response({"uid": "u", "total": 100})
    ) as request:
        emecef.request_invoice(plain)
    body = request.call_args.kwargs["json"]
    assert (
        "aib" not in body
        and "taxSpecific" not in body["items"][0]
        and body["client"] == {"name": "Awa", "ifu": "123"}
    )


@pytest.mark.parametrize(
    ("error", "kind", "code"),
    [
        (requests.ConnectionError("boom"), FiscalTemporaryError, ""),
        (response({}, status=503), FiscalTemporaryError, ""),
        (response({}, status=429), FiscalTemporaryError, ""),
        (response({}, status=401), FiscalError, "TOKEN_REFUSED"),
        (response({}, status=403), FiscalError, "TOKEN_REFUSED"),
        (response({}, status=400), FiscalError, "HTTP_ERROR"),
        (response({"errorCode": "E12", "errorDesc": "IFU inconnu"}), FiscalError, "E12"),
        (response({"errorCode": "E13"}), FiscalError, "E13"),
        (response(["pas un objet"]), FiscalTemporaryError, ""),
        (response({"uid": "u"}), FiscalTemporaryError, ""),
    ],
)
def test_emecef_failures_are_classified(emecef, error, kind, code):
    effect = {"side_effect": error} if isinstance(error, Exception) else {"return_value": error}
    with mock.patch("requests.request", **effect), pytest.raises(FiscalError) as raised:
        emecef.request_invoice(invoice_request())
    assert type(raised.value) is kind and raised.value.code == code


def test_emecef_unreadable_json_and_missing_security_elements(emecef):
    broken = response({})
    broken.json.side_effect = ValueError
    with mock.patch("requests.request", return_value=broken), pytest.raises(FiscalTemporaryError):
        emecef.status()
    with (
        mock.patch("requests.request", return_value=response({"dateTime": "x"})),
        pytest.raises(FiscalTemporaryError),
    ):
        emecef.confirm("u-1")


# --- Garde-fou ----------------------------------------------------------------------------------------------------


def configure(**fields):
    config = PlatformSettings.load()
    for name, value in fields.items():
        setattr(config, name, value)
    return config


def test_aib_letter_follows_the_dgi_rates():
    groups = FakeFiscalProvider().tax_groups()
    assert aib_letter(configure(), groups) is None
    assert aib_letter(configure(aib_enabled=True, aib_rate=Decimal("1")), groups) == "A"
    assert aib_letter(configure(aib_enabled=True, aib_rate=Decimal("5.00")), groups) == "B"
    assert aib_letter(configure(aib_enabled=True, aib_rate=Decimal("3")), groups) is None


def test_activation_is_possible_when_rates_match_the_dgi():
    config = configure(
        emecef_enabled=True,
        emecef_taxed_group="B",
        emecef_exempt_group="A",
        vat_enabled=True,
        vat_rate=Decimal("18"),
        aib_enabled=True,
        aib_rate=Decimal("5"),
    )
    assert activation_errors(config) == {}
    assert activation_errors(configure(emecef_enabled=True, emecef_exempt_group="A")) == {}


def test_activation_is_refused_when_rates_diverge():
    errors = activation_errors(
        configure(
            emecef_enabled=True,
            emecef_taxed_group="B",
            emecef_exempt_group="B",
            vat_enabled=True,
            vat_rate=Decimal("10"),
            aib_enabled=True,
            aib_rate=Decimal("3"),
        )
    )
    assert set(errors) == {"emecef_taxed_group", "emecef_exempt_group", "aib_rate"}
    assert "18 %" in errors["emecef_taxed_group"] and "exonéré" in errors["emecef_exempt_group"]


def test_activation_is_refused_without_environment_or_with_a_bad_token(settings):
    config = configure(emecef_enabled=True, emecef_exempt_group="A")
    settings.FISCAL_PROVIDER = "emecef"
    assert "EMECEF_TOKEN" in activation_errors(config)["emecef_enabled"]
    settings.FISCAL_PROVIDER = "fake"

    class Invalid(FakeFiscalProvider):
        def status(self):
            return super().status().__class__(token_valid=False)

    assert "jeton" in activation_errors(config, Invalid())["emecef_enabled"]

    class Down(FakeFiscalProvider):
        def tax_groups(self):
            raise FiscalTemporaryError("hors service")

    assert "hors service" in activation_errors(config, Down())["emecef_enabled"]


# --- Réglages -----------------------------------------------------------------------------------------------------


def test_emecef_is_off_by_default_and_needs_its_groups():
    config = PlatformSettings.load()
    assert (config.emecef_enabled, config.emecef_taxed_group, config.emecef_exempt_group) == (
        False,
        "",
        "",
    )
    config.emecef_enabled = True
    with pytest.raises(ValidationError) as error:
        config.full_clean()
    assert set(error.value.message_dict) == {"emecef_taxed_group", "emecef_exempt_group"}


def settings_form(**overrides):
    data = {
        "otp_length": 6,
        "otp_validity_seconds": 300,
        "otp_max_attempts": 3,
        "otp_resend_delay_seconds": 60,
        "otp_daily_limit_per_phone": 5,
        "otp_daily_limit_per_ip": 20,
        "summative_retry_cooldown_seconds": 600,
        "dropout_threshold_days": 7,
        "vat_rate": "18",
        "aib_rate": "0",
        "points_scale": '{"mission": 10}',
        "rank_thresholds": '[{"rank": "Explorateur", "points": 0}]',
    }
    return {**data, **overrides}


def test_admin_activates_emecef_only_when_the_dgi_rates_match(client):
    verified_client(client, SUPER_ADMIN)
    PlatformSettings.load()
    form = settings_form(
        emecef_enabled="on",
        emecef_taxed_group="B",
        emecef_exempt_group="A",
        vat_enabled="on",
        vat_applies_to_shipping="on",
        aib_applies_to_shipping="on",
    )
    refused = client.post(f"{SETTINGS_URL}1/change/", {**form, "vat_rate": "10"})
    assert refused.status_code == 200
    assert "emecef_taxed_group" in refused.context["adminform"].form.errors
    assert PlatformSettings.load().emecef_enabled is False

    accepted = client.post(f"{SETTINGS_URL}1/change/", form)
    assert accepted.status_code == 302
    config = PlatformSettings.load()
    assert (config.emecef_enabled, config.emecef_taxed_group, config.emecef_exempt_group) == (
        True,
        "B",
        "A",
    )

    # e-MECeF activé : un réglage sans rapport se change sans interroger la DGI
    with mock.patch("apps.payments.fiscal.guard.get_fiscal_provider", side_effect=AssertionError):
        again = client.post(f"{SETTINGS_URL}1/change/", {**form, "dropout_threshold_days": 9})
    assert again.status_code == 302 and PlatformSettings.load().dropout_threshold_days == 9


# --- Vérification manuelle (`emecef_check`, lecture seule) -------------------------------------------------------


def test_emecef_reads_the_invoice_and_payment_types(emecef):
    types = [{"type": "FV", "description": "Facture de vente"}, {"type": "FA"}, "bruit"]
    with mock.patch("requests.request", return_value=response(types)) as request:
        assert emecef.invoice_types() == [("FV", "Facture de vente"), ("FA", "")]
    assert request.call_args.args[:2] == (
        "GET",
        "https://dgi.test/sygmef-emcf/api/info/invoiceTypes",
    )
    with mock.patch(
        "requests.request", return_value=response([{"type": "MOBILEMONEY", "description": "MM"}])
    ):
        assert emecef.payment_types() == [("MOBILEMONEY", "MM")]
    with (
        mock.patch("requests.request", return_value=response({"a": 1})),
        pytest.raises(FiscalTemporaryError),
    ):
        emecef.payment_types()


def test_the_fake_provider_lists_its_types():
    provider = FakeFiscalProvider()
    assert [code for code, _ in provider.invoice_types()] == ["FV", "FA", "EV", "EA"]
    assert "MOBILEMONEY" in [code for code, _ in provider.payment_types()]


def test_emecef_check_prints_the_read_only_report_without_the_token(emecef, settings):
    from io import StringIO

    from django.core.management import call_command

    settings.FISCAL_PROVIDER = "emecef"
    status = {"tokenValid": "true", "ifu": "0000000000001", "nim": "NIM1", "version": "1.0"}
    groups = {"a": 0, "b": 18, "c": 0, "d": 0, "e": 0, "f": 0, "aibA": 1, "aibB": 5}
    replies = [
        response(status),
        response(groups),
        response([{"type": "FV", "description": "Facture de vente"}]),
        response([{"type": "ESPECES", "description": "Espèces"}]),
    ]
    out = StringIO()
    with mock.patch("requests.request", side_effect=replies) as request:
        call_command("emecef_check", stdout=out)
    assert [call.args[0] for call in request.call_args_list] == ["GET"] * 4
    report = out.getvalue()
    assert "jeton valide : oui" in report and "•••••••••0001" in report and "B : 18" in report
    assert (
        "AIB A : 1 · AIB B : 5" in report
        and "FV : Facture de vente" in report
        and "ESPECES" in report
    )
    assert "jeton-de-test" not in report and "0000000000001" not in report


def test_emecef_check_fails_on_an_invalid_token_or_an_api_error(emecef, settings):
    from io import StringIO

    from django.core.management import call_command
    from django.core.management.base import CommandError

    settings.FISCAL_PROVIDER = "fake"
    out = StringIO()
    call_command("emecef_check", stdout=out)  # faux fournisseur : rapport sans réseau
    assert "FISCAL_PROVIDER=fake" in out.getvalue()

    settings.FISCAL_PROVIDER = "emecef"
    with (
        mock.patch("requests.request", side_effect=requests.ConnectionError),
        pytest.raises(CommandError, match="injoignable"),
    ):
        call_command("emecef_check", stdout=StringIO())
    invalid = [
        response({"tokenValid": "false"}),
        response({"a": 0, "b": 18, "c": 0, "d": 0, "e": 0, "f": 0, "aibA": 1, "aibB": 5}),
        response([]),
        response([]),
    ]
    with (
        mock.patch("requests.request", side_effect=invalid),
        pytest.raises(CommandError, match="pas valide"),
    ):
        call_command("emecef_check", stdout=StringIO())
