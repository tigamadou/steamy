"""Tâches Celery de la pédagogie : PDF des certificats (ADR 0005)."""

from datetime import timedelta

from celery import shared_task
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from apps.core.pdf import render_pdf

from .models import Certificate, certificate_path

MAX_RETRIES = 5
#: Un certificat encore `pending` après ce délai est relancé par le filet de sécurité
PENDING_GRACE = timedelta(minutes=10)


def build_certificate_pdf(certificate_id: int) -> bool:
    """
    Génère le PDF depuis le contenu figé, sous une clé déterministe (même UUID) : relancer ne crée pas de second
    fichier. Ne fait rien si le PDF est prêt et présent. Renvoie si un PDF a été écrit.
    """
    with transaction.atomic():
        certificate = Certificate.objects.select_for_update().get(pk=certificate_id)
        pdf = certificate.pdf
        if (
            certificate.pdf_status == Certificate.PdfStatus.READY
            and pdf
            and pdf.storage.exists(pdf.name)
        ):
            return False
        content = render_pdf(
            "pdf/certificate.html", {**certificate.snapshot, "number": certificate.number}
        )
        pdf.save(certificate_path(certificate, None), ContentFile(content), save=False)
        certificate.pdf_status = Certificate.PdfStatus.READY
        certificate.save(update_fields=["pdf", "pdf_status"])
    return True


@shared_task(bind=True, acks_late=True, max_retries=MAX_RETRIES)
def generate_certificate_pdf(self, certificate_id: int) -> bool:
    """PDF d'un certificat ; réessais à attente exponentielle, puis `failed` (visible du Support dans l'admin)."""
    try:
        return build_certificate_pdf(certificate_id)
    except Certificate.DoesNotExist:
        return False
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            Certificate.objects.filter(pk=certificate_id).update(
                pdf_status=Certificate.PdfStatus.FAILED
            )
            raise
        raise self.retry(exc=exc, countdown=30 * 2**self.request.retries) from exc


@shared_task
def retry_pending_certificates() -> int:
    """Relance les certificats restés `pending` plus de 10 minutes (worker arrêté pendant un déploiement)."""
    stale = Certificate.objects.filter(
        pdf_status=Certificate.PdfStatus.PENDING, issued_at__lt=timezone.now() - PENDING_GRACE
    ).values_list("id", flat=True)
    for certificate_id in stale:
        generate_certificate_pdf.delay(certificate_id)
    return len(stale)
