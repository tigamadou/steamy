# apps/analytics/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TrackingEventViewSet, dashboard_summary, export_events_csv

router = DefaultRouter()
router.register(r"events", TrackingEventViewSet, basename="event")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/summary/", dashboard_summary, name="analytics-summary"),
    path("export/events.csv", export_events_csv, name="analytics-export-events"),
]
