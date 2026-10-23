"""
Facture normalisée e-MECeF (ADR 0006, C26) : `get_fiscal_provider()` est le seul point d'entrée du code métier.

Le fournisseur est choisi par `FISCAL_PROVIDER` : `fake` (local, CI, e2e ; interdit si `DEPLOYED`) ou `emecef`.
"""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .base import (
    FiscalClient,
    FiscalError,
    FiscalInvoiceProvider,
    FiscalItem,
    FiscalPayment,
    FiscalStatus,
    FiscalTemporaryError,
    InvoiceRequest,
    InvoiceTotals,
    PendingRequest,
    SecurityElements,
    TaxGroups,
)
from .emecef import EmecefProvider
from .fake import FakeFiscalProvider

PROVIDERS: dict[str, type[FiscalInvoiceProvider]] = {
    FakeFiscalProvider.name: FakeFiscalProvider,
    EmecefProvider.name: EmecefProvider,
}

__all__ = [
    "PROVIDERS",
    "FiscalClient",
    "FiscalError",
    "FiscalInvoiceProvider",
    "FiscalItem",
    "FiscalPayment",
    "FiscalStatus",
    "FiscalTemporaryError",
    "InvoiceRequest",
    "InvoiceTotals",
    "PendingRequest",
    "SecurityElements",
    "TaxGroups",
    "get_fiscal_provider",
]


def get_fiscal_provider(name: str | None = None) -> FiscalInvoiceProvider:
    """Fournisseur configuré (`FISCAL_PROVIDER`)."""
    name = name or settings.FISCAL_PROVIDER
    try:
        provider_class = PROVIDERS[name]
    except KeyError:
        raise ImproperlyConfigured(
            f"Fournisseur de facture normalisée inconnu : {name!r} (attendu : {', '.join(PROVIDERS)})"
        ) from None
    return provider_class()
