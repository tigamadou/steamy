from django.contrib import admin

from .models import EventApplication, EventProposal, EventTicket, SteamyEvent


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


@admin.register(EventApplication)
class EventApplicationAdmin(admin.ModelAdmin):
    """Suivi des candidatures (WAD12) ; le refus exceptionnel avec remboursement arrive avec le back-office (L6.2)."""

    list_display = ("event", "learner", "status", "ticket", "created_at")
    list_filter = ("status", "event")
    search_fields = ("learner__username", "event__title")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(EventProposal)
class EventProposalAdmin(admin.ModelAdmin):
    """Suivi seulement : les propositions sont faites par les enseignants (WT09)."""

    list_display = ("event", "classroom", "teacher", "created_at")
    list_filter = ("event",)
    readonly_fields = ("event", "classroom", "teacher", "created_at")

    def has_add_permission(self, request):
        return False
