# project/asgi.py
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")

# Initialise Django AVANT tout import qui touche aux modèles (middleware, routing),
# sinon : AppRegistryNotReady au démarrage.
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

import apps.messaging.routing as messaging_routing  # noqa: E402
from apps.messaging.middleware import TokenAuthMiddleware  # noqa: E402

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
