from django.contrib import admin

from .models import EventProposal, SteamyEvent


@admin.register(SteamyEvent)
class SteamyEventAdmin(admin.ModelAdmin):
    list_display = ("title", "starts_at", "city", "price", "capacity", "seats_left", "status")
    list_filter = ("status", "online", "city")
    search_fields = ("title", "slug", "place", "city")
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "starts_at"
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Places restantes")
    def seats_left(self, obj):
        return obj.seats_left


@admin.register(EventProposal)
class EventProposalAdmin(admin.ModelAdmin):
    """Suivi seulement : les propositions sont faites par les enseignants (WT09)."""

    list_display = ("event", "classroom", "teacher", "created_at")
    list_filter = ("event",)
    readonly_fields = ("event", "classroom", "teacher", "created_at")

    def has_add_permission(self, request):
        return False
