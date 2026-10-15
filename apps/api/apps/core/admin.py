from django.contrib import admin

from .models import AuditLog, PlatformSettings


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    """Singleton (WAD14) : une seule ligne, ni ajout ni suppression."""

    fieldsets = (
        (
            "OTP (D24)",
            {
                "fields": (
                    "otp_length",
                    "otp_validity_seconds",
                    "otp_max_attempts",
                    "otp_resend_delay_seconds",
                    "otp_daily_limit_per_phone",
                    "otp_daily_limit_per_ip",
                )
            },
        ),
        (
            "Pédagogie et encadrement",
            {"fields": ("summative_retry_cooldown_seconds", "dropout_threshold_days")},
        ),
        ("Gamification (C8)", {"fields": ("points_scale", "rank_thresholds")}),
    )

    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "actor", "target_type", "target_id", "ip")
    list_filter = ("action", "target_type")
    search_fields = ("action", "target_id", "actor__email")
    date_hierarchy = "created_at"

    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
