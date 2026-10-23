"""
Factures (ADR 0005, C12, D40). Le format légal attend la décision comptable : **P1** (facture normalisée MECeF /
e-MECeF de la DGI) et **P2** (TVA : prix TTC ou HT, taux, exonération). En attendant, tout ce qui a une valeur
légale est un **réglage** (`INVOICE_*`), jamais une valeur inventée ici :

- `INVOICE_PROVISIONAL` (vrai par défaut) : le document s'intitule « Reçu de paiement » et porte une mention « document
  non fiscal » ; faux : « Facture », une fois P1 tranché ;
- `INVOICE_SELLER` : raison sociale, adresse, IFU, RCCM… (seuls les champs renseignés sont imprimés) ;
- TVA et AIB (C25) : la facture ventile HT, taxes et total à payer **tels que figés sur la commande** à sa création
  (`Order.taxes`), jamais recalculés avec les réglages du moment ;
- `INVOICE_MENTIONS` : mentions légales supplémentaires.

La facture est émise une fois, dans la transaction d'exécution post-paiement (numéro sans trou, contenu figé), puis
son PDF est généré par Celery après la validation.
"""

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.core.models import DocumentSequence, PlatformSettings

from .models import Invoice, Order, Payment
from .taxes import snapshot_lines


def buyer_of(order: Order) -> dict:
    if order.payer is not None:
        return {
            "name": f"{order.payer.first_name} {order.payer.last_name}".strip(),
            "phone": order.payer.phone or "",
        }
    return {
        "name": f"{order.guest_first_name} {order.guest_last_name}".strip(),
        "phone": order.guest_phone,
    }


def issue_invoice(order: Order, payment: Payment) -> Invoice:
    """Émet la facture d'une commande payée (une seule fois) et lance son PDF après la validation."""
    existing = Invoice.objects.filter(order=order).first()
    if existing:
        return existing
    issued_at = timezone.now()
    number = DocumentSequence.next("invoice", issued_at.year)
    invoice = Invoice.objects.create(
        order=order,
        number=f"FAC-{issued_at.year}-{number:06d}",
        issued_at=issued_at,
        snapshot={
            "provisional": settings.INVOICE_PROVISIONAL,
            "seller": {k: v for k, v in settings.INVOICE_SELLER.items() if v},
            "mentions": list(settings.INVOICE_MENTIONS),
            "buyer": buyer_of(order),
            "reference": order.reference,
            "lines": [
                {
                    "title": item.title,
                    "unit_price": item.unit_price,
                    "quantity": item.quantity,
                    "total": item.total,
                }
                for item in order.items.all()
            ],
            "subtotal": order.subtotal,
            "shipping_fee": order.shipping_fee,
            "taxes": snapshot_lines(order.taxes),
            "total": order.total,
            "currency": order.currency,
            "payment": {
                "network": payment.network,
                "transaction": payment.provider_transaction_id or "",
                "paid_on": f"{(order.paid_at or issued_at):%d/%m/%Y}",
            },
            "issued_on": f"{issued_at:%d/%m/%Y}",
        },
    )
    from .tasks import generate_invoice_pdf, issue_fiscal_invoice

    transaction.on_commit(lambda: generate_invoice_pdf.delay(invoice.pk))
    if (
        PlatformSettings.load().emecef_enabled
    ):  # facture normalisée e-MECeF (ADR 0006), le reçu partant déjà
        transaction.on_commit(lambda: issue_fiscal_invoice.delay(invoice.pk))
    return invoice


def filename(invoice: Invoice) -> str:
    confirmed = invoice.fiscal_status == Invoice.FiscalStatus.CONFIRMED
    kind = "recu" if invoice.snapshot.get("provisional") and not confirmed else "facture"
    return f"{kind}-{invoice.number}.pdf"
