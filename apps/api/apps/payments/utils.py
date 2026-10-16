"""
Traitement des notifications de paiement (S5, S9, ADR 0003). Le webhook vérifié est la source de vérité ; la tâche
`reconcile_pending_payments` passe par le même traitement quand un webhook s'est perdu.
"""

import logging

from django.db import transaction
from django.utils import timezone

from apps.core.audit import audit

from .fulfillment import settle
from .models import Order, Payment
from .providers import PaymentEvent, PaymentStatus

logger = logging.getLogger(__name__)

TERMINAL = (Payment.Status.SUCCEEDED, Payment.Status.FAILED)


class WebhookRejected(Exception):
    """Notification de paiement refusée : elle ne doit avoir aucun effet (S5)."""


@transaction.atomic
def handle_payment_event(provider_name: str, event: PaymentEvent) -> bool:
    """
    Applique une notification authentifiée et normalisée. Garanties :
    - verrou sur la commande (`select_for_update`) : deux notifications simultanées sont traitées l'une après
      l'autre, et l'exécution post-paiement n'a lieu qu'une fois ;
    - idempotence : un paiement déjà réussi ou échoué n'est plus modifié (rejeu) ;
    - montant et devise comparés à la commande : un écart fait échouer le paiement, sans payer la commande, et
      laisse une alerte dans le journal d'audit.

    Renvoie False si la notification est refusée après avoir été enregistrée (écart de montant ou de devise).
    """
    order = Order.objects.select_for_update().filter(reference=event.reference).first()
    if order is None:
        raise WebhookRejected("commande inconnue")
    payment = (
        Payment.objects.select_for_update()
        .filter(provider=provider_name, provider_transaction_id=event.provider_tx_id)
        .first()
    )
    if payment is not None and payment.order_id != order.id:
        raise WebhookRejected("transaction rattachée à une autre commande")
    if payment is None:  # initiation perdue ou faite hors de Steamy : la notification fait foi
        payment = Payment.objects.create(
            order=order,
            provider=provider_name,
            provider_transaction_id=event.provider_tx_id,
            amount=event.amount,
            currency=event.currency or order.currency,
            status=Payment.Status.PENDING,
        )
    if payment.status in TERMINAL:
        return True  # rejeu : déjà traité

    payment.payload = {"status": event.status, "amount": event.amount, "currency": event.currency}
    if event.amount != order.total or event.currency != order.currency:
        payment.status = Payment.Status.FAILED
        payment.failure_code = "AMOUNT_MISMATCH"
        payment.failure_reason = "Montant ou devise différents de la commande."
        payment.save()
        audit(
            "payment.amount_mismatch",
            target=order,
            data={
                "payment": payment.pk,
                "expected": [order.total, order.currency],
                "received": [event.amount, event.currency],
            },
        )
        logger.warning("Paiement %s : montant ou devise incohérents", payment.pk)
        return False

    if event.status == PaymentStatus.SUCCEEDED:
        payment.status = Payment.Status.SUCCEEDED
        payment.confirmed_at = timezone.now()
        payment.save()
        settle(order, payment)
    elif event.status == PaymentStatus.FAILED:
        payment.status = Payment.Status.FAILED
        payment.failure_code = "DECLINED"
        payment.failure_reason = event.failure_reason or "Paiement refusé."
        payment.save()
    else:
        payment.status = Payment.Status.PENDING
        payment.save()
    return True
