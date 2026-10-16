from django.contrib import admin
from django.db import transaction

from .models import Certificate, Enrollment, MissionProgress, QuizAttempt


class MissionProgressInline(admin.TabularInline):
    model = MissionProgress
    extra = 0
    readonly_fields = ("mission", "completed_at")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    """Inscriptions en lecture seule : elles ne sont créées que par le serveur (§4.3)."""

    list_display = ("learner", "course", "source", "status", "progress_pct", "created_at")
    list_filter = ("source", "status")
    search_fields = ("learner__username", "course__title")
    readonly_fields = (
        "learner",
        "course",
        "source",
        "status",
        "progress_pct",
        "last_activity_at",
        "completed_at",
        "created_at",
    )
    inlines = [MissionProgressInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    """Tentatives en lecture seule : corrigées par le serveur (§4.4)."""

    list_display = ("learner", "quiz", "percentage", "status", "created_at")
    list_filter = ("status", "quiz__kind")
    search_fields = ("learner__username",)
    readonly_fields = [field.name for field in QuizAttempt._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    """Certificats en lecture seule (D33) ; un PDF en échec se relance par l'action « Régénérer » (ADR 0005 §8)."""

    list_display = ("number", "enrollment", "pdf_status", "issued_at")
    list_filter = ("pdf_status",)
    search_fields = ("number", "enrollment__learner__username")
    readonly_fields = ("enrollment", "number", "uuid", "pdf_status", "snapshot", "issued_at")
    exclude = ("pdf",)
    actions = ["regenerate"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.action(description="Régénérer le PDF")
    def regenerate(self, request, queryset):
        from .tasks import generate_certificate_pdf

        ids = list(queryset.values_list("id", flat=True))
        queryset.update(pdf_status=Certificate.PdfStatus.PENDING)
        for certificate_id in ids:
            transaction.on_commit(lambda pk=certificate_id: generate_certificate_pdf.delay(pk))
        self.message_user(request, f"{len(ids)} PDF relancé(s).")
