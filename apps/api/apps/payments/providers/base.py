"""
Interface des prestataires de paiement Mobile Money (S9, ADR 0003).

Le code métier n'appelle jamais un prestataire directement : il passe par `get_provider()`, qui renvoie le
prestataire choisi par `PAYMENT_PROVIDER`. Changer de prestataire ne touche ni aux commandes ni à l'exécution
post-paiement. Les montants sont des entiers en FCFA (XOF), jamais des décimaux.
"""

from dataclasses import dataclass
from enum import StrEnum


class PaymentProviderError(Exception):
    """Demande refusée par le prestataire (numéro, réseau, montant…) : inutile de réessayer."""


class PaymentTemporaryError(PaymentProviderError):
    """Échec passager (réseau, limite de débit, panne du prestataire) : on peut réessayer plus tard."""


class PaymentStatus(StrEnum):
    """Les 4 états d'un paiement (SPEC-TECHNIQUE §3.3), communs à tous les prestataires."""

    INITIATED = "initiated"
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class RefundOutcome(StrEnum):
    #: Remboursé par l'API du prestataire.
    DONE = "done"
    #: À traiter à la main depuis l'admin Finance (`Refund.processed=false`, ADR 0003 §6).
    PENDING_MANUAL = "pending_manual"
    #: Le prestataire ne sait pas rembourser cette transaction.
    UNSUPPORTED = "unsupported"


@dataclass(frozen=True)
class Charge:
    """Demande de débit construite par le serveur à partir d'une commande : rien n'y vient du client, hormis le
    pays, le réseau et le numéro du payeur."""

    reference: str
    amount: int
    currency: str
    country: str
    network: str
    #: Numéro Mobile Money du payeur, en E.164
    msisdn: str
    description: str = ""
    first_name: str = ""
    last_name: str = ""


@dataclass(frozen=True)
class InitiateResult:
    provider_tx_id: str
    status: PaymentStatus
    #: Page du prestataire où finir le paiement (mode redirection). Jamais utilisé avec FedaPay en v1 (ADR 0003).
    redirect_url: str | None = None


@dataclass(frozen=True)
class PaymentEvent:
    """Notification normalisée, lue dans un webhook authentifié (`parse_event`)."""

    reference: str
    provider_tx_id: str
    amount: int
    currency: str
    status: PaymentStatus
    failure_reason: str = ""


class PaymentProvider:
    #: Nom enregistré dans `Payment.provider`, accepté par `PAYMENT_PROVIDER` et dans l'URL du webhook.
    name = ""

    def initiate(self, charge: Charge) -> InitiateResult:
        """Demande le débit du numéro (USSD push, sans redirection) et renvoie la transaction créée."""
        raise NotImplementedError

    def verify_webhook(self, request) -> bool:
        """Authentifie une notification **avant** toute lecture de son contenu (signature du corps brut)."""
        raise NotImplementedError

    def parse_event(self, payload: dict) -> PaymentEvent | None:
        """Normalise une notification authentifiée ; None si elle ne concerne pas un paiement (ignorée).
        Lève `ValueError` si elle est incomplète ou incohérente."""
        raise NotImplementedError

    def fetch_status(self, provider_tx_id: str) -> PaymentStatus:
        """Interroge le prestataire (réconciliation des webhooks perdus)."""
        raise NotImplementedError

    def refund(self, provider_tx_id: str, amount: int) -> RefundOutcome:
        """Rembourse tout ou partie d'une transaction réussie. Par défaut, le prestataire ne sait pas le faire."""
        return RefundOutcome.UNSUPPORTED
