"""
WAD10 · Boutique et commandes, WAD11 · Paiements dans l'admin Django (LOT-6 6.4). Aucune voie de l'admin ne passe
une commande à « payée » (S9) ; livraison monotone et notifiée ; révocation d'un Kit Code non utilisé seulement ;
paiements en lecture seule, numéro masqué, `payload` réservé à la Finance, agrégats exacts ; remboursements demandés
puis traités par la Finance avec double confirmation ; factures téléchargeables.
"""

import pytest
from django.contrib.messages import get_messages
from django.core.files.base import ContentFile
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.groups import CONTENT, FINANCE, SUPPORT
from apps.core.models import AuditLog
from apps.core.storage import PrivateFileSystemStorage
from apps.core.tests.staff import verified_client
from apps.notifications.models import Notification
from apps.payments.admin import masked, payment_totals
from apps.payments.models import Invoice, KitCode, Order, Payment, Refund
from apps.shop.tests.factories import KitFactory

from .factories import OrderFactory, OrderItemFactory, PaymentFactory

pytestmark = pytest.mark.django_db

ORDERS = reverse("admin:payments_order_changelist")
PAYMENTS = reverse("admin:payments_payment_changelist")
REFUNDS = reverse("admin:payments_refund_changelist")
KIT_CODES = reverse("admin:payments_kitcode_changelist")


def action_names(client, url) -> list[str]:
    """Actions proposées dans la liste (aucune si le formulaire d'actions est absent)."""
    form = client.get(url).context["action_form"]
    return [name for name, _ in form.fields["action"].choices] if form else []


def member(group):
    client = APIClient()
    verified_client(client, group)
    return client


def act(client, url, action, objects, **extra):
    return client.post(
        url,
        {"action": action, "_selected_action": [obj.pk for obj in objects], **extra},
        follow=True,
    )


def texts(response):
    return [str(message) for message in get_messages(response.wsgi_request)]


def kit_order(**fields) -> Order:
    order = OrderFactory(kind=Order.Kind.KIT, items=[], shipping_status="preparing", **fields)
    OrderItemFactory(order=order, course=None, kit=KitFactory(), title="Kit robot")
    return order


# --- Commandes et livraison (WAD10) --------------------------------------------------------------------------


def test_support_moves_the_delivery_one_step_at_a_time_and_the_payer_is_told():
    support = member(SUPPORT)
    order = kit_order(paid=True)
    form = act(support, ORDERS, "set_shipping_status", [order])
    assert "Nouveau statut de livraison" in form.content.decode()

    response = act(support, ORDERS, "set_shipping_status", [order], apply="1", status="shipped")
    assert "Livraisons mises à jour : 1." in texts(response)
    order.refresh_from_db()
    assert order.shipping_status == "shipped"
    assert Notification.objects.filter(user=order.payer, title="Commande expédiée").exists()
    assert AuditLog.objects.filter(action="order.shipping_status", data__status="shipped").exists()

    act(support, ORDERS, "set_shipping_status", [order], apply="1", status="delivered")
    order.refresh_from_db()
    assert order.shipping_status == "delivered"


@pytest.mark.parametrize(
    ("fields", "target", "reason"),
    [
        ({"paid": True}, "delivered", "passage impossible de « En préparation » à « Livrée »"),
        (
            {"paid": True, "shipping_status": "delivered"},
            "shipped",
            "passage impossible de « Livrée » à « Expédiée »",
        ),
        ({}, "shipped", "la commande n'est pas payée"),
    ],
)
def test_non_monotone_or_unpaid_deliveries_are_refused(fields, target, reason):
    support = member(SUPPORT)
    shipping = fields.pop("shipping_status", "preparing")
    order = kit_order(**fields)
    Order.objects.filter(pk=order.pk).update(shipping_status=shipping)
    response = act(support, ORDERS, "set_shipping_status", [order], apply="1", status=target)
    assert any(reason in message for message in texts(response))
    order.refresh_from_db()
    assert order.shipping_status == shipping


def test_a_course_order_has_no_delivery():
    support = member(SUPPORT)
    order = OrderFactory(paid=True)
    response = act(support, ORDERS, "set_shipping_status", [order], apply="1", status="shipped")
    assert any("« sans livraison »" in message for message in texts(response))


def test_no_admin_path_marks_an_order_paid():
    order = kit_order()
    for client in (member(SUPPORT), member(FINANCE)):
        change = reverse("admin:payments_order_change", args=[order.pk])
        assert client.post(change, {"status": "paid"}).status_code == 403
        assert client.get(reverse("admin:payments_order_add")).status_code == 403
        assert all("pay" not in name for name in action_names(client, ORDERS))
    order.refresh_from_db()
    assert order.status == Order.Status.PENDING


def test_order_pages_show_items_and_kit_codes():
    support = member(SUPPORT)
    order = kit_order(paid=True)
    item = order.items.get()
    KitCode.objects.create(kit=item.kit, order_item=item, code="STEAMY-AAAA-BBBB")
    KitCode.objects.create(
        kit=item.kit, order_item=item, code="STEAMY-CCCC-DDDD", revoked_at=timezone.now()
    )
    KitCode.objects.create(
        kit=item.kit, order_item=item, code="STEAMY-EEEE-FFFF", redeemed_at=timezone.now()
    )
    assert "Kit robot × 1" in support.get(ORDERS).content.decode()
    page = support.get(reverse("admin:payments_order_change", args=[order.pk])).content.decode()
    assert "STEAMY-AAAA-BBBB · disponible" in page
    assert "STEAMY-CCCC-DDDD · révoqué" in page and "STEAMY-EEEE-FFFF · utilisé" in page
    course_order = OrderFactory()
    assert (
        "—"
        in support.get(
            reverse("admin:payments_order_change", args=[course_order.pk])
        ).content.decode()
    )


def test_finance_cannot_change_deliveries():
    assert "set_shipping_status" not in action_names(member(FINANCE), ORDERS)


# --- Kit Codes ------------------------------------------------------------------------------------------------


def test_only_an_unused_kit_code_is_revoked():
    support = member(SUPPORT)
    order = kit_order(paid=True)
    item = order.items.get()
    free = KitCode.objects.create(kit=item.kit, order_item=item, code="STEAMY-AAAA-BBBB")
    used = KitCode.objects.create(
        kit=item.kit, order_item=item, code="STEAMY-CCCC-DDDD", redeemed_at=timezone.now()
    )
    gone = KitCode.objects.create(
        kit=item.kit, order_item=item, code="STEAMY-EEEE-FFFF", revoked_at=timezone.now()
    )
    response = act(support, KIT_CODES, "revoke", [free, used, gone])
    messages = texts(response)
    assert "Kit Codes révoqués : 1." in messages
    assert "STEAMY-CCCC-DDDD : déjà utilisé, il ne peut plus être révoqué." in messages
    assert "STEAMY-EEEE-FFFF : déjà révoqué." in messages
    free.refresh_from_db()
    used.refresh_from_db()
    assert free.revoked_at is not None and used.revoked_at is None
    assert AuditLog.objects.filter(action="kitcode.revoked", target_id=str(free.pk)).exists()
    assert order.reference in support.get(KIT_CODES).content.decode()


def test_finance_cannot_revoke_kit_codes():
    assert "revoke" not in action_names(member(FINANCE), KIT_CODES)


# --- Paiements (WAD11) ------------------------------------------------------------------------------------------


def test_payments_are_read_only_with_a_masked_number():
    finance = member(FINANCE)
    payment = PaymentFactory(status=Payment.Status.SUCCEEDED, payload={"event": "secret"})
    listing = finance.get(PAYMENTS).content.decode()
    assert "+229 •••• 00 01" in listing and "+2290197000001" not in listing
    change = reverse("admin:payments_payment_change", args=[payment.pk])
    assert finance.post(change, {"amount": 1}).status_code == 403
    assert finance.get(reverse("admin:payments_payment_add")).status_code == 403
    page = finance.get(change).content.decode()
    assert "secret" in page and "+2290197000001" not in page


def test_support_never_sees_the_payload():
    payment = PaymentFactory(payload={"event": "secret"})
    page = (
        member(SUPPORT)
        .get(reverse("admin:payments_payment_change", args=[payment.pk]))
        .content.decode()
    )
    assert "secret" not in page


def test_content_has_no_access_to_payments():
    content = member(CONTENT)
    assert content.get(PAYMENTS).status_code == 403
    assert content.get(REFUNDS).status_code == 403


def test_payment_totals_match_a_reference_computation():
    PaymentFactory(status=Payment.Status.SUCCEEDED, amount=15000)
    PaymentFactory(
        status=Payment.Status.SUCCEEDED,
        amount=20000,
        order=OrderFactory(kind=Order.Kind.KIT, items=[]),
    )
    PaymentFactory(status=Payment.Status.FAILED, amount=15000)
    PaymentFactory(status=Payment.Status.PENDING, amount=15000)
    assert payment_totals(Payment.objects.all()) == {
        "volume": 35000,
        "volume_label": "35 000 FCFA",
        "count": 4,
        "succeeded": 2,
        "failed": 1,
        "failure_rate": 33.3,
    }
    assert payment_totals(Payment.objects.none())["failure_rate"] is None
    finance = member(FINANCE)
    listing = finance.get(PAYMENTS).content.decode()
    assert "35 000 FCFA" in listing and "33,3 %" in listing
    # Filtre par type de commande : les agrégats suivent la liste
    assert finance.get(PAYMENTS, {"type": "kit"}).context["payment_totals"]["volume"] == 20000
    assert finance.get(PAYMENTS, {"type": "course"}).context["payment_totals"]["count"] == 3


def test_masking_handles_short_and_empty_numbers():
    assert masked("") == "—"
    assert masked("12345") == "••••"


def test_guest_payer_is_shown_by_phone():
    order = OrderFactory(kind=Order.Kind.KIT, items=[], payer=None, guest_phone="+2290197000099")
    PaymentFactory(order=order)
    assert "+2290197000099" in member(FINANCE).get(PAYMENTS).content.decode()


# --- Remboursements -----------------------------------------------------------------------------------------------


def test_finance_requests_a_refund_on_a_succeeded_payment_within_its_amount():
    finance = member(FINANCE)
    payment = PaymentFactory(status=Payment.Status.SUCCEEDED, amount=15000)
    failed = PaymentFactory(status=Payment.Status.FAILED)
    add = reverse("admin:payments_refund_add")
    form = finance.get(add).context["adminform"].form
    assert list(form.fields["payment"].queryset) == [payment]

    too_much = finance.post(add, {"payment": payment.pk, "amount": 20000, "reason": "Erreur"})
    assert "Montant remboursable : 15000 FCFA au plus." in too_much.content.decode()
    not_succeeded = finance.post(add, {"payment": failed.pk, "amount": 100, "reason": "Erreur"})
    assert not_succeeded.status_code == 200 and not Refund.objects.exists()

    response = finance.post(
        add, {"payment": payment.pk, "amount": 5000, "reason": "Kit abîmé"}, follow=True
    )
    refund = Refund.objects.get()
    assert (refund.amount, refund.reason, refund.processed) == (5000, "Kit abîmé", False)
    assert AuditLog.objects.filter(action="refund.requested").exists()
    assert payment.order.reference in response.content.decode()


def test_processing_a_refund_needs_a_double_confirmation():
    finance = member(FINANCE)
    payment = PaymentFactory(status=Payment.Status.SUCCEEDED, order=OrderFactory(paid=True))
    refund = Refund.objects.create(payment=payment, amount=payment.amount, reason="Doublon")
    form = act(finance, REFUNDS, "process", [refund])
    assert "Le remboursement a été effectué" in form.content.decode()
    act(finance, REFUNDS, "process", [refund], apply="1", done="on")  # une seule case : rien
    refund.refresh_from_db()
    assert not refund.processed

    response = act(finance, REFUNDS, "process", [refund], apply="1", done="on", order_refunded="on")
    assert "Remboursements traités : 1." in texts(response)
    refund.refresh_from_db()
    payment.order.refresh_from_db()
    assert refund.processed and payment.order.status == Order.Status.REFUNDED
    assert Notification.objects.filter(
        user=payment.order.payer, title="Remboursement effectué"
    ).exists()

    again = act(finance, REFUNDS, "process", [refund], apply="1", done="on", order_refunded="on")
    assert f"Remboursement n° {refund.pk} : déjà traité." in texts(again)


def test_refund_service_refuses_invalid_requests():
    from apps.payments import backoffice

    staff = verified_client(APIClient(), FINANCE)
    with pytest.raises(backoffice.BackofficeError, match="paiement réussi"):
        backoffice.request_refund(PaymentFactory(), 100, "x", staff)
    payment = PaymentFactory(status=Payment.Status.SUCCEEDED, amount=1000)
    with pytest.raises(backoffice.BackofficeError, match="1000 FCFA au plus"):
        backoffice.request_refund(payment, 2000, "x", staff)
    Refund.objects.create(payment=payment, amount=1000)
    assert backoffice.refundable(payment) == 0


def test_support_cannot_refund():
    assert member(SUPPORT).get(reverse("admin:payments_refund_add")).status_code == 403


# --- Factures -----------------------------------------------------------------------------------------------------


@pytest.fixture
def invoice():
    order = OrderFactory(paid=True)
    invoice = Invoice.objects.create(order=order, number="FAC-2026-000042")
    invoice.pdf.save("x.pdf", ContentFile(b"%PDF-1.7 facture"), save=False)
    invoice.pdf_status = Invoice.PdfStatus.READY
    invoice.save()
    return invoice


def test_finance_downloads_an_invoice(invoice, monkeypatch):
    finance = member(FINANCE)
    page = finance.get(reverse("admin:payments_invoice_change", args=[invoice.pk])).content.decode()
    url = reverse("admin:payments_invoice_download", args=[invoice.pk])
    assert url in page and "Télécharger FAC-2026-000042" in page
    response = finance.get(url)
    assert b"".join(response.streaming_content) == b"%PDF-1.7 facture"
    monkeypatch.setattr(
        PrivateFileSystemStorage,
        "signed_url",
        lambda self, name, filename: f"https://media.test/{filename}",
    )
    assert finance.get(url)["Location"] == "https://media.test/FAC-2026-000042.pdf"


def test_an_invoice_not_ready_or_forbidden_is_not_downloaded(invoice):
    finance = member(FINANCE)
    url = reverse("admin:payments_invoice_download", args=[invoice.pk])
    assert member(CONTENT).get(url).status_code == 404
    Invoice.objects.filter(pk=invoice.pk).update(pdf_status=Invoice.PdfStatus.PENDING)
    assert finance.get(url).status_code == 404
    page = finance.get(reverse("admin:payments_invoice_change", args=[invoice.pk])).content.decode()
    assert "En préparation" in page


# --- Kits ---------------------------------------------------------------------------------------------------------


def test_kit_stock_badge_has_three_levels():
    content = member(CONTENT)
    for quantity in (0, 5, 20):
        KitFactory(stock_quantity=quantity)
    listing = content.get(reverse("admin:shop_kit_changelist")).content.decode()
    assert "Rupture" in listing and "Stock bas" in listing and "En stock" in listing


def test_an_invalid_filter_redirects_without_totals():
    response = member(FINANCE).get(PAYMENTS, {"inconnu": "1"})
    assert response.status_code == 302 and "e=1" in response["Location"]
