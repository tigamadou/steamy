"""
Paiement Mobile Money (S9, ADR 0003) : `get_provider()` est le seul point d'entrée du code métier.

Le prestataire est choisi par `PAYMENT_PROVIDER` : `fake` (local, CI, e2e ; interdit si `DEPLOYED`) ou `fedapay`.
"""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .base import (
    Charge,
    InitiateResult,
    PaymentEvent,
    PaymentProvider,
    PaymentProviderError,
    PaymentStatus,
    PaymentTemporaryError,
    RefundOutcome,
)
from .fake import FakePaymentProvider
from .fedapay import FedaPayProvider

PROVIDERS: dict[str, type[PaymentProvider]] = {
    FakePaymentProvider.name: FakePaymentProvider,
    FedaPayProvider.name: FedaPayProvider,
}

__all__ = [
    "PROVIDERS",
    "Charge",
    "InitiateResult",
    "PaymentEvent",
    "PaymentProvider",
    "PaymentProviderError",
    "PaymentStatus",
    "PaymentTemporaryError",
    "RefundOutcome",
    "get_provider",
]


def get_provider(name: str | None = None) -> PaymentProvider:
    """Prestataire configuré (`PAYMENT_PROVIDER`), ou celui nommé par l'URL d'un webhook."""
    name = name or settings.PAYMENT_PROVIDER
    try:
        provider_class = PROVIDERS[name]
    except KeyError:
        raise ImproperlyConfigured(
            f"Prestataire de paiement inconnu : {name!r} (attendu : {', '.join(PROVIDERS)})"
        ) from None
    return provider_class()
