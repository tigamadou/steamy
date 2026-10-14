# apps/payments/views.py
import json

from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Order, Payment
from .serializers import OrderSerializer, PaymentSerializer


class IsAdminOrOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        return getattr(obj, "user", None) and obj.user == request.user


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.prefetch_related("items").all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrOwner]

    def perform_create(self, serializer):
        # force user to the request user
        serializer.save(user=self.request.user)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.select_related("order").all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrOwner]


# Webhook endpoint for providers (unprotected CSRF exempt; verify signature inside)
@extend_schema(
    summary="Webhook des prestataires de paiement (appelé par KKiaPay / FedaPay, pas par le front)",
    parameters=[
        OpenApiParameter("provider_name", str, OpenApiParameter.PATH, enum=["kkiapay", "fedapay"])
    ],
    request=OpenApiTypes.OBJECT,
    responses={200: inline_serializer("WebhookAck", {"ok": serializers.BooleanField()})},
    auth=[],
)
@csrf_exempt
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def provider_webhook(request, provider_name: str):
    """
    Generic webhook entrypoint for external providers.
    - provider_name: "kkiapay" or "fedapay"
    The request.body should be validated by provider-specific verification code.
    """
    payload = request.body
    try:
        data = json.loads(payload)
    except Exception:
        data = {}

    # Basic structure: provider sends back transaction status & reference
    # Implement provider-specific verification logic in utils.verify_provider_webhook
    from .utils import handle_provider_event, verify_provider_webhook

    if not verify_provider_webhook(provider_name, request):
        return Response({"detail": "invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    # handle event (create/update Payment, mark order paid, etc.)
    try:
        handle_provider_event(provider_name, data)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"ok": True})
