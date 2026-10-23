from django.apps import apps
from django.conf import settings
from django.contrib import admin, messages
from django.db import transaction
from django.shortcuts import redirect
from django.utils import timezone
from django.utils.translation import ngettext
from django_otp.plugins.otp_totp.models import TOTPDevice

from .models import Announcement, AuditLog, PlatformSettings
from .tasks import broadcast_announcement

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
    """
    Singleton (WAD14) : une seule ligne, ni ajout ni suppression ; la liste ouvre la fiche. Bornes et formats validés
    par le modèle. Les réglages sont relus à chaque usage (`PlatformSettings.load()`) : aucun cache à invalider.
    """

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
        (
            "Factures : TVA et AIB (C25)",
            {"fields": ("vat_enabled", "vat_rate", "aib_enabled", "aib_rate")},
        ),
        ("Messagerie (S10)", {"fields": ("sms_provider",)}),
    )
    readonly_fields = ("sms_provider",)

    @admin.display(description="Fournisseur SMS actif")
    def sms_provider(self, obj):
        """Choisi par l'environnement (`SMS_PROVIDER`, ADR 0002), pas depuis l'admin."""
        return settings.SMS_PROVIDER

    def changelist_view(self, request, extra_context=None):
        if not self.has_view_or_change_permission(request):
            return super().changelist_view(request, extra_context)
        return redirect("admin:core_platformsettings_change", PlatformSettings.load().pk)

    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    """Annonces (WAD14) : diffusées une fois, en notification (D7), puis figées."""

    list_display = ("title", "audience", "starts_at", "ends_at", "broadcast_at", "recipients")
    list_filter = ("audience",)
    search_fields = ("title", "body")
    fields = ("title", "body", "audience", "url", "starts_at", "ends_at")
    readonly_fields = ("created_by", "broadcast_at", "recipients")
    actions = ["broadcast"]

    def get_fields(self, request, obj=None):
        return self.fields + self.readonly_fields if obj else self.fields

    def has_change_permission(self, request, obj=None):
        if obj is not None and obj.broadcast_at is not None:
            return False
        return super().has_change_permission(request, obj)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    @admin.action(description="Diffuser en notification", permissions=["change"])
    def broadcast(self, request, queryset):
        now = timezone.now()
        ready = [
            a for a in queryset if a.broadcast_at is None and (a.ends_at is None or a.ends_at > now)
        ]
        for announcement in ready:
            transaction.on_commit(lambda pk=announcement.pk: broadcast_announcement.delay(pk))
        self.message_user(
            request,
            ngettext(
                "%d annonce en cours de diffusion.",
                "%d annonces en cours de diffusion.",
                len(ready),
            )
            % len(ready),
            messages.SUCCESS,
        )
        skipped = len(queryset) - len(ready)
        if skipped:
            self.message_user(
                request,
                ngettext(
                    "%d annonce ignorée (déjà diffusée ou terminée).",
                    "%d annonces ignorées (déjà diffusées ou terminées).",
                    skipped,
                )
                % skipped,
                messages.WARNING,
            )


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
