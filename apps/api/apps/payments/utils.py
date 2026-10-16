import logging
from decimal import Decimal

from django.db import IntegrityError, transaction

from .models import Order, Payment
from .providers import PaymentEvent, PaymentStatus

logger = logging.getLogger(__name__)


class WebhookRejected(Exception):
    """Notification de paiement refusée : elle ne doit avoir aucun effet (S5)."""


@transaction.atomic
def handle_payment_event(provider_name: str, event: PaymentEvent):
    """
    Enregistre une notification authentifiée et normalisée par le prestataire, et marque la commande payée si elle
    est valide.

    Garanties (S5) :
    - le montant ET la devise doivent correspondre exactement à la commande ;
    - idempotence : une transaction (prestataire + identifiant) n'est traitée qu'une fois,
      même en cas de notifications simultanées (verrou sur la commande + contrainte unique) ;
    - une commande déjà payée n'est jamais modifiée.
    """
    try:
        order = Order.objects.select_for_update().get(reference=event.reference)
    except Order.DoesNotExist:
        raise WebhookRejected("commande inconnue") from None

    if Decimal(event.amount) != order.total or event.currency != order.currency.upper():
        raise WebhookRejected(
            f"montant ou devise incohérents ({event.amount} {event.currency} "
            f"pour {order.total} {order.currency})"
        )

    try:
        payment, _ = Payment.objects.get_or_create(
            provider=provider_name,
            provider_transaction_id=event.provider_tx_id,
            defaults={"order": order, "amount": event.amount, "currency": order.currency},
        )
    except IntegrityError:  # notification concurrente pour la même transaction
        payment = Payment.objects.get(
            provider=provider_name, provider_transaction_id=event.provider_tx_id
        )
    if payment.order_id != order.id:
        raise WebhookRejected("transaction déjà rattachée à une autre commande")
    if payment.success or order.paid:
        return payment  # rejeu : déjà traité

    if event.status == PaymentStatus.SUCCEEDED:
        payment.mark_success(tx_id=event.provider_tx_id)
    else:
        payment.save()
    return payment
