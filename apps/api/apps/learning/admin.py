from django.contrib import admin

from .models import Enrollment, MissionProgress


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
