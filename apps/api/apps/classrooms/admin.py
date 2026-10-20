from django.contrib import admin, messages
from django.utils.translation import ngettext

from .invitations import send_invitation
from .models import Classroom, ClassroomMembership, School, TeacherInvitation


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "city",
        "country",
        "offer",
        "learner_quota",
        "classroom_quota",
        "valid_until",
    )
    list_filter = ("country",)
    search_fields = ("name", "city")
    filter_horizontal = ("courses",)


class MembershipInline(admin.TabularInline):
    model = ClassroomMembership
    fields = ("learner", "status", "consent_request", "joined_at", "left_at")
    readonly_fields = fields
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    """Suivi par le support : les classes sont créées par les enseignants (WT13)."""

    list_display = ("name", "teacher", "school", "course", "archived_at")
    list_filter = ("school",)
    search_fields = ("name", "teacher__email")
    raw_id_fields = ("teacher",)
    inlines = [MembershipInline]


@admin.register(TeacherInvitation)
class TeacherInvitationAdmin(admin.ModelAdmin):
    """Seule voie de création d'un compte enseignant (S5) : créer l'invitation, puis « Envoyer »."""

    list_display = ("email", "school", "sent_at", "expires_at", "accepted_at", "invited_by")
    list_filter = ("school",)
    search_fields = ("email", "first_name", "last_name")
    readonly_fields = ("invited_by", "sent_at", "expires_at", "accepted_at")
    actions = ["send"]

    def save_model(self, request, obj, form, change):
        """Une invitation créée (« Inviter un enseignant », WAD06) part aussitôt ; le compte naît à son acceptation."""
        super().save_model(request, obj, form, change)
        if not change:
            send_invitation(obj, invited_by=request.user)
            self.message_user(request, f"Invitation envoyée à {obj.email}.", messages.SUCCESS)

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
