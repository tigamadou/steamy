# apps/payments/views.py
import json
import logging

from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from libs.scoping import OwnedByRequestUserMixin

from .models import Order, Payment
from .serializers import OrderSerializer, PaymentSerializer

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
    summary="Webhook des prestataires de paiement (appelé par KKiaPay / FedaPay, pas par le front)",
    parameters=[
        OpenApiParameter("provider_name", str, OpenApiParameter.PATH, enum=["kkiapay", "fedapay"])
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
    Generic webhook entrypoint for external providers.
    - provider_name: "kkiapay" or "fedapay"
    The request.body should be validated by provider-specific verification code.
    """
    # Réponses volontairement neutres (S5) : aucun détail n'est renvoyé à l'appelant, la cause
    # est journalisée côté serveur.
    from .utils import WebhookRejected, handle_provider_event, verify_provider_webhook

    rejected = Response({"ok": False}, status=status.HTTP_400_BAD_REQUEST)
    if not verify_provider_webhook(provider_name, request):
        logger.warning("Webhook %s : signature invalide", provider_name)
        return rejected
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        logger.warning("Webhook %s : corps illisible", provider_name)
        return rejected
    if not isinstance(data, dict):
        return rejected

    try:
        handle_provider_event(provider_name, data)
    except WebhookRejected as exc:
        logger.warning("Webhook %s refusé : %s", provider_name, exc)
        return rejected
    except Exception:
        logger.exception("Webhook %s : erreur de traitement", provider_name)
        return rejected

    return Response({"ok": True})
