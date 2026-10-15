# apps/analytics/urls.py
from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import TrackingEventViewSet

router = SimpleRouter()
router.register(r"events", TrackingEventViewSet, basename="event")

# `dashboard/summary/` et `export/events/` (personnel sans TOTP) sont remplacés par `/api/backoffice/` (§7.8, §7.9)
urlpatterns = [path("", include(router.urls))]
