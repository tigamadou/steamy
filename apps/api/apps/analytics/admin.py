# apps/analytics/admin.py
from django.contrib import admin

from .models import DailyAggregatedStat, TrackingEvent


@admin.register(TrackingEvent)
class TrackingEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "entity_type", "entity_id", "user", "created_at")
    list_filter = ("event_type", "entity_type")
    search_fields = ("entity_id", "user__email")

    # Télémétrie en lecture seule (LOT-6 6.1)
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DailyAggregatedStat)
class DailyAggregatedStatAdmin(admin.ModelAdmin):
    list_display = ("date", "group_by", "key", "metric", "value")
    list_filter = ("metric", "group_by", "date")
    search_fields = ("key",)
