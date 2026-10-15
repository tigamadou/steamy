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
