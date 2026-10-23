"""
Demande e-MECeF d'une commande (ADR 0006, §2) : lignes à prix **TTC** dont la somme est exactement notre total hors AIB.

Nos prix sont HT et les taxes s'ajoutent (C25), la TVA étant calculée une fois sur le total de la commande et figée
(`Order.taxes`). L'e-MCF extrait la TVA du prix TTC d'un groupe taxable : `HT = arrondi(total du groupe × 100 / (100 +
taux))`. Avec `T = base HT taxée + TVA figée`, cette extraction redonne **exactement** la base et la TVA de la commande,
pour tout taux (l'écart d'arrondi de la TVA est au plus de 0,5 franc). La TVA est répartie entre les lignes taxées au
plus fort reste ; une ligne dont le TTC n'est pas divisible par sa quantité part en quantité 1 (« titre × quantité »).
"""

from dataclasses import dataclass
from decimal import Decimal

from .base import FiscalClient, FiscalItem, FiscalPayment, InvoiceRequest

SHIPPING_TITLE = "Livraison"


@dataclass(frozen=True)
class Expected:
    """Ce que l'e-MCF doit renvoyer pour que la facture soit confirmée : nos montants figés."""

    taxed_group: str
    #: Total TTC envoyé au groupe taxé (0 sans TVA) et part de TVA / base HT qu'on y attend
    taxed_total: int
    vat_base: int
    vat: int
    aib: int
    #: Somme des lignes : HT + livraison + TVA, sans l'AIB
    lines_total: int
    #: `lines_total`, plus l'AIB si `total` l'inclut (réglage `EMECEF_AIB_IN_TOTAL`)
    total: int


def allocate(weights: list[int], amount: int) -> list[int]:
    """Répartit `amount` entre les lignes proportionnellement à `weights`, au plus fort reste ; la somme est exacte."""
    whole = sum(weights)
    if not whole:
        return [0] * len(weights)
    shares = [amount * weight // whole for weight in weights]
    order = sorted(range(len(weights)), key=lambda i: (-(amount * weights[i] % whole), i))
    for index in order[: amount - sum(shares)]:
        shares[index] += 1
    return shares


def _line(title: str, quantity: int, amount: int, group: str) -> FiscalItem:
    """Ligne d'un montant total entier : prix unitaire entier si la division est exacte, sinon quantité 1."""
    if quantity > 1 and amount % quantity == 0:
        return FiscalItem("", title, amount // quantity, Decimal(quantity), group)
    return FiscalItem(
        "", f"{title} × {quantity}" if quantity > 1 else title, amount, Decimal(1), group
    )


def build_request(
    order, buyer: dict, config, aib: str | None, aib_in_total: bool
) -> tuple[InvoiceRequest, Expected]:
    goods = [(item.title, item.quantity, item.total) for item in order.items.all()]
    shipping = order.shipping_fee
    vat = order.taxes.get("vat")
    aib_tax = order.taxes.get("aib")
    lines = [*goods, *([(SHIPPING_TITLE, 1, shipping)] if shipping else [])]
    goods_total = sum(total for _, _, total in goods)
    taxed_flags = [bool(vat)] * len(goods)
    if shipping:
        taxed_flags.append(bool(vat) and vat["base"] == goods_total + shipping)
    taxed_amounts = [
        total if taxed else 0 for (_, _, total), taxed in zip(lines, taxed_flags, strict=True)
    ]
    shares = allocate(taxed_amounts, vat["amount"] if vat else 0)
    items = []
    for (title, quantity, total), taxed, share in zip(lines, taxed_flags, shares, strict=True):
        if taxed:
            items.append(_line(title, quantity, total + share, config.emecef_taxed_group))
        else:
            items.append(_line(title, quantity, total, config.emecef_exempt_group))
    lines_total = goods_total + shipping + (vat["amount"] if vat else 0)
    aib_amount = aib_tax["amount"] if aib_tax else 0
    expected = Expected(
        taxed_group=config.emecef_taxed_group,
        taxed_total=(vat["base"] + vat["amount"]) if vat else 0,
        vat_base=vat["base"] if vat else 0,
        vat=vat["amount"] if vat else 0,
        aib=aib_amount,
        lines_total=lines_total,
        total=lines_total + (aib_amount if aib_in_total else 0),
    )
    request = InvoiceRequest(
        type="FV",
        items=items,
        client=FiscalClient(name=buyer.get("name", ""), contact=buyer.get("phone", "")),
        payments=[FiscalPayment("MOBILEMONEY", expected.total)],
        aib=aib,
        operator_name="Steamy",
    )
    return request, expected


def discrepancies(expected: Expected, totals) -> list[str]:
    """Écarts entre la réponse de l'e-MCF et nos montants figés ; vide si la facture peut être confirmée."""
    found = []
    if totals.total != expected.total:
        found.append(f"total {totals.total} au lieu de {expected.total}")
    if totals.aib != expected.aib:
        found.append(f"AIB {totals.aib} au lieu de {expected.aib}")
    if expected.vat_base:
        group = expected.taxed_group
        if totals.group_totals.get(group) != expected.taxed_total:
            found.append(
                f"groupe {group} {totals.group_totals.get(group)} au lieu de {expected.taxed_total}"
            )
        if group in totals.vat and totals.vat[group] != expected.vat:
            found.append(f"TVA {totals.vat[group]} au lieu de {expected.vat}")
        if group in totals.excl_tax and totals.excl_tax[group] != expected.vat_base:
            found.append(f"HT {totals.excl_tax[group]} au lieu de {expected.vat_base}")
    return found
