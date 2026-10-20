"""
Demandes de paiement de l'enfant au parent (D52, C4, C10) : création par l'apprenant, SMS et notification au parent
avec un lien vers `WPD15`, renvoi limité, annulation par l'enfant, refus par le parent, expiration à 7 jours. La
demande passe à `paid` quand une commande qui la règle est payée (exécution post-paiement).
"""

from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import ParentChildLink, User
from libs.errors import ApiError

from .models import Order, PaymentRequest

REQUEST_TTL = timedelta(days=7)
#: Renvoi limité (C4) : 3 envois au plus, espacés de 24 h
MAX_SENDS = 3
RESEND_DELAY = timedelta(hours=24)


def parent_of(learner):
    link = ParentChildLink.objects.filter(learner=learner).select_related("parent").first()
    return link.parent if link else None


def parent_url(request: PaymentRequest) -> str:
    return f"/parent/demandes/{request.pk}"


def next_resend_at(request: PaymentRequest):
    """Date à partir de laquelle l'enfant peut relancer, ou None s'il ne le peut plus."""
    if request.status != PaymentRequest.Status.PENDING or request.send_count >= MAX_SENDS:
        return None
    return request.last_sent_at + RESEND_DELAY


def kit_lines(items) -> list[tuple[str, int]]:
    """Lignes d'une demande de kits, comparables quel que soit leur ordre."""
    return sorted((item["kit_slug"], item["quantity"]) for item in items)


@transaction.atomic
def create_request(learner, *, kind: str, amount: int, course=None, items=None):
    """
    Crée la demande et prévient le parent. Une demande en attente pour le même parcours, ou pour les mêmes kits en
    mêmes quantités (ordre indifférent), est réutilisée.
    """
    parent = parent_of(learner)
    if (
        parent is None
    ):  # pragma: no cover - un apprenant actif a toujours un parent (consentement, S3)
        raise ApiError("PERMISSION_DENIED")
    # Verrou de l'apprenant : deux demandes simultanées ne créent pas deux demandes ni deux SMS
    User.objects.select_for_update().filter(pk=learner.pk).first()
    now = timezone.now()
    open_requests = PaymentRequest.objects.filter(
        requested_by=learner, status=PaymentRequest.Status.PENDING, expires_at__gt=now
    )
    if course is not None:
        existing = open_requests.filter(course=course).first()
        if existing:
            return existing, False
    elif items:
        wanted = kit_lines(items)
        for existing in open_requests.filter(kind=PaymentRequest.Kind.KIT, course__isnull=True):
            if kit_lines(existing.items) == wanted:
                return existing, False
    request = PaymentRequest.objects.create(
        requested_by=learner,
        parent=parent,
        kind=kind,
        course=course,
        items=items or [],
        amount=amount,
        last_sent_at=now,
        expires_at=now + REQUEST_TTL,
    )
    tell_parent(request)
    return request, True


def tell_parent(request: PaymentRequest) -> None:
    from apps.notifications.models import Category
    from apps.notifications.services import notify
    from apps.notifications.sms import queue_sms

    child = request.requested_by.first_name
    queue_sms(
        request.parent.phone,
        f"Steamy : {child} vous demande de régler « {request.title} » ({request.amount} FCFA). "
        f"{settings.WEB_URL}{parent_url(request)}",
        purpose="payment_request",
    )
    notify(
        request.parent,
        Category.PAYMENTS,
        "payment_request",
        f"{child} vous demande un paiement",
        f"{request.title} · {request.amount} FCFA",
        url=parent_url(request),
        tone="info",
        icon="💳",
    )


def ensure_pending(request: PaymentRequest) -> None:
    if request.status != PaymentRequest.Status.PENDING or request.expires_at <= timezone.now():
        raise ApiError("PAYMENT_REQUEST_CLOSED")


@transaction.atomic
def resend(request: PaymentRequest) -> PaymentRequest:
    request = PaymentRequest.objects.select_for_update().get(pk=request.pk)
    ensure_pending(request)
    available_at = next_resend_at(request)
    if available_at is None or available_at > timezone.now():
        raise ApiError("THROTTLED", "Tu pourras relancer ton parent un peu plus tard.")
    request.send_count += 1
    request.last_sent_at = timezone.now()
    request.save(update_fields=["send_count", "last_sent_at"])
    tell_parent(request)
    return request


def _pending_orders(request: PaymentRequest, payer=None):
    """Commandes en attente qui règlent la demande, verrouillées (dans une transaction)."""
    orders = Order.objects.select_for_update().filter(
        payment_request=request, status=Order.Status.PENDING
    )
    return orders.filter(payer=payer) if payer is not None else orders


@transaction.atomic
def order_for_request(request: PaymentRequest, *, payer, delivery_zone=None, **order) -> Order:
    """
    Commande du parent qui règle la demande de l'enfant (WPD15), sous verrou de la demande : une commande en attente
    encore valable, à la même adresse de livraison, est reprise (pas de seconde réservation ni de second paiement) ;
    une adresse différente annule l'ancienne commande et rend son stock avant d'en créer une nouvelle.
    """
    from .orders import cancel_order, create_order

    request = PaymentRequest.objects.select_for_update().get(pk=request.pk)
    ensure_pending(request)
    for pending in _pending_orders(request, payer).order_by("-created_at"):
        same_address = pending.delivery_zone_id == (
            delivery_zone.pk if delivery_zone else None
        ) and pending.delivery_address == order.get("delivery_address")
        if same_address and not pending.is_expired:
            return pending
        cancel_order(pending)
    created, _ = create_order(
        payer=payer, delivery_zone=delivery_zone, payment_request=request, **order
    )
    return created


@transaction.atomic
def close(request: PaymentRequest, status: str, reason: str = "") -> PaymentRequest:
    """
    Annulation par l'enfant ou refus par le parent : la demande doit être encore en attente. Le motif facultatif du
    refus (WPD15) est transmis à l'enfant dans sa notification.
    """
    request = PaymentRequest.objects.select_for_update().get(pk=request.pk)
    ensure_pending(request)
    request.status = status
    request.decided_at = timezone.now()
    request.decline_reason = reason if status == PaymentRequest.Status.DECLINED else ""
    request.save(update_fields=["status", "decided_at", "decline_reason"])
    # Plus rien à régler : les commandes en attente sont annulées et leur stock rendu
    from .orders import cancel_order

    for order in _pending_orders(request):
        cancel_order(order)
    if status == PaymentRequest.Status.DECLINED:
        from apps.notifications.models import Category
        from apps.notifications.services import notify

        notify(
            request.requested_by,
            Category.PAYMENTS,
            "payment_request_declined",
            "Ton parent a refusé ta demande",
            f"{request.title} · « {reason} »" if reason else request.title,
            url=f"/apprenant/demandes/{request.pk}",
            tone="warning",
            icon="💬",
        )
    return request


def mark_paid(order: Order) -> None:
    """Exécution post-paiement : la demande réglée par cette commande passe à `paid` (sauf refusée ou annulée)."""
    if order.payment_request_id:
        # Une demande refusée ou annulée le reste ; une demande expirée réglée tard est honorée (C17)
        PaymentRequest.objects.filter(
            pk=order.payment_request_id,
            status__in=[PaymentRequest.Status.PENDING, PaymentRequest.Status.EXPIRED],
        ).update(status=PaymentRequest.Status.PAID, decided_at=timezone.now())


def expire_requests() -> int:
    """Toutes les heures : les demandes en attente depuis 7 jours expirent (C4)."""
    return PaymentRequest.objects.filter(
        status=PaymentRequest.Status.PENDING, expires_at__lte=timezone.now()
    ).update(status=PaymentRequest.Status.EXPIRED, decided_at=timezone.now())
