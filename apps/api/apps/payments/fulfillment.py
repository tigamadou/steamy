"""
Exécution post-paiement (§4.3, D36, D37, C3, C17) : **une seule fois**, dans la transaction du webhook qui verrouille
la commande. Elle marque la commande payée, confirme le stock, inscrit le bénéficiaire, génère les Kit Codes des
kits, vide le panier et prévient le payeur et le bénéficiaire. Les candidatures (L3b.6) et la facture (L3b.2b) s'y
ajoutent.

Paiement reçu sur une commande expirée (C17) : honoré si le stock est encore disponible, sinon remboursé. Un second
paiement réussi sur une commande déjà payée est remboursé.
"""

import logging

from django.conf import settings
from django.db.models import F
from django.utils import timezone

from apps.core.audit import audit
from apps.learning.models import Enrollment
from apps.shop.models import CartItem, Kit, StockReservation

from .kit_codes import generate_codes
from .models import Order, Payment, Refund
from .providers import PaymentProviderError, RefundOutcome, get_provider

log = logging.getLogger(__name__)


def settle(order: Order, payment: Payment) -> None:
    """Paiement réussi et vérifié : honore la commande, ou rembourse si elle ne peut plus l'être."""
    if order.status == Order.Status.PENDING:
        fulfill(order)
    elif order.status == Order.Status.CANCELLED and reacquire_stock(order):
        fulfill(order)
        audit("payment.late_honored", target=order, data={"payment": payment.pk})
    elif order.status == Order.Status.CANCELLED:
        refund(payment, "Commande expirée et kit plus disponible (C17).")
        order.status = Order.Status.REFUNDED
        order.save(update_fields=["status", "updated_at"])
        tell_payer(
            order,
            "Paiement remboursé",
            f"La commande {order.reference} avait expiré et le kit n'est plus disponible : "
            "votre paiement est remboursé.",
            tone="warning",
        )
    else:  # déjà payée (paiement en double) ou remboursée
        refund(payment, "Paiement reçu sur une commande déjà réglée.")


def fulfill(order: Order) -> None:
    now = timezone.now()
    order.status = Order.Status.PAID
    order.paid_at = now
    order.save(update_fields=["status", "paid_at", "updated_at"])
    StockReservation.objects.filter(
        order_item__order=order, confirmed_at__isnull=True, released_at__isnull=True
    ).update(confirmed_at=now)

    items = list(order.items.select_related("course", "kit"))
    learner = order.beneficiary
    for item in items:
        if item.course_id and learner is not None:
            Enrollment.objects.get_or_create(
                learner=learner, course=item.course, defaults={"source": Enrollment.Source.ORDER}
            )
        if item.kit_id:
            generate_codes(item)
    kit_ids = [item.kit_id for item in items if item.kit_id]
    if kit_ids and order.payer_id:
        CartItem.objects.filter(cart__user_id=order.payer_id, kit_id__in=kit_ids).delete()

    tell_payer(
        order,
        "Paiement reçu",
        f"Commande {order.reference} réglée : {order.total} FCFA.",
        tone="success",
    )
    if learner is not None:
        tell_beneficiary(order, items)


def reacquire_stock(order: Order) -> bool:
    """Commande annulée à l'expiration : reprend son stock s'il est encore disponible (tout ou rien)."""
    reservations = list(
        StockReservation.objects.select_for_update()
        .filter(order_item__order=order, released_at__isnull=False)
        .order_by("kit_id")
    )
    wanted = {}
    for reservation in reservations:
        wanted[reservation.kit_id] = wanted.get(reservation.kit_id, 0) + reservation.quantity
    kits = list(Kit.objects.select_for_update().filter(pk__in=wanted).order_by("pk"))
    if any(kit.stock_quantity < wanted[kit.pk] for kit in kits):
        return False
    for kit in kits:
        Kit.objects.filter(pk=kit.pk).update(stock_quantity=F("stock_quantity") - wanted[kit.pk])
    StockReservation.objects.filter(pk__in=[r.pk for r in reservations]).update(released_at=None)
    return True


def refund(payment: Payment, reason: str) -> Refund:
    """Rembourse un paiement réussi : par l'API du prestataire, sinon à traiter par la Finance (ADR 0003 §6)."""
    try:
        outcome = get_provider(payment.provider).refund(
            payment.provider_transaction_id, payment.amount
        )
    except PaymentProviderError:
        log.exception("Remboursement de %s impossible par l'API", payment.pk)
        outcome = RefundOutcome.PENDING_MANUAL
    refund = Refund.objects.create(
        payment=payment,
        amount=payment.amount,
        reason=reason,
        processed=outcome == RefundOutcome.DONE,
    )
    audit(
        "payment.refunded",
        target=payment,
        data={"order": payment.order.reference, "amount": payment.amount, "outcome": outcome},
    )
    return refund


# --- Messages ------------------------------------------------------------------------------------


def tell_payer(order: Order, title: str, message: str, tone: str = "info") -> None:
    """Parent : notification (et email s'il en a un). Invité : SMS (il n'a pas de compte)."""
    from apps.notifications.models import Category
    from apps.notifications.services import notify
    from apps.notifications.sms import queue_sms

    if order.payer is not None and order.payer.is_parent:
        notify(
            order.payer,
            Category.PAYMENTS,
            "order",
            title,
            message,
            url=f"/parent/commandes/{order.reference}",
            tone=tone,
            icon="💳",
        )
    elif order.is_guest:
        queue_sms(order.guest_phone, f"Steamy : {message}", purpose="order")


def tell_beneficiary(order: Order, items) -> None:
    from apps.notifications.models import Category
    from apps.notifications.services import notify

    learner = order.beneficiary
    if not learner.is_learner:
        return
    for item in items:
        if item.course_id:
            notify(
                learner,
                Category.PAYMENTS,
                "course_unlocked",
                f"{item.course.title} est débloqué",
                "Ton parent a réglé le parcours : tu peux commencer.",
                url=f"/apprenant/parcours/{item.course.slug}",
                tone="success",
                icon="🎉",
            )
        elif item.kit_id:
            notify(
                learner,
                Category.PAYMENTS,
                "kit_ordered",
                f"{item.kit.name} est commandé",
                "Ton parent a réglé la commande : le kit arrive bientôt.",
                url=f"/apprenant/boutique/{item.kit.slug}",
                tone="success",
                icon="📦",
            )


def guest_tracking_url(order: Order, token: str) -> str:
    """Lien de suivi d'une commande invitée (WK07, C10) : le jeton est dans le fragment, jamais envoyé au serveur."""
    return f"{settings.WEB_URL}/boutique/commandes/{order.reference}#jeton={token}"
