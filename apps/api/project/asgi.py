# project/asgi.py
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")

# HTTP uniquement : le websocket de la messagerie n'est plus servi (S11).
application = get_asgi_application()
