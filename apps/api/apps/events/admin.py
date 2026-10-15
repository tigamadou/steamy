from django.contrib import admin

from .models import EventTicket, SteamyEvent


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


@admin.register(EventTicket)
class EventTicketAdmin(admin.ModelAdmin):
    """Tickets offerts à la certification (D33) : créés par le serveur seulement."""

    list_display = ("learner", "enrollment", "created_at")
    search_fields = ("learner__username",)
    readonly_fields = ("learner", "enrollment", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
