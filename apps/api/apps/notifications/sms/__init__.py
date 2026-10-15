"""
Envoi de SMS (S10, ADR 0002) : `queue_sms(phone, text, purpose)` est le seul point d'entrée du code métier.

Le fournisseur est choisi par `SMS_PROVIDER` : `fake` (local, CI ; interdit si `DEPLOYED`) ou `twilio`.
"""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction

from .base import SmsError, SmsProvider, SmsStatus, SmsTemporaryError
from .fake import FakeSmsProvider
from .twilio import TwilioProvider

PROVIDERS: dict[str, type[SmsProvider]] = {
    FakeSmsProvider.name: FakeSmsProvider,
    TwilioProvider.name: TwilioProvider,
}

__all__ = [
    "SmsError",
    "SmsProvider",
    "SmsStatus",
    "SmsTemporaryError",
    "get_provider",
    "queue_sms",
]


def get_provider() -> SmsProvider:
    try:
        provider_class = PROVIDERS[settings.SMS_PROVIDER]
    except KeyError:
        raise ImproperlyConfigured(
            f"SMS_PROVIDER inconnu : {settings.SMS_PROVIDER!r} (attendu : {', '.join(PROVIDERS)})"
        ) from None
    return provider_class()


def queue_sms(phone: str, text: str, purpose: str = "") -> None:
    """Programme l'envoi après la validation de la transaction : un SMS ne part jamais pour une saisie annulée."""
    from apps.notifications.tasks import send_sms

    transaction.on_commit(lambda: send_sms.delay(phone, text, purpose))
