"""Factures (API-L3b.2b, ADR 0005, C12) : émises au paiement, numérotées sans trou, PDF privé, payeur seulement."""

from datetime import timedelta
from decimal import Decimal

import pytest
from celery.exceptions import Retry
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import ParentFactory, TeacherFactory
from apps.core.models import PlatformSettings
from apps.payments import tasks
from apps.payments.invoices import filename, issue_invoice, rate_label, tax_breakdown, to_franc
from apps.payments.models import Invoice, Order
from apps.payments.providers import PaymentEvent, PaymentStatus
from apps.payments.utils import handle_payment_event

from .factories import OrderFactory, PaymentFactory

pytestmark = pytest.mark.django_db


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def pay(order, commit):
    payment = PaymentFactory(order=order)
    event = PaymentEvent(
        order.reference,
        payment.provider_transaction_id,
        order.total,
        "XOF",
        PaymentStatus.SUCCEEDED,
    )
    with commit(execute=True):
        handle_payment_event("fake", event)
    order.refresh_from_db()
    return payment


@pytest.fixture
def paid_order(django_capture_on_commit_callbacks):
    order = OrderFactory()
    pay(order, django_capture_on_commit_callbacks)
    return order


def url(order):
    return f"/api/payments/orders/{order.reference}/invoice/"


def test_invoice_is_issued_at_payment_and_downloadable_by_the_payer(paid_order):
    invoice = Invoice.objects.get(order=paid_order)
    year = timezone.now().year
    assert invoice.number == f"FAC-{year}-000001"
    assert invoice.pdf_status == Invoice.PdfStatus.READY and invoice.pdf.name.endswith(
        f"{invoice.uuid}.pdf"
    )
    snapshot = invoice.snapshot
    assert snapshot["provisional"] is True and snapshot["vat"] is None and snapshot["aib"] is None
    assert snapshot["seller"] == {"name": "Steamy"}
    assert snapshot["buyer"]["phone"] == paid_order.payer.phone
    assert snapshot["lines"][0]["total"] == 15000 and snapshot["total"] == 15000
    body = client_for(paid_order.payer).get(f"/api/payments/orders/{paid_order.reference}/").json()
    assert body["invoice"] == {"number": invoice.number, "pdfStatus": "ready"}

    resp = client_for(paid_order.payer).get(url(paid_order))
    assert resp.status_code == 200 and resp["Content-Type"] == "application/pdf"
    assert f'filename="recu-{invoice.number}.pdf"' in resp["Content-Disposition"]
    assert b"".join(resp.streaming_content).startswith(b"%PDF")


def test_invoice_is_refused_to_the_beneficiary_and_others(paid_order):
    for user in (paid_order.beneficiary, ParentFactory(), TeacherFactory(), None):
        assert client_for(user).get(url(paid_order)).status_code == 404, user


def test_invoice_not_ready_or_missing(paid_order):
    Invoice.objects.filter(order=paid_order).update(pdf_status=Invoice.PdfStatus.PENDING)
    resp = client_for(paid_order.payer).get(url(paid_order))
    assert (resp.status_code, resp.json()["code"]) == (409, "PDF_NOT_READY")
    unpaid = OrderFactory()
    assert client_for(unpaid.payer).get(url(unpaid)).status_code == 404


def test_invoice_redirects_to_a_signed_url_when_the_storage_signs(paid_order, monkeypatch):
    invoice = Invoice.objects.get(order=paid_order)
    monkeypatch.setattr(
        type(invoice.pdf.storage), "signed_url", lambda self, name, filename: "https://media/x"
    )
    resp = client_for(paid_order.payer).get(url(paid_order))
    assert resp.status_code == 302 and resp["Location"] == "https://media/x"


def test_guest_downloads_with_the_token(django_capture_on_commit_callbacks):
    from apps.payments.orders import hash_token

    order = OrderFactory(
        payer=None,
        beneficiary=None,
        kind="kit",
        guest_phone="+2290197000055",
        guest_first_name="Awa",
        items=[],
    )
    Order.objects.filter(pk=order.pk).update(guest_access_token_hash=hash_token("jeton"))
    pay(order, django_capture_on_commit_callbacks)
    invoice = Invoice.objects.get(order=order)
    assert invoice.snapshot["buyer"] == {"name": "Awa", "phone": "+2290197000055"}
    assert client_for().get(url(order), headers={"X-Guest-Token": "jeton"}).status_code == 200
    assert client_for().get(url(order), headers={"X-Guest-Token": "autre"}).status_code == 404


def test_numbers_follow_without_gap_and_issue_is_idempotent(
    django_capture_on_commit_callbacks, settings
):
    settings.INVOICE_PROVISIONAL = False
    orders = [OrderFactory(), OrderFactory()]
    payments = [pay(order, django_capture_on_commit_callbacks) for order in orders]
    numbers = sorted(Invoice.objects.values_list("number", flat=True))
    assert [n[-6:] for n in numbers] == ["000001", "000002"]
    invoice = Invoice.objects.get(order=orders[0])
    assert issue_invoice(orders[0], payments[0]) == invoice
    assert filename(invoice) == f"facture-{invoice.number}.pdf" and str(invoice) == invoice.number


def configure(**fields):
    config = PlatformSettings.load()
    for name, value in fields.items():
        setattr(config, name, value)
    config.full_clean()
    config.save()
    return config


def test_no_tax_by_default():
    assert tax_breakdown(15000) == {"vat": None, "aib": None}


def test_vat_alone_splits_a_tax_inclusive_price():
    configure(vat_enabled=True, vat_rate=Decimal("18"))
    assert tax_breakdown(11800) == {
        "vat": {"rate": "18", "excluding_vat": 10000, "vat": 1800, "including_vat": 11800},
        "aib": None,
    }


def test_aib_alone_is_computed_on_the_total():
    configure(aib_enabled=True, aib_rate=Decimal("1.5"))
    assert tax_breakdown(15000) == {
        "vat": None,
        "aib": {"rate": "1.5", "base": 15000, "amount": 225},
    }


def test_both_taxes_put_the_aib_on_the_amount_excluding_vat():
    configure(vat_enabled=True, vat_rate=Decimal("18"), aib_enabled=True, aib_rate=Decimal("5"))
    assert tax_breakdown(11800) == {
        "vat": {"rate": "18", "excluding_vat": 10000, "vat": 1800, "including_vat": 11800},
        "aib": {"rate": "5", "base": 10000, "amount": 500},
    }


def test_rounding_is_to_the_franc_half_up_and_vat_plus_net_equals_total():
    assert (
        to_franc(Decimal("2.5")) == 3
        and to_franc(Decimal("3.5")) == 4
        and to_franc(Decimal("2.4")) == 2
    )
    assert rate_label(Decimal("18.00")) == "18" and rate_label(Decimal("0.50")) == "0.5"
    configure(vat_enabled=True, vat_rate=Decimal("18"))
    for total in (1, 99, 10001, 12345):
        vat = tax_breakdown(total)["vat"]
        assert vat["excluding_vat"] + vat["vat"] == total


def test_taxes_and_seller_are_printed_and_frozen_at_issue(
    django_capture_on_commit_callbacks, settings
):
    configure(vat_enabled=True, vat_rate=Decimal("18"), aib_enabled=True, aib_rate=Decimal("1"))
    settings.INVOICE_SELLER = {
        "name": "Steamy SARL",
        "address": "Cotonou",
        "tax_id": "",
        "registration": "RB/1",
    }
    settings.INVOICE_MENTIONS = ["Mention de test"]
    order = OrderFactory()
    pay(order, django_capture_on_commit_callbacks)
    invoice = Invoice.objects.get(order=order)
    snapshot = invoice.snapshot
    assert snapshot["seller"] == {
        "name": "Steamy SARL",
        "address": "Cotonou",
        "registration": "RB/1",
    }
    assert snapshot["vat"]["vat"] == 15000 - snapshot["vat"]["excluding_vat"]
    assert snapshot["aib"] == {"rate": "1", "base": snapshot["vat"]["excluding_vat"], "amount": 127}
    assert snapshot["mentions"] == ["Mention de test"]

    # Changer les taux ensuite ne touche jamais une facture déjà émise, ni son PDF régénéré
    configure(vat_rate=Decimal("5"), aib_enabled=False)
    Invoice.objects.filter(pk=invoice.pk).update(pdf_status=Invoice.PdfStatus.PENDING)
    assert tasks.build_invoice_pdf(invoice.pk) is True
    invoice.refresh_from_db()
    assert invoice.snapshot == snapshot and invoice.pdf_status == Invoice.PdfStatus.READY


def test_pdf_is_not_rebuilt_when_ready(paid_order):
    invoice = Invoice.objects.get(order=paid_order)
    assert tasks.build_invoice_pdf(invoice.pk) is False


def test_pdf_failure_is_retried_then_marked_failed(paid_order, monkeypatch):
    invoice = Invoice.objects.get(order=paid_order)
    Invoice.objects.filter(pk=invoice.pk).update(pdf_status=Invoice.PdfStatus.PENDING)

    def broken(invoice_id):
        raise RuntimeError("WeasyPrint indisponible")

    countdowns = []

    def retry(exc, countdown):
        countdowns.append(countdown)
        return Retry()

    monkeypatch.setattr(tasks, "build_invoice_pdf", broken)
    task = tasks.generate_invoice_pdf
    monkeypatch.setattr(task, "retry", retry)

    def run(retries):
        task.push_request(retries=retries)
        try:
            return task.run(invoice.pk)
        finally:
            task.pop_request()

    with pytest.raises(Retry):
        run(retries=1)
    assert countdowns == [60]
    with pytest.raises(RuntimeError):
        run(retries=tasks.INVOICE_MAX_RETRIES)
    invoice.refresh_from_db()
    assert invoice.pdf_status == Invoice.PdfStatus.FAILED


def test_pdf_task_ignores_a_deleted_invoice():
    assert tasks.generate_invoice_pdf.apply(args=[999999]).get() is False


def test_stale_pending_invoices_are_relaunched(paid_order, monkeypatch):
    launched = []
    monkeypatch.setattr(tasks.generate_invoice_pdf, "delay", launched.append)
    invoice = Invoice.objects.get(order=paid_order)
    Invoice.objects.filter(pk=invoice.pk).update(pdf_status=Invoice.PdfStatus.PENDING)
    assert tasks.retry_pending_invoices() == 0
    Invoice.objects.filter(pk=invoice.pk).update(issued_at=timezone.now() - timedelta(minutes=11))
    call_command("retry_pending_invoices")
    assert launched == [invoice.pk]


def test_admin_regenerates_the_pdf(client, paid_order, django_capture_on_commit_callbacks):
    from django.urls import reverse

    from apps.core.tests.staff import verified_client

    verified_client(client, is_superuser=True)
    invoice = Invoice.objects.get(order=paid_order)
    with django_capture_on_commit_callbacks(execute=True):
        client.post(
            reverse("admin:payments_invoice_changelist"),
            {"action": "regenerate", "_selected_action": [invoice.pk]},
        )
    invoice.refresh_from_db()
    assert invoice.pdf_status == Invoice.PdfStatus.READY
