# apps/payments/utils.py
import hashlib
import hmac
import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import IntegrityError, transaction

from .models import Order, Payment

logger = logging.getLogger(__name__)

SUCCESS_STATES = {"success", "completed", "paid", "succeeded", "approved"}


class WebhookRejected(Exception):
    """Notification de paiement refusée : elle ne doit avoir aucun effet (S5)."""


def verify_provider_webhook(provider_name: str, request):
    """
    Vérifie l'authenticité d'une notification (HMAC-SHA256 du corps brut).
    Le format exact de chaque prestataire est intégré en API-L3b, après leur comparaison (S9).
    """
    secret = getattr(settings, f"PAYMENTS_{provider_name.upper()}_SECRET", None)
    if not secret:
        return False

    signature = request.headers.get("X-Signature") or request.headers.get("X-Callback-Signature")
    if not signature:
        return False

    computed = hmac.new(secret.encode(), request.body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature)


def _parse_amount(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise WebhookRejected("montant illisible") from None


@transaction.atomic
def handle_provider_event(provider_name: str, data: dict):
    """
    Enregistre une notification de paiement et marque la commande payée si elle est valide.

    Garanties (S5) :
    - le montant ET la devise doivent correspondre exactement à la commande ;
    - idempotence : une transaction (prestataire + identifiant) n'est traitée qu'une fois,
      même en cas de notifications simultanées (verrou sur la commande + contrainte unique) ;
    - une commande déjà payée n'est jamais modifiée.
    """
    reference = data.get("reference") or data.get("merchant_ref") or data.get("order_ref")
    tx_id = data.get("transaction_id") or data.get("tx_id") or data.get("id")
    status = str(data.get("status") or data.get("state") or data.get("event") or "").lower()
    if not reference or not tx_id:
        raise WebhookRejected("référence ou transaction manquante")

    try:
        order = Order.objects.select_for_update().get(reference=reference)
    except Order.DoesNotExist:
        raise WebhookRejected("commande inconnue") from None

    amount = _parse_amount(data.get("amount"))
    currency = str(data.get("currency") or "").upper()
    if amount != order.total or currency != order.currency.upper():
        raise WebhookRejected(
            f"montant ou devise incohérents ({amount} {currency} pour {order.total} {order.currency})"
        )

    try:
        payment, _ = Payment.objects.get_or_create(
            provider=provider_name,
            provider_transaction_id=str(tx_id),
            defaults={"order": order, "amount": amount, "currency": order.currency},
        )
    except IntegrityError:  # notification concurrente pour la même transaction
        payment = Payment.objects.get(provider=provider_name, provider_transaction_id=str(tx_id))
    if payment.order_id != order.id:
        raise WebhookRejected("transaction déjà rattachée à une autre commande")
    if payment.success or order.paid:
        return payment  # rejeu : déjà traité

    payment.provider_payload = data
    if status in SUCCESS_STATES:
        payment.mark_success(tx_id=str(tx_id))
    else:
        payment.save()
    return payment
