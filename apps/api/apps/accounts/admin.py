"""
Admin des comptes (API-L6.2) : WAD06-WAD07 (utilisateurs), WAD08 (consentements, modération D15), WAD13 (équipe).

- Les personas ne se créent jamais ici (S1, S5) : `UserAdmin` ne liste que les apprenants, parents et enseignants,
  sans ajout ni suppression ; rôle, statut et identifiants y sont en lecture seule (D71). Le statut change par les
  actions *suspendre*, *désactiver*, *réactiver* (motif obligatoire, journalisé).
- Le personnel, ses groupes et son TOTP sont gérés par le seul Super-admin (`StaffMemberAdmin`).
- Consentements en suivi seul (D70) : ni ajout, ni modification, ni suppression ; actions *relancer* et *litige*.
- Suppressions de compte en suivi seul (D40, D54) ; action *annuler la suppression* (motif obligatoire, journalisé) :
  seule voie pour un parent qui a supprimé son propre compte, désactivé aussitôt.
"""

from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import UserChangeForm
from django.db.models import Exists, OuterRef, Q
from django.urls import reverse
from django.utils.html import format_html
from django.utils.translation import ngettext
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.core.admin_actions import form_action
from apps.core.groups import SUPER_ADMIN
from apps.referentials.models import Relationship
from libs.errors import ApiError
from libs.phone import normalize_phone

from . import backoffice
from .consent import effective_status
from .deletion import cancel_by_support
from .models import (
    ConsentRequest,
    DeletionRequest,
    LearnerProfile,
    ParentChildLink,
    ParentProfile,
    PublicProfileReview,
    StaffMember,
    TeacherProfile,
    User,
)
from .otp import client_ip
from .signup import resend_consent_request

#: Champs sensibles des profils (D6) : visibles avec *view_sensitive_profile* seulement.
SENSITIVE_FIELDS = ("gender", "disability")


class ReadOnlyAdmin(admin.ModelAdmin):
    """Suivi seul : ni ajout, ni modification, ni suppression ; les écritures passent par des actions."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class ReasonForm(forms.Form):
    reason = forms.CharField(label="Motif", widget=forms.Textarea(attrs={"rows": 3}))


class DisputeForm(forms.Form):
    note = forms.CharField(label="Note du litige", widget=forms.Textarea(attrs={"rows": 3}))


class ParentChangeForm(forms.Form):
    phone = forms.CharField(
        label="Téléphone du nouveau parent", help_text="Format international, +229…"
    )
    relationship = forms.ModelChoiceField(
        label="Lien de parenté", queryset=Relationship.objects.filter(active=True)
    )

    def clean_phone(self):
        phone = normalize_phone(self.cleaned_data["phone"])
        if not phone:
            raise forms.ValidationError("Numéro invalide.")
        return phone


# --- Utilisateurs (WAD06, WAD07) ------------------------------------------------------------------


class ReadOnlyInline(admin.TabularInline):
    """Inline de la fiche utilisateur (WAD07) : lecture seule, sans ajout ni suppression."""

    extra = 0
    can_delete = False
    show_change_link = True
    #: Relations affichées, chargées avec les lignes
    related = ()

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(*self.related)

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class ChildrenInline(ReadOnlyInline):
    model = ParentChildLink
    fk_name = "parent"
    related = ("learner", "relationship")
    fields = ("learner", "relationship", "created_at")
    readonly_fields = fields
    verbose_name_plural = "Enfants rattachés"


class ConsentInline(ReadOnlyInline):
    model = ConsentRequest
    fk_name = "learner"
    fields = ("origin", "parent_phone", "status", "created_at", "expires_at")
    readonly_fields = fields
    verbose_name_plural = "Demandes de consentement"


def enrollment_inline():
    from apps.learning.models import Enrollment

    return type(
        "EnrollmentInline",
        (ReadOnlyInline,),
        {
            "model": Enrollment,
            "fk_name": "learner",
            "related": ("course",),
            "fields": ("course", "source", "status", "created_at"),
            "readonly_fields": ("course", "source", "status", "created_at"),
            "verbose_name_plural": "Inscriptions",
        },
    )


def order_inline():
    from apps.payments.models import Order

    return type(
        "OrderInline",
        (ReadOnlyInline,),
        {
            "model": Order,
            "fk_name": "payer",
            "fields": ("reference", "kind", "total", "status", "created_at"),
            "readonly_fields": ("reference", "kind", "total", "status", "created_at"),
            "verbose_name_plural": "Commandes payées",
        },
    )


def membership_inline():
    from apps.classrooms.models import ClassroomMembership

    return type(
        "MembershipInline",
        (ReadOnlyInline,),
        {
            "model": ClassroomMembership,
            "fk_name": "learner",
            "related": ("classroom",),
            "fields": ("classroom", "status", "joined_at", "left_at"),
            "readonly_fields": ("classroom", "status", "joined_at", "left_at"),
            "verbose_name_plural": "Classes",
        },
    )


class CountryFilter(admin.SimpleListFilter):
    """Pays de la localité du profil (apprenant ou parent)."""

    title = "pays"
    parameter_name = "pays"

    def lookups(self, request, model_admin):
        from apps.referentials.models import Country

        return [(country.code, country.label) for country in Country.objects.filter(active=True)]

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        return queryset.filter(
            Q(learner_profile__locality__country=self.value())
            | Q(parent_profile__locality__country=self.value())
        )


def profile_of(user):
    """Profil d'apprenant ou de parent (localité, avatar, champs sensibles) ; `None` pour un enseignant."""
    for name in ("learner_profile", "parent_profile"):
        try:
            return getattr(user, name)
        except (LearnerProfile.DoesNotExist, ParentProfile.DoesNotExist):
            continue
    return None


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("__str__", "avatar", "full_name", "role", "city", "date_joined", "status")
    list_filter = ("role", "status", CountryFilter)
    search_fields = ("username", "phone", "email", "first_name", "last_name")
    ordering = ("-date_joined",)
    list_select_related = (
        "learner_profile__locality",
        "learner_profile__avatar",
        "parent_profile__locality",
    )
    fields = (
        "role",
        "status",
        "username",
        "phone",
        "email",
        "first_name",
        "last_name",
        "parent",
        "locality",
        "date_joined",
        "last_login",
    )
    readonly_fields = (
        "role",
        "status",
        "username",
        "phone",
        "email",
        "parent",
        "locality",
        "date_joined",
        "last_login",
    )
    actions = ["suspend", "deactivate", "reactivate", "send_password_reset"]

    def get_fields(self, request, obj=None):
        fields = list(super().get_fields(request, obj))
        if request.user.has_perm("accounts.view_sensitive_profile"):
            fields += ["gender", "disability"]
        return fields

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if request.user.has_perm("accounts.view_sensitive_profile"):
            fields += ["gender", "disability"]
        return fields

    def get_inlines(self, request, obj):
        # Pas de page d'ajout (S1, S5) : `obj` est toujours un compte existant
        if obj.role == User.Role.PARENT:
            return [ChildrenInline, order_inline()]
        if obj.role == User.Role.LEARNER:
            return [ConsentInline, enrollment_inline(), membership_inline()]
        return []

    def changelist_view(self, request, extra_context=None):
        # « Inviter un enseignant » (S5) : seule voie de création d'un compte enseignant
        extra_context = {
            **(extra_context or {}),
            "teacher_invitation_url": reverse("admin:classrooms_teacherinvitation_add"),
        }
        return super().changelist_view(request, extra_context)

    @admin.display(description="Avatar")
    def avatar(self, obj):
        profile = profile_of(obj)
        avatar = getattr(profile, "avatar", None)
        return avatar.emoji if avatar else "—"

    @admin.display(description="Ville")
    def city(self, obj):
        profile = profile_of(obj)
        return profile.locality.city if profile and profile.locality else "—"

    @admin.display(description="Localité")
    def locality(self, obj):
        profile = profile_of(obj)
        if profile is None or profile.locality is None:
            return "—"
        place = profile.locality
        return f"{place.city}, {place.country_id} · {place.get_area_type_display()}"

    @admin.display(description="Genre")
    def gender(self, obj):
        profile = profile_of(obj)
        return profile.get_gender_display() if profile and profile.gender else "—"

    @admin.display(description="Handicap")
    def disability(self, obj):
        profile = profile_of(obj)
        return str(profile.disability) if profile and profile.disability else "—"

    @admin.action(
        description="Réinitialiser le mot de passe (lien au titulaire)",
        permissions=["reset_password"],
    )
    def send_password_reset(self, request, queryset):
        for user in queryset:
            try:
                channel = backoffice.send_password_reset_link(user, request)
            except ValueError as error:
                self.message_user(request, str(error), messages.ERROR)
            except ApiError as error:  # plafond d'envois atteint (D24)
                self.message_user(request, f"{user} : {error.detail}", messages.WARNING)
            else:
                via = "par SMS" if channel == "sms" else "par email"
                self.message_user(
                    request, f"{user} : lien de réinitialisation envoyé {via}.", messages.SUCCESS
                )

    def has_reset_password_permission(self, request):
        return request.user.has_perm("accounts.reset_password")

    def get_queryset(self, request):
        return super().get_queryset(request).filter(is_staff=False)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_deactivate_user_permission(self, request):
        return request.user.has_perm("accounts.deactivate_user")

    @admin.display(description="Nom")
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    @admin.display(description="Parent")
    def parent(self, obj):
        link = ParentChildLink.objects.filter(learner=obj).select_related("parent").first()
        if link is None:
            return "—"
        url = reverse("admin:accounts_user_change", args=[link.parent_id])
        return format_html('<a href="{}">{}</a>', url, link.parent.get_full_name())

    def _set_status(self, request, queryset, status, title):
        def apply(data):
            changed = sum(
                backoffice.set_status(user, status, data["reason"], request) for user in queryset
            )
            skipped = queryset.count() - changed
            self.message_user(
                request,
                ngettext("%d compte mis à jour.", "%d comptes mis à jour.", changed) % changed,
                messages.SUCCESS,
            )
            if skipped:
                self.message_user(
                    request,
                    ngettext(
                        "%d compte ignoré (statut incompatible).",
                        "%d comptes ignorés (statut incompatible).",
                        skipped,
                    )
                    % skipped,
                    messages.WARNING,
                )

        return form_action(
            self,
            request,
            queryset,
            ReasonForm,
            title=title,
            intro="Le motif est conservé dans le journal d'audit.",
            submit_label="Confirmer",
            apply=apply,
        )

    @admin.action(description="Suspendre", permissions=["deactivate_user"])
    def suspend(self, request, queryset):
        return self._set_status(request, queryset, User.Status.SUSPENDED, "Suspendre des comptes")

    @admin.action(description="Désactiver", permissions=["deactivate_user"])
    def deactivate(self, request, queryset):
        return self._set_status(
            request, queryset, User.Status.DEACTIVATED, "Désactiver des comptes"
        )

    @admin.action(description="Réactiver", permissions=["deactivate_user"])
    def reactivate(self, request, queryset):
        return self._set_status(request, queryset, User.Status.ACTIVE, "Réactiver des comptes")


class SensitiveProfileAdmin(admin.ModelAdmin):
    """Profils : genre et handicap retirés du formulaire sans *view_sensitive_profile* (D6)."""

    list_display = ("user", "created_at")
    raw_id_fields = ("user",)

    def get_exclude(self, request, obj=None):
        if request.user.has_perm("accounts.view_sensitive_profile"):
            return ()
        return SENSITIVE_FIELDS


admin.site.register(LearnerProfile, SensitiveProfileAdmin)
admin.site.register(ParentProfile, SensitiveProfileAdmin)
admin.site.register(TeacherProfile, list_display=("user", "created_at"), raw_id_fields=("user",))


# --- Consentements et liens (WAD08) ---------------------------------------------------------------


@admin.register(ConsentRequest)
class ConsentRequestAdmin(ReadOnlyAdmin):
    """Suivi seul (D70) : aucune voie de l'admin ne fait passer une demande à « acceptée » ou « refusée »."""

    list_display = (
        "child",
        "age",
        "origin",
        "parent_phone",
        "created_at",
        "current_status",
        "disputed_at",
    )
    list_filter = ("status", "origin", ("disputed_at", admin.EmptyFieldListFilter))
    search_fields = ("parent_phone", "learner__username", "subject__last_name")
    fields = (
        "origin",
        "subject",
        "learner",
        "requested_by",
        "parent_phone",
        "parent",
        "relationship",
        "status",
        "expires_at",
        "last_sent_at",
        "refusal_reason",
        "refusal_note",
        "resolved_at",
        "disputed_at",
        "dispute_note",
        "replaces_link",
        "created_at",
    )
    readonly_fields = fields
    actions = ["resend", "flag_dispute"]

    def has_resend_permission(self, request):
        return request.user.has_perm("accounts.resend")

    def has_flag_dispute_permission(self, request):
        return request.user.has_perm("accounts.flag_dispute")

    @admin.display(description="Enfant")
    def child(self, obj):
        return f"{obj.subject.get('first_name', '')} {obj.subject.get('last_name', '')}".strip()

    @admin.display(description="Âge")
    def age(self, obj):
        return obj.subject.get("age")

    @admin.display(description="Statut")
    def current_status(self, obj):
        return ConsentRequest.Status(effective_status(obj)).label

    @admin.action(description="Relancer le parent (SMS)", permissions=["resend"])
    def resend(self, request, queryset):
        """Mêmes plafonds que la relance de W07 : délai entre deux envois, quotas par numéro et par IP (D24)."""
        sent = 0
        for consent in queryset:
            try:
                resend_consent_request(consent, client_ip(request))
            except ApiError as error:
                self.message_user(request, f"{consent} : {error.detail}", messages.WARNING)
            else:
                sent += 1
        if sent:
            self.message_user(
                request,
                ngettext("%d relance envoyée.", "%d relances envoyées.", sent) % sent,
                messages.SUCCESS,
            )

    @admin.action(description="Marquer en litige", permissions=["flag_dispute"])
    def flag_dispute(self, request, queryset):
        def apply(data):
            for consent in queryset:
                backoffice.flag_dispute(consent, data["note"], request)
            self.message_user(request, "Litige enregistré.", messages.SUCCESS)

        return form_action(
            self,
            request,
            queryset,
            DisputeForm,
            title="Marquer en litige",
            intro="La demande reste à trancher par le parent ; la note est visible du support.",
            submit_label="Enregistrer le litige",
            apply=apply,
        )


@admin.register(DeletionRequest)
class DeletionRequestAdmin(ReadOnlyAdmin):
    """Suppressions programmées ou en attente du parent (D40, D54) : le support les suit et peut les annuler."""

    list_display = ("user", "status", "requested_by", "reason", "scheduled_for", "created_at")
    list_filter = ("status",)
    search_fields = ("user__username", "user__phone", "user__last_name")
    fields = (
        "user",
        "requested_by",
        "status",
        "reason",
        "note",
        "scheduled_for",
        "resolved_at",
        "created_at",
    )
    readonly_fields = fields
    actions = ["cancel"]

    def has_cancel_deletion_permission(self, request):
        return request.user.has_perm("accounts.cancel_deletion")

    @admin.action(description="Annuler la suppression", permissions=["cancel_deletion"])
    def cancel(self, request, queryset):
        def apply(data):
            cancelled = sum(
                cancel_by_support(deletion, data["reason"], request) for deletion in queryset
            )
            self.message_user(
                request,
                ngettext(
                    "%d suppression annulée, compte réactivé.",
                    "%d suppressions annulées, comptes réactivés.",
                    cancelled,
                )
                % cancelled,
                messages.SUCCESS,
            )
            skipped = queryset.count() - cancelled
            if skipped:
                self.message_user(
                    request,
                    ngettext(
                        "%d demande ignorée (déjà close).",
                        "%d demandes ignorées (déjà closes).",
                        skipped,
                    )
                    % skipped,
                    messages.WARNING,
                )

        return form_action(
            self,
            request,
            queryset,
            ReasonForm,
            title="Annuler des suppressions",
            intro="Le compte est réactivé et l'anonymisation n'aura pas lieu. Le motif est journalisé.",
            submit_label="Annuler la suppression",
            apply=apply,
        )


@admin.register(ParentChildLink)
class ParentChildLinkAdmin(ReadOnlyAdmin):
    list_display = ("learner", "parent", "relationship", "created_at")
    search_fields = ("learner__username", "parent__phone", "parent__last_name")
    fields = ("learner", "parent", "relationship", "consent_request", "created_at", "updated_at")
    readonly_fields = fields
    actions = ["change_parent"]

    def has_change_parent_permission(self, request):
        return request.user.has_perm("accounts.change_parent")

    @admin.action(description="Changer de parent (D22)", permissions=["change_parent"])
    def change_parent(self, request, queryset):
        """Une demande part vers le nouveau parent ; le lien ne change qu'à son acceptation."""
        if queryset.count() != 1:
            self.message_user(request, "Sélectionnez un seul lien.", messages.ERROR)
            return None
        link = queryset.get()

        def apply(data):
            try:
                backoffice.request_parent_change(link, data["phone"], data["relationship"], request)
            except ApiError as error:
                self.message_user(request, error.detail, messages.ERROR)
            else:
                self.message_user(
                    request,
                    "Demande envoyée au nouveau parent : le lien sera remplacé à son acceptation.",
                    messages.SUCCESS,
                )

        return form_action(
            self,
            request,
            queryset,
            ParentChangeForm,
            title="Changer de parent",
            intro="Le nouveau parent reçoit une demande de consentement par SMS. Rien ne change avant son "
            "acceptation ; l'ancien parent est alors prévenu.",
            submit_label="Envoyer la demande",
            apply=apply,
        )


@admin.register(PublicProfileReview)
class PublicProfileReviewAdmin(admin.ModelAdmin):
    """Modération a priori de l'affichage public des mineurs (D15) : approuver ou rejeter, rien d'autre."""

    list_display = ("pseudonym", "learner", "avatar", "status", "created_at", "reviewed_by")
    list_filter = ("status",)
    search_fields = ("pseudonym", "learner__username")
    fields = (
        "learner",
        "pseudonym",
        "avatar",
        "status",
        "reviewed_by",
        "reviewed_at",
        "created_at",
    )
    readonly_fields = fields
    actions = ["approve", "reject"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def _review(self, request, queryset, approve):
        done = sum(
            backoffice.review_public_profile(review, approve, request) for review in queryset
        )
        self.message_user(
            request,
            ngettext("%d affichage modéré.", "%d affichages modérés.", done) % done,
            messages.SUCCESS,
        )

    @admin.action(description="Approuver", permissions=["change"])
    def approve(self, request, queryset):
        self._review(request, queryset, approve=True)

    @admin.action(description="Rejeter", permissions=["change"])
    def reject(self, request, queryset):
        self._review(request, queryset, approve=False)


# --- Équipe (WAD13) ----------------------------------------------------------------------------------


class StaffMemberForm(UserChangeForm):
    """Garde-fous : le dernier Super-admin garde son groupe ; personne ne se retire soi-même du groupe."""

    request = None

    def clean_groups(self):
        groups = self.cleaned_data["groups"]
        member = self.instance
        if member.pk is None or groups.filter(name=SUPER_ADMIN).exists():
            return groups
        if member.pk == self.request.user.pk and member.groups.filter(name=SUPER_ADMIN).exists():
            raise forms.ValidationError(
                "Vous ne pouvez pas vous retirer vous-même du groupe Super-admin."
            )
        if backoffice.is_last_super_admin(member):
            raise forms.ValidationError("Le dernier Super-admin ne peut pas quitter ce groupe.")
        return groups


@admin.register(StaffMember)
class StaffMemberAdmin(DjangoUserAdmin):
    form = StaffMemberForm
    list_display = ("email", "full_name", "staff_groups", "totp", "status", "last_login")
    list_filter = ("groups", "status")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identité", {"fields": ("first_name", "last_name")}),
        ("Accès", {"fields": ("groups", "is_superuser", "status")}),
        ("Dates", {"fields": ("date_joined", "last_login")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2", "groups"),
            },
        ),
    )
    readonly_fields = ("is_superuser", "status", "date_joined", "last_login")
    filter_horizontal = ("groups",)
    actions = ["reset_totp"]

    def get_queryset(self, request):
        confirmed = TOTPDevice.objects.filter(user=OuterRef("pk"), confirmed=True)
        return (
            super()
            .get_queryset(request)
            .filter(is_staff=True)
            .prefetch_related("groups")
            .annotate(has_totp=Exists(confirmed))
        )

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.request = request
        return form

    def get_actions(self, request):
        actions = super().get_actions(request)
        actions.pop("delete_selected", None)  # suppression fiche par fiche, garde-fous compris
        return actions

    def has_delete_permission(self, request, obj=None):
        if obj is not None and (obj.pk == request.user.pk or backoffice.is_last_super_admin(obj)):
            return False
        return super().has_delete_permission(request, obj)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.role, obj.is_staff = None, True
        super().save_model(request, obj, form, change)

    @admin.display(description="Nom")
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    @admin.display(description="Groupes")
    def staff_groups(self, obj):
        return ", ".join(group.name for group in obj.groups.all())

    @admin.display(description="TOTP", boolean=True)
    def totp(self, obj):
        return obj.has_totp

    @admin.action(description="Réinitialiser le TOTP (ferme les sessions)", permissions=["change"])
    def reset_totp(self, request, queryset):
        for staff in queryset:
            backoffice.reset_totp(staff, request)
        self.message_user(
            request,
            "TOTP réinitialisé : le membre se réenrôle à sa prochaine connexion.",
            messages.SUCCESS,
        )
