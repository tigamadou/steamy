import logging

from celery import shared_task
from django.test import RequestFactory
from django.urls import reverse

log = logging.getLogger(__name__)


@shared_task
def deliver_fake_webhook(provider_tx_id: str, status: str) -> int:
    """
    Faux prestataire : fixe l'issue de la transaction et poste sa notification signée sur le webhook, comme le
    ferait un vrai prestataire. La requête est traitée sur place par la vue du webhook (aucun appel réseau), donc
    par la même vérification de signature et le même traitement. Renvoie le statut HTTP de la réponse.
    """
    from .providers import PaymentStatus
    from .providers.fake import SIGNATURE_HEADER, FakePaymentProvider, sign, webhook_body
    from .views import provider_webhook

    body = webhook_body(FakePaymentProvider().settle(provider_tx_id, PaymentStatus(status)))
    request = RequestFactory().post(
        reverse("payments-webhook", kwargs={"provider_name": FakePaymentProvider.name}),
        body,
        content_type="application/json",
        headers={SIGNATURE_HEADER: sign(body)},
    )
    response = provider_webhook(request, provider_name=FakePaymentProvider.name)
    log.info("Faux webhook %s (%s) : HTTP %s", provider_tx_id, status, response.status_code)
    return response.status_code


@shared_task
def release_expired_reservations() -> int:
    """Toutes les 5 min : annule les commandes non payées à l'échéance et rend leur stock (D38)."""
    from .orders import release_expired_orders

    return release_expired_orders()


@shared_task
def reconcile_pending_payments() -> int:
    """Toutes les 5 min : vérifie auprès du prestataire les paiements sans issue depuis 10 min (webhook perdu)."""
    from .checkout import reconcile_pending_payments as reconcile

    return reconcile()


@shared_task
def expire_payment_requests() -> int:
    """Toutes les heures : les demandes de paiement en attente depuis 7 jours expirent (C4)."""
    from .requests import expire_requests

    return expire_requests()


INVOICE_MAX_RETRIES = 5


def build_invoice_pdf(invoice_id: int) -> bool:
    """
    Génère le PDF depuis le contenu figé, sous une clé déterministe (même UUID) : relancer ne crée pas de second
    fichier. Ne fait rien si le PDF est prêt et présent. Renvoie si un PDF a été écrit.
    """
    from django.core.files.base import ContentFile
    from django.db import transaction

    from apps.core.pdf import render_pdf

    from .models import Invoice, invoice_path

    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().get(pk=invoice_id)
        pdf = invoice.pdf
        if invoice.pdf_status == Invoice.PdfStatus.READY and pdf and pdf.storage.exists(pdf.name):
            return False
        content = render_pdf("pdf/invoice.html", {**invoice.snapshot, "number": invoice.number})
        pdf.save(invoice_path(invoice, None), ContentFile(content), save=False)
        invoice.pdf_status = Invoice.PdfStatus.READY
        invoice.save(update_fields=["pdf", "pdf_status"])
    return True


@shared_task(bind=True, acks_late=True, max_retries=INVOICE_MAX_RETRIES)
def generate_invoice_pdf(self, invoice_id: int) -> bool:
    """PDF d'une facture ; réessais à attente exponentielle, puis `failed` (visible de la Finance dans l'admin)."""
    from .models import Invoice

    try:
        return build_invoice_pdf(invoice_id)
    except Invoice.DoesNotExist:
        return False
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            Invoice.objects.filter(pk=invoice_id).update(pdf_status=Invoice.PdfStatus.FAILED)
            raise
        raise self.retry(exc=exc, countdown=30 * 2**self.request.retries) from exc


@shared_task
def retry_pending_invoices() -> int:
    """Toutes les 10 min : relance les factures restées `pending` plus de 10 minutes (worker arrêté)."""
    from datetime import timedelta

    from django.utils import timezone

    from .models import Invoice

    stale = list(
        Invoice.objects.filter(
            pdf_status=Invoice.PdfStatus.PENDING,
            issued_at__lt=timezone.now() - timedelta(minutes=10),
        ).values_list("id", flat=True)
    )
    for invoice_id in stale:
        generate_invoice_pdf.delay(invoice_id)
    return len(stale)
