"""Moteur de taxes (C25) : HT + livraison + TVA + AIB, arrondi unique au franc (demi-haut) sur le total."""

from decimal import Decimal

from apps.core.models import PlatformSettings
from apps.payments.taxes import compute_taxes, rate_label, to_franc


def config(**fields):
    return PlatformSettings(**fields)


def test_nothing_is_added_by_default():
    quote = compute_taxes(10000, 2000, config())
    assert (quote.vat, quote.aib, quote.total) == (None, None, 12000)
    assert quote.snapshot() == {"vat": None, "aib": None}


def test_vat_alone_is_added_on_goods_and_shipping():
    quote = compute_taxes(10000, 2000, config(vat_enabled=True, vat_rate=Decimal("18")))
    assert (quote.vat.base, quote.vat.amount, quote.aib, quote.total) == (12000, 2160, None, 14160)


def test_aib_alone_is_added():
    quote = compute_taxes(10000, 0, config(aib_enabled=True, aib_rate=Decimal("1.5")))
    assert (quote.aib.rate, quote.aib.base, quote.aib.amount, quote.vat) == (
        "1.5",
        10000,
        150,
        None,
    )
    assert quote.total == 10150


def test_both_taxes_are_independent_aib_is_not_computed_on_vat():
    quote = compute_taxes(
        10000,
        2000,
        config(vat_enabled=True, vat_rate=Decimal("18"), aib_enabled=True, aib_rate=Decimal("5")),
    )
    assert (quote.vat.amount, quote.aib.base, quote.aib.amount) == (2160, 12000, 600)
    assert quote.total == 10000 + 2000 + 2160 + 600
    assert quote.snapshot() == {
        "vat": {"rate": "18", "base": 12000, "amount": 2160},
        "aib": {"rate": "5", "base": 12000, "amount": 600},
    }


def test_shipping_is_taxed_per_tax_switch():
    quote = compute_taxes(
        10000,
        2000,
        config(
            vat_enabled=True,
            vat_rate=Decimal("18"),
            vat_applies_to_shipping=False,
            aib_enabled=True,
            aib_rate=Decimal("5"),
        ),
    )
    assert (quote.vat.base, quote.vat.amount) == (10000, 1800)
    assert (quote.aib.base, quote.aib.amount) == (12000, 600)
    quote = compute_taxes(
        10000,
        2000,
        config(aib_enabled=True, aib_rate=Decimal("5"), aib_applies_to_shipping=False),
    )
    assert (quote.aib.base, quote.aib.amount) == (10000, 500)


def test_rounding_is_once_on_the_total_half_up():
    assert [to_franc(Decimal(v)) for v in ("2.4", "2.5", "3.5")] == [2, 3, 4]
    # 3 lignes de 33 FCFA à 1,5 % : arrondi du total (99 × 1,5 % = 1,485 → 1), pas ligne par ligne (3 × 0)
    quote = compute_taxes(99, 0, config(aib_enabled=True, aib_rate=Decimal("1.5")))
    assert quote.aib.amount == 1
    quote = compute_taxes(100, 0, config(vat_enabled=True, vat_rate=Decimal("2.5")))
    assert quote.vat.amount == 3


def test_rate_label_drops_useless_zeros():
    assert rate_label(Decimal("18.00")) == "18" and rate_label(Decimal("0.50")) == "0.5"
    assert rate_label(Decimal("100.00")) == "100"
