# apps/analytics/admin.py
from django.contrib import admin

from .models import DailyAggregatedStat, Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "entity_type", "entity_id", "user", "created_at")
    list_filter = ("event_type", "entity_type")
    search_fields = ("entity_id", "user__email")


@admin.register(DailyAggregatedStat)
class DailyAggregatedStatAdmin(admin.ModelAdmin):
    list_display = ("date", "group_by", "key", "metric", "value")
    list_filter = ("metric", "group_by", "date")
    search_fields = ("key",)
