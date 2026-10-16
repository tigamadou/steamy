"""
Faux prestataire de paiement : le seul autorisé hors staging et production (S9, ADR 0003).

**Pilotable** par le numéro Mobile Money saisi, pour les tests et les parcours Playwright :

| Fin du numéro | Issue |
| --- | --- |
| `…01` | succès |
| `…02` | échec (solde insuffisant) |
| `…03` | reste en attente (aucune notification : webhook perdu, réconciliation) |
| autre | succès |

L'issue est notifiée comme le ferait un vrai prestataire : un webhook **signé** est posté de façon asynchrone
(tâche Celery `deliver_fake_webhook`, après la validation de la transaction) sur `payments/webhook/fake/`, et passe
donc par la même vérification de signature et le même traitement que les vrais. Les transactions vivent dans le
cache (Redis en local), ce qui suffit à un faux prestataire.
"""

import hashlib
import hmac
import json
import logging
import uuid

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction

from libs.phone import mask_phone

from .base import (
    Charge,
    InitiateResult,
    PaymentEvent,
    PaymentProvider,
    PaymentProviderError,
    PaymentStatus,
    RefundOutcome,
)

log = logging.getLogger(__name__)

#: Secret de signature du faux prestataire : il n'ouvre rien, le faux prestataire étant refusé si `DEPLOYED`.
FAKE_WEBHOOK_SECRET = "steamy-fake-payment"
SIGNATURE_HEADER = "X-Fake-Signature"
#: Durée de vie d'une fausse transaction dans le cache
TRANSACTION_TTL = 7 * 24 * 3600

OUTCOMES = {
    "01": PaymentStatus.SUCCEEDED,
    "02": PaymentStatus.FAILED,
    "03": PaymentStatus.PENDING,
}
FAILURE_REASON = "Solde insuffisant (faux prestataire)."


def sign(body: bytes) -> str:
    return hmac.new(FAKE_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()


def outcome_for(msisdn: str) -> PaymentStatus:
    return OUTCOMES.get(msisdn[-2:], PaymentStatus.SUCCEEDED)


def _key(provider_tx_id: str) -> str:
    return f"fake-payment:{provider_tx_id}"


class FakePaymentProvider(PaymentProvider):
    name = "fake"

    def __init__(self):
        if settings.DEPLOYED:
            raise ImproperlyConfigured(
                "Le faux prestataire de paiement est interdit en staging et en production (PAYMENT_PROVIDER)."
            )

    # --- Transactions (cache) ------------------------------------------------------------------

    def get(self, provider_tx_id: str) -> dict:
        record = cache.get(_key(provider_tx_id))
        if record is None:
            raise PaymentProviderError(f"transaction inconnue : {provider_tx_id}")
        return record

    def _save(self, provider_tx_id: str, record: dict) -> None:
        cache.set(_key(provider_tx_id), record, TRANSACTION_TTL)

    def settle(self, provider_tx_id: str, status: PaymentStatus) -> dict:
        """Fixe l'issue d'une transaction (notification ou `simulate_payment`) et renvoie la notification à poster."""
        record = {**self.get(provider_tx_id), "status": str(status)}
        self._save(provider_tx_id, record)
        payload = {
            "reference": record["reference"],
            "transactionId": provider_tx_id,
            "amount": record["amount"],
            "currency": record["currency"],
            "status": record["status"],
        }
        if status == PaymentStatus.FAILED:
            payload["failureReason"] = FAILURE_REASON
        return payload

    # --- Interface -----------------------------------------------------------------------------

    def initiate(self, charge: Charge) -> InitiateResult:
        provider_tx_id = f"fake-{uuid.uuid4().hex}"
        self._save(
            provider_tx_id,
            {
                "reference": charge.reference,
                "amount": charge.amount,
                "currency": charge.currency,
                "status": str(PaymentStatus.PENDING),
            },
        )
        outcome = outcome_for(charge.msisdn)
        log.info(
            "Faux paiement %s (%s, %s) : issue %s",
            provider_tx_id,
            charge.reference,
            mask_phone(charge.msisdn),
            outcome,
        )
        if outcome != PaymentStatus.PENDING:
            from apps.payments.tasks import deliver_fake_webhook

            transaction.on_commit(
                lambda: deliver_fake_webhook.apply_async(
                    (provider_tx_id, str(outcome)), countdown=settings.FAKE_PAYMENT_DELAY
                )
            )
        return InitiateResult(provider_tx_id=provider_tx_id, status=PaymentStatus.PENDING)

    def verify_webhook(self, request) -> bool:
        received = request.headers.get(SIGNATURE_HEADER, "")
        return bool(received) and hmac.compare_digest(sign(request.body), received)

    def parse_event(self, payload: dict) -> PaymentEvent | None:
        try:
            return PaymentEvent(
                reference=str(payload["reference"]),
                provider_tx_id=str(payload["transactionId"]),
                amount=int(payload["amount"]),
                currency=str(payload["currency"]).upper(),
                status=PaymentStatus(payload["status"]),
                failure_reason=str(payload.get("failureReason", "")),
            )
        except (KeyError, TypeError) as error:
            raise ValueError(f"notification incomplète : {error}") from None

    def fetch_status(self, provider_tx_id: str) -> PaymentStatus:
        return PaymentStatus(self.get(provider_tx_id)["status"])

    def refund(self, provider_tx_id: str, amount: int) -> RefundOutcome:
        self.get(provider_tx_id)
        log.info("Faux remboursement de %s FCFA sur %s", amount, provider_tx_id)
        return RefundOutcome.DONE


def webhook_body(payload: dict) -> bytes:
    return json.dumps(payload).encode()
