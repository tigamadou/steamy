"""
Interface des fournisseurs SMS (S10, ADR 0002).

Le code métier n'appelle jamais un fournisseur directement : il passe par `queue_sms()` (tâche Celery `send_sms`),
qui utilise le fournisseur choisi par `SMS_PROVIDER`. Changer de fournisseur ne touche donc pas le code métier.
"""

from dataclasses import dataclass


class SmsError(Exception):
    """Envoi refusé par le fournisseur (numéro invalide, compte bloqué…) : inutile de réessayer."""


class SmsTemporaryError(SmsError):
    """Échec passager (réseau, limite de débit, panne du fournisseur) : la tâche réessaie."""


@dataclass(frozen=True)
class SmsStatus:
    """Accusé de réception lu dans un webhook de statut."""

    message_id: str
    status: str
    error_code: str = ""


class SmsProvider:
    #: Nom enregistré dans `SmsMessage.provider` et accepté par `SMS_PROVIDER`.
    name = ""

    def send(self, phone: str, text: str) -> str:
        """Envoie `text` au numéro E.164 `phone` et renvoie l'identifiant du message chez le fournisseur."""
        raise NotImplementedError

    def parse_status(self, request) -> SmsStatus | None:
        """Lit un webhook de statut ; None s'il n'est pas authentique. Par défaut, aucun webhook n'est accepté."""
        return None
