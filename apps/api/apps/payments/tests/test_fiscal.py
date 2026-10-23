"""
Facture normalisée e-MECeF (ADR 0006, C26) : interface, faux fournisseur, client e-MCF (transport simulé : aucun appel
réseau réel), garde-fou des taux et activation depuis l'admin.
"""

from datetime import timedelta
from decimal import Decimal
from unittest import mock

import pytest
import requests
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.utils import timezone

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
    SecurityElements,
    TaxGroups,
    get_fiscal_provider,
)
from apps.payments.fiscal.base import FiscalInvoiceProvider, FiscalStatus
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


TEST_URL = "https://developper.impots.bj/sygmef-emcf/api"


@pytest.fixture
def emecef(settings):
    settings.EMECEF_ENVIRONMENT = "test"
    settings.EMECEF_TOKEN = "jeton-de-test"
    settings.EMECEF_IFU = "9999900000001"
    return EmecefProvider()


def invoice_request(client_name="Marie Houngbo", aib=None, **fields):
    """L'exemple de la documentation de la DGI : 2 × 1 800 (groupe B) et 3 × 450 (groupe A), 4 950 au total."""
    return InvoiceRequest(
        type="FV",
        items=[
            FiscalItem("", "Jus d'orange", 1800, Decimal(2), "B"),
            FiscalItem("", "Lait 1/1 EX", 450, Decimal(3), "A"),
        ],
        client=FiscalClient(name=client_name, contact="+2290197000001"),
        payments=[FiscalPayment("MOBILEMONEY", 4950)],
        aib=aib,
        operator_name="Steamy",
        **fields,
    )


#: Réponses exactes de la documentation de la DGI (« Spécification de l'API pour l'e-MCF v1.0 »)
DGI_INVOICE = {
    "uid": "ac33f8fe-9735-4ed6-a9c3-df58a908ccd3",
    "ta": 0,
    "tb": 18,
    "tc": 0,
    "td": 18,
    "taa": 1350,
    "tab": 3600,
    "tac": 0,
    "tad": 0,
    "tae": 0,
    "taf": 0,
    "hab": 3051,
    "had": 0,
    "vab": 549,
    "vad": 0,
    "total": 4950,
    "aib": 0,
    "ts": 0,
}
DGI_SECURITY = {
    "dateTime": "23/11/2020 13:17:08",
    "qrCode": "F;IN01000005;X537E4DBAJUUHHXNFWISFEKJ;9999900000001;20201123131708",
    "codeMECeFDGI": "X537-E4DB-AJUU-HHXN-FWIS-FEKJ",
    "counters": "64/64 FV",
    "nim": "IN01000005",
}
DGI_INFO_STATUS = {
    "status": True,
    "version": "1.0",
    "ifu": "9999900000001",
    "nim": "XX01000070",
    "tokenValid": "2999-01-31T00:00:00+01:00",
    "serverDateTime": "2021-01-05T21:26:18.9775221+01:00",
    "emcfList": [
        {"nim": "XX01000070", "status": "Actif", "shopName": "TEST #70", "address2": None},
        {"nim": "XX01000071", "status": "Désactivé", "shopName": "TEST #70"},
    ],
}
DGI_TAX_GROUPS = {"a": 0, "b": 18, "c": 0, "d": 18, "e": 0, "f": 0, "aibA": 1, "aibB": 5}
DGI_PENDING = {
    "status": True,
    "version": "1.0",
    "ifu": "99999000000001",
    "tokenValid": "2020-11-28T00:00:00+01:00",
    "serverDateTime": "2020-11-21T17:25:14.7179651+01:00",
    "pendingRequestsCount": 2,
    "pendingRequestsList": [
        {"date": "2020-11-20T21:45:56.523+01:00", "uid": "437261A6-41BD-4D7B-B61B-E60C2D8089AA"},
        {"date": "2020-11-20T21:46:49.207+01:00", "uid": "313AE8C2-1EAC-4DE9-AF40-7A0240599114"},
        {"date": "sans date", "uid": "C562ADCF-BCF5-4592-A95F-5A5617C66FD8"},
        {"date": "2020-11-20T21:48:17.78+01:00"},
    ],
}


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
        provider.pending_requests,
        provider.tax_groups,
        provider.invoice_types,
        provider.payment_types,
        lambda: provider.request_invoice(invoice_request()),
        lambda: provider.confirm("x"),
        lambda: provider.cancel("x"),
    ):
        with pytest.raises(NotImplementedError):
            call()


def test_status_and_security_elements_helpers():
    now = timezone.now()
    assert FiscalStatus(token_valid_until=now + timedelta(days=1)).token_valid
    assert not FiscalStatus(token_valid_until=now - timedelta(days=1)).token_valid
    assert not FiscalStatus(token_valid_until=None).token_valid
    later = FiscalStatus(
        token_valid_until=now + timedelta(days=1), server_time=now + timedelta(days=2)
    )
    assert not later.token_valid and not later.active
    assert FiscalStatus(token_valid_until=None, emcf_status="Actif").active
    elements = SecurityElements("d", "qr", "X537-E4DB-AJUU-HHXN-FWIS-FEKJ", "1/1 FV", "NIM")
    assert elements.reference == "X537E4DBAJUUHHXNFWISFEKJ" and len(elements.reference) == 24


# --- Faux fournisseur ----------------------------------------------------------------------------------------------


def test_fake_computes_like_the_dgi_example_and_confirms_with_security_elements():
    provider = FakeFiscalProvider()
    status = provider.status()
    assert status.token_valid and status.active and provider.pending_requests() == []
    assert provider.tax_groups().rates["B"] == 18
    totals = provider.request_invoice(invoice_request())
    # Exemple de la DGI : le prix TTC du groupe B contient la TVA extraite (3 600 → 3 051 HT + 549)
    assert (totals.total, totals.aib) == (4950, 0)
    assert totals.group_totals["A"] == 1350 and totals.group_totals["B"] == 3600
    assert (totals.excl_tax["B"], totals.vat["B"], totals.vat["D"]) == (3051, 549, 0)
    elements = provider.confirm(totals.uid)
    assert (
        len(elements.code) == 29
        and len(elements.reference) == 24
        and elements.qr_code.startswith("F;")
    )
    assert elements.nim and elements.counters == "1/1 FV"
    with pytest.raises(FiscalError) as again:
        provider.confirm(totals.uid)
    assert again.value.code == "20"


def test_fake_aib_is_computed_on_the_excl_tax_base():
    totals = FakeFiscalProvider().request_invoice(invoice_request(aib="B"))
    assert totals.aib == round((1350 + 3051) * 5 / 100) and totals.total == 4950


def test_fake_cancel_returns_no_code_and_unknown_uid_is_refused():
    provider = FakeFiscalProvider()
    cancelled = provider.cancel(provider.request_invoice(invoice_request()).uid)
    assert cancelled.code == "" and cancelled.qr_code == "" and cancelled.date_time
    with pytest.raises(FiscalError) as error:
        provider.cancel("inconnu")
    assert error.value.code == "20"


def test_fake_is_driven_by_the_client_name():
    provider = FakeFiscalProvider()
    with pytest.raises(FiscalError) as refused:
        provider.request_invoice(invoice_request("Marie [REFUSED]"))
    assert refused.value.code == "99" and not isinstance(refused.value, FiscalTemporaryError)
    with pytest.raises(FiscalTemporaryError):
        provider.request_invoice(invoice_request("Marie [DOWN]"))
    assert [code for code, _ in provider.invoice_types()] == ["FV", "FA", "EV", "EA"]
    assert "MOBILEMONEY" in [code for code, _ in provider.payment_types()]


# --- Client e-MCF (transport simulé, réponses de la documentation de la DGI) ---------------------------------------


def test_emecef_requires_a_known_environment_and_its_secrets(settings):
    settings.EMECEF_TOKEN, settings.EMECEF_IFU = "", ""
    with pytest.raises(ImproperlyConfigured, match="obligatoires"):
        EmecefProvider()
    settings.EMECEF_TOKEN, settings.EMECEF_IFU = "jeton", "9999900000001"
    settings.EMECEF_ENVIRONMENT = "recette"
    with pytest.raises(ImproperlyConfigured, match="inconnu"):
        EmecefProvider()


def test_the_production_server_is_reserved_to_the_production_environment(settings):
    settings.EMECEF_TOKEN, settings.EMECEF_IFU = "jeton", "9999900000001"
    settings.EMECEF_ENVIRONMENT = "production"
    settings.ENV = "staging"
    with pytest.raises(ImproperlyConfigured, match="production"):
        EmecefProvider()
    settings.ENV = settings.PRODUCTION
    assert EmecefProvider().api_url == "https://sygmef.impots.bj/emcf/api"


def test_emecef_status_reads_the_token_validity_date_and_the_emcf_status(emecef):
    with mock.patch("requests.request", return_value=response(DGI_INFO_STATUS)) as request:
        status = emecef.status()
    assert request.call_args.args == ("GET", f"{TEST_URL}/info/status")
    assert request.call_args.kwargs["headers"]["Authorization"] == "Bearer jeton-de-test"
    assert (status.ifu, status.nim, status.version, status.emcf_status) == (
        "9999900000001",
        "XX01000070",
        "1.0",
        "Actif",
    )
    assert status.token_valid_until.year == 2999 and status.token_valid and status.active
    expired = {
        **DGI_INFO_STATUS,
        "tokenValid": "2020-11-28T00:00:00+01:00",
        "emcfList": [],
        "nim": "autre",
    }
    with mock.patch("requests.request", return_value=response(expired)):
        status = emecef.status()
    assert not status.token_valid and not status.active
    with mock.patch("requests.request", return_value=response({"tokenValid": "n'importe quoi"})):
        assert emecef.status().token_valid_until is None


def test_emecef_pending_requests_come_from_the_invoice_api(emecef):
    with mock.patch("requests.request", return_value=response(DGI_PENDING)) as request:
        pending = emecef.pending_requests()
    assert request.call_args.args == ("GET", f"{TEST_URL}/invoice")
    assert [item.uid for item in pending] == [
        "437261A6-41BD-4D7B-B61B-E60C2D8089AA",
        "313AE8C2-1EAC-4DE9-AF40-7A0240599114",
        "C562ADCF-BCF5-4592-A95F-5A5617C66FD8",
    ]
    assert pending[0].date.year == 2020 and pending[2].date is None


def test_emecef_reads_the_tax_groups_and_the_types(emecef):
    with mock.patch("requests.request", return_value=response(DGI_TAX_GROUPS)) as request:
        groups = emecef.tax_groups()
    assert request.call_args.args[1] == f"{TEST_URL}/info/taxGroups"
    assert groups == TaxGroups(
        rates={"A": 0, "B": 18, "C": 0, "D": 18, "E": 0, "F": 0}, aib_a=1, aib_b=5
    )
    with (
        mock.patch("requests.request", return_value=response({"a": 0})),
        pytest.raises(FiscalTemporaryError),
    ):
        emecef.tax_groups()
    types = [{"type": "FV", "description": "Facture de vente"}, {"type": "FA"}, "bruit"]
    with mock.patch("requests.request", return_value=response(types)) as request:
        assert emecef.invoice_types() == [("FV", "Facture de vente"), ("FA", "")]
    assert request.call_args.args[1] == f"{TEST_URL}/info/invoiceTypes"
    with mock.patch(
        "requests.request",
        return_value=response([{"type": "MOBILEMONEY", "description": "MOBILE MONEY"}]),
    ):
        assert emecef.payment_types() == [("MOBILEMONEY", "MOBILE MONEY")]
    with (
        mock.patch("requests.request", return_value=response({"a": 1})),
        pytest.raises(FiscalTemporaryError),
    ):
        emecef.payment_types()


def test_emecef_requests_an_invoice_with_the_dgi_example(emecef):
    with mock.patch("requests.request", return_value=response(DGI_INVOICE)) as request:
        totals = emecef.request_invoice(invoice_request(aib="A"))
    assert request.call_args.args == ("POST", f"{TEST_URL}/invoice")
    body = request.call_args.kwargs["json"]
    assert body == {
        "ifu": "9999900000001",
        "type": "FV",
        "items": [
            {"name": "Jus d'orange", "price": 1800, "quantity": 2.0, "taxGroup": "B"},
            {"name": "Lait 1/1 EX", "price": 450, "quantity": 3.0, "taxGroup": "A"},
        ],
        "operator": {"id": "", "name": "Steamy"},
        "payment": [{"name": "MOBILEMONEY", "amount": 4950}],
        "client": {"name": "Marie Houngbo", "contact": "+2290197000001"},
        "aib": "A",
    }
    assert "reference" not in body
    assert totals.uid == DGI_INVOICE["uid"] and totals.total == 4950 and totals.aib == 0
    assert totals.group_totals == {"A": 1350, "B": 3600, "C": 0, "D": 0, "E": 0, "F": 0}
    assert totals.excl_tax == {"B": 3051, "D": 0} and totals.vat == {"B": 549, "D": 0}


def test_emecef_omits_the_optional_request_fields(emecef):
    plain = InvoiceRequest(
        type="FV",
        items=[FiscalItem("92891", "Lait", 1200, Decimal("12.250"), "A", tax_specific=230)],
        client=FiscalClient(name=""),
        payments=[],
    )
    with mock.patch("requests.request", return_value=response(DGI_INVOICE)) as request:
        emecef.request_invoice(plain)
    body = request.call_args.kwargs["json"]
    assert "aib" not in body and "client" not in body and "reference" not in body
    assert body["items"][0] == {
        "name": "Lait",
        "price": 1200,
        "quantity": 12.25,
        "taxGroup": "A",
        "code": "92891",
        "taxSpecific": 230,
    }


def test_a_credit_note_carries_the_24_character_reference_of_the_original_invoice(emecef):
    original = SecurityElements(
        "d", "qr", "X537-E4DB-AJUU-HHXN-FWIS-FEKJ", "64/64 FV", "IN01000005"
    )
    credit = InvoiceRequest(
        type="FA",
        items=[FiscalItem("", "Jus d'orange", 1800, Decimal(1), "B")],
        client=FiscalClient(name="Marie"),
        payments=[FiscalPayment("MOBILEMONEY", 1800)],
        reference=original.reference,
    )
    with mock.patch("requests.request", return_value=response(DGI_INVOICE)) as request:
        emecef.request_invoice(credit)
    assert request.call_args.kwargs["json"]["reference"] == "X537E4DBAJUUHHXNFWISFEKJ"
    for bad, code in (("", "5"), ("X537-E4DB", "5"), ("X537-E4DB-AJUU-HHXN-FWIS-FEKJ", "5")):
        with mock.patch("requests.request") as request, pytest.raises(FiscalError) as error:
            emecef.request_invoice(InvoiceRequest(**{**credit.__dict__, "reference": bad}))
        assert error.value.code == code and not request.called
    with mock.patch("requests.request") as request, pytest.raises(FiscalError) as error:
        emecef.request_invoice(InvoiceRequest(**{**credit.__dict__, "type": "FV"}))
    assert error.value.code == "4" and not request.called


def test_emecef_confirms_and_cancels_with_put(emecef):
    uid = DGI_INVOICE["uid"]
    with mock.patch("requests.request", return_value=response(DGI_SECURITY)) as request:
        elements = emecef.confirm(uid)
    assert request.call_args.args == ("PUT", f"{TEST_URL}/invoice/{uid}/confirm")
    assert (elements.code, elements.counters, elements.nim) == (
        "X537-E4DB-AJUU-HHXN-FWIS-FEKJ",
        "64/64 FV",
        "IN01000005",
    )
    assert (
        elements.date_time == "23/11/2020 13:17:08"
        and elements.reference == "X537E4DBAJUUHHXNFWISFEKJ"
    )
    cancelled = {
        "dateTime": "23/11/2020 13:17:09",
        "qrCode": "",
        "codeMECeFDGI": "",
        "counters": "64/65 FV",
        "nim": "IN01000005",
    }
    with mock.patch("requests.request", return_value=response(cancelled)) as request:
        result = emecef.cancel(uid)
    assert request.call_args.args == ("PUT", f"{TEST_URL}/invoice/{uid}/cancel")
    assert result.code == "" and result.qr_code == "" and result.counters == "64/65 FV"
    with (
        mock.patch("requests.request", return_value=response({"dateTime": "x"})),
        pytest.raises(FiscalTemporaryError),
    ):
        emecef.confirm(uid)


@pytest.mark.parametrize(
    ("error", "kind", "code"),
    [
        (requests.ConnectionError("boom"), FiscalTemporaryError, ""),
        (response({}, status=503), FiscalTemporaryError, ""),
        (response({}, status=429), FiscalTemporaryError, ""),
        (response({}, status=401), FiscalError, "TOKEN_REFUSED"),
        (response({}, status=400), FiscalError, "HTTP_ERROR"),
        (
            response(
                {
                    "errorCode": "1",
                    "errorDesc": "Le nombre maximum de factures en attente est dépassé",
                }
            ),
            FiscalTemporaryError,
            "1",
        ),
        (
            response({"errorCode": "10", "errorDesc": "Réessayez plus tard"}),
            FiscalTemporaryError,
            "10",
        ),
        (
            response({"errorCode": "12", "errorDesc": "Montant supérieur à la facture d'origine"}),
            FiscalError,
            "12",
        ),
        (response({"errorCode": "99"}), FiscalError, "99"),
        (response(["pas un objet"]), FiscalTemporaryError, ""),
        (response({"uid": "u"}), FiscalTemporaryError, ""),
    ],
)
def test_emecef_failures_are_classified_by_the_annex_of_the_dgi(emecef, error, kind, code):
    effect = {"side_effect": error} if isinstance(error, Exception) else {"return_value": error}
    with mock.patch("requests.request", **effect), pytest.raises(FiscalError) as raised:
        emecef.request_invoice(invoice_request())
    assert type(raised.value) is kind and raised.value.code == code


def test_emecef_unreadable_json_is_a_temporary_failure(emecef):
    broken = response({})
    broken.json.side_effect = ValueError
    with mock.patch("requests.request", return_value=broken), pytest.raises(FiscalTemporaryError):
        emecef.status()


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


def test_activation_is_possible_when_rates_match_the_dgi(settings):
    settings.EMECEF_AIB_IN_TOTAL = False
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


def test_activation_is_refused_when_rates_diverge(settings):
    settings.EMECEF_AIB_IN_TOTAL = True
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


def test_activation_with_the_aib_waits_for_the_probe_to_say_if_total_includes_it(settings):
    settings.EMECEF_AIB_IN_TOTAL = None
    config = configure(
        emecef_enabled=True, emecef_exempt_group="A", aib_enabled=True, aib_rate=Decimal("5")
    )
    assert set(activation_errors(config)) == {"aib_enabled"}
    settings.EMECEF_AIB_IN_TOTAL = False
    assert activation_errors(config) == {}


def test_activation_is_refused_without_environment_with_a_bad_token_or_an_inactive_emcf(settings):
    config = configure(emecef_enabled=True, emecef_exempt_group="A")
    settings.FISCAL_PROVIDER = "emecef"
    settings.EMECEF_TOKEN = ""
    assert "EMECEF_TOKEN" in activation_errors(config)["emecef_enabled"]
    settings.FISCAL_PROVIDER = "fake"

    class Expired(FakeFiscalProvider):
        def status(self):
            return FiscalStatus(
                token_valid_until=timezone.now() - timedelta(days=1), emcf_status="Actif"
            )

    assert "expiré" in activation_errors(config, Expired())["emecef_enabled"]

    class Inactive(FakeFiscalProvider):
        def status(self):
            return FiscalStatus(
                token_valid_until=timezone.now() + timedelta(days=9), emcf_status="Désactivé"
            )

    assert "Désactivé" in activation_errors(config, Inactive())["emecef_enabled"]

    class Unknown(FakeFiscalProvider):
        def status(self):
            return FiscalStatus(token_valid_until=timezone.now() + timedelta(days=9))

    assert "inconnu" in activation_errors(config, Unknown())["emecef_enabled"]

    class Down(FakeFiscalProvider):
        def tax_groups(self):
            raise FiscalTemporaryError("hors service")

    assert "hors service" in activation_errors(config, Down())["emecef_enabled"]


# --- Réglages -----------------------------------------------------------------------------------------------------


def test_emecef_is_off_by_default_and_needs_its_groups():
    config = PlatformSettings.load()
    # Libellés officiels de la DGI : B taxable, E régime TPS (Steamy sans TVA), C exportation
    assert (
        config.emecef_enabled,
        config.emecef_taxed_group,
        config.emecef_exempt_group,
        config.emecef_export_group,
    ) == (False, "B", "E", "C")
    config.full_clean()
    config.emecef_enabled = True
    config.emecef_taxed_group = config.emecef_exempt_group = ""
    with pytest.raises(ValidationError) as error:
        config.full_clean()
    assert set(error.value.message_dict) == {"emecef_taxed_group", "emecef_exempt_group"}


@pytest.mark.parametrize("rate", ["3", "0.5", "10"])
def test_with_emecef_the_aib_is_one_or_five_percent(rate):
    config = configure(
        emecef_enabled=True,
        emecef_taxed_group="B",
        emecef_exempt_group="A",
        aib_enabled=True,
        aib_rate=Decimal(rate),
    )
    with pytest.raises(ValidationError) as error:
        config.full_clean()
    assert (
        set(error.value.message_dict) == {"aib_rate"}
        and "1 %" in error.value.message_dict["aib_rate"][0]
    )
    config.aib_rate = Decimal("5")
    config.full_clean()


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
        emecef_export_group="C",
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


def test_emecef_check_prints_the_read_only_report_without_the_token(emecef, settings):
    from io import StringIO

    from django.core.management import call_command

    settings.FISCAL_PROVIDER = "emecef"
    replies = [
        response(DGI_INFO_STATUS),
        response(DGI_PENDING),
        response(DGI_TAX_GROUPS),
        response([{"type": "FV", "description": "Facture de vente"}]),
        response([{"type": "ESPECES", "description": "ESPECES"}]),
    ]
    out = StringIO()
    with mock.patch("requests.request", side_effect=replies) as request:
        call_command("emecef_check", stdout=out)
    assert [call.args[0] for call in request.call_args_list] == ["GET"] * 5
    report = out.getvalue()
    assert "Serveur : test" in report and "jeton valide : oui (jusqu'au 31/01/2999)" in report
    assert "•••••••••0001" in report and "e-MCF : Actif · demandes en attente : 3" in report
    assert (
        "D : 18" in report
        and "AIB A : 1 · AIB B : 5" in report
        and "FV : Facture de vente" in report
    )
    assert "jeton-de-test" not in report and "9999900000001" not in report


def test_emecef_check_with_the_fake_provider_and_failures(emecef, settings):
    from io import StringIO

    from django.core.management import call_command
    from django.core.management.base import CommandError

    settings.FISCAL_PROVIDER = "fake"
    out = StringIO()
    call_command("emecef_check", stdout=out)
    assert "FISCAL_PROVIDER=fake" in out.getvalue() and "Serveur : fake" in out.getvalue()

    settings.FISCAL_PROVIDER = "emecef"
    with (
        mock.patch("requests.request", side_effect=requests.ConnectionError),
        pytest.raises(CommandError, match="injoignable"),
    ):
        call_command("emecef_check", stdout=StringIO())

    def replies(status):
        return [
            response(status),
            response(DGI_PENDING),
            response(DGI_TAX_GROUPS),
            response([]),
            response([]),
        ]

    expired = {**DGI_INFO_STATUS, "tokenValid": "2020-11-28T00:00:00+01:00"}
    with (
        mock.patch("requests.request", side_effect=replies(expired)),
        pytest.raises(CommandError, match="expiré"),
    ):
        call_command("emecef_check", stdout=StringIO())
    inactive = {**DGI_INFO_STATUS, "emcfList": [{"nim": "XX01000070", "status": "Désactivé"}]}
    with (
        mock.patch("requests.request", side_effect=replies(inactive)),
        pytest.raises(CommandError, match="pas actif"),
    ):
        call_command("emecef_check", stdout=StringIO())


def test_the_migration_fills_empty_groups_and_keeps_the_staff_choice():
    from importlib import import_module

    from django.apps import apps as registry

    migration = import_module("apps.core.migrations.0009_groupes_dgi")
    config = PlatformSettings.load()
    config.emecef_taxed_group, config.emecef_exempt_group, config.emecef_export_group = "", "A", ""
    config.save()
    migration.fill_groups(registry, None)
    config.refresh_from_db()
    assert (config.emecef_taxed_group, config.emecef_exempt_group, config.emecef_export_group) == (
        "B",
        "A",
        "C",
    )
    migration.fill_groups(registry, None)  # idempotent : rien à remplir
