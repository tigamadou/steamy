"""
Factures (ADR 0005, C12, D40, C25). Les prix sont **TTC** et la TVA n'est ventilée que si le personnel l'active ; ce
qui s'applique d'abord est l'**AIB**. Tout ce qui a une valeur légale est un **réglage**, jamais une valeur inventée
ici :

- TVA et AIB : `PlatformSettings` (`vat_enabled`, `vat_rate`, `aib_enabled`, `aib_rate`), deux interrupteurs
  indépendants relus à chaque émission ; le snapshot de la facture garde les taux **au moment de l'émission**, une
  facture n'est jamais recalculée ensuite ;
- `INVOICE_PROVISIONAL` (vrai par défaut) : le document s'intitule « Reçu de paiement » et porte une mention « document
  non fiscal » ; faux : « Facture », une fois la facture normalisée (P1) branchée ;
- `INVOICE_SELLER` : raison sociale, adresse, IFU, RCCM… (seuls les champs renseignés sont imprimés) ;
- `INVOICE_MENTIONS` : mentions légales supplémentaires.

La facture est émise une fois, dans la transaction d'exécution post-paiement (numéro sans trou, contenu figé), puis
son PDF est généré par Celery après la validation.
"""

from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.core.models import DocumentSequence, PlatformSettings

from .models import Invoice, Order, Payment


def to_franc(amount: Decimal) -> int:
    """Arrondi au franc, la demi-unité vers le haut (le `round` de Python arrondit au pair)."""
    return int(amount.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def rate_label(rate: Decimal) -> str:
    """Taux en % tel qu'imprimé et figé : `18` ou `1.5`, sans zéros inutiles."""
    return format(rate.normalize(), "f")


def tax_breakdown(total: int, config: PlatformSettings | None = None) -> dict:
    """
    Ventilation d'un total TTC (XOF entier, référence serveur), arrondie au franc :

    - `vat` (si la TVA est activée) : `excluding_vat = round(TTC × 100 / (100 + taux))`, `vat = TTC − HT`, donc
      HT + TVA = TTC exactement ;
    - `aib` (si l'AIB est activé) : `amount = round(base × taux / 100)` sur la base HT (le total si pas de TVA).
      L'AIB est **affiché** : il n'est pas ajouté au montant payé (décision en attente, C25).
    """
    config = config or PlatformSettings.load()
    vat = aib = None
    base = total
    if config.vat_enabled:
        excluding = to_franc(Decimal(total) * 100 / (100 + config.vat_rate))
        vat = {
            "rate": rate_label(config.vat_rate),
            "excluding_vat": excluding,
            "vat": total - excluding,
            "including_vat": total,
        }
        base = excluding
    if config.aib_enabled:
        aib = {
            "rate": rate_label(config.aib_rate),
            "base": base,
            "amount": to_franc(Decimal(base) * config.aib_rate / 100),
        }
    return {"vat": vat, "aib": aib}


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
            **tax_breakdown(order.total),
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
