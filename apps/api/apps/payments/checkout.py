"""
Initiation d'un paiement Mobile Money (§4.3, D76, S9) : par le serveur, sur un réseau activé pour le pays, pour le
total de la commande calculé par le serveur. L'issue arrive par le webhook (ou la réconciliation).
"""

import logging
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.referentials.models import PaymentNetwork
from libs.errors import ApiError

from .models import Order, Payment
from .providers import (
    Charge,
    PaymentProviderError,
    PaymentTemporaryError,
    get_provider,
)

log = logging.getLogger(__name__)

#: Délai après lequel un paiement sans issue est vérifié auprès du prestataire (webhook perdu)
RECONCILE_AFTER = timedelta(minutes=10)

#: Un paiement encore en attente chez le prestataire après ce délai n'a jamais été validé : il expire
EXPIRE_AFTER = timedelta(hours=24)

#: Un échec non définitif n'est revérifié que pendant cette durée après la création du paiement…
RETRY_FAILED_WINDOW = timedelta(hours=48)

#: …et au plus une fois par ce délai
RETRY_FAILED_EVERY = timedelta(minutes=30)

#: Paiements sans issue (initiés ou en attente de validation sur le téléphone)
IN_PROGRESS = (Payment.Status.INITIATED, Payment.Status.PENDING)

#: Durée pendant laquelle un paiement sans issue bloque un nouveau paiement de la commande. Au-delà, il est tenu
#: pour abandonné (demande USSD ignorée) et le payeur peut réessayer ; si ce paiement aboutit quand même, le second
#: débit est remboursé à l'exécution (paiement en double, C17).
PAYMENT_IN_PROGRESS_TTL = timedelta(minutes=5)

#: Échecs qui ne sont pas définitifs : un paiement ainsi échoué est revérifié chez le prestataire et peut encore
#: passer à réussi (le payeur a validé après le délai, l'initiation n'avait pas abouti côté Steamy…)
RETRIABLE_FAILURES = (
    Payment.FailureCode.DECLINED,
    Payment.FailureCode.EXPIRED,
    Payment.FailureCode.INITIATION_LOST,
)


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
    try:
        provider = get_provider()
    except ImproperlyConfigured:
        log.error("Initiation du paiement impossible : prestataire non configuré")
        raise ApiError("PAYMENT_UNAVAILABLE") from None
    if not provider.supports(country, network):
        raise ApiError("NETWORK_UNAVAILABLE", fields={"network": "NETWORK_UNAVAILABLE"})
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
        # `merchant_reference` (`<référence>-<rang>`) est posée par `Payment.save`, sous ce verrou
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
                    merchant_reference=payment.merchant_reference,
                    amount=order.total,
                    currency=order.currency,
                    country=country,
                    network=network,
                    msisdn=msisdn,
                    description=f"Steamy · commande {order.reference}",
                    first_name=first_name,
                    last_name=last_name,
                    metadata={"order": order.reference, "payment": payment.pk},
                )
            )
        except PaymentProviderError as error:
            # La transaction a pu être créée avant l'échec : son identifiant n'est jamais perdu
            payment.provider_transaction_id = error.provider_tx_id
            if isinstance(error, PaymentTemporaryError):
                log.warning("Initiation du paiement %s : prestataire indisponible", payment.pk)
                if error.provider_tx_id:  # à retrouver : la réconciliation tranche
                    payment.status = Payment.Status.PENDING
                else:
                    payment.status = Payment.Status.FAILED
                    payment.failure_code = Payment.FailureCode.PROVIDER_UNAVAILABLE
                    payment.failure_reason = (
                        "Le service de paiement est indisponible. Réessayez dans un instant."
                    )
            else:
                log.warning("Initiation du paiement %s refusée", payment.pk)
                payment.status = Payment.Status.FAILED
                payment.failure_code = Payment.FailureCode.PROVIDER_REFUSED
                payment.failure_reason = (
                    "Le paiement a été refusé. Vérifiez le numéro et le réseau."
                )
        else:
            payment.provider_transaction_id = result.provider_tx_id
            payment.status = result.status
        payment.save()
    return payment


def verify_payment(payment: Payment) -> Payment:
    """Relit la transaction chez le prestataire et applique le résultat (réconciliation, « Revérifier »).
    Renvoie une instance **neuve** du paiement (avec `order` chargée), à jour. Sans identifiant de transaction, ne
    fait rien. Les erreurs du prestataire et `ImproperlyConfigured` se propagent."""
    from .utils import apply_transaction

    if payment.provider_transaction_id:
        tx = get_provider(payment.provider).fetch_transaction(payment.provider_transaction_id)
        apply_transaction(payment.provider, tx)
        return Payment.objects.select_related("order").get(pk=payment.pk)
    return payment


def lose_initiation(payment_id: int) -> bool:
    """Paiement resté sans identifiant de transaction : l'initiation n'a jamais abouti. Sous verrous (commande, puis
    paiement), état relu : un webhook qui vient de rattacher la transaction l'emporte."""
    with transaction.atomic():
        order_id = Payment.objects.values_list("order_id", flat=True).get(pk=payment_id)
        Order.objects.select_for_update().get(pk=order_id)
        payment = Payment.objects.select_for_update().get(pk=payment_id)
        if payment.status not in IN_PROGRESS or payment.provider_transaction_id:
            return False
        payment.status = Payment.Status.FAILED
        payment.failure_code = Payment.FailureCode.INITIATION_LOST
        payment.failure_reason = "Le paiement n'a pas pu être lancé."
        payment.save(update_fields=["status", "failure_code", "failure_reason"])
        return True


def expire_payment(payment_id: int) -> bool:
    """Paiement toujours en attente chez le prestataire après 24 h : le payeur n'a jamais validé. Sous verrous
    (commande, puis paiement), état relu."""
    with transaction.atomic():
        order_id = Payment.objects.values_list("order_id", flat=True).get(pk=payment_id)
        Order.objects.select_for_update().get(pk=order_id)
        payment = Payment.objects.select_for_update().get(pk=payment_id)
        if payment.status not in IN_PROGRESS:
            return False
        payment.status = Payment.Status.FAILED
        payment.failure_code = Payment.FailureCode.EXPIRED
        payment.failure_reason = "Le paiement n'a pas été validé à temps."
        payment.save(update_fields=["status", "failure_code", "failure_reason"])
        return True


def reconcile_payment(payment_id: int) -> bool:
    """Revérifie un paiement ; renvoie si son statut a changé."""
    payment = Payment.objects.select_related("order").get(pk=payment_id)
    before = payment.status
    in_progress = before in IN_PROGRESS
    retriable = (
        before == Payment.Status.FAILED
        and payment.failure_code in RETRIABLE_FAILURES
        and bool(payment.provider_transaction_id)
    )
    if not (in_progress or retriable):
        return False  # réglé entre-temps
    if in_progress and not payment.provider_transaction_id:
        return lose_initiation(payment_id)
    result = verify_payment(payment)
    if result.status in IN_PROGRESS and result.created_at <= timezone.now() - EXPIRE_AFTER:
        return expire_payment(payment_id)
    return result.status != before


def reconcile_pending_payments() -> int:
    """
    Rattrape ce que le webhook n'a pas réglé. Trois cas, chacun traité isolément (une erreur n'arrête pas le passage) :
    - sans issue depuis 10 min, sans identifiant : initiation perdue (`failed`) ;
    - sans issue depuis 10 min, avec identifiant : relecture chez le prestataire ; encore en attente après 24 h, il
      expire ;
    - échec non définitif (refusé, expiré, initiation perdue) avec identifiant, de moins de 48 h : relu au plus
      toutes les 30 min, pour rattraper un paiement validé après coup.
    Renvoie le nombre de paiements dont le statut a changé.
    """
    now = timezone.now()
    in_progress = Q(status__in=IN_PROGRESS, created_at__lte=now - RECONCILE_AFTER)
    retriable = Q(
        status=Payment.Status.FAILED,
        failure_code__in=RETRIABLE_FAILURES,
        provider_transaction_id__gt="",
        created_at__gt=now - RETRY_FAILED_WINDOW,
    ) & (Q(checked_at__isnull=True) | Q(checked_at__lte=now - RETRY_FAILED_EVERY))
    changed = 0
    for payment_id in list(
        Payment.objects.filter(in_progress | retriable).order_by("pk").values_list("pk", flat=True)
    ):
        try:
            changed += reconcile_payment(payment_id)
        except (PaymentProviderError, ImproperlyConfigured):
            log.warning("Réconciliation du paiement %s impossible pour l'instant", payment_id)
        except Exception:
            log.exception("Réconciliation du paiement %s : erreur", payment_id)
    return changed
