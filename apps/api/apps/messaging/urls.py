from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet

# Conversations, messages et pièces jointes ne sont plus exposés (S11) : seules les
# notifications restent, en attendant leur app dédiée (API-1).
router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("", include(router.urls)),
]
