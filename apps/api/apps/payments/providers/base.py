"""
Interface des prestataires de paiement Mobile Money (S9, ADR 0003).

Le code métier n'appelle jamais un prestataire directement : il passe par `get_provider()`, qui renvoie le
prestataire choisi par `PAYMENT_PROVIDER`. Changer de prestataire ne touche ni aux commandes ni à l'exécution
post-paiement. Les montants sont des entiers en FCFA (XOF), jamais des décimaux.
"""

from dataclasses import dataclass, field
from enum import StrEnum


class PaymentProviderError(Exception):
    """Demande refusée par le prestataire (numéro, réseau, montant…) : inutile de réessayer."""

    def __init__(self, message: str = "", *, provider_tx_id: str | None = None):
        super().__init__(message)
        #: Identifiant de la transaction chez le prestataire si elle a été créée avant l'échec, sinon None
        self.provider_tx_id = provider_tx_id


class PaymentTemporaryError(PaymentProviderError):
    """Échec passager (réseau, limite de débit, panne du prestataire, jeton absent) : on peut réessayer plus tard.
    Porte aussi `provider_tx_id` quand la transaction existait déjà."""


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

    #: Référence de la commande (description, journal)
    reference: str
    #: Unique par tentative, envoyée au prestataire (ADR 0008 §2) ; égale à `Payment.merchant_reference`
    merchant_reference: str
    amount: int
    currency: str
    country: str
    network: str
    #: Numéro Mobile Money du payeur, en E.164
    msisdn: str
    description: str = ""
    first_name: str = ""
    last_name: str = ""
    #: Non sensible : `{"order": <référence>, "payment": <id>}`
    metadata: dict[str, str | int] = field(default_factory=dict)


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


@dataclass(frozen=True)
class ProviderTransaction:
    """Transaction relue chez le prestataire (`fetch_transaction`), normalisée."""

    provider_tx_id: str
    #: Statut normalisé : en attente → PENDING ; approuvée → SUCCEEDED ; refusée, annulée, expirée, remboursée →
    #: FAILED ; statut inconnu → PENDING
    status: PaymentStatus
    #: Statut brut du prestataire, tel quel (vocabulaire FedaPay, minuscules) ; vide si absent
    provider_status: str
    #: Montant en FCFA
    amount: int
    #: ISO en majuscules ; vide si inconnue
    currency: str
    #: Vide si absente
    merchant_reference: str
    #: Frais du prestataire en FCFA ; None si inconnus
    fees: int | None = None


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

    def transaction_id_of(self, payload: dict) -> str | None:
        """Identifiant de transaction d'une notification **déjà authentifiée**, sans exiger le reste du corps ;
        None si elle ne concerne pas une transaction. Ne lève jamais."""
        raise NotImplementedError

    def fetch_transaction(self, provider_tx_id: str) -> ProviderTransaction:
        """Relit la transaction chez le prestataire (webhook, réconciliation, « Revérifier »). N'écrit rien.
        Lève `PaymentProviderError` (refusée ou inconnue) ou `PaymentTemporaryError` (réseau, 429, 5xx, illisible)."""
        raise NotImplementedError

    def supports(self, country: str, network: str) -> bool:
        """Le prestataire sait-il débiter ce réseau dans ce pays ?"""
        raise NotImplementedError

    def refund(self, provider_tx_id: str, amount: int) -> RefundOutcome:
        """Rembourse tout ou partie d'une transaction réussie. Par défaut, le prestataire ne sait pas le faire."""
        return RefundOutcome.UNSUPPORTED
