from django.contrib import admin

from .models import ImpactReport, KpiDefinition


class ReadOnly(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(KpiDefinition)
class KpiDefinitionAdmin(ReadOnly):
    """Définitions chargées par migration (30 indicateurs) : consultables, jamais modifiées à la main."""

    list_display = ("code", "label", "group", "unit", "source", "target", "periodicity")
    list_filter = ("group", "source", "unit")
    search_fields = ("code", "label")


@admin.register(ImpactReport)
class ImpactReportAdmin(ReadOnly):
    """Rapports trimestriels : saisis et soumis dans WAD04-WAD05 (Next.js), ici en lecture seule."""

    list_display = ("period", "status", "submitted_at", "submitted_by")
    list_filter = ("status",)
