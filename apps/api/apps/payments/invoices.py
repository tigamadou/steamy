"""
Factures (ADR 0005, C12, D40). Le format légal attend la décision comptable : **P1** (facture normalisée MECeF /
e-MECeF de la DGI) et **P2** (TVA : prix TTC ou HT, taux, exonération). En attendant, tout ce qui a une valeur
légale est un **réglage** (`INVOICE_*`), jamais une valeur inventée ici :

- `INVOICE_PROVISIONAL` (vrai par défaut) : le document s'intitule « Reçu de paiement » et porte une mention « document
  non fiscal » ; faux : « Facture », une fois P1 tranché ;
- `INVOICE_SELLER` : raison sociale, adresse, IFU, RCCM… (seuls les champs renseignés sont imprimés) ;
- `INVOICE_VAT_RATE` (vide par défaut : aucune ventilation de TVA) et `INVOICE_PRICES_INCLUDE_VAT` ;
- `INVOICE_MENTIONS` : mentions légales supplémentaires.

La facture est émise une fois, dans la transaction d'exécution post-paiement (numéro sans trou, contenu figé), puis
son PDF est généré par Celery après la validation.
"""

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.core.models import DocumentSequence

from .models import Invoice, Order, Payment


def vat_breakdown(total: int) -> dict | None:
    """Ventilation HT / TVA / TTC selon les réglages (P2), arrondie au franc ; None si aucun taux n'est réglé."""
    rate = settings.INVOICE_VAT_RATE
    if rate is None:
        return None
    if settings.INVOICE_PRICES_INCLUDE_VAT:
        excluding = round(total * 100 / (100 + rate))
        return {
            "rate": rate,
            "excluding_vat": excluding,
            "vat": total - excluding,
            "including_vat": total,
        }
    vat = round(total * rate / 100)
    return {"rate": rate, "excluding_vat": total, "vat": vat, "including_vat": total + vat}


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
            "total": order.total,
            "currency": order.currency,
            "vat": vat_breakdown(order.total),
            "payment": {
                "network": payment.network,
                "transaction": payment.provider_transaction_id or "",
                "paid_on": f"{(order.paid_at or issued_at):%d/%m/%Y}",
            },
            "issued_on": f"{issued_at:%d/%m/%Y}",
        },
    )
    from .tasks import generate_invoice_pdf

    transaction.on_commit(lambda: generate_invoice_pdf.delay(invoice.pk))
    return invoice


def filename(invoice: Invoice) -> str:
    kind = "recu" if invoice.snapshot.get("provisional") else "facture"
    return f"{kind}-{invoice.number}.pdf"
