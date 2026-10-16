"""
Actions du personnel sur le commerce (WAD10, WAD11, LOT-6 6.4), appelées par l'admin Django. Aucune ne passe une
commande à « payée » (S9 : le webhook vérifié fait foi) ; chacune est journalisée dans `AuditLog`.

- Livraison : `preparing → shipped → delivered`, une étape à la fois, sur une commande payée ; le payeur est prévenu.
- Kit Code : révocation d'un code non utilisé (perdu, vendu par erreur).
- Remboursement : demandé par la Finance sur un paiement réussi (dans la limite du montant), puis « traité » une fois
  effectué auprès de l'opérateur ; la commande passe alors à « remboursée ».
"""

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.core.audit import audit

from .fulfillment import tell_payer
from .models import KitCode, Order, Payment, Refund

Shipping = Order.ShippingStatus

#: Étape suivante de la livraison : jamais de retour en arrière ni de saut
NEXT_SHIPPING = {Shipping.PREPARING: Shipping.SHIPPED, Shipping.SHIPPED: Shipping.DELIVERED}

SHIPPING_MESSAGES = {
    Shipping.SHIPPED: ("Commande expédiée", "Votre commande {reference} est en route."),
    Shipping.DELIVERED: (
        "Commande livrée",
        "Votre commande {reference} est livrée. Bonne construction !",
    ),
}


class BackofficeError(ValueError):
    """Action refusée : le message est affiché tel quel dans l'admin."""


def set_shipping_status(order: Order, target: str, user, request=None) -> None:
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.status != Order.Status.PAID:
            raise BackofficeError(f"{order.reference} : la commande n'est pas payée.")
        if NEXT_SHIPPING.get(order.shipping_status) != target:
            current = order.get_shipping_status_display() or "sans livraison"
            raise BackofficeError(
                f"{order.reference} : passage impossible de « {current} » à « {Shipping(target).label} » "
                "(la livraison avance d'une étape à la fois)."
            )
        order.shipping_status = target
        order.save(update_fields=["shipping_status", "updated_at"])
        audit(
            "order.shipping_status",
            request=request,
            actor=user,
            target=order,
            data={"status": target},
        )
        title, message = SHIPPING_MESSAGES[target]
        tell_payer(order, title, message.format(reference=order.reference), tone="success")


def revoke_kit_code(code: KitCode, user, request=None) -> None:
    with transaction.atomic():
        code = KitCode.objects.select_for_update().get(pk=code.pk)
        if code.redeemed_at is not None:
            raise BackofficeError(f"{code.code} : déjà utilisé, il ne peut plus être révoqué.")
        if code.revoked_at is not None:
            raise BackofficeError(f"{code.code} : déjà révoqué.")
        code.revoked_at = timezone.now()
        code.save(update_fields=["revoked_at"])
        audit("kitcode.revoked", request=request, actor=user, target=code)


def refundable(payment: Payment) -> int:
    """Montant encore remboursable d'un paiement réussi."""
    already = payment.refunds.aggregate(total=Sum("amount"))["total"] or 0
    return max(payment.amount - already, 0)


def request_refund(payment: Payment, amount: int, reason: str, user, request=None) -> Refund:
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        if payment.status != Payment.Status.SUCCEEDED:
            raise BackofficeError("Seul un paiement réussi se rembourse.")
        if not 0 < amount <= refundable(payment):
            raise BackofficeError(f"Montant remboursable : {refundable(payment)} FCFA au plus.")
        refund = Refund.objects.create(payment=payment, amount=amount, reason=reason)
        audit(
            "refund.requested",
            request=request,
            actor=user,
            target=payment,
            data={"refund": refund.pk, "amount": amount},
        )
    return refund


def process_refund(refund: Refund, user, request=None) -> None:
    """Remboursement effectué auprès de l'opérateur : marqué traité, commande « remboursée », payeur prévenu."""
    with transaction.atomic():
        refund = (
            Refund.objects.select_for_update().select_related("payment__order").get(pk=refund.pk)
        )
        if refund.processed:
            raise BackofficeError(f"Remboursement n° {refund.pk} : déjà traité.")
        refund.processed = True
        refund.save(update_fields=["processed"])
        order = refund.payment.order
        Order.objects.filter(pk=order.pk).update(
            status=Order.Status.REFUNDED, updated_at=timezone.now()
        )
        audit(
            "refund.processed",
            request=request,
            actor=user,
            target=order,
            data={"refund": refund.pk, "amount": refund.amount},
        )
        tell_payer(
            order,
            "Remboursement effectué",
            f"Votre paiement de {refund.amount} FCFA pour la commande {order.reference} est remboursé.",
        )
