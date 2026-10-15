from django.apps import apps
from django.contrib import admin
from django_otp.plugins.otp_totp.models import TOTPDevice

from .models import AuditLog, PlatformSettings

#: Modèles gelés ou remplacés par la refonte, retirés de l'admin (LOT-6 6.1) : l'ancien catalogue `courses`
#: (dont `Path`), remplacé par `catalog` (API-L1).
FROZEN_MODELS = (
    "courses.Path",
    "courses.Course",
    "courses.Module",
    "courses.Lesson",
    "courses.Resource",
)


def unregister_frozen(site, labels) -> None:
    for label in labels:
        try:
            model = apps.get_model(label)
        except LookupError:  # modèle déjà supprimé du code
            continue
        if site.is_registered(model):
            site.unregister(model)


unregister_frozen(admin.site, FROZEN_MODELS)


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
    """Journal d'audit, en lecture seule ; visible du seul Super-admin (matrice D71)."""

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


# Appareils TOTP (WAD13) : ni ajout ni modification (l'enrôlement passe par WAD15), ni secret ni QR code affichés.
# Supprimer l'appareil d'un membre réinitialise son TOTP et ferme ses sessions.
admin.site.unregister(TOTPDevice)


@admin.register(TOTPDevice)
class TOTPDeviceAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "confirmed", "created_at", "last_used_at")
    list_filter = ("confirmed",)
    search_fields = ("user__email",)
    fields = ("user", "name", "confirmed", "created_at", "last_used_at", "throttling_failure_count")
    readonly_fields = fields

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
