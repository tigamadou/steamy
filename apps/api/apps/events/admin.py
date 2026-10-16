"""
Steamy Events dans l'admin Django (WAD12, LOT-6 6.5). Événements saisis par le groupe Contenu ; candidatures suivies
par le Support, statut en lecture seule. Seule action : le refus exceptionnel avec motif (C3), qui rembourse une
candidature payée. Aucune action ne confirme une candidature (S3 : accord du parent, puis paiement).
"""

from django import forms
from django.contrib import admin, messages

from apps.core.admin_actions import form_action

from . import backoffice
from .models import EventApplication, EventTicket, SteamyEvent


@admin.register(SteamyEvent)
class SteamyEventAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "starts_at",
        "ends_at",
        "place",
        "city",
        "capacity",
        "seats_left",
        "access",
        "application_deadline",
        "status",
    )
    list_filter = ("status", "online", "city")
    search_fields = ("title", "slug", "place", "city")
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "starts_at"
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Places restantes")
    def seats_left(self, obj):
        return obj.seats_left

    @admin.display(description="Accès", ordering="price")
    def access(self, obj):
        return "Gratuit" if obj.price == 0 else f"{obj.price:,} FCFA".replace(",", " ")


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


class RefusalForm(forms.Form):
    reason = forms.CharField(
        label="Motif (communiqué à l'enfant et à son parent)",
        max_length=255,
        widget=forms.Textarea(attrs={"rows": 3}),
    )


@admin.register(EventApplication)
class EventApplicationAdmin(admin.ModelAdmin):
    """Suivi des candidatures (WAD12) : statut en lecture seule ; refus exceptionnel motivé (Support)."""

    list_display = (
        "learner",
        "age",
        "event",
        "parent_decided_at",
        "payment",
        "status",
        "created_at",
    )
    list_filter = ("status", "event")
    search_fields = ("learner__username", "event__title")
    list_select_related = ("learner__learner_profile", "event")
    actions = ["refuse"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Âge")
    def age(self, obj):
        return backoffice.applicant_age(obj) or "—"

    @admin.display(description="Paiement")
    def payment(self, obj):
        if obj.event.price == 0 or obj.ticket_id:
            return "Sans paiement"
        return "Payée" if backoffice.paid_payment(obj) else "Non payée"

    def has_refuse_permission(self, request):
        return request.user.has_perm("events.refuse_application")

    @admin.action(description="Refus exceptionnel", permissions=["refuse"])
    def refuse(self, request, queryset):
        def apply(data):
            refused = 0
            for application in queryset:
                try:
                    refund = backoffice.refuse_exceptionally(
                        application, data["reason"], request.user, request
                    )
                except backoffice.RefusalError as error:
                    self.message_user(request, str(error), messages.ERROR)
                    continue
                refused += 1
                if refund:
                    self.message_user(
                        request,
                        f"{application} : remboursement de {refund.amount} FCFA créé, à traiter par la Finance.",
                        messages.WARNING,
                    )
            if refused:
                self.message_user(request, f"Candidatures annulées : {refused}.", messages.SUCCESS)

        return form_action(
            self,
            request,
            queryset,
            RefusalForm,
            title="Refus exceptionnel de candidatures",
            intro="La place est rendue ; l'enfant et son parent sont prévenus ; une candidature payée est remboursée "
            "(remboursement à traiter par la Finance).",
            submit_label="Refuser",
            apply=apply,
        )
