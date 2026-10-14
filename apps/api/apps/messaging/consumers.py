# apps/messaging/consumers.py
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Conversation, Message, MessageReceipt

User = get_user_model()


class ConversationConsumer(AsyncJsonWebsocketConsumer):
    """
    Websocket consumer to handle a single conversation room.
    Path: ws/conversations/<conversation_id>/
    Actions accepted (JSON):
      - {"action":"join"}  -> join group
      - {"action":"leave"} -> leave group
      - {"action":"send.message", "body": "..."} -> create Message and broadcast
    """

    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"].get("conversation_id")
        self.group_name = f"conversation_{self.conversation_id}"

        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            # reject connection if not authenticated
            await self.close(code=4001)
            return

        # verify user is participant of conversation
        is_participant = await self._is_participant(user.id, self.conversation_id)
        if not is_participant:
            await self.close(code=4003)  # forbidden
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # optionally notify other participants that user joined
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.presence",
                "event": "joined",
                "user_id": user.id,
                "email": getattr(user, "email", str(user)),
                "timestamp": timezone.now().isoformat(),
            },
        )

    async def disconnect(self, close_code):
        # leave group cleanly
        try:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        except Exception:
            pass

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming JSON messages
        """
        action = content.get("action")
        user = self.scope.get("user")

        if action == "join":
            # already added on connect, respond ok
            await self.send_json({"ok": True, "action": "join"})
            return

        if action == "leave":
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.send_json({"ok": True, "action": "leave"})
            return

        if action == "send.message":
            body = content.get("body", "").strip()
            if not body:
                await self.send_json({"error": "empty body"}, status=400)
                return
            # create message in DB and receipts
            message_obj = await self._create_message(user.id, self.conversation_id, body)
            # broadcast to group the new message
            payload = {
                "type": "chat.message",
                "message": {
                    "id": message_obj.id,
                    "conversation": self.conversation_id,
                    "sender_id": user.id,
                    "sender_username": getattr(user, "email", None),
                    "body": message_obj.body,
                    "created_at": message_obj.created_at.isoformat(),
                },
            }
            await self.channel_layer.group_send(self.group_name, payload)
            return

        # unknown action
        await self.send_json({"error": "unknown action"}, status=400)

    # event handler for group messages
    async def chat_message(self, event):
        """
        Called when a message is broadcast to the group.
        forward it to WS client.
        """
        await self.send_json(
            {
                "action": "message",
                "message": event["message"],
            }
        )

    async def chat_presence(self, event):
        await self.send_json(
            {
                "action": "presence",
                "event": event.get("event"),
                "user_id": event.get("user_id"),
                "username": event.get("email"),
                "timestamp": event.get("timestamp"),
            }
        )

    # ---------- DB helpers (sync -> async) ----------
    @database_sync_to_async
    def _is_participant(self, user_id, conversation_id):
        try:
            conv = Conversation.objects.get(pk=conversation_id)
        except Conversation.DoesNotExist:
            return False
        return conv.participants.filter(pk=user_id).exists()

    @database_sync_to_async
    def _create_message(self, user_id, conversation_id, body):
        user = User.objects.get(pk=user_id)
        conv = Conversation.objects.get(pk=conversation_id)
        msg = Message.objects.create(conversation=conv, sender=user, body=body)
        # create receipts for recipients
        for u in conv.participants.exclude(pk=user.pk):
            MessageReceipt.objects.create(message=msg, user=u)
        return msg


class MessagingConsumer(AsyncJsonWebsocketConsumer):
    """
    Optional global channel - e.g. for system-wide notifications or presence.
    For now it simply accepts authenticated connections.
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return
        await self.accept()

    async def receive_json(self, content, **kwargs):
        # Exemple: ping/pong
        if content.get("action") == "ping":
            await self.send_json({"action": "pong"})
