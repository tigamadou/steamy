"""Tâches planifiées des comptes (CELERY_BEAT_SCHEDULE), relançables sans effet double ; `manage.py <tâche>`."""

from celery import shared_task
from django.utils import timezone

from .consent import RETENTION
from .models import ConsentRequest, User


@shared_task
def expire_consent_requests() -> int:
    """Demandes en attente arrivées à échéance (7 jours, D21) : expirées, lien désactivé."""
    return ConsentRequest.objects.filter(
        status=ConsentRequest.Status.PENDING, expires_at__lte=timezone.now()
    ).update(status=ConsentRequest.Status.EXPIRED, resolved_at=timezone.now(), token_hash="")


@shared_task
def purge_signup_sessions() -> int:
    """Inscriptions expirées : le compte en attente est supprimé et l'identifiant libéré (D21, C14)."""
    deleted, _ = User.objects.filter(
        status=User.Status.PENDING, signup_session__expires_at__lte=timezone.now()
    ).delete()
    return deleted


@shared_task
def purge_refused_requests() -> int:
    """Demandes closes (refusées, expirées, annulées) depuis plus de 30 jours : supprimées (C9)."""
    closed = [
        ConsentRequest.Status.REFUSED,
        ConsentRequest.Status.EXPIRED,
        ConsentRequest.Status.CANCELLED,
    ]
    deleted, _ = ConsentRequest.objects.filter(
        status__in=closed, resolved_at__lte=timezone.now() - RETENTION
    ).delete()
    return deleted
