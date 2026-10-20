"""
Initiation d'un paiement Mobile Money (§4.3, D76, S9) : par le serveur, sur un réseau activé pour le pays, pour le
total de la commande calculé par le serveur. L'issue arrive par le webhook (ou la réconciliation).
"""

import logging
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils import timezone

from apps.referentials.models import PaymentNetwork
from libs.errors import ApiError

from .models import Order, Payment
from .providers import (
    Charge,
    PaymentEvent,
    PaymentProviderError,
    PaymentStatus,
    PaymentTemporaryError,
    get_provider,
)

log = logging.getLogger(__name__)

#: Délai après lequel un paiement sans issue est vérifié auprès du prestataire (webhook perdu)
RECONCILE_AFTER = timedelta(minutes=10)

#: Paiements sans issue (initiés ou en attente de validation sur le téléphone)
IN_PROGRESS = (Payment.Status.INITIATED, Payment.Status.PENDING)

#: Durée pendant laquelle un paiement sans issue bloque un nouveau paiement de la commande. Au-delà, il est tenu
#: pour abandonné (demande USSD ignorée) et le payeur peut réessayer ; si ce paiement aboutit quand même, le second
#: débit est remboursé à l'exécution (paiement en double, C17).
PAYMENT_IN_PROGRESS_TTL = timedelta(minutes=5)


def check_payable(order: Order) -> None:
    if order.status == Order.Status.PAID:
        raise ApiError("ORDER_ALREADY_PAID")
    if order.status != Order.Status.PENDING or order.is_expired:
        raise ApiError("ORDER_EXPIRED")


def payer_name(order: Order) -> tuple[str, str]:
    if order.payer is not None:
        return order.payer.first_name, order.payer.last_name
    return order.guest_first_name, order.guest_last_name


def initiate_payment(order: Order, *, country: str, network: str, msisdn: str) -> Payment:
    """Crée le paiement et demande le débit au prestataire. Un refus du prestataire donne un paiement `failed`."""
    check_payable(order)
    if not PaymentNetwork.objects.filter(
        country_id=country, country__active=True, code=network, enabled=True, active=True
    ).exists():
        raise ApiError("NETWORK_UNAVAILABLE", fields={"network": "NETWORK_UNAVAILABLE"})
    provider = get_provider()
    first_name, last_name = payer_name(order)
    with transaction.atomic():
        # Verrou de la commande jusqu'à l'enregistrement de la transaction : un webhook très rapide attend, puis
        # retrouve ce paiement au lieu d'en créer un second.
        locked = Order.objects.select_for_update().get(pk=order.pk)
        # Relue sous le verrou : un webhook qui vient de payer la commande ne laisse pas passer un nouveau débit
        check_payable(locked)
        # Un débit à la fois : un second paiement (double clic, autre onglet) pendant qu'un premier attend sa
        # validation pourrait débiter deux fois le payeur. Sous le verrou de la commande, deux envois simultanés
        # ne passent pas tous les deux.
        recent = timezone.now() - PAYMENT_IN_PROGRESS_TTL
        if locked.payments.filter(status__in=IN_PROGRESS, created_at__gt=recent).exists():
            raise ApiError("PAYMENT_IN_PROGRESS")
        payment = Payment.objects.create(
            order=order,
            provider=provider.name,
            country=country,
            network=network,
            msisdn=msisdn,
            amount=order.total,
            currency=order.currency,
        )
        try:
            result = provider.initiate(
                Charge(
                    reference=order.reference,
                    amount=order.total,
                    currency=order.currency,
                    country=country,
                    network=network,
                    msisdn=msisdn,
                    description=f"Steamy · commande {order.reference}",
                    first_name=first_name,
                    last_name=last_name,
                )
            )
        except PaymentTemporaryError:
            log.exception("Initiation du paiement %s : prestataire indisponible", payment.pk)
            payment.status = Payment.Status.FAILED
            payment.failure_code = Payment.FailureCode.PROVIDER_UNAVAILABLE
            payment.failure_reason = (
                "Le service de paiement est indisponible. Réessayez dans un instant."
            )
        except PaymentProviderError:
            log.exception("Initiation du paiement %s refusée", payment.pk)
            payment.status = Payment.Status.FAILED
            payment.failure_code = Payment.FailureCode.PROVIDER_REFUSED
            payment.failure_reason = "Le paiement a été refusé. Vérifiez le numéro et le réseau."
        else:
            payment.provider_transaction_id = result.provider_tx_id
            payment.status = result.status
        payment.save()
    return payment


def reconcile_pending_payments() -> int:
    """Interroge le prestataire pour les paiements sans issue depuis 10 min (webhook perdu). Renvoie leur nombre."""
    from .utils import WebhookRejected, handle_payment_event

    stale = Payment.objects.select_related("order").filter(
        status__in=IN_PROGRESS,
        created_at__lte=timezone.now() - RECONCILE_AFTER,
    )
    settled = 0
    for payment in stale:
        if not payment.provider_transaction_id:  # l'initiation n'a jamais abouti
            payment.status = Payment.Status.FAILED
            payment.failure_code = Payment.FailureCode.INITIATION_LOST
            payment.failure_reason = "Le paiement n'a pas pu être lancé."
            payment.save(update_fields=["status", "failure_code", "failure_reason"])
            settled += 1
            continue
        try:
            status = get_provider(payment.provider).fetch_status(payment.provider_transaction_id)
        except (PaymentProviderError, ImproperlyConfigured):
            log.warning("Réconciliation du paiement %s impossible pour l'instant", payment.pk)
            continue
        if status not in (PaymentStatus.SUCCEEDED, PaymentStatus.FAILED):
            continue
        event = PaymentEvent(
            reference=payment.order.reference,
            provider_tx_id=payment.provider_transaction_id,
            amount=payment.amount,
            currency=payment.currency,
            status=status,
        )
        try:
            handle_payment_event(payment.provider, event)
        except WebhookRejected:  # pragma: no cover - commande et transaction viennent de notre base
            log.exception("Réconciliation du paiement %s refusée", payment.pk)
            continue
        settled += 1
    return settled
