# apps/messaging/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # connexion: ws://host/ws/conversations/<conversation_id>/?token=...
    re_path(r"ws/conversations/(?P<conversation_id>\d+)/?$", consumers.ConversationConsumer.as_asgi()),
    # liste globale (option): ws://host/ws/messaging/?token=...
    re_path(r"ws/messaging/?$", consumers.MessagingConsumer.as_asgi()),
]
