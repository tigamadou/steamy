# apps/payments/views.py
import json
import logging

from django.core.exceptions import ImproperlyConfigured
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from libs.scoping import OwnedByRequestUserMixin

from .models import Order, Payment
from .providers import PROVIDERS, get_provider
from .serializers import OrderSerializer, PaymentSerializer
from .utils import WebhookRejected, handle_payment_event

logger = logging.getLogger(__name__)


# Lecture seule (S5) : une commande ne se crée plus avec un prix fourni par le client. La
# création, avec un prix calculé par le serveur, arrive en API-L3b.
class OrderViewSet(OwnedByRequestUserMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Order.objects.prefetch_related("items").order_by("-id")
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]


class PaymentViewSet(OwnedByRequestUserMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.select_related("order").order_by("-id")
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    owner_field = "order__user"


# Webhook endpoint for providers (unprotected CSRF exempt; verify signature inside)
class WebhookRateThrottle(AnonRateThrottle):
    scope = "webhook"  # S9


@extend_schema(
    summary="Webhook des prestataires de paiement (appelé par le prestataire, pas par le front)",
    parameters=[
        OpenApiParameter("provider_name", str, OpenApiParameter.PATH, enum=sorted(PROVIDERS))
    ],
    request=OpenApiTypes.OBJECT,
    responses={
        200: inline_serializer("WebhookAck", {"ok": serializers.BooleanField()}),
        400: inline_serializer("WebhookNack", {"ok": serializers.BooleanField()}),
    },
    auth=[],
)
@csrf_exempt
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([WebhookRateThrottle])
def provider_webhook(request, provider_name: str):
    """
    Point d'entrée des notifications des prestataires (S9, ADR 0003). La signature est vérifiée **avant** toute
    lecture du contenu ; le prestataire normalise ensuite la notification (`parse_event`).
    """
    # Réponses volontairement neutres (S5) : aucun détail n'est renvoyé à l'appelant, la cause
    # est journalisée côté serveur.
    rejected = Response({"ok": False}, status=status.HTTP_400_BAD_REQUEST)
    try:
        provider = get_provider(provider_name)
    except ImproperlyConfigured:
        logger.warning("Webhook %s : prestataire inconnu ou non configuré", provider_name)
        return rejected
    if not provider.verify_webhook(request):
        logger.warning("Webhook %s : signature invalide", provider_name)
        return rejected
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError("corps qui n'est pas un objet")
        event = provider.parse_event(data)
    except (ValueError, UnicodeDecodeError) as exc:
        logger.warning("Webhook %s : notification illisible (%s)", provider_name, exc)
        return rejected
    if event is None:
        return Response({"ok": True})  # événement sans rapport avec un paiement

    try:
        handle_payment_event(provider.name, event)
    except WebhookRejected as exc:
        logger.warning("Webhook %s refusé : %s", provider_name, exc)
        return rejected
    except Exception:
        logger.exception("Webhook %s : erreur de traitement", provider_name)
        return rejected

    return Response({"ok": True})
