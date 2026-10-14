# apps/messaging/serializers.py
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Conversation, Message, MessageAttachment, MessageReceipt, Notification

UserModel = get_user_model()


class ConversationSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(
        many=True, queryset=UserModel.objects.all(), required=False
    )

    class Meta:
        model = Conversation
        fields = ["id", "title", "participants", "created_at", "updated_at"]


class CreateConversationSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(
        many=True, queryset=UserModel.objects.all(), required=False
    )

    class Meta:
        model = Conversation
        fields = ["id", "title", "participants"]

    def create(self, validated_data):
        participants = validated_data.pop("participants", [])
        conv = Conversation.objects.create(**validated_data)
        if participants:
            conv.participants.set(participants)
        return conv


class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = ["id", "message", "file", "filename", "size", "uploaded_at"]
        read_only_fields = ["uploaded_at", "filename", "size"]

    def create(self, validated_data):
        file = validated_data.get("file")
        if file and not validated_data.get("filename"):
            validated_data["filename"] = getattr(file, "name", "")
        if file and not validated_data.get("size"):
            try:
                file.seek(0, 2)
                validated_data["size"] = file.tell()
                file.seek(0)
            except Exception:
                pass
        return super().create(validated_data)


class MessageCreateSerializer(serializers.ModelSerializer):
    attachments = MessageAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "body",
            "created_at",
            "edited",
            "deleted",
            "attachments",
        ]
        read_only_fields = ["id", "sender", "created_at", "edited", "deleted", "attachments"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["sender"] = request.user
        return super().create(validated_data)


class ReceiptSummarySerializer(serializers.Serializer):
    user = serializers.IntegerField()
    delivered_at = serializers.DateTimeField(allow_null=True)
    read_at = serializers.DateTimeField(allow_null=True)


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.StringRelatedField()
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    receipts = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "body",
            "created_at",
            "edited",
            "deleted",
            "attachments",
            "receipts",
        ]

    @extend_schema_field(ReceiptSummarySerializer(many=True))
    def get_receipts(self, obj):
        return [
            {"user": r.user_id, "delivered_at": r.delivered_at, "read_at": r.read_at}
            for r in obj.receipts.all()
        ]


class MessageReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageReceipt
        fields = ["id", "message", "user", "delivered_at", "read_at"]
        read_only_fields = ["delivered_at", "read_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "user", "title", "body", "url", "created_at", "read"]
        read_only_fields = ["id", "created_at", "user"]
