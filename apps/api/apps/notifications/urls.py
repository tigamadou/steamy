from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import NotificationViewSet, PreferencesView

router = SimpleRouter()
router.register(r"", NotificationViewSet, basename="notification")

urlpatterns = [
    path("preferences/", PreferencesView.as_view(), name="notification-preferences"),
    path("", include(router.urls)),
]
