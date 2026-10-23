"""
Faux fournisseur de facture normalisée : le seul autorisé hors staging et production (ADR 0006).

Il calcule comme l'e-MCF documenté par la DGI : le `price` d'une ligne d'un groupe taxable est **TTC** et la TVA en est
extraite (`HT = arrondi(total du groupe × 100 / (100 + taux))`, `TVA = total du groupe − HT`) ; `total` est la somme des
lignes, l'AIB (calculé sur le HT) est rapporté à part, et ajouté à `total` si `EMECEF_AIB_IN_TOTAL`. Les groupes et taux sont **artificiels** (aucune valeur légale),
d'après l'exemple de la documentation : A = 0, B = 18, C = 0, D = 18, E = 0, F = 0 ; AIB A = 1 %, B = 5 %. Les demandes
vivent dans le cache (Redis en local).

**Pilotable** par le nom du client, pour les tests et les parcours Playwright :

| Nom du client se terminant par | Effet |
| --- | --- |
| `[REFUSED]` | la demande est refusée (`errorCode` métier) |
| `[DOWN]` | échec passager (réessai) |
| autre | accepté |
"""

import uuid
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone

from .base import (
    INVOICE_TYPES,
    PAYMENT_NAMES,
    FiscalError,
    FiscalInvoiceProvider,
    FiscalStatus,
    FiscalTemporaryError,
    InvoiceRequest,
    InvoiceTotals,
    PendingRequest,
    SecurityElements,
    TaxGroups,
)

FAKE_RATES = {"A": 0, "B": 18, "C": 0, "D": 18, "E": 0, "F": 0}
FAKE_AIB = {"A": 1, "B": 5}
FAKE_NIM = "FAKE000001"
TTL = 7 * 24 * 3600


def _key(uid: str) -> str:
    return f"fake-fiscal:{uid}"


def to_franc(amount: Decimal) -> int:
    return int(amount.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _stamp() -> str:
    return timezone.now().strftime("%d/%m/%Y %H:%M:%S")


class FakeFiscalProvider(FiscalInvoiceProvider):
    name = "fake"

    def __init__(self):
        if settings.DEPLOYED:
            raise ImproperlyConfigured(
                "Le faux fournisseur de facture normalisée est interdit en staging et en production (FISCAL_PROVIDER)."
            )

    def status(self) -> FiscalStatus:
        now = timezone.now()
        return FiscalStatus(
            token_valid_until=now + timedelta(days=365),
            ifu="0000000000000",
            nim=FAKE_NIM,
            version="fake",
            emcf_status="Actif",
            server_time=now,
        )

    def pending_requests(self) -> list[PendingRequest]:
        return []

    def tax_groups(self) -> TaxGroups:
        return TaxGroups(rates=dict(FAKE_RATES), aib_a=FAKE_AIB["A"], aib_b=FAKE_AIB["B"])

    def invoice_types(self) -> list[tuple[str, str]]:
        return [(code, f"Type {code} (faux)") for code in INVOICE_TYPES]

    def payment_types(self) -> list[tuple[str, str]]:
        return [(name, f"{name} (faux)") for name in PAYMENT_NAMES]

    def request_invoice(self, request: InvoiceRequest) -> InvoiceTotals:
        if request.client.name.endswith("[DOWN]"):
            raise FiscalTemporaryError("Faux fournisseur indisponible.")
        if request.client.name.endswith("[REFUSED]"):
            raise FiscalError("Demande refusée par le faux fournisseur.", code="99")
        group_totals = {group: 0 for group in "ABCDEF"}
        for item in request.items:
            group_totals[item.tax_group] += to_franc(Decimal(item.price) * item.quantity)
        excl_tax, vat = {}, {}
        for group in "BD":
            excl_tax[group] = to_franc(
                Decimal(group_totals[group]) * 100 / (100 + FAKE_RATES[group])
            )
            vat[group] = group_totals[group] - excl_tax[group]
        total = sum(group_totals.values())
        base_ht = total - sum(vat.values())
        aib = to_franc(Decimal(base_ht) * FAKE_AIB[request.aib] / 100) if request.aib else 0
        total += aib if settings.EMECEF_AIB_IN_TOTAL else 0
        uid = str(uuid.uuid4())
        cache.set(_key(uid), {"state": "requested", "type": request.type}, TTL)
        return InvoiceTotals(
            uid=uid,
            total=total,
            aib=aib,
            group_totals=group_totals,
            excl_tax=excl_tax,
            vat=vat,
            raw={"uid": uid, "total": total, "aib": aib},
        )

    def confirm(self, uid: str) -> SecurityElements:
        invoice = self._pending(uid)
        invoice["state"] = "confirmed"
        cache.set(_key(uid), invoice, TTL)
        code = uid.replace("-", "").upper()[:24]
        return SecurityElements(
            date_time=_stamp(),
            qr_code=f"F;{FAKE_NIM};{code};0000000000000;{timezone.now():%Y%m%d%H%M%S}",
            code="-".join(code[i : i + 4] for i in range(0, 24, 4)),
            counters=f"1/1 {invoice['type']}",
            nim=FAKE_NIM,
        )

    def cancel(self, uid: str) -> SecurityElements:
        invoice = self._pending(uid)
        invoice["state"] = "cancelled"
        cache.set(_key(uid), invoice, TTL)
        return SecurityElements(date_time=_stamp(), qr_code="", code="", counters="", nim=FAKE_NIM)

    @staticmethod
    def _pending(uid: str) -> dict:
        invoice = cache.get(_key(uid))
        if invoice is None or invoice["state"] != "requested":
            raise FiscalError(
                "La facture n'existe pas ou elle est déjà finalisée / annulée.", code="20"
            )
        return invoice
