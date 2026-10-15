from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from libs.scoping import OwnedByRequestUserMixin

from .models import Category, Channel, Notification, NotificationPreference, SmsMessage
from .serializers import (
    NotificationSerializer,
    PreferencesSerializer,
    PreferencesUpdateSerializer,
    ReadAllSerializer,
    UnreadCountSerializer,
)
from .services import categories_for, contact_email, email_enabled
from .sms import get_provider


class NotificationViewSet(OwnedByRequestUserMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """Notifications du compte connecté, les plus récentes d'abord (WD04, WPD14, WT12, cloche des shells)."""

    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = []

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list" and self.request.query_params.get("unread") in ("1", "true"):
            queryset = queryset.filter(read_at__isnull=True)
        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter("unread", OpenApiTypes.BOOL, description="Seulement les non lues")
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(responses=UnreadCountSerializer)
    @action(detail=False, url_path="unread-count")
    def unread_count(self, request):
        return Response({"count": self.get_queryset().filter(read_at__isnull=True).count()})

    @extend_schema(request=None, responses=NotificationSerializer)
    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notification).data)

    @extend_schema(request=None, responses=ReadAllSerializer)
    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        updated = self.get_queryset().filter(read_at__isnull=True).update(read_at=timezone.now())
        return Response({"updated": updated})


class PreferencesView(APIView):
    """
    Préférences par catégorie (WD06, WPD08, WT08). Dans l'application : toujours actif. Email : réglable, envoyé
    seulement si une adresse est renseignée (`emailAddress`).
    """

    permission_classes = [IsAuthenticated]

    def _payload(self, user):
        return {
            "email_address": contact_email(user),
            "categories": [
                {
                    "category": category,
                    "label": Category(category).label,
                    "in_app": True,
                    "email": email_enabled(user, category),
                }
                for category in categories_for(user)
            ],
        }

    @extend_schema(responses=PreferencesSerializer)
    def get(self, request):
        return Response(PreferencesSerializer(self._payload(request.user)).data)

    @extend_schema(request=PreferencesUpdateSerializer, responses=PreferencesSerializer)
    def patch(self, request):
        serializer = PreferencesUpdateSerializer(
            data=request.data, context={"allowed": categories_for(request.user)}
        )
        serializer.is_valid(raise_exception=True)
        for item in serializer.validated_data["categories"]:
            NotificationPreference.objects.update_or_create(
                user=request.user,
                category=item["category"],
                channel=Channel.EMAIL,
                defaults={"enabled": item["email"]},
            )
        return Response(PreferencesSerializer(self._payload(request.user)).data)


class SmsStatusWebhookView(APIView):
    """
    Accusés de réception du fournisseur SMS (ADR 0002). Authentifiés par la signature du fournisseur, pas par la
    session : réservé au fournisseur, hors du contrat du front.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [FormParser]
    throttle_scope = "webhook"

    @extend_schema(exclude=True)
    def post(self, request):
        provider = get_provider()
        status = provider.parse_status(request)
        if status is None:
            return Response(status=403)
        SmsMessage.objects.filter(provider=provider.name, message_id=status.message_id).update(
            status=status.status[:16], error_code=status.error_code[:16], updated_at=timezone.now()
        )
        return Response(status=204)
