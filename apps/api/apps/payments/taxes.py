"""
Taxes d'une commande (ADR 0005, C25). Les prix du catalogue, des kits et des événements sont **HT** ; la TVA et
l'AIB, si le personnel les active (`PlatformSettings`), **s'ajoutent** au montant payé :

    total à payer = HT (lignes) + livraison + TVA + AIB

- base de la TVA : lignes HT, plus la livraison si `vat_applies_to_shipping` ;
- base de l'AIB : lignes HT, plus la livraison si `aib_applies_to_shipping` ; **jamais la TVA** (indépendante) ;
- arrondi : **une seule fois par taxe, sur le total de la commande**, au franc, la demi-unité vers le haut (le
  `round` de Python arrondit au pair). Pas d'arrondi par ligne : la ventilation de la facture est celle du total.

`compute_taxes` est une fonction pure ; le résultat est figé sur la commande à sa création et jamais recalculé.
"""

from dataclasses import asdict, dataclass
from decimal import ROUND_HALF_UP, Decimal


def to_franc(amount: Decimal) -> int:
    return int(amount.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def rate_label(rate: Decimal) -> str:
    """Taux en % tel qu'il est figé et imprimé : `18` ou `1.5`, sans zéros inutiles."""
    return format(rate.normalize(), "f")


@dataclass(frozen=True)
class Tax:
    rate: str
    base: int
    amount: int


@dataclass(frozen=True)
class TaxQuote:
    goods: int
    shipping: int
    vat: Tax | None
    aib: Tax | None

    @property
    def total(self) -> int:
        return self.goods + self.shipping + sum(tax.amount for _, tax in self._taxes() if tax)

    def lines(self) -> list[dict]:
        """Lignes de taxes à afficher, dans l'ordre TVA puis AIB : `{code, rate, base, amount}`."""
        return [{"code": code, **asdict(tax)} for code, tax in self._taxes() if tax]

    def _taxes(self):
        return (("vat", self.vat), ("aib", self.aib))

    def snapshot(self) -> dict:
        """Contenu figé sur la commande (JSON) : taxes appliquées, jamais recalculées."""
        return {"vat": self.vat and asdict(self.vat), "aib": self.aib and asdict(self.aib)}


def _tax(enabled: bool, rate: Decimal, goods: int, shipping: int, on_shipping: bool) -> Tax | None:
    if not enabled:
        return None
    base = goods + (shipping if on_shipping else 0)
    return Tax(rate_label(rate), base, to_franc(Decimal(base) * rate / 100))


def compute_taxes(goods: int, shipping: int, config) -> TaxQuote:
    """Taxes d'une commande de `goods` FCFA HT (lignes) et `shipping` FCFA de livraison, selon les réglages."""
    return TaxQuote(
        goods=goods,
        shipping=shipping,
        vat=_tax(
            config.vat_enabled, config.vat_rate, goods, shipping, config.vat_applies_to_shipping
        ),
        aib=_tax(
            config.aib_enabled, config.aib_rate, goods, shipping, config.aib_applies_to_shipping
        ),
    )


def snapshot_lines(snapshot: dict) -> list[dict]:
    """Lignes de taxes d'une commande, lues dans son instantané figé (`Order.taxes`)."""
    return [{"code": code, **snapshot[code]} for code in ("vat", "aib") if snapshot.get(code)]


def taxes_share(order, goods: int) -> int:
    """Part de TVA + AIB d'une commande qui revient à `goods` FCFA HT de ses lignes (remboursement partiel), au franc."""
    if not order.subtotal:
        return 0
    return to_franc(Decimal(order.vat_amount + order.aib_amount) * goods / order.subtotal)
