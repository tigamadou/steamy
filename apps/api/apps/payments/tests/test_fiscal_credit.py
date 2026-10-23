"""
Avoirs normalisés manuels (ADR 0006), facture EV (export), garde-fou IFU et surveillance du jeton : faux fournisseur,
aucun réseau.
"""

from datetime import timedelta
from html import unescape
from unittest import mock

import pytest
from django.core import mail
from django.urls import reverse
from django.utils import timezone

from apps.core.groups import FINANCE, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import verified_client
from apps.payments import tasks
from apps.payments.fiscal import FiscalError, FiscalStatus, FiscalTemporaryError, InvoiceTotals
from apps.payments.fiscal.base import FiscalStatus as Status
from apps.payments.fiscal.credit import (
    CreditNoteRefused,
    build_credit_request,
    create_credit_note,
    creditable,
    issue_credit,
)
from apps.payments.fiscal.fake import FakeFiscalProvider
from apps.payments.fiscal.guard import activation_errors
from apps.payments.fiscal.issuance import FiscalDeferred, issue_fiscal
from apps.payments.fiscal.monitor import check_status
from apps.payments.invoices import fiscal_type_of, payer_country
from apps.payments.models import CreditNote, Invoice, Refund

from .factories import OrderFactory, PaymentFactory
from .test_fiscal_issuance import VAT, configure, paid_invoice, taxed_order

pytestmark = pytest.mark.django_db

_CAPTURE = {}


@pytest.fixture(autouse=True)
def _capture_on_commit(django_capture_on_commit_callbacks):
    _CAPTURE["run"] = django_capture_on_commit_callbacks


def make(*args, **kwargs):
    """Crée l'avoir et exécute la tâche d'émission, lancée à la validation de la transaction."""
    with _CAPTURE["run"](execute=True):
        return create_credit_note(*args, **kwargs)


@pytest.fixture
def confirmed(django_capture_on_commit_callbacks):
    """Facture normalisée confirmée de 17 700 FCFA (15 000 HT + TVA 18 %)."""
    invoice = paid_invoice(django_capture_on_commit_callbacks)
    assert invoice.fiscal_status == "confirmed" and invoice.fiscal_total == 17700
    return invoice


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
    assert {line["group"] for line in invoice.fiscal_lines} == {"C"}
    assert invoice.fiscal_total == 17700  # payé, TVA comprise : aucun montant modifié


def test_an_export_invoice_needs_its_group():
    config = configure(**VAT)
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
    assert FiscalStatus is Status


# --- Avoirs manuels -----------------------------------------------------------------------------------------------


def test_a_credit_note_references_the_original_code_and_keeps_the_groups(confirmed):
    credit = make(confirmed, 5000, "Geste commercial", user=None)
    credit.refresh_from_db()
    assert credit.number.startswith("AV-") and credit.fiscal_status == "confirmed"
    assert credit.fiscal["code"] and credit.invoice == confirmed
    request = build_credit_request(credit, configure(**VAT))
    assert request.type == "FA" and request.reference == confirmed.fiscal["code"].replace("-", "")
    assert len(request.reference) == 24 and [(i.price, i.tax_group) for i in request.items] == [
        (5000, "B")
    ]
    assert creditable(confirmed) == 12700
    assert AuditLog.objects.filter(action="credit_note.created").exists()
    assert AuditLog.objects.filter(action="credit_note.fiscal_confirmed").exists()


def test_the_credit_is_split_between_the_original_groups_and_export_gives_an_ea(confirmed):
    Invoice.objects.filter(pk=confirmed.pk).update(
        fiscal_lines=[
            {"name": "A", "price": 6000, "quantity": "1", "group": "B"},
            {"name": "B", "price": 2000, "quantity": "2", "group": "A"},
        ],
        fiscal_type="EV",
    )
    confirmed.refresh_from_db()
    credit = CreditNote(invoice=confirmed, amount=1000, number="AV-X")
    request = build_credit_request(credit, configure(**VAT))
    assert request.type == "EA" and sorted((i.tax_group, i.price) for i in request.items) == [
        ("A", 400),
        ("B", 600),
    ]


def test_the_credit_amount_cannot_exceed_what_is_left_and_failed_notes_do_not_count(confirmed):
    with pytest.raises(CreditNoteRefused, match="positif"):
        make(confirmed, 0, "", None)
    with pytest.raises(CreditNoteRefused, match="17700"):
        make(confirmed, 17701, "", None)
    make(confirmed, 17000, "", None)
    with pytest.raises(CreditNoteRefused, match="700"):
        make(confirmed, 701, "", None)
    CreditNote.objects.update(fiscal_status="failed")
    assert creditable(confirmed) == 17700
    unconfirmed = Invoice.objects.get(pk=confirmed.pk)
    Invoice.objects.filter(pk=confirmed.pk).update(fiscal_status="failed")
    with pytest.raises(CreditNoteRefused, match="confirmée"):
        make(unconfirmed, 100, "", None)


def test_a_credit_note_can_regularise_a_refund_of_the_same_order_only(confirmed):
    refund = Refund.objects.create(
        payment=PaymentFactory(order=confirmed.order), amount=3000, processed=True
    )
    credit = make(confirmed, 3000, "Remboursement", None, refund)
    assert credit.refund == refund
    with pytest.raises(CreditNoteRefused, match="remboursement"):
        make(confirmed, 100, "", None, refund)
    other = Refund.objects.create(payment=PaymentFactory(), amount=100, processed=True)
    with pytest.raises(CreditNoteRefused, match="remboursement"):
        make(confirmed, 100, "", None, other)


def test_a_credit_failure_is_visible_and_never_changes_the_amounts(confirmed):
    with mock.patch.object(
        FakeFiscalProvider,
        "request_invoice",
        side_effect=FiscalError("Montant supérieur", code="12"),
    ):
        credit = make(confirmed, 5000, "", None)
    credit.refresh_from_db()
    assert credit.fiscal_status == "failed" and credit.fiscal_error.startswith("12 ")
    assert AuditLog.objects.filter(action="credit_note.fiscal_failed").exists()
    assert issue_credit(credit.pk) == "failed"
    confirmed.refresh_from_db()
    assert confirmed.fiscal_total == 17700


def test_a_credit_mismatch_cancels_the_request(confirmed):
    real = FakeFiscalProvider.request_invoice

    def skewed(self, request):
        totals = real(self, request)
        return InvoiceTotals(totals.uid, totals.total + 1)

    with mock.patch.object(FakeFiscalProvider, "request_invoice", skewed):
        credit = make(confirmed, 5000, "", None)
    credit.refresh_from_db()
    assert credit.fiscal_status == "failed" and "MISMATCH" in credit.fiscal_error

    def broken(self, uid):
        raise FiscalError("déjà finalisée", code="20")

    with (
        mock.patch.object(FakeFiscalProvider, "request_invoice", skewed),
        mock.patch.object(FakeFiscalProvider, "cancel", broken),
    ):
        again = make(confirmed, 100, "", None)
    again.refresh_from_db()
    assert again.fiscal_status == "failed"


def test_credit_resume_expiry_and_guard(confirmed, settings, monkeypatch):
    monkeypatch.setattr(tasks.issue_credit_note, "delay", lambda pk: None)
    credit = make(confirmed, 5000, "", None)
    provider = FakeFiscalProvider()

    # reprise : uid connu, il ne reste qu'à confirmer
    uid = provider.request_invoice(build_credit_request(credit, configure(**VAT))).uid
    CreditNote.objects.filter(pk=credit.pk).update(fiscal_status="requested", fiscal_uid=uid)
    with mock.patch.object(FakeFiscalProvider, "request_invoice", side_effect=AssertionError):
        assert issue_credit(credit.pk) == "confirmed"

    # expirée : on oublie l'uid et on réessaie
    other = make(confirmed, 100, "", None)
    CreditNote.objects.filter(pk=other.pk).update(fiscal_status="requested", fiscal_uid="expiree")
    with pytest.raises(FiscalTemporaryError, match="expirée"):
        issue_credit(other.pk)
    assert issue_credit(other.pk) == "confirmed"

    # réponse perdue : on attend l'expiration des demandes en attente
    third = make(confirmed, 100, "", None)
    CreditNote.objects.filter(pk=third.pk).update(fiscal_status="requested", fiscal_uid="")
    from apps.payments.fiscal.base import PendingRequest

    with mock.patch.object(
        FakeFiscalProvider, "pending_requests", return_value=[PendingRequest("x")]
    ):
        with pytest.raises(FiscalDeferred):
            issue_credit(third.pk)

    # panne passagère au moment de la demande : levée, réessayée par la tâche
    sixth = make(confirmed, 100, "", None)
    CreditNote.objects.filter(pk=sixth.pk).update(fiscal_status="none", fiscal_uid="")
    with mock.patch.object(
        FakeFiscalProvider, "request_invoice", side_effect=FiscalTemporaryError("panne")
    ):
        with pytest.raises(FiscalTemporaryError):
            issue_credit(sixth.pk)

    # refus autre que l'expiration, panne passagère, jeton, verrou
    fourth = make(confirmed, 100, "", None)
    CreditNote.objects.filter(pk=fourth.pk).update(fiscal_status="none", fiscal_uid="")
    with mock.patch.object(
        FakeFiscalProvider, "confirm", side_effect=FiscalError("boum", code="99")
    ):
        assert issue_credit(fourth.pk) == "failed"
    fifth = make(confirmed, 100, "", None)
    CreditNote.objects.filter(pk=fifth.pk).update(fiscal_status="none", fiscal_uid="")
    with mock.patch.object(
        FakeFiscalProvider, "confirm", side_effect=FiscalTemporaryError("panne")
    ):
        with pytest.raises(FiscalTemporaryError):
            issue_credit(fifth.pk)
    with mock.patch(
        "apps.payments.fiscal.credit.activation_errors",
        return_value={"emecef_enabled": "jeton expiré"},
    ):
        with pytest.raises(FiscalTemporaryError, match="jeton"):
            issue_credit(fifth.pk)
    from django.core.cache import cache

    cache.set(f"fiscal-credit:{fifth.pk}", 1, 60)
    with pytest.raises(FiscalDeferred):
        issue_credit(fifth.pk)
    cache.delete(f"fiscal-credit:{fifth.pk}")


def test_the_credit_task_retries_then_fails(confirmed, monkeypatch):
    monkeypatch.setattr(tasks.issue_credit_note, "delay", lambda pk: None)
    credit = make(confirmed, 5000, "", None)
    countdowns = []
    monkeypatch.setattr(
        tasks.issue_credit_note,
        "retry",
        lambda exc, countdown: countdowns.append(countdown) or RuntimeError(),
    )
    task = tasks.issue_credit_note

    def run(retries):
        task.push_request(retries=retries)
        try:
            return task.run(credit.pk)
        finally:
            task.pop_request()

    with mock.patch(
        "apps.payments.fiscal.credit.issue_credit", side_effect=FiscalTemporaryError("panne")
    ):
        with pytest.raises(RuntimeError):
            run(1)
        with pytest.raises(FiscalTemporaryError):
            run(tasks.INVOICE_MAX_RETRIES)
    with mock.patch(
        "apps.payments.fiscal.credit.issue_credit", side_effect=FiscalDeferred("attente", 130)
    ):
        with pytest.raises(RuntimeError):
            run(0)
    assert countdowns == [60, 130]
    credit.refresh_from_db()
    assert credit.fiscal_status == "failed"
    assert task.apply(args=[999999]).get() == ""


# --- Admin ---------------------------------------------------------------------------------------------------------


def post_action(client, url, action, pk, **extra):
    return client.post(url, {"action": action, "_selected_action": [pk], **extra})


def test_finance_issues_a_credit_note_from_the_invoice_list(
    client, confirmed, django_capture_on_commit_callbacks
):
    refund = Refund.objects.create(
        payment=PaymentFactory(order=confirmed.order), amount=3000, processed=True
    )
    verified_client(client, FINANCE)
    changelist = reverse("admin:payments_invoice_changelist")
    form = post_action(client, changelist, "issue_credit_note", confirmed.pk)
    assert form.status_code == 200 and "Reste à créditer sur" in form.content.decode()
    assert "17700 FCFA" in form.content.decode()
    with django_capture_on_commit_callbacks(execute=True):
        done = client.post(
            changelist,
            {
                "action": "issue_credit_note",
                "_selected_action": [confirmed.pk],
                "apply": "1",
                "amount": 3000,
                "reason": "Remboursement du 12",
                "refund": refund.pk,
            },
        )
    assert done.status_code == 302
    credit = CreditNote.objects.get()
    assert credit.amount == 3000 and credit.refund == refund and credit.fiscal_status == "confirmed"
    assert credit.created_by.groups.filter(name=FINANCE).exists()
    page = client.get(
        reverse("admin:payments_invoice_change", args=[confirmed.pk])
    ).content.decode()
    assert credit.number in page and "Facture normalisée" in page
    # Refus : plus que le reste à créditer
    refused = client.post(
        changelist,
        {
            "action": "issue_credit_note",
            "_selected_action": [confirmed.pk],
            "apply": "1",
            "amount": 99999,
            "reason": "trop",
        },
        follow=True,
    )
    assert "Reste à créditer" in refused.content.decode() and CreditNote.objects.count() == 1


def test_the_credit_action_needs_one_confirmed_invoice_and_the_permission(
    client, confirmed, django_capture_on_commit_callbacks
):
    other = paid_invoice(django_capture_on_commit_callbacks)
    verified_client(client, FINANCE)
    changelist = reverse("admin:payments_invoice_changelist")
    two = client.post(
        changelist,
        {"action": "issue_credit_note", "_selected_action": [confirmed.pk, other.pk]},
        follow=True,
    )
    assert "une seule facture" in two.content.decode()
    Invoice.objects.filter(pk=other.pk).update(fiscal_status="none")
    none = (
        post_action(client, changelist, "issue_credit_note", other.pk, follow=True)
        if False
        else client.post(
            changelist, {"action": "issue_credit_note", "_selected_action": [other.pk]}, follow=True
        )
    )
    assert "n'est pas une facture normalisée confirmée" in unescape(none.content.decode())
    verified_client(client, SUPPORT)
    refused = client.post(
        changelist, {"action": "issue_credit_note", "_selected_action": [confirmed.pk]}
    )
    assert "Relancer l" not in refused.content.decode() or CreditNote.objects.count() == 0
    assert not CreditNote.objects.exists()


def test_finance_relaunches_a_failed_credit_note_and_lists_refunds_without_credit(
    client, confirmed, django_capture_on_commit_callbacks
):
    with mock.patch.object(
        FakeFiscalProvider, "request_invoice", side_effect=FiscalError("x", code="99")
    ):
        credit = make(confirmed, 3000, "", None)
    credit.refresh_from_db()
    assert credit.fiscal_status == "failed"
    verified_client(client, FINANCE)
    page = client.get(reverse("admin:payments_creditnote_change", args=[credit.pk]))
    assert page.status_code == 200 and "99 x" in page.content.decode()
    with django_capture_on_commit_callbacks(execute=True):
        client.post(
            reverse("admin:payments_creditnote_changelist"),
            {"action": "retry_fiscal", "_selected_action": [credit.pk]},
        )
    credit.refresh_from_db()
    assert credit.fiscal_status == "confirmed" and credit.fiscal_error == ""

    covered = Refund.objects.create(
        payment=PaymentFactory(order=confirmed.order), amount=10, processed=True
    )
    missing = Refund.objects.create(
        payment=PaymentFactory(order=confirmed.order), amount=20, processed=True
    )
    covered.credit_note = credit
    url = reverse("admin:payments_refund_changelist")
    CreditNote.objects.filter(pk=credit.pk).update(refund=covered)
    listing = client.get(url, {"credit_note": "missing"}).content.decode()
    assert f"refund/{missing.pk}/" in listing and f"refund/{covered.pk}/" not in listing
    issued = client.get(url, {"credit_note": "issued"}).content.decode()
    assert f"refund/{covered.pk}/" in issued and credit.number in issued
    everything = client.get(url).content.decode()
    assert f"refund/{missing.pk}/" in everything and "—" in everything
    assert client.get(reverse("admin:payments_creditnote_add")).status_code == 403


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
