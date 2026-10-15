"""
Espace enseignant (§7.6). Sérialiseurs **dédiés** : un élève n'y apparaît que par son prénom, son nom et son avatar,
jamais par son handicap, sa localité, sa date de naissance, son âge, son téléphone ni son identifiant (D64).
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts import consent as consent_service
from apps.accounts.models import ConsentRequest
from apps.catalog.models import Course, Level, Mission, Project
from apps.catalog.serializers import CategorySummarySerializer
from apps.referentials.models import SchoolGrade
from apps.referentials.serializers import AvatarSerializer, SchoolGradeSerializer

from . import quotas
from .models import Classroom, ClassroomMembership, School, validate_color


class CourseSummarySerializer(serializers.ModelSerializer):
    category = CategorySummarySerializer(read_only=True)

    class Meta:
        model = Course
        fields = ("slug", "title", "emoji", "category", "difficulty", "duration_hours")
        read_only_fields = fields


class SchoolSerializer(serializers.ModelSerializer):
    """WT03, WT06, WT13 : l'école, son offre et ce qui reste des quotas (invitations en attente comprises, C19)."""

    country = serializers.CharField(source="country.code", read_only=True)
    learners_used = serializers.SerializerMethodField()
    learners_left = serializers.SerializerMethodField()
    classrooms_used = serializers.SerializerMethodField()
    classrooms_left = serializers.SerializerMethodField()
    courses = CourseSummarySerializer(many=True, read_only=True)

    class Meta:
        model = School
        fields = (
            "name",
            "city",
            "country",
            "offer",
            "valid_until",
            "learner_quota",
            "learners_used",
            "learners_left",
            "classroom_quota",
            "classrooms_used",
            "classrooms_left",
            "courses",
        )
        read_only_fields = fields

    def get_learners_used(self, school) -> int:
        return quotas.learners_used(school)

    def get_learners_left(self, school) -> int:
        return max(school.learner_quota - self.get_learners_used(school), 0)

    def get_classrooms_used(self, school) -> int:
        return quotas.classrooms_used(school)

    def get_classrooms_left(self, school) -> int:
        return max(school.classroom_quota - self.get_classrooms_used(school), 0)


class ClassroomSerializer(serializers.ModelSerializer):
    """Carte de classe (WT01, WT03) et en-tête de WT04."""

    course = CourseSummarySerializer(read_only=True)
    school_grade = SchoolGradeSerializer(read_only=True, allow_null=True)
    member_count = serializers.IntegerField(read_only=True, help_text="Élèves actifs")
    pending_invitation_count = serializers.IntegerField(
        read_only=True, help_text="Invitations en attente du parent"
    )
    has_members = serializers.BooleanField(
        read_only=True, help_text="Parcours figé : la classe a déjà eu un membre"
    )

    class Meta:
        model = Classroom
        fields = (
            "id",
            "name",
            "color",
            "course",
            "school_grade",
            "member_count",
            "pending_invitation_count",
            "has_members",
            "created_at",
        )
        read_only_fields = fields


class ClassroomWriteSerializer(serializers.Serializer):
    """WT13 : nom*, parcours* (de l'offre), niveau scolaire facultatif, couleur facultative."""

    name = serializers.CharField(max_length=80, trim_whitespace=True)
    course_slug = serializers.SlugRelatedField(
        slug_field="slug",
        source="course",
        queryset=Course.objects.filter(status=Course.Status.PUBLISHED),
        help_text="Parcours de l'offre de l'école (`classrooms/school/`)",
    )
    school_grade = serializers.SlugRelatedField(
        slug_field="code",
        queryset=SchoolGrade.objects.filter(active=True),
        required=False,
        allow_null=True,
        help_text="Code du référentiel `school-grades`",
    )
    color = serializers.CharField(
        max_length=7, required=False, validators=[validate_color], help_text="#RRGGBB"
    )


class MemberLearnerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    avatar = serializers.SerializerMethodField()

    @extend_schema_field(AvatarSerializer(allow_null=True))
    def get_avatar(self, learner):
        profile = getattr(learner, "learner_profile", None)
        avatar = getattr(profile, "avatar", None)
        return AvatarSerializer(avatar).data if avatar else None


class MemberSerializer(serializers.ModelSerializer):
    """
    Ligne de WT04 : élève actif (`MemberRow`) ou invitation (`InvitationRow`). Une invitation montre le prénom et le
    nom saisis par l'enseignant et l'état de la demande au parent, jamais son numéro.
    """

    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    learner = serializers.SerializerMethodField()
    invitation_status = serializers.SerializerMethodField(
        help_text="État de la demande au parent (`invited` seulement) ; `refused` et `expired` sont à signaler"
    )
    invitation_expires_at = serializers.SerializerMethodField()

    class Meta:
        model = ClassroomMembership
        fields = (
            "id",
            "status",
            "first_name",
            "last_name",
            "learner",
            "invitation_status",
            "invitation_expires_at",
            "joined_at",
            "created_at",
        )
        read_only_fields = fields

    @staticmethod
    def _subject(membership, key) -> str:
        consent = membership.consent_request
        return (consent.subject.get(key) if consent else None) or ""

    def get_first_name(self, membership) -> str:
        if membership.learner:
            return membership.learner.first_name
        return self._subject(membership, "first_name")

    def get_last_name(self, membership) -> str:
        if membership.learner:
            return membership.learner.last_name
        return self._subject(membership, "last_name")

    @extend_schema_field(MemberLearnerSerializer(allow_null=True))
    def get_learner(self, membership):
        if membership.learner is None:
            return None
        return MemberLearnerSerializer(membership.learner).data

    @extend_schema_field(
        serializers.ChoiceField(choices=ConsentRequest.Status.choices, allow_null=True)
    )
    def get_invitation_status(self, membership):
        if (
            membership.status != ClassroomMembership.Status.INVITED
            or not membership.consent_request
        ):
            return None
        return consent_service.effective_status(membership.consent_request)

    @extend_schema_field(serializers.DateTimeField(allow_null=True))
    def get_invitation_expires_at(self, membership):
        if self.get_invitation_status(membership) != ConsentRequest.Status.PENDING:
            return None
        return serializers.DateTimeField().to_representation(membership.consent_request.expires_at)


class MissionNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mission
        fields = ("id", "order", "title", "duration_min", "icon")


class LevelNodeSerializer(serializers.ModelSerializer):
    missions = MissionNodeSerializer(many=True, read_only=True)

    class Meta:
        model = Level
        fields = ("id", "order", "title", "duration_min", "missions")


class ProjectNodeSerializer(serializers.ModelSerializer):
    levels = LevelNodeSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ("id", "order", "title", "duration_hours", "levels")


class SupervisedCourseSerializer(CourseSummarySerializer):
    """Parcours encadré (WT02) : ses classes et ses élèves actifs chez l'enseignant."""

    classroom_count = serializers.IntegerField(read_only=True)
    learner_count = serializers.IntegerField(read_only=True)

    class Meta(CourseSummarySerializer.Meta):
        fields = (*CourseSummarySerializer.Meta.fields, "classroom_count", "learner_count")
        read_only_fields = fields


class SupervisedCourseDetailSerializer(SupervisedCourseSerializer):
    """WT10 : l'arbre Projet → Niveau → Mission, en lecture seule (S5)."""

    classrooms = serializers.SerializerMethodField()
    projects = ProjectNodeSerializer(many=True, read_only=True)

    class Meta(SupervisedCourseSerializer.Meta):
        fields = (*SupervisedCourseSerializer.Meta.fields, "description", "classrooms", "projects")
        read_only_fields = fields

    @extend_schema_field(ClassroomSerializer(many=True))
    def get_classrooms(self, course):
        return ClassroomSerializer(self.context["classrooms"], many=True).data
