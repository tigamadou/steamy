from django.contrib import admin

from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "category", "type", "title", "created_at", "read_at")
    list_filter = ("category", "tone")
    search_fields = ("title", "type")
    raw_id_fields = ("user",)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "category", "channel", "enabled")
    raw_id_fields = ("user",)
