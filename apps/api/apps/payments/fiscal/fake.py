"""
Faux fournisseur de facture normalisée : le seul autorisé hors staging et production (ADR 0006).

Les groupes et taux ci-dessous sont **artificiels** (ils n'ont aucune valeur légale) : ils ne servent qu'à exercer le
flux sans la DGI. Les totaux sont la somme des lignes, plus l'AIB au taux du groupe demandé. Les demandes vivent dans
le cache (Redis en local), ce qui suffit à un faux fournisseur.

**Pilotable** par la référence de commande, pour les tests et les parcours Playwright :

| Fin de la référence | Effet |
| --- | --- |
| `-REFUSED` | la demande est refusée (`errorCode` métier) |
| `-DOWN` | échec passager (réessai) |
| autre | accepté |
"""

import uuid
from datetime import UTC, datetime

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured

from .base import (
    INVOICE_TYPES,
    PAYMENT_NAMES,
    FiscalError,
    FiscalInvoiceProvider,
    FiscalStatus,
    FiscalTemporaryError,
    InvoiceRequest,
    InvoiceTotals,
    SecurityElements,
    TaxGroups,
)

FAKE_RATES = {"A": 0, "B": 18, "C": 0, "D": 0, "E": 0, "F": 0}
FAKE_AIB = {"A": 1, "B": 5}
FAKE_NIM = "FAKE000001"
TTL = 7 * 24 * 3600


def _key(uid: str) -> str:
    return f"fake-fiscal:{uid}"


class FakeFiscalProvider(FiscalInvoiceProvider):
    name = "fake"

    def __init__(self):
        if settings.DEPLOYED:
            raise ImproperlyConfigured(
                "Le faux fournisseur de facture normalisée est interdit en staging et en production (FISCAL_PROVIDER)."
            )

    def status(self) -> FiscalStatus:
        return FiscalStatus(token_valid=True, ifu="0000000000000", nim=FAKE_NIM, version="fake")

    def tax_groups(self) -> TaxGroups:
        return TaxGroups(rates=dict(FAKE_RATES), aib_a=FAKE_AIB["A"], aib_b=FAKE_AIB["B"])

    def invoice_types(self) -> list[tuple[str, str]]:
        return [(code, f"Type {code} (faux)") for code in INVOICE_TYPES]

    def payment_types(self) -> list[tuple[str, str]]:
        return [(name, f"{name} (faux)") for name in PAYMENT_NAMES]

    def request_invoice(self, request: InvoiceRequest) -> InvoiceTotals:
        if request.reference.endswith("-DOWN"):
            raise FiscalTemporaryError("Faux fournisseur indisponible.")
        if request.reference.endswith("-REFUSED"):
            raise FiscalError("Demande refusée par le faux fournisseur.", code="FAKE_REFUSED")
        goods = sum(item.price * int(item.quantity) for item in request.items)
        aib = round(goods * FAKE_AIB[request.aib] / 100) if request.aib else 0
        uid = str(uuid.uuid4())
        cache.set(_key(uid), {"state": "requested", "reference": request.reference}, TTL)
        return InvoiceTotals(
            uid=uid, total=goods + aib, aib=aib, raw={"uid": uid, "total": goods + aib}
        )

    def confirm(self, uid: str) -> SecurityElements:
        invoice = self._known(uid)
        invoice["state"] = "confirmed"
        cache.set(_key(uid), invoice, TTL)
        return SecurityElements(
            date_time=datetime.now(UTC).strftime("%d/%m/%Y %H:%M:%S"),
            qr_code=f"F;{FAKE_NIM};{uid}",
            code=f"FAKE-{uid[:8].upper()}",
            counters="1/1 FV",
            nim=FAKE_NIM,
        )

    def cancel(self, uid: str) -> SecurityElements:
        invoice = self._known(uid)
        invoice["state"] = "cancelled"
        cache.set(_key(uid), invoice, TTL)
        return SecurityElements(
            date_time=datetime.now(UTC).strftime("%d/%m/%Y %H:%M:%S"),
            qr_code=f"X;{FAKE_NIM};{uid}",
            code=f"FAKE-{uid[:8].upper()}",
            counters="1/1 FV",
            nim=FAKE_NIM,
        )

    @staticmethod
    def _known(uid: str) -> dict:
        invoice = cache.get(_key(uid))
        if invoice is None:
            raise FiscalError("Demande inconnue du faux fournisseur.", code="FAKE_UNKNOWN")
        return invoice
