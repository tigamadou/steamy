"""
Demandes de paiement de l'enfant au parent (D52, C4, C10) : création par l'apprenant, SMS et notification au parent
avec un lien vers `WPD15`, renvoi limité, annulation par l'enfant, refus par le parent, expiration à 7 jours. La
demande passe à `paid` quand une commande qui la règle est payée (exécution post-paiement).
"""

from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import ParentChildLink
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
    if course is not None:
        existing = PaymentRequest.objects.filter(
            requested_by=learner, course=course, status=PaymentRequest.Status.PENDING
        ).first()
        if existing:
            return existing, False
    elif items:
        wanted = kit_lines(items)
        pending = PaymentRequest.objects.filter(
            requested_by=learner,
            kind=PaymentRequest.Kind.KIT,
            course__isnull=True,
            status=PaymentRequest.Status.PENDING,
        )
        for existing in pending:
            if kit_lines(existing.items) == wanted:
                return existing, False
    now = timezone.now()
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


@transaction.atomic
def close(request: PaymentRequest, status: str) -> PaymentRequest:
    """Annulation par l'enfant ou refus par le parent : la demande doit être encore en attente."""
    request = PaymentRequest.objects.select_for_update().get(pk=request.pk)
    ensure_pending(request)
    request.status = status
    request.decided_at = timezone.now()
    request.save(update_fields=["status", "decided_at"])
    if status == PaymentRequest.Status.DECLINED:
        from apps.notifications.models import Category
        from apps.notifications.services import notify

        notify(
            request.requested_by,
            Category.PAYMENTS,
            "payment_request_declined",
            "Ton parent a refusé ta demande",
            request.title,
            url=f"/apprenant/demandes/{request.pk}",
            tone="warning",
            icon="💬",
        )
    return request


def mark_paid(order: Order) -> None:
    """Exécution post-paiement : la demande réglée par cette commande passe à `paid`."""
    if order.payment_request_id:
        PaymentRequest.objects.filter(pk=order.payment_request_id).exclude(
            status=PaymentRequest.Status.PAID
        ).update(status=PaymentRequest.Status.PAID, decided_at=timezone.now())


def expire_requests() -> int:
    """Toutes les heures : les demandes en attente depuis 7 jours expirent (C4)."""
    return PaymentRequest.objects.filter(
        status=PaymentRequest.Status.PENDING, expires_at__lte=timezone.now()
    ).update(status=PaymentRequest.Status.EXPIRED, decided_at=timezone.now())
