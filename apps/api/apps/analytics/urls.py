# apps/analytics/urls.py
from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import TrackingEventViewSet, dashboard_summary, export_events_csv

router = SimpleRouter()
router.register(r"events", TrackingEventViewSet, basename="event")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/summary/", dashboard_summary, name="analytics-summary"),
    path("export/events/", export_events_csv, name="analytics-export-events"),
]
