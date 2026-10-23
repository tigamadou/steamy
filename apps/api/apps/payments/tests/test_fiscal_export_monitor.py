"""
Facture EV (export), garde-fou IFU et surveillance quotidienne du jeton e-MECeF (ADR 0006) : faux fournisseur, aucun réseau.
"""

from datetime import timedelta
from unittest import mock

import pytest
from django.core import mail
from django.utils import timezone

from apps.core.groups import FINANCE
from apps.core.models import AuditLog
from apps.payments import tasks
from apps.payments.fiscal import FiscalTemporaryError
from apps.payments.fiscal.base import FiscalStatus as Status
from apps.payments.fiscal.fake import FakeFiscalProvider
from apps.payments.fiscal.guard import activation_errors
from apps.payments.fiscal.issuance import issue_fiscal
from apps.payments.fiscal.monitor import check_status
from apps.payments.invoices import fiscal_type_of, payer_country

from .factories import OrderFactory, PaymentFactory
from .test_fiscal_issuance import VAT, configure, taxed_order

pytestmark = pytest.mark.django_db


# --- Type de facture : FV ou EV -----------------------------------------------------------------------------------


def test_the_payer_country_comes_from_the_payment_then_the_phone():
    order = OrderFactory()
    payment = PaymentFactory(order=order, country="TG")
    assert payer_country(order, payment) == "TG" and fiscal_type_of(order, payment) == "EV"
    assert fiscal_type_of(order, PaymentFactory(order=order, country="BJ")) == "FV"
    bare = PaymentFactory(order=order, country="")
    order.payer.phone = "+2290197000077"
    from apps.payments.tests.factories import load_referentials

    load_referentials()
    assert payer_country(order, bare) == "BJ"
    order.payer = None
    order.guest_phone = "+22890000001"
    assert payer_country(order, bare) in ("TG", "")


def test_an_unknown_country_gives_fv_and_is_reported():
    order = OrderFactory(payer=None, beneficiary=None, kind="kit", guest_phone="", items=[])
    assert fiscal_type_of(order, PaymentFactory(order=order, country="")) == "FV"
    assert AuditLog.objects.filter(action="invoice.fiscal_country_unknown").exists()


def test_a_foreign_payer_gets_an_export_invoice_in_the_export_group(
    django_capture_on_commit_callbacks,
):
    config = configure(**VAT, emecef_export_group="C")
    order = taxed_order(config)
    payment = PaymentFactory(order=order, country="TG")
    from apps.payments.invoices import issue_invoice

    order.status = "paid"
    order.save()
    invoice = issue_invoice(order, payment)
    assert invoice.fiscal_type == "EV"
    assert issue_fiscal(invoice.pk) == "confirmed"
    invoice.refresh_from_db()
    assert (
        invoice.fiscal_status == "confirmed" and invoice.order.total == 17700
    )  # aucun montant modifié


def test_an_export_invoice_needs_its_group():
    config = configure(**VAT, emecef_export_group="")
    order = taxed_order(config)
    order.status = "paid"
    order.save()
    from apps.payments.invoices import issue_invoice

    invoice = issue_invoice(order, PaymentFactory(order=order, country="TG"))
    assert issue_fiscal(invoice.pk) == "failed"
    invoice.refresh_from_db()
    assert "EXPORT_GROUP" in invoice.fiscal_error


# --- Garde-fou ----------------------------------------------------------------------------------------------------


def test_the_token_ifu_must_match_ours_and_the_export_group_must_be_zero(settings):
    config = configure(emecef_export_group="B")
    assert "taux nul" in activation_errors(config)["emecef_export_group"]
    settings.FISCAL_PROVIDER = "emecef"
    settings.EMECEF_TOKEN, settings.EMECEF_IFU = "jeton", "9999900000001"

    class Provider(FakeFiscalProvider):
        def status(self):
            return Status(
                token_valid_until=timezone.now() + timedelta(days=30),
                ifu="9999900000002",
                emcf_status="Actif",
            )

    assert "ne correspond pas" in activation_errors(config, Provider())["emecef_enabled"]


# --- Surveillance --------------------------------------------------------------------------------------------------


def finance_user():
    from apps.accounts.tests.factories import StaffFactory

    user = StaffFactory(email="finance@steamy.test")
    from django.contrib.auth.models import Group

    user.groups.add(Group.objects.get_or_create(name=FINANCE)[0])
    return user


def test_the_daily_check_is_silent_when_everything_is_fine_or_disabled():
    configure(emecef_enabled=False)
    assert check_status() == []
    configure()
    assert check_status() == [] and not mail.outbox


def test_the_daily_check_alerts_finance_on_expiry_inactivity_and_downtime():
    finance_user()
    configure()
    soon = Status(token_valid_until=timezone.now() + timedelta(days=5), emcf_status="Actif")
    with mock.patch.object(FakeFiscalProvider, "status", return_value=soon):
        alerts = check_status()
    assert len(alerts) == 1 and "expire le" in alerts[0]
    assert mail.outbox[-1].to == ["finance@steamy.test"] and "[Steamy]" in mail.outbox[-1].subject

    expired = Status(token_valid_until=timezone.now() - timedelta(days=1), emcf_status="Actif")
    with mock.patch.object(FakeFiscalProvider, "status", return_value=expired):
        assert "expiré" in check_status()[0]
    inactive = Status(
        token_valid_until=timezone.now() + timedelta(days=90), emcf_status="Désactivé"
    )
    with mock.patch.object(FakeFiscalProvider, "status", return_value=inactive):
        assert "Désactivé" in check_status()[0]
    with mock.patch.object(
        FakeFiscalProvider, "status", side_effect=FiscalTemporaryError("hors service")
    ):
        assert "hors service" in check_status()[0]
    assert AuditLog.objects.filter(action="emecef.alert").count() == 4
    assert tasks.check_emecef_status() == 0


def test_alerts_without_a_finance_address_are_only_logged():
    configure()
    expired = Status(token_valid_until=timezone.now() - timedelta(days=1), emcf_status="Actif")
    with mock.patch.object(FakeFiscalProvider, "status", return_value=expired):
        assert check_status() and not mail.outbox


def test_the_refund_form_reminds_that_credit_notes_are_manual(client):
    from django.urls import reverse

    from apps.core.tests.staff import verified_client

    verified_client(client, FINANCE)
    page = client.get(reverse("admin:payments_refund_add")).content.decode()
    assert "avoir est à émettre" in page and "manuellement auprès de la DGI" in page
