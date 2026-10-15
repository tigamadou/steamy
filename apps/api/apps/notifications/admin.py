from django.contrib import admin

from .models import Notification, NotificationPreference, SmsMessage


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


@admin.register(SmsMessage)
class SmsMessageAdmin(admin.ModelAdmin):
    list_display = ("created_at", "provider", "purpose", "recipient", "status", "error_code")
    list_filter = ("provider", "purpose", "status")
    search_fields = ("message_id",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
