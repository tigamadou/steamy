"""
Création et cycle de vie des commandes (§4.3, D37, D38, C10). Les vues n'appellent que ces fonctions.

- **Stock** : réservé à la commande, sous verrou des kits (`select_for_update`, pris dans l'ordre des identifiants
  pour éviter les interblocages), décrémenté tout de suite ; `OUT_OF_STOCK` sinon. Une commande non payée à
  l'échéance (30 min) est annulée et son stock rendu (`release_expired_orders`).
- **Invité** (kits seulement, D12) : un jeton opaque est remis une seule fois à la création ; seule son empreinte
  est gardée (C10). Il ouvre ensuite la commande par l'en-tête `X-Guest-Token`.
"""

import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.events.applications import release as release_application
from apps.shop.models import Kit, StockReservation
from libs.errors import ApiError

from .models import Order, OrderItem
from .pricing import Quote

GUEST_TOKEN_HEADER = "X-Guest-Token"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def order_ttl() -> timedelta:
    return timedelta(minutes=settings.ORDER_TTL_MINUTES)


@transaction.atomic
def create_order(
    *,
    kind: str,
    quote: Quote,
    payer=None,
    guest: dict | None = None,
    beneficiary=None,
    delivery_zone=None,
    delivery_address: dict | None = None,
    payment_request=None,
) -> tuple[Order, str | None]:
    """
    Crée la commande, ses lignes et ses réservations de stock, rattachée à la demande de l'enfant qu'elle règle
    (WPD15). Renvoie la commande et le jeton invité éventuel.
    """
    expires_at = timezone.now() + order_ttl()
    kit_lines = [line for line in quote.lines if line.kit is not None]
    _reserve(kit_lines)

    guest_token = secrets.token_urlsafe(32) if guest else None
    order = Order.objects.create(
        kind=kind,
        payer=payer,
        guest_first_name=(guest or {}).get("first_name", ""),
        guest_last_name=(guest or {}).get("last_name", ""),
        guest_phone=(guest or {}).get("phone", ""),
        guest_access_token_hash=hash_token(guest_token) if guest_token else "",
        beneficiary=beneficiary,
        subtotal=quote.subtotal,
        shipping_fee=quote.shipping_fee,
        total=quote.total,
        delivery_zone=delivery_zone,
        delivery_address=delivery_address,
        shipping_status=Order.ShippingStatus.PREPARING if kit_lines else "",
        expires_at=expires_at,
        payment_request=payment_request,
    )
    for line in quote.lines:
        item = OrderItem.objects.create(
            order=order,
            course=line.course,
            kit=line.kit,
            event=line.event,
            event_application=line.event_application,
            title=line.title,
            unit_price=line.unit_price,
            quantity=line.quantity,
            total=line.total,
        )
        if line.kit is not None:
            StockReservation.objects.create(
                kit=line.kit, order_item=item, quantity=line.quantity, expires_at=expires_at
            )
    return order, guest_token


def _reserve(kit_lines) -> None:
    """Décrémente le stock des kits commandés, sous verrou ; tout ou rien (`OUT_OF_STOCK`)."""
    if not kit_lines:
        return
    wanted = {line.kit.pk: line.quantity for line in kit_lines}
    kits = list(Kit.objects.select_for_update().filter(pk__in=wanted).order_by("pk"))
    for kit in kits:
        if kit.stock_quantity < wanted[kit.pk]:
            raise ApiError("OUT_OF_STOCK", fields={"items": "OUT_OF_STOCK"})
    for kit in kits:
        Kit.objects.filter(pk=kit.pk).update(stock_quantity=F("stock_quantity") - wanted[kit.pk])


def release_stock(order: Order) -> None:
    """Rend le stock réservé et non confirmé d'une commande (annulation, expiration)."""
    now = timezone.now()
    reservations = StockReservation.objects.select_for_update().filter(
        order_item__order=order, confirmed_at__isnull=True, released_at__isnull=True
    )
    for reservation in reservations.order_by("kit_id"):
        Kit.objects.filter(pk=reservation.kit_id).update(
            stock_quantity=F("stock_quantity") + reservation.quantity
        )
        reservation.released_at = now
        reservation.save(update_fields=["released_at"])


def cancel_order(order: Order) -> None:
    """Annule une commande en attente (verrouillée par l'appelant) : stock rendu, places d'événement libérées."""
    release_stock(order)
    for item in order.items.filter(event_application__isnull=False):
        release_application(item.event_application)
    order.status = Order.Status.CANCELLED
    order.save(update_fields=["status", "updated_at"])


def release_expired_orders() -> int:
    """Annule les commandes non payées à l'échéance et rend leur stock (D38). Renvoie le nombre de commandes."""
    count = 0
    expired = Order.objects.filter(status=Order.Status.PENDING, expires_at__lte=timezone.now())
    for pk in expired.values_list("pk", flat=True):
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=pk)
            if not order.is_expired:  # payée entre-temps
                continue
            cancel_order(order)
            count += 1
    return count


def order_for_guest(reference: str, token: str) -> Order | None:
    """Commande invitée ouverte par son jeton ; None si le jeton ne correspond pas (jamais d'indice)."""
    order = Order.objects.filter(reference=reference).exclude(guest_access_token_hash="").first()
    if order is None or not hmac.compare_digest(order.guest_access_token_hash, hash_token(token)):
        return None
    return order
