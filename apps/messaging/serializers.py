from rest_framework import serializers
from .models import Conversation, Message, MessageAttachment, MessageReceipt, Notification
from django.contrib.auth import get_user_model

User = get_user_model()

class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email",)

class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = ("id", "filename", "file", "size", "uploaded_at")
        read_only_fields = ("uploaded_at",)

class MessageSerializer(serializers.ModelSerializer):
    sender = SimpleUserSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = ("id","conversation","sender","body","created_at","edited","deleted","attachments")
        read_only_fields = ("sender","created_at","edited","deleted")

class ConversationSerializer(serializers.ModelSerializer):
    participants = SimpleUserSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ("id","title","participants","created_at","updated_at","messages")

class CreateConversationSerializer(serializers.ModelSerializer):
    participant_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)

    class Meta:
        model = Conversation
        fields = ("id","title","participant_ids")

    def create(self, validated_data):
        participants = validated_data.pop("participant_ids", [])
        conv = Conversation.objects.create(title=validated_data.get("title",""))
        conv.participants.add(*participants)
        return conv

class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id","conversation","body")

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["sender"] = request.user
        msg = Message.objects.create(**validated_data)
        # create receipts for other participants
        conv = msg.conversation
        for u in conv.participants.exclude(pk=request.user.pk):
            MessageReceipt.objects.create(message=msg, user=u)
        return msg

class MessageReceiptSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)
    class Meta:
        model = MessageReceipt
        fields = ("id","message","user","delivered_at","read_at")
        read_only_fields = ("delivered_at","read_at")

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id","title","body","url","created_at","read")
        read_only_fields = ("created_at",)
