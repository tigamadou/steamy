"""
Domaine `accounts` : les enfants du parent connecté (WPD01-WPD04, WPD10, D26, D51) et le parent de l'apprenant
connecté (WD22). Règles : `apps/accounts/children.py`.

Toute route `children/{id}/` passe par le lien parent ↔ enfant du parent connecté : un `id` étranger → 404.
"""

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response

from apps.accounts import children as service
from apps.accounts import deletion as deletion_service
from apps.accounts import signup as signup_service
from apps.accounts import weekly_report as weekly_service
from apps.accounts.fields import PasswordField
from apps.accounts.models import DeletionRequest, Gender, ParentChildLink, User
from apps.accounts.profile import ProfileStep, profile_step
from apps.learning.models import Enrollment, LearnerBadge, QuizAttempt
from apps.learning.progression import Progression
from apps.learning.serializers import AttemptListItemSerializer, EnrollmentSerializer
from apps.learning.views import attempt_item, enrollment_payload
from apps.referentials.models import Disability, Relationship, SchoolGrade
from apps.referentials.serializers import (
    AvatarSerializer,
    DisabilitySerializer,
    GoalSerializer,
    LocalitySerializer,
    RelationshipSerializer,
    SchoolGradeSerializer,
)
from libs.errors import ApiError, message_for
from libs.permissions import IsLearner, IsParent

from .deletion import ChildDeletionSerializer
from .learner_signup import UsernameField
from .profiles import age_on, check_birth_date, code_field, locality_field

#: Tentatives affichées dans WPD03.
RECENT_ATTEMPTS = 5

# --- Lecture ------------------------------------------------------------------------------------


def courses_payload(child) -> list[dict]:
    """Progression par parcours (WPD03, WPD11), l'activité la plus récente d'abord."""
    enrollments = Enrollment.objects.filter(learner=child).order_by(
        F("last_activity_at").desc(nulls_last=True), "-created_at", "-id"
    )
    return [enrollment_payload(e, Progression(e)) for e in enrollments]


class ChildDeletionStateSerializer(serializers.ModelSerializer):
    """Suppression en cours : à examiner (`pending_parent`) ou programmée (« Supprimé le … », annulable, D54)."""

    class Meta:
        model = DeletionRequest
        fields = ("id", "status", "scheduled_for")
        read_only_fields = fields


class ChildSerializer(serializers.ModelSerializer):
    """Ligne d'un enfant (WPD01, WPD02) : rien de sensible (genre, handicap, localité) hors du détail."""

    age = serializers.SerializerMethodField()
    relationship = RelationshipSerializer(source="parent_link.relationship", read_only=True)
    avatar = AvatarSerializer(source="learner_profile.avatar", read_only=True, allow_null=True)
    school_grade = SchoolGradeSerializer(
        source="learner_profile.school_grade", read_only=True, allow_null=True
    )
    points = serializers.IntegerField(source="learner_profile.points", read_only=True)
    streak_days = serializers.IntegerField(source="learner_profile.streak_days", read_only=True)
    rank = serializers.CharField(source="learner_profile.rank", read_only=True)
    profile_step = serializers.SerializerMethodField(
        help_text="Étape de profil que l'enfant doit encore compléter (W11-W14), null si complet"
    )
    created_at = serializers.DateTimeField(source="date_joined", read_only=True)
    deletion = serializers.SerializerMethodField()
    active_courses = serializers.IntegerField(
        read_only=True, help_text="Parcours en cours (WPD01, stat « Parcours en cours »)"
    )

    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "username",
            "status",
            "age",
            "relationship",
            "avatar",
            "school_grade",
            "points",
            "streak_days",
            "rank",
            "profile_step",
            "created_at",
            "deletion",
            "active_courses",
        )
        read_only_fields = fields

    def get_age(self, child) -> int | None:
        profile = child.learner_profile
        if profile.birth_date:
            return age_on(profile.birth_date, timezone.localdate())
        return profile.declared_age

    @extend_schema_field(serializers.ChoiceField(choices=ProfileStep.choices, allow_null=True))
    def get_profile_step(self, child) -> str | None:
        return profile_step(child)

    @extend_schema_field(ChildDeletionStateSerializer(allow_null=True))
    def get_deletion(self, child):
        deletion = next(iter(child.open_deletions), None)
        return ChildDeletionStateSerializer(deletion).data if deletion else None


class ChildDetailSerializer(ChildSerializer):
    """Détail (WPD03, WPD10) : seul écran, avec la modification, où paraissent genre, handicap et localité (D6)."""

    birth_date = serializers.DateField(source="learner_profile.birth_date", read_only=True)
    gender = serializers.ChoiceField(
        source="learner_profile.gender", choices=Gender.choices, read_only=True, allow_null=True
    )
    disability = DisabilitySerializer(
        source="learner_profile.disability", read_only=True, allow_null=True
    )
    locality = LocalitySerializer(
        source="learner_profile.locality", read_only=True, allow_null=True
    )
    goals = GoalSerializer(source="learner_profile.goals", many=True, read_only=True)
    public_display_allowed = serializers.BooleanField(
        source="learner_profile.public_display_allowed",
        read_only=True,
        help_text="Opt-in parental à l'affichage public (pseudonyme et avatar, D15)",
    )

    courses = serializers.SerializerMethodField(
        help_text="Progression par parcours (WPD03), la plus récente activité d'abord"
    )

    recent_attempts = serializers.SerializerMethodField(
        help_text=f"{RECENT_ATTEMPTS} dernières tentatives de quiz (WPD03, statut serveur D31)"
    )
    badges = serializers.SerializerMethodField(help_text="Nombre de badges obtenus (WPD03)")

    class Meta(ChildSerializer.Meta):
        fields = (
            *ChildSerializer.Meta.fields,
            "courses",
            "recent_attempts",
            "badges",
            "birth_date",
            "gender",
            "disability",
            "locality",
            "goals",
            "public_display_allowed",
        )
        read_only_fields = fields

    @extend_schema_field(EnrollmentSerializer(many=True))
    def get_courses(self, child):
        return EnrollmentSerializer(courses_payload(child), many=True).data

    @extend_schema_field(AttemptListItemSerializer(many=True))
    def get_recent_attempts(self, child):
        attempts = QuizAttempt.objects.filter(learner=child).select_related(
            "quiz__level__project", "quiz__project", "enrollment__course"
        )[:RECENT_ATTEMPTS]
        return AttemptListItemSerializer([attempt_item(a) for a in attempts], many=True).data

    def get_badges(self, child) -> int:
        return LearnerBadge.objects.filter(learner=child).count()


# --- Écriture -----------------------------------------------------------------------------------


class ChildCreateSerializer(serializers.Serializer):
    """WPD04 : le parent crée le compte et choisit le mot de passe initial."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    birth_date = serializers.DateField(help_text="10 à 17 ans (D23)")
    relationship = code_field(
        Relationship, help_text="Lien de parenté (référentiel `relationships`)"
    )
    username = UsernameField()
    password = PasswordField()

    def validate_username(self, value):
        if not signup_service.username_available(value):
            raise serializers.ValidationError(message_for("USERNAME_TAKEN"), code="USERNAME_TAKEN")
        return value

    def validate_birth_date(self, value):
        return check_birth_date(value)


class ChildUpdateSerializer(serializers.Serializer):
    """WPD10. L'identifiant ne se modifie pas (C12) ; le mot de passe passe par `password-reset/` (D26)."""

    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    birth_date = serializers.DateField(
        required=False, help_text="Cohérente avec l'âge déclaré (D23)"
    )
    school_grade = code_field(SchoolGrade, required=False)
    locality = locality_field(required=False)
    gender = serializers.ChoiceField(choices=Gender.choices, allow_null=True, required=False)
    disability = code_field(Disability, allow_null=True, required=False)
    public_display_allowed = serializers.BooleanField(required=False)

    USER_FIELDS = ("first_name", "last_name")

    def validate_birth_date(self, value):
        return check_birth_date(value, self.instance.learner_profile)

    def update(self, child, validated_data):
        profile = child.learner_profile
        with transaction.atomic():
            for name, value in validated_data.items():
                setattr(child if name in self.USER_FIELDS else profile, name, value)
            child.save()
            profile.save()
        return child


class ChildPasswordResetSerializer(serializers.Serializer):
    password = PasswordField(help_text="Nouveau mot de passe, à communiquer à l'enfant (D26)")


# --- WPD11 · Rapport hebdomadaire ----------------------------------------------------------------


class DaySecondsSerializer(serializers.Serializer):
    date = serializers.DateField()
    seconds = serializers.IntegerField()


class WeeklyReportSerializer(serializers.Serializer):
    week = serializers.CharField(help_text="Semaine ISO `AAAA-Www`")
    start_date = serializers.DateField(help_text="Lundi")
    end_date = serializers.DateField(help_text="Dimanche")
    previous_week = serializers.CharField()
    next_week = serializers.CharField(allow_null=True, help_text="Null pour la semaine en cours")
    seconds = serializers.IntegerField(help_text="Temps d'apprentissage (journal, D55)")
    missions_completed = serializers.IntegerField()
    quizzes_passed = serializers.IntegerField()
    days = DaySecondsSerializer(many=True, help_text="7 jours, du lundi au dimanche")
    courses = EnrollmentSerializer(many=True, help_text="Progression actuelle par parcours")
    email = serializers.EmailField(
        allow_null=True,
        help_text="Adresse où le rapport est envoyé chaque semaine, null sans email",
    )


class WeeklyReportQuerySerializer(serializers.Serializer):
    week = serializers.CharField(
        required=False, help_text="`AAAA-Www` ; par défaut, la semaine en cours"
    )


class ChildViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Enfants rattachés au parent connecté."""

    permission_classes = [IsParent]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    filter_backends = []
    lookup_value_regex = r"\d+"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()
        return service.children_of(self.request.user)

    def get_serializer_class(self):
        return ChildSerializer if self.action == "list" else ChildDetailSerializer

    def list(self, request, *args, **kwargs):
        """WPD01, WPD02 : les enfants, par prénom."""
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """WPD03, WPD10."""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(request=ChildCreateSerializer, responses={201: ChildDetailSerializer})
    def create(self, request, *args, **kwargs):
        """WPD04 : compte actif, consentement d'origine `parent` créé accepté (D51)."""
        serializer = ChildCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        child = service.create_child(request.user, **serializer.validated_data)
        child = self.get_queryset().get(pk=child.pk)
        return Response(ChildDetailSerializer(child).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=ChildUpdateSerializer, responses=ChildDetailSerializer)
    def partial_update(self, request, *args, **kwargs):
        """WPD10 : profil de l'enfant, et opt-in à l'affichage public (D15)."""
        child = self.get_object()
        serializer = ChildUpdateSerializer(child, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ChildDetailSerializer(self.get_queryset().get(pk=child.pk)).data)

    @extend_schema(request=ChildPasswordResetSerializer, responses={204: None})
    @action(detail=True, methods=["post"], url_path="password-reset")
    def password_reset(self, request, pk=None):
        """WPD03 « Réinitialiser le mot de passe » (D26, §8.9) : l'ancien ne permet plus de se connecter."""
        child = self.get_object()
        serializer = ChildPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service.reset_password(
            request.user, child, serializer.validated_data["password"], request=request
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        methods=["post"], request=ChildDeletionSerializer, responses=ChildDetailSerializer
    )
    @extend_schema(methods=["delete"], request=None, responses=ChildDetailSerializer)
    @action(detail=True, methods=["post", "delete"])
    def deletion(self, request, pk=None):
        """
        WPD09 (`POST`) : compte désactivé aussitôt, anonymisé à J+30 ; valide aussi la demande de l'enfant (WD15).
        WPD02 (`DELETE`) : « Annuler la suppression », l'enfant peut de nouveau se connecter.
        """
        child = self.get_object()
        if request.method == "DELETE":
            deletion_service.cancel_child(request.user, child, request=request)
        else:
            serializer = ChildDeletionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            deletion_service.delete_child(
                request.user, child, **serializer.validated_data, request=request
            )
        return Response(ChildDetailSerializer(self.get_queryset().get(pk=child.pk)).data)

    @extend_schema(parameters=[WeeklyReportQuerySerializer], responses=WeeklyReportSerializer)
    @action(detail=True, methods=["get"], url_path="weekly-report")
    def weekly_report(self, request, pk=None):
        """WPD11 : semaine ISO (`?week=AAAA-Www`), navigation vers les semaines précédentes (D55)."""
        child = self.get_object()
        monday = weekly_service.parse_week(request.query_params.get("week"))
        profile = getattr(request.user, "parent_profile", None)
        data = {
            **weekly_service.report(child, monday),
            "courses": courses_payload(child),
            "email": getattr(profile, "email", None) or None,
        }
        return Response(WeeklyReportSerializer(data).data)


# --- WD22 · Mon parent --------------------------------------------------------------------------


class MyParentSerializer(serializers.ModelSerializer):
    """Le parent vu par l'apprenant (WD22) : nom et lien de parenté, ni numéro ni email."""

    first_name = serializers.CharField(source="parent.first_name")
    last_name = serializers.CharField(source="parent.last_name")
    relationship = RelationshipSerializer()
    linked_at = serializers.DateTimeField(source="created_at")

    class Meta:
        model = ParentChildLink
        fields = ("first_name", "last_name", "relationship", "linked_at")
        read_only_fields = fields


class MyParentView(RetrieveAPIView):
    permission_classes = [IsLearner]
    serializer_class = MyParentSerializer

    def get_object(self):
        link = (
            ParentChildLink.objects.select_related("parent", "relationship")
            .filter(learner=self.request.user)
            .first()
        )
        if link is None:
            raise ApiError("NOT_FOUND")
        return link
