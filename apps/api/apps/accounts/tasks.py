"""Tâches planifiées des comptes (CELERY_BEAT_SCHEDULE), relançables sans effet double ; `manage.py <tâche>`."""

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.core.models import PlatformSettings
from apps.notifications.sms import queue_sms

from . import deletion, weekly_report
from .consent import RETENTION
from .models import ConsentRequest, OtpChallenge, User
from .otp import code_text

RESET_EMAIL_SUBJECT = "Steamy : votre code de réinitialisation"


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


@shared_task
def anonymize_due_accounts() -> int:
    """Suppressions programmées arrivées à J+30 : comptes anonymisés, factures conservées (D40, D54)."""
    return deletion.anonymize_due()


@shared_task
def send_weekly_reports() -> int:
    """Chaque lundi : rapport de la semaine écoulée pour chaque enfant actif, dans l'app et par email (D55)."""
    return weekly_report.send_weekly_reports()


@shared_task(autoretry_for=(OSError,), retry_backoff=True, max_retries=5)
def send_reset_code(challenge_id: str, code: str) -> bool:
    """
    Envoie le code de « mot de passe oublié » (WL02) : SMS au parent, email à l'enseignant (C6). Rien si la saisie
    ne désignait aucun compte : la requête HTTP a fait le même travail dans les deux cas.
    """
    challenge = OtpChallenge.objects.filter(pk=challenge_id, user__isnull=False).first()
    if challenge is None:
        return False
    text = code_text(code, PlatformSettings.load())
    if challenge.email:
        send_mail(RESET_EMAIL_SUBJECT, text, settings.DEFAULT_FROM_EMAIL, [challenge.email])
    else:
        queue_sms(challenge.phone, text, purpose=challenge.purpose)
    return True
