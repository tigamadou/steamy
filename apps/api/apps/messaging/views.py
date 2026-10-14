from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Conversation, Message, MessageAttachment, MessageReceipt, Notification
from .serializers import (
    ConversationSerializer,
    CreateConversationSerializer,
    MessageAttachmentSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    NotificationSerializer,
)
from .tasks import send_message_notifications_async


class IsParticipantOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        return obj.participants.filter(pk=request.user.pk).exists() if hasattr(obj, 'participants') else False


class IsParticipantOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        # allow listing and creation for authenticated users (listing will be filtered by get_queryset)
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        # participants is a M2M on Conversation
        return obj.participants.filter(pk=request.user.pk).exists()


class ConversationViewSet(viewsets.ModelViewSet):
    """
    Conversation list: returns only conversations where the user is participant (or all if staff).
    Object-level access is enforced by IsParticipantOrAdmin.
    """
    queryset = Conversation.objects.prefetch_related("participants", "messages__sender")
    permission_classes = [permissions.IsAuthenticated, IsParticipantOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset.all()
        # only conversations where the user is a participant
        return self.queryset.filter(participants=user)

    def get_serializer_class(self):
        if self.action in ("create",):
            return CreateConversationSerializer
        return ConversationSerializer

    def perform_create(self, serializer):
        conv = serializer.save()
        # add the current user if not included
        if self.request.user.pk not in [p.pk for p in conv.participants.all()]:
            conv.participants.add(self.request.user)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.select_related(
        "sender", "conversation").prefetch_related("attachments", "receipts")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("create",):
            return MessageCreateSerializer
        return MessageSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        msg = serializer.save()
        # kick off async notifications to participants (email/push)
        send_message_notifications_async.delay(msg.id)
        return Response(MessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        receipt, _ = MessageReceipt.objects.get_or_create(message=msg, user=request.user)
        receipt.read_at = timezone.now()
        receipt.save()
        return Response({"ok": True})


class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = MessageAttachment.objects.select_related("message")
    serializer_class = MessageAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save()


class IsOwnerOrStaff(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        return obj.user_id == request.user.id


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrStaff]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        # Génération du schéma OpenAPI : pas d'utilisateur réel
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        user = self.request.user
        if user.is_staff:
            return Notification.objects.all().order_by("-created_at")
        return Notification.objects.filter(user=user).order_by("-created_at")

    def perform_update(self, serializer):
        # ensure user cannot change owner
        serializer.save()
