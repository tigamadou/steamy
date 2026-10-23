"""
Émission de la facture normalisée e-MECeF (ADR 0006) : demande à prix TTC dont la somme est exacte, comparaison avec nos
montants figés, confirmation, éléments de sécurité sur le PDF, reprise et échecs. Faux fournisseur : aucun réseau.
"""

import random
from decimal import Decimal
from unittest import mock

import pytest
from django.core.cache import cache
from django.template.loader import render_to_string
from django.urls import reverse

from apps.core.groups import FINANCE
from apps.core.models import AuditLog, PlatformSettings
from apps.core.tests.staff import verified_client
from apps.payments import tasks
from apps.payments.fiscal import FiscalError, FiscalTemporaryError, InvoiceTotals
from apps.payments.fiscal.base import GROUPS
from apps.payments.fiscal.builder import allocate, build_request, discrepancies
from apps.payments.fiscal.fake import FakeFiscalProvider
from apps.payments.fiscal.issuance import EXPIRY_WAIT_SECONDS, FiscalDeferred, issue_fiscal
from apps.payments.fiscal.qr import qr_svg
from apps.payments.invoices import filename
from apps.payments.models import Invoice
from apps.payments.taxes import compute_taxes

from .factories import OrderFactory, OrderItemFactory
from .test_invoices import pay

pytestmark = pytest.mark.django_db


def configure(**fields):
    config = PlatformSettings.load()
    defaults = {"emecef_enabled": True, "emecef_taxed_group": "B", "emecef_exempt_group": "A"}
    for name, value in {**defaults, **fields}.items():
        setattr(config, name, value)
    config.save()
    return config


VAT = {"vat_enabled": True, "vat_rate": Decimal("18")}
AIB = {"aib_enabled": True, "aib_rate": Decimal("5")}


def taxed_order(config, goods=((15000, 1),), shipping=0, **kwargs):
    """Commande aux taxes figées selon `config`, comme `pricing.quote` le ferait à la création."""
    subtotal = sum(price * quantity for price, quantity in goods)
    quote = compute_taxes(subtotal, shipping, config)
    order = OrderFactory(
        subtotal=subtotal,
        shipping_fee=shipping,
        vat_amount=quote.vat.amount if quote.vat else 0,
        aib_amount=quote.aib.amount if quote.aib else 0,
        total=quote.total,
        taxes=quote.snapshot(),
        items=[],
        **kwargs,
    )
    for price, quantity in goods:
        OrderItemFactory(
            order=order, title="Parcours robotique", unit_price=price, quantity=quantity
        )
    return order


def requested(order, config, aib=None, aib_in_total=False):
    buyer = {"name": "Marie Houngbo", "phone": "+2290197000001"}
    return build_request(order, buyer, config, aib, aib_in_total)


# --- Demande à prix TTC ---------------------------------------------------------------------------------------------


def test_allocate_is_exact_and_proportional():
    assert allocate([100, 200, 300], 60) == [10, 20, 30]
    assert sum(allocate([101, 303, 7], 55)) == 55
    assert allocate([0, 0], 5) == [0, 0]
    assert allocate([1, 1, 1], 2) == [1, 1, 0]  # plus fort reste, à égalité le premier


def test_without_vat_lines_are_sent_at_their_excl_tax_price_in_the_exempt_group():
    config = configure()
    order = taxed_order(config, goods=((15000, 2),), shipping=2000)
    request, expected = requested(order, config)
    assert [(i.name, i.price, i.quantity, i.tax_group) for i in request.items] == [
        ("Parcours robotique", 15000, Decimal(2), "A"),
        ("Livraison", 2000, Decimal(1), "A"),
    ]
    assert (expected.lines_total, expected.total, expected.vat_base) == (32000, 32000, 0)
    assert request.payments[0].amount == 32000 and request.type == "FV" and request.reference == ""
    assert request.client.name == "Marie Houngbo" and request.operator_name == "Steamy"
    assert discrepancies(expected, FakeFiscalProvider().request_invoice(request)) == []


def test_with_vat_the_lines_are_ttc_and_the_dgi_extraction_gives_back_our_amounts():
    config = configure(**VAT)
    order = taxed_order(config, goods=((15000, 1),))
    request, expected = requested(order, config)
    assert [(i.price, i.tax_group) for i in request.items] == [(17700, "B")]
    totals = FakeFiscalProvider().request_invoice(request)
    assert (totals.excl_tax["B"], totals.vat["B"], totals.total) == (15000, 2700, 17700)
    assert discrepancies(expected, totals) == []


def test_a_line_that_cannot_be_split_evenly_goes_out_with_quantity_one():
    config = configure(**VAT)
    order = taxed_order(config, goods=((101, 3),))  # 303 HT, TVA 55, TTC 358 non divisible par 3
    request, expected = requested(order, config)
    assert [(i.name, i.price, i.quantity) for i in request.items] == [
        ("Parcours robotique × 3", 358, Decimal(1))
    ]
    assert expected.taxed_total == 358
    order = taxed_order(config, goods=((3333, 3),))  # 9 999 HT, TVA 1 800, TTC 11 799 = 3 × 3 933
    request, _ = requested(order, config)
    assert [(i.price, i.quantity) for i in request.items] == [(3933, Decimal(3))]


def test_the_shipping_follows_its_vat_switch():
    config = configure(**VAT, vat_applies_to_shipping=False)
    order = taxed_order(config, goods=((10000, 1),), shipping=2000)
    request, expected = requested(order, config)
    assert [(i.name, i.price, i.tax_group) for i in request.items] == [
        ("Parcours robotique", 11800, "B"),
        ("Livraison", 2000, "A"),
    ]
    assert expected.vat_base == 10000 and expected.lines_total == 13800
    totals = FakeFiscalProvider().request_invoice(request)
    assert discrepancies(expected, totals) == []
    taxed = configure(**VAT, vat_applies_to_shipping=True)
    request, expected = requested(taxed_order(taxed, goods=((10000, 1),), shipping=2000), taxed)
    assert sum(i.price * int(i.quantity) for i in request.items) == expected.lines_total == 14160
    assert {i.tax_group for i in request.items} == {"B"}


def test_the_sum_of_the_lines_is_exact_for_many_orders_and_the_dgi_finds_our_amounts():
    config = configure(**VAT)
    rng = random.Random(7)
    for _ in range(60):
        goods = tuple((rng.randint(1, 60000), rng.randint(1, 5)) for _ in range(rng.randint(1, 4)))
        shipping = rng.choice([0, 1500, 2000, 3333])
        order = taxed_order(config, goods=goods, shipping=shipping)
        request, expected = requested(order, config)
        assert sum(i.price * int(i.quantity) for i in request.items) == expected.lines_total
        totals = FakeFiscalProvider().request_invoice(request)
        assert discrepancies(expected, totals) == [], (goods, shipping)


def test_the_aib_is_compared_and_included_in_the_total_only_when_the_setting_says_so(settings):
    config = configure(**VAT, **AIB)
    order = taxed_order(config, goods=((15000, 1),))
    for in_total in (False, True):
        settings.EMECEF_AIB_IN_TOTAL = in_total
        request, expected = requested(order, config, aib="B", aib_in_total=in_total)
        totals = FakeFiscalProvider().request_invoice(request)
        assert expected.aib == order.aib_amount == 750 and totals.aib == 750
        assert expected.total == (18450 if in_total else 17700) and totals.total == expected.total
        assert discrepancies(expected, totals) == []
    assert any(
        "AIB" in d for d in discrepancies(expected, InvoiceTotals("u", expected.total, aib=1))
    )


def test_discrepancies_name_what_differs():
    config = configure(**VAT)
    order = taxed_order(config, goods=((15000, 1),))
    _, expected = requested(order, config)
    totals = InvoiceTotals(
        "u",
        17701,
        group_totals={"B": 17701},
        excl_tax={"B": 15001},
        vat={"B": 2700},
    )
    found = discrepancies(expected, totals)
    assert (
        len(found) == 3
        and found[0].startswith("total")
        and "groupe B" in found[1]
        and "HT" in found[2]
    )
    wrong_vat = InvoiceTotals(
        "u", 17700, group_totals={"B": 17700}, excl_tax={"B": 15000}, vat={"B": 2699}
    )
    assert discrepancies(expected, wrong_vat) == ["TVA 2699 au lieu de 2700"]


def test_for_a_group_without_ht_and_vat_fields_only_the_group_total_is_compared():
    config = configure(**VAT, emecef_taxed_group="E")
    _, expected = requested(taxed_order(config, goods=((15000, 1),)), config)
    ok = InvoiceTotals("u", 17700, group_totals={"E": 17700})
    assert discrepancies(expected, ok) == []
    assert discrepancies(expected, InvoiceTotals("u", 17700, group_totals={"E": 17000})) == [
        "groupe E 17000 au lieu de 17700"
    ]


# --- Émission ------------------------------------------------------------------------------------------------------


def issue(invoice):
    return issue_fiscal(invoice.pk)


def paid_invoice(commit, config=None, **order_kwargs):
    config = config or configure(**VAT)
    order = taxed_order(config, **order_kwargs)
    pay(order, commit)
    return Invoice.objects.get(order=order)


def test_a_paid_order_gets_a_confirmed_normalised_invoice_with_its_security_elements(
    django_capture_on_commit_callbacks,
):
    invoice = paid_invoice(django_capture_on_commit_callbacks)
    assert invoice.fiscal_status == Invoice.FiscalStatus.CONFIRMED and invoice.fiscal_uid
    assert len(invoice.fiscal["code"]) == 29 and invoice.fiscal["qr_code"].startswith("F;")
    assert invoice.snapshot["total"] == 17700 and invoice.snapshot["taxes"][0]["amount"] == 2700
    assert invoice.pdf_status == Invoice.PdfStatus.READY
    assert filename(invoice) == f"facture-{invoice.number}.pdf"
    html = render_to_string("pdf/invoice.html", tasks.invoice_context(invoice))
    assert (
        invoice.fiscal["code"] in html and "<svg" in html and "Facture normalisée e-MECeF" in html
    )
    assert "Document non fiscal" not in html and "TVA (18 % de 15000 FCFA)" in html
    assert AuditLog.objects.filter(action="invoice.fiscal_confirmed").exists()
    # Rejouer ne change rien
    assert issue(invoice) == "confirmed"


def test_without_the_switch_the_receipt_stays_provisional(django_capture_on_commit_callbacks):
    config = configure(emecef_enabled=False, **VAT)
    invoice = paid_invoice(django_capture_on_commit_callbacks, config)
    assert invoice.fiscal_status == Invoice.FiscalStatus.NONE and not invoice.fiscal
    assert issue(invoice) == "none"
    assert filename(invoice) == f"recu-{invoice.number}.pdf"
    html = render_to_string("pdf/invoice.html", tasks.invoice_context(invoice))
    assert "Document non fiscal" in html and "Code MECeF/DGI" not in html


def test_a_mismatch_cancels_the_request_and_fails_without_touching_the_amounts(
    django_capture_on_commit_callbacks,
):
    real = FakeFiscalProvider.request_invoice

    def skewed(self, request):
        totals = real(self, request)
        return InvoiceTotals(
            totals.uid,
            totals.total + 1,
            group_totals=totals.group_totals,
            vat=totals.vat,
            excl_tax=totals.excl_tax,
        )

    with (
        mock.patch.object(FakeFiscalProvider, "request_invoice", skewed),
        mock.patch.object(
            FakeFiscalProvider, "cancel", autospec=True, side_effect=FakeFiscalProvider.cancel
        ) as cancel,
    ):
        invoice = paid_invoice(django_capture_on_commit_callbacks)
    assert (
        invoice.fiscal_status == Invoice.FiscalStatus.FAILED and "MISMATCH" in invoice.fiscal_error
    )
    assert "total 17701 au lieu de 17700" in invoice.fiscal_error and cancel.call_count == 1
    assert invoice.order.total == 17700 and not invoice.fiscal
    assert AuditLog.objects.filter(action="invoice.fiscal_failed").exists()
    assert filename(invoice).startswith("recu-")


def test_a_failed_cancel_after_a_mismatch_is_only_logged(django_capture_on_commit_callbacks):
    real = FakeFiscalProvider.request_invoice

    def skewed(self, request):
        totals = real(self, request)
        return InvoiceTotals(totals.uid, 1)

    def broken(self, uid):
        raise FiscalError("déjà finalisée", code="20")

    with (
        mock.patch.object(FakeFiscalProvider, "request_invoice", skewed),
        mock.patch.object(FakeFiscalProvider, "cancel", broken),
    ):
        invoice = paid_invoice(django_capture_on_commit_callbacks)
    assert invoice.fiscal_status == Invoice.FiscalStatus.FAILED


def test_a_business_refusal_fails_without_retry(django_capture_on_commit_callbacks):
    config = configure(**VAT)
    order = taxed_order(config)
    order.payer.first_name, order.payer.last_name = "Marie [REFUSED]", ""
    order.payer.save()
    pay(order, django_capture_on_commit_callbacks)
    invoice = Invoice.objects.get(order=order)
    assert invoice.fiscal_status == Invoice.FiscalStatus.FAILED and invoice.fiscal_error.startswith(
        "99 "
    )


def test_a_temporary_failure_is_retried_then_marked_failed(
    django_capture_on_commit_callbacks, monkeypatch
):
    config = configure(**VAT)
    order = taxed_order(config)
    order.payer.first_name, order.payer.last_name = "Marie [DOWN]", ""
    order.payer.save()
    task = tasks.issue_fiscal_invoice
    monkeypatch.setattr(
        task, "delay", lambda pk: None
    )  # la tâche est lancée à la main, pas en mode immédiat
    pay(order, django_capture_on_commit_callbacks)
    invoice = Invoice.objects.get(order=order)
    assert invoice.fiscal_status == Invoice.FiscalStatus.NONE

    countdowns = []

    def retry(exc, countdown):
        countdowns.append(countdown)
        return RuntimeError("retry")

    monkeypatch.setattr(task, "retry", retry)

    def run(retries):
        task.push_request(retries=retries)
        try:
            return task.run(invoice.pk)
        finally:
            task.pop_request()

    with pytest.raises(RuntimeError):
        run(retries=1)
    assert countdowns == [60]
    invoice.refresh_from_db()
    assert (
        invoice.fiscal_status == Invoice.FiscalStatus.REQUESTED
    )  # envoyée, sans réponse : réessai à venir
    with pytest.raises(FiscalTemporaryError):
        run(retries=tasks.INVOICE_MAX_RETRIES)
    invoice.refresh_from_db()
    assert (
        invoice.fiscal_status == Invoice.FiscalStatus.FAILED
        and "indisponible" in invoice.fiscal_error
    )
    assert tasks.issue_fiscal_invoice.apply(args=[999999]).get() == ""


def test_the_task_uses_the_wait_asked_by_the_issuance(monkeypatch):
    config = configure(**VAT)
    invoice = paid_requested(config)
    cache.set("fiscal-issue-pending", 1)
    monkeypatch.setattr(tasks, "issue_fiscal", lambda *_: None, raising=False)
    waits = []
    monkeypatch.setattr(
        tasks.issue_fiscal_invoice,
        "retry",
        lambda exc, countdown: waits.append(countdown) or RuntimeError(),
    )
    with mock.patch(
        "apps.payments.fiscal.issuance.issue_fiscal", side_effect=FiscalDeferred("attente", 130)
    ):
        tasks.issue_fiscal_invoice.push_request(retries=0)
        try:
            with pytest.raises(RuntimeError):
                tasks.issue_fiscal_invoice.run(invoice.pk)
        finally:
            tasks.issue_fiscal_invoice.pop_request()
    assert waits == [130]


def paid_requested(config):
    order = taxed_order(config)
    order.status = "paid"
    order.save()
    from apps.payments.invoices import issue_invoice

    from .factories import PaymentFactory

    return issue_invoice(order, PaymentFactory(order=order))


# --- Reprise ---------------------------------------------------------------------------------------------------------


def test_a_known_uid_is_only_confirmed_not_requested_again():
    config = configure(**VAT)
    invoice = paid_requested(config)
    provider = FakeFiscalProvider()
    uid = provider.request_invoice(requested(invoice.order, config)[0]).uid
    Invoice.objects.filter(pk=invoice.pk).update(fiscal_status="requested", fiscal_uid=uid)
    with mock.patch.object(
        FakeFiscalProvider, "request_invoice", side_effect=AssertionError("pas de nouveau POST")
    ):
        assert issue(invoice) == "confirmed"
    invoice.refresh_from_db()
    assert invoice.fiscal_uid == uid and invoice.fiscal["code"]


def test_an_expired_request_is_forgotten_and_asked_again_later():
    config = configure(**VAT)
    invoice = paid_requested(config)
    Invoice.objects.filter(pk=invoice.pk).update(fiscal_status="requested", fiscal_uid="expiree")
    with pytest.raises(FiscalTemporaryError, match="expirée"):
        issue(invoice)
    invoice.refresh_from_db()
    assert invoice.fiscal_uid == "" and invoice.fiscal_status == "requested"
    assert issue(invoice) == "confirmed"  # repart d'une nouvelle demande


def test_a_lost_response_waits_for_pending_requests_to_expire_before_asking_again():
    config = configure(**VAT)
    invoice = paid_requested(config)
    Invoice.objects.filter(pk=invoice.pk).update(fiscal_status="requested", fiscal_uid="")
    from apps.payments.fiscal.base import PendingRequest

    with mock.patch.object(
        FakeFiscalProvider, "pending_requests", return_value=[PendingRequest("autre")]
    ):
        with pytest.raises(FiscalDeferred) as deferred:
            issue(invoice)
    assert deferred.value.countdown == EXPIRY_WAIT_SECONDS
    assert issue(invoice) == "confirmed"


def test_a_refusal_at_confirmation_other_than_expiry_fails():
    config = configure(**VAT)
    invoice = paid_requested(config)

    def refused(self, uid):
        raise FiscalError("Erreur lors du traitement", code="99")

    with mock.patch.object(FakeFiscalProvider, "confirm", refused):
        assert issue(invoice) == "failed"
    invoice.refresh_from_db()
    assert invoice.fiscal_error.startswith("99 ")


def test_a_temporary_failure_at_confirmation_is_raised_and_keeps_the_uid():
    config = configure(**VAT)
    invoice = paid_requested(config)

    def down(self, uid):
        raise FiscalTemporaryError("indisponible")

    with (
        mock.patch.object(FakeFiscalProvider, "confirm", down),
        pytest.raises(FiscalTemporaryError),
    ):
        issue(invoice)
    invoice.refresh_from_db()
    assert invoice.fiscal_status == "requested" and invoice.fiscal_uid


# --- Garde-fous ----------------------------------------------------------------------------------------------------


def test_issuance_is_suspended_when_the_guard_refuses(settings):
    config = configure(**VAT, **AIB)
    settings.EMECEF_AIB_IN_TOTAL = None
    invoice = paid_requested(config)
    with pytest.raises(FiscalTemporaryError, match="emecef_probe"):
        issue(invoice)
    invoice.refresh_from_db()
    assert invoice.fiscal_status == "none"


def test_a_second_worker_waits_while_one_is_issuing():
    config = configure(**VAT)
    invoice = paid_requested(config)
    cache.set(f"fiscal-issue:{invoice.pk}", 1, 60)
    with pytest.raises(FiscalDeferred):
        issue(invoice)
    cache.delete(f"fiscal-issue:{invoice.pk}")


def test_the_qr_is_inline_svg():
    svg = qr_svg("F;IN01000005;X537E4DBAJUUHHXNFWISFEKJ;9999900000001;20201123131708")
    assert svg.startswith("<svg") and "<?xml" not in svg
    assert GROUPS == ("A", "B", "C", "D", "E", "F")


# --- Admin ---------------------------------------------------------------------------------------------------------


def test_finance_relaunches_a_failed_fiscal_invoice(client, django_capture_on_commit_callbacks):
    config = configure(**VAT)
    invoice = paid_requested(config)
    Invoice.objects.filter(pk=invoice.pk).update(fiscal_status="failed", fiscal_error="99 boom")
    verified_client(client, FINANCE)
    page = client.get(reverse("admin:payments_invoice_change", args=[invoice.pk]))
    assert page.status_code == 200 and "99 boom" in page.content.decode()
    with django_capture_on_commit_callbacks(execute=True):
        client.post(
            reverse("admin:payments_invoice_changelist"),
            {"action": "retry_fiscal", "_selected_action": [invoice.pk]},
        )
    invoice.refresh_from_db()
    assert invoice.fiscal_status == "confirmed" and invoice.fiscal_error == ""
