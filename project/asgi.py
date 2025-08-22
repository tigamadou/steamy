# project/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# optionnel : middleware personnalisé pour JWT (si tu utilises SimpleJWT)
from apps.messaging.middleware import TokenAuthMiddleware  # voir plus bas

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")

django_asgi_app = get_asgi_application()

import apps.messaging.routing as messaging_routing

# choose middleware stack:
# - AuthMiddlewareStack uses session cookie auth
# - TokenAuthMiddleware wraps AuthMiddlewareStack to support ?token=JWT
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": TokenAuthMiddleware(
        AuthMiddlewareStack(
            URLRouter(
                messaging_routing.websocket_urlpatterns
            )
        )
    ),
})
