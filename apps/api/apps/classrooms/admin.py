from django.contrib import admin, messages
from django.utils.translation import ngettext

from .invitations import send_invitation
from .models import School, TeacherInvitation


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "country", "learner_quota", "classroom_quota", "valid_until")
    list_filter = ("country",)
    search_fields = ("name", "city")


@admin.register(TeacherInvitation)
class TeacherInvitationAdmin(admin.ModelAdmin):
    """Seule voie de création d'un compte enseignant (S5) : créer l'invitation, puis « Envoyer »."""

    list_display = ("email", "school", "sent_at", "expires_at", "accepted_at", "invited_by")
    list_filter = ("school",)
    search_fields = ("email", "first_name", "last_name")
    readonly_fields = ("invited_by", "sent_at", "expires_at", "accepted_at")
    actions = ["send"]

    @admin.action(description="Envoyer l'invitation par email (nouveau lien, valable 7 jours)")
    def send(self, request, queryset):
        pending = queryset.filter(accepted_at__isnull=True)
        for invitation in pending:
            send_invitation(invitation, invited_by=request.user)
        sent = len(pending)
        skipped = queryset.count() - sent
        self.message_user(
            request,
            ngettext("%d invitation envoyée.", "%d invitations envoyées.", sent) % sent,
            messages.SUCCESS,
        )
        if skipped:
            self.message_user(
                request,
                ngettext(
                    "%d invitation déjà acceptée, ignorée.",
                    "%d invitations déjà acceptées, ignorées.",
                    skipped,
                )
                % skipped,
                messages.WARNING,
            )
