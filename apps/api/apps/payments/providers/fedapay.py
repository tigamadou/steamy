"""
Prestataire réel : FedaPay (ADR 0003), par son API REST v1 et ses webhooks signés. Pas de SDK Python officiel.

Paiement sans redirection, initié par le serveur : création de la transaction (`POST /transactions`, référence de
la commande dans `merchant_reference`), jeton (`POST /transactions/{id}/token`), puis débit direct sur le réseau
choisi (`POST /{mode}` : le payeur valide sur son téléphone). Le webhook signé fait foi ; `fetch_status` sert à la
réconciliation.

Configuration lue dans l'environnement, jamais dans le dépôt : `FEDAPAY_SECRET_KEY` (clé secrète `sk_…`),
`FEDAPAY_WEBHOOK_SECRET` (secret du webhook `wh_…`), `FEDAPAY_ENVIRONMENT` (`sandbox` ou `live`). Les modes de débit
par réseau (`FEDAPAY_MODES`) et les identifiants de devise (`FEDAPAY_CURRENCY_IDS`) sont à confirmer dans le bac à
sable (inconnues 1 et 5 de l'ADR 0003), d'où des réglages plutôt que des constantes.
"""

import hashlib
import hmac
import logging
import time

import requests
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

log = logging.getLogger(__name__)

API_URLS = {
    "sandbox": "https://sandbox-api.fedapay.com/v1",
    "live": "https://api.fedapay.com/v1",
}
TIMEOUT_SECONDS = 15
SIGNATURE_HEADER = "X-FEDAPAY-SIGNATURE"
#: Écart toléré entre l'horodatage signé et l'heure du serveur (rejeu d'une vieille notification)
SIGNATURE_TOLERANCE_SECONDS = 300

#: Statuts FedaPay d'une transaction → statut Steamy
STATUSES = {
    "pending": PaymentStatus.PENDING,
    "approved": PaymentStatus.SUCCEEDED,
    "transferred": PaymentStatus.SUCCEEDED,
    "declined": PaymentStatus.FAILED,
    "canceled": PaymentStatus.FAILED,
    "expired": PaymentStatus.FAILED,
    "refunded": PaymentStatus.FAILED,
}
FAILURE_REASONS = {
    "declined": "Paiement refusé par l'opérateur.",
    "canceled": "Paiement annulé.",
    "expired": "Paiement non validé à temps.",
    "refunded": "Paiement remboursé.",
}


class FedaPayProvider(PaymentProvider):
    name = "fedapay"

    def __init__(self):
        self.secret_key = settings.FEDAPAY_SECRET_KEY
        self.webhook_secret = settings.FEDAPAY_WEBHOOK_SECRET
        environment = settings.FEDAPAY_ENVIRONMENT
        if not (self.secret_key and self.webhook_secret):
            raise ImproperlyConfigured(
                "FEDAPAY_SECRET_KEY et FEDAPAY_WEBHOOK_SECRET sont obligatoires."
            )
        if environment not in API_URLS:
            raise ImproperlyConfigured(
                f"FEDAPAY_ENVIRONMENT inconnu : {environment!r} (attendu : sandbox ou live)"
            )
        self.api_url = API_URLS[environment]

    # --- Appels à l'API ------------------------------------------------------------------------

    def _call(self, method: str, path: str, payload: dict | None = None) -> dict:
        try:
            response = requests.request(
                method,
                f"{self.api_url}{path}",
                json=payload,
                headers={"Authorization": f"Bearer {self.secret_key}"},
                timeout=TIMEOUT_SECONDS,
            )
        except requests.RequestException as error:
            raise PaymentTemporaryError(
                f"FedaPay injoignable : {error.__class__.__name__}"
            ) from error
        if response.status_code == 429 or response.status_code >= 500:
            raise PaymentTemporaryError(f"FedaPay indisponible (HTTP {response.status_code})")
        if not response.ok:
            raise PaymentProviderError(f"Demande refusée par FedaPay (HTTP {response.status_code})")
        try:
            return response.json()
        except ValueError:
            raise PaymentTemporaryError("Réponse illisible de FedaPay") from None

    @staticmethod
    def _transaction(data: dict) -> dict:
        transaction = data.get("v1/transaction", data)
        if not isinstance(transaction, dict) or "id" not in transaction:
            raise PaymentTemporaryError("Réponse de FedaPay sans transaction")
        return transaction

    # --- Interface -----------------------------------------------------------------------------

    def initiate(self, charge: Charge) -> InitiateResult:
        mode = settings.FEDAPAY_MODES.get(f"{charge.country}:{charge.network}")
        if not mode:
            raise PaymentProviderError(
                f"Réseau non pris en charge : {charge.country}:{charge.network}"
            )
        transaction = self._transaction(
            self._call(
                "POST",
                "/transactions",
                {
                    "description": charge.description or f"Commande {charge.reference}",
                    "amount": charge.amount,
                    "currency": {"iso": charge.currency},
                    "merchant_reference": charge.reference,
                    "callback_url": settings.FEDAPAY_CALLBACK_URL,
                    "customer": {
                        "firstname": charge.first_name,
                        "lastname": charge.last_name,
                        "phone_number": {
                            "number": national_number(charge.msisdn, charge.country),
                            "country": charge.country.lower(),
                        },
                    },
                },
            )
        )
        provider_tx_id = str(transaction["id"])
        token = self._call("POST", f"/transactions/{provider_tx_id}/token").get("token")
        if not token:
            raise PaymentTemporaryError("Jeton de paiement FedaPay absent")
        self._call("POST", f"/{mode}", {"token": token})
        return InitiateResult(provider_tx_id=provider_tx_id, status=PaymentStatus.PENDING)

    def verify_webhook(self, request) -> bool:
        """`X-FEDAPAY-SIGNATURE: t=<horodatage>,s=<HMAC-SHA256("<t>.<corps>")>` (inconnue 5 de l'ADR 0003)."""
        parts = dict(
            item.split("=", 1)
            for item in request.headers.get(SIGNATURE_HEADER, "").split(",")
            if "=" in item
        )
        timestamp, received = parts.get("t", ""), parts.get("s", "")
        if not (timestamp.isdigit() and received):
            return False
        if abs(time.time() - int(timestamp)) > SIGNATURE_TOLERANCE_SECONDS:
            return False
        signed = timestamp.encode() + b"." + request.body
        expected = hmac.new(self.webhook_secret.encode(), signed, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, received)

    def parse_event(self, payload: dict) -> PaymentEvent | None:
        if not str(payload.get("name", "")).startswith("transaction."):
            return None  # autres événements du compte (clients, virements) : sans effet
        entity = payload.get("entity")
        if not isinstance(entity, dict):
            raise ValueError("notification sans transaction")
        status = STATUSES.get(entity.get("status"))
        reference = entity.get("merchant_reference")
        if status is None or not reference or not entity.get("id"):
            raise ValueError("transaction incomplète")
        try:
            amount = int(entity["amount"])
        except (KeyError, TypeError, ValueError):
            raise ValueError("montant illisible") from None
        return PaymentEvent(
            reference=str(reference),
            provider_tx_id=str(entity["id"]),
            amount=amount,
            currency=currency_of(entity),
            status=status,
            failure_reason=FAILURE_REASONS.get(entity["status"], ""),
        )

    def fetch_status(self, provider_tx_id: str) -> PaymentStatus:
        transaction = self._transaction(self._call("GET", f"/transactions/{provider_tx_id}"))
        return STATUSES.get(transaction.get("status"), PaymentStatus.PENDING)

    def refund(self, provider_tx_id: str, amount: int) -> RefundOutcome:
        """Pas d'API publique de remboursement (ADR 0003 §6) : traité par la Finance dans le tableau de bord."""
        log.info("Remboursement FedaPay %s (%s FCFA) à traiter à la main", provider_tx_id, amount)
        return RefundOutcome.PENDING_MANUAL


def currency_of(entity: dict) -> str:
    currency = entity.get("currency")
    if isinstance(currency, dict) and currency.get("iso"):
        return str(currency["iso"]).upper()
    return settings.FEDAPAY_CURRENCY_IDS.get(str(entity.get("currency_id")), "")


def national_number(msisdn: str, country: str) -> str:
    """Numéro sans indicatif, comme l'attend FedaPay (`phone_number.number`)."""
    from apps.referentials.models import Country

    dial_code = Country.objects.filter(code=country).values_list("dial_code", flat=True).first()
    prefix = f"+{dial_code}" if dial_code else "+"
    return msisdn.removeprefix(prefix)
