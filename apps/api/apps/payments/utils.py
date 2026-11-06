"""
Application des transactions de paiement (S5, S9, ADR 0003 et 0008). Le prestataire ne produit jamais d'état à
croire : une notification ne sert qu'à connaître l'identifiant de la transaction, que l'on **relit** chez le
prestataire (hors de tout verrou) avant de l'appliquer sous verrous (commande, puis paiement). La réconciliation et
« Revérifier » passent par le même chemin.
"""

import logging

from django.db import transaction
from django.utils import timezone

from apps.core.audit import audit

from .checkout import RETRIABLE_FAILURES
from .fulfillment import refund, settle
from .models import Order, Payment
from .providers import ProviderTransaction, get_provider

logger = logging.getLogger(__name__)

TERMINAL = (Payment.Status.SUCCEEDED, Payment.Status.FAILED)

#: Statuts bruts du prestataire (vocabulaire FedaPay) qui désignent de l'argent reçu
RECEIVED = ("approved", "transferred")
REFUNDED = ("refunded", "partially_refunded")
#: Statut brut d'un refus → (code d'échec, raison)
FAILURES = {
    "declined": (Payment.FailureCode.DECLINED, "Paiement refusé par l'opérateur."),
    "canceled": (Payment.FailureCode.DECLINED, "Paiement annulé."),
    "expired": (Payment.FailureCode.EXPIRED, "Le paiement n'a pas été validé à temps."),
    "refunded": (Payment.FailureCode.DECLINED, "Paiement remboursé."),
    "partially_refunded": (Payment.FailureCode.DECLINED, "Paiement remboursé."),
}


def handle_payment_event(provider_name: str, provider_tx_id: str) -> Payment | None:
    """Point d'entrée du webhook : relit la transaction chez le prestataire, **hors verrou**, puis l'applique.
    Une erreur de relecture (`PaymentProviderError`) se propage : l'appelant décide, la réconciliation rattrape."""
    tx = get_provider(provider_name).fetch_transaction(provider_tx_id)
    return apply_transaction(provider_name, tx)


def ignore(provider_name: str, tx: ProviderTransaction, why: str) -> None:
    audit(
        "payment.webhook_ignored",
        data={
            "provider": provider_name,
            "transaction": tx.provider_tx_id,
            "merchantReference": tx.merchant_reference,
            "why": why,
        },
    )
    logger.warning(
        "Transaction %s du prestataire %s ignorée : %s", tx.provider_tx_id, provider_name, why
    )


def locate_order_id(provider_name: str, tx: ProviderTransaction) -> int | None:
    """Commande à verrouiller **avant** de chercher le paiement : un webhook arrivé pendant l'initiation attend
    qu'elle soit validée, puis retrouve le paiement. La référence de commande ne sert qu'à choisir le verrou."""
    known = (
        Payment.objects.filter(provider=provider_name, provider_transaction_id=tx.provider_tx_id)
        .values_list("order_id", flat=True)
        .first()
    )
    if known is not None:
        return known
    if "-" in tx.merchant_reference:
        reference = tx.merchant_reference.rsplit("-", 1)[0]
        return Order.objects.filter(reference=reference).values_list("pk", flat=True).first()
    return None


@transaction.atomic
def apply_transaction(provider_name: str, tx: ProviderTransaction) -> Payment | None:
    """
    Applique une transaction **déjà relue** chez le prestataire. Garanties :
    - verrous dans l'ordre commande, puis paiement : deux applications simultanées se suivent, et l'exécution
      post-paiement n'a lieu qu'une fois ;
    - jamais de paiement créé ici : une transaction sans correspondance est ignorée (renvoie None) ;
    - statut brut, frais et date de relecture écrits à chaque relecture, même sur un paiement déjà terminal ;
    - idempotence du statut : un paiement réussi, ou échoué pour un motif définitif, ne bouge plus ; un échec
      non définitif (refusé, expiré, initiation perdue) peut encore passer à réussi ;
    - montant et devise comparés au paiement et à la commande : un écart fait échouer le paiement ; si l'argent
      est bien arrivé, le montant reçu est à rembourser.
    """
    order_id = locate_order_id(provider_name, tx)
    if order_id is None:
        ignore(provider_name, tx, "aucune commande correspondante")
        return None
    order = Order.objects.select_for_update().get(pk=order_id)
    payment = Payment.objects.filter(
        provider=provider_name, provider_transaction_id=tx.provider_tx_id
    ).first()
    if payment is None and tx.merchant_reference:
        payment = Payment.objects.filter(
            provider=provider_name, merchant_reference=tx.merchant_reference, order=order
        ).first()
        if payment is not None and payment.provider_transaction_id:
            ignore(provider_name, tx, "paiement déjà rattaché à une autre transaction")
            return None
        if payment is not None:
            payment.provider_transaction_id = tx.provider_tx_id
    if payment is None:
        ignore(provider_name, tx, "aucun paiement correspondant")
        return None
    pk = payment.pk
    carried_id = payment.provider_transaction_id
    payment = Payment.objects.select_for_update().get(pk=pk)
    payment.provider_transaction_id = carried_id

    # Observations : à chaque relecture, avant tout contrôle d'idempotence
    changed_status = payment.provider_status != tx.provider_status
    payment.provider_status = tx.provider_status
    if tx.fees is not None:
        payment.provider_fees = tx.fees
    payment.checked_at = timezone.now()
    payment.payload = {"status": tx.provider_status, "amount": tx.amount, "currency": tx.currency}
    if (
        tx.provider_status in REFUNDED
        and payment.status == Payment.Status.SUCCEEDED
        and changed_status
    ):
        audit(
            "payment.provider_refunded",
            target=order,
            data={"payment": payment.pk, "status": tx.provider_status},
        )
    payment.save()

    if payment.status == Payment.Status.SUCCEEDED:
        return payment
    if payment.status == Payment.Status.FAILED:
        if payment.failure_code not in RETRIABLE_FAILURES or tx.provider_status not in RECEIVED:
            return payment  # un échec ne bouge que vers « réussi »

    if (
        tx.amount != payment.amount
        or tx.currency != payment.currency
        or tx.amount != order.total
        or tx.currency != order.currency
    ):
        payment.status = Payment.Status.FAILED
        payment.failure_code = Payment.FailureCode.AMOUNT_MISMATCH
        payment.failure_reason = "Montant ou devise différents de la commande."
        payment.save()
        audit(
            "payment.amount_mismatch",
            target=order,
            data={
                "payment": payment.pk,
                "expected": [order.total, order.currency],
                "received": [tx.amount, tx.currency],
            },
        )
        logger.warning("Paiement %s : montant ou devise incohérents", payment.pk)
        if tx.provider_status in RECEIVED:  # l'argent est arrivé : ce qui a été reçu est à rendre
            refund(payment, "Montant reçu différent de la commande.", amount=tx.amount)
        return payment

    if tx.provider_status in RECEIVED:
        payment.status = Payment.Status.SUCCEEDED
        payment.failure_code = ""
        payment.failure_reason = ""
        payment.confirmed_at = timezone.now()
        payment.save()
        settle(order, payment)
    elif tx.provider_status in FAILURES:
        payment.status = Payment.Status.FAILED
        payment.failure_code, payment.failure_reason = FAILURES[tx.provider_status]
        payment.save()
    elif tx.provider_status == "pending":
        payment.status = Payment.Status.PENDING
        payment.save()
    else:
        logger.warning(
            "Paiement %s : statut inconnu du prestataire (%s)", payment.pk, tx.provider_status
        )
    return payment
