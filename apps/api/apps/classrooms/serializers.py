"""
Espace enseignant (§7.6). Sérialiseurs **dédiés** : un élève n'y apparaît que par son prénom, son nom et son avatar,
jamais par son handicap, sa localité, sa date de naissance, son âge, son téléphone ni son identifiant (D64).
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts import consent as consent_service
from apps.accounts.fields import PhoneField
from apps.accounts.models import ConsentRequest
from apps.catalog.models import Course, Level, Mission, Project, Quiz
from apps.catalog.serializers import CategorySummarySerializer
from apps.events.models import EventApplication
from apps.events.serializers import EventSummarySerializer
from apps.learning.models import QuizAttempt
from apps.learning.serializers import BadgeSerializer
from apps.referentials.models import Relationship, SchoolGrade
from apps.referentials.serializers import AvatarSerializer, SchoolGradeSerializer
from libs.errors import ApiError

from . import follow_up, quotas
from .models import Classroom, ClassroomMembership, School, TeacherComment, validate_color


class ClassroomCourseSerializer(serializers.ModelSerializer):
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
    offer_expired = serializers.SerializerMethodField(
        help_text="Offre échue : création de classes et ajout d'élèves bloqués (`SCHOOL_OFFER_EXPIRED`)"
    )
    courses = ClassroomCourseSerializer(many=True, read_only=True)

    class Meta:
        model = School
        fields = (
            "name",
            "city",
            "country",
            "offer",
            "valid_until",
            "offer_expired",
            "learner_quota",
            "learners_used",
            "learners_left",
            "classroom_quota",
            "classrooms_used",
            "classrooms_left",
            "courses",
        )
        read_only_fields = fields

    def get_offer_expired(self, school) -> bool:
        try:
            quotas.check_offer(school)
        except ApiError:
            return True
        return False

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

    course = ClassroomCourseSerializer(read_only=True)
    school_grade = SchoolGradeSerializer(read_only=True, allow_null=True)
    member_count = serializers.IntegerField(read_only=True, help_text="Élèves actifs")
    pending_invitation_count = serializers.IntegerField(
        read_only=True, help_text="Invitations en attente du parent"
    )
    has_members = serializers.BooleanField(
        read_only=True, help_text="Parcours figé : la classe a déjà eu un membre"
    )
    average_progress = serializers.IntegerField(
        read_only=True, help_text="Progression moyenne des élèves actifs sur le parcours (%)"
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
            "average_progress",
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
    progress_pct = serializers.SerializerMethodField(
        help_text="Élève actif : progression sur le parcours"
    )
    last_activity_at = serializers.SerializerMethodField(
        help_text="Élève actif : dernière activité sur le parcours, ou date d'adhésion"
    )
    is_dropout = serializers.SerializerMethodField(help_text="Élève actif en décrochage (D66)")

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
            "progress_pct",
            "last_activity_at",
            "is_dropout",
            "joined_at",
            "created_at",
        )
        read_only_fields = fields

    def _follow(self, membership):
        """`(inscription, dernière activité, décrocheur)` d'un élève actif ; `None` sinon ou hors contexte."""
        follow = self.context.get("follow")
        if membership.status != ClassroomMembership.Status.ACTIVE or follow is None:
            return None
        enrollments, limit = follow
        enrollment = enrollments.get((membership.learner_id, membership.classroom.course_id))
        return (
            enrollment,
            follow_up.last_activity(membership, enrollment),
            follow_up.is_dropout(membership, enrollment, limit),
        )

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_progress_pct(self, membership):
        follow = self._follow(membership)
        if follow is None:
            return None
        return follow[0].progress_pct if follow[0] else 0

    @extend_schema_field(serializers.DateTimeField(allow_null=True))
    def get_last_activity_at(self, membership):
        follow = self._follow(membership)
        return serializers.DateTimeField().to_representation(follow[1]) if follow else None

    @extend_schema_field(serializers.BooleanField())
    def get_is_dropout(self, membership) -> bool:
        follow = self._follow(membership)
        return bool(follow and follow[2])

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


class StatsMixin:
    """Compteurs du parcours chez l'enseignant (WT10), calculés par la vue et passés en contexte."""

    def _stat(self, name, key):
        return self.context.get("stats", {}).get(name, {}).get(key)


class MissionNodeSerializer(StatsMixin, serializers.ModelSerializer):
    completed_count = serializers.SerializerMethodField(
        help_text="Élèves actifs de l'enseignant ayant terminé la mission"
    )

    class Meta:
        model = Mission
        fields = ("id", "order", "title", "duration_min", "icon", "completed_count")

    def get_completed_count(self, mission) -> int:
        return self._stat("completed", mission.pk) or 0


class LevelNodeSerializer(StatsMixin, serializers.ModelSerializer):
    missions = MissionNodeSerializer(many=True, read_only=True)
    pass_rate = serializers.SerializerMethodField(
        help_text="Part des tentatives réussies à la formative du niveau (%), null sans tentative"
    )

    class Meta:
        model = Level
        fields = ("id", "order", "title", "duration_min", "pass_rate", "missions")

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_pass_rate(self, level):
        return self._stat("level_pass_rate", level.pk)


class ProjectNodeSerializer(StatsMixin, serializers.ModelSerializer):
    levels = LevelNodeSerializer(many=True, read_only=True)
    pass_rate = serializers.SerializerMethodField(
        help_text="Part des tentatives réussies à la sommative du projet (%), null sans tentative"
    )

    class Meta:
        model = Project
        fields = ("id", "order", "title", "duration_hours", "pass_rate", "levels")

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_pass_rate(self, project):
        return self._stat("project_pass_rate", project.pk)


class SupervisedCourseSerializer(ClassroomCourseSerializer):
    """Parcours encadré (WT02) : ses classes et ses élèves actifs chez l'enseignant."""

    classroom_count = serializers.IntegerField(read_only=True)
    learner_count = serializers.IntegerField(read_only=True)

    class Meta(ClassroomCourseSerializer.Meta):
        fields = (*ClassroomCourseSerializer.Meta.fields, "classroom_count", "learner_count")
        read_only_fields = fields


class SupervisedCourseDetailSerializer(SupervisedCourseSerializer):
    """WT10 : l'arbre Projet → Niveau → Mission, en lecture seule (S5)."""

    classrooms = serializers.SerializerMethodField()
    formative_pass_rate = serializers.SerializerMethodField()
    summative_pass_rate = serializers.SerializerMethodField()
    projects = ProjectNodeSerializer(many=True, read_only=True)

    class Meta(SupervisedCourseSerializer.Meta):
        fields = (
            *SupervisedCourseSerializer.Meta.fields,
            "description",
            "classrooms",
            "formative_pass_rate",
            "summative_pass_rate",
            "projects",
        )
        read_only_fields = fields

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_formative_pass_rate(self, course):
        return self.context.get("stats", {}).get("kind_pass_rate", {}).get("formative")

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_summative_pass_rate(self, course):
        return self.context.get("stats", {}).get("kind_pass_rate", {}).get("summative")

    @extend_schema_field(ClassroomSerializer(many=True))
    def get_classrooms(self, course):
        return ClassroomSerializer(self.context["classrooms"], many=True).data


class InvitationSerializer(serializers.Serializer):
    """WT06 onglet Individuel : l'élève n'a pas de téléphone (D30), seul son parent est contacté."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    parent_phone = PhoneField()
    relationship = serializers.SlugRelatedField(
        slug_field="code",
        queryset=Relationship.objects.filter(active=True),
        help_text="Code du référentiel `relationships`",
    )


class ImportRowSerializer(serializers.Serializer):
    """Ligne saisie ou corrigée dans le front ; `line` garde son numéro d'origine dans le rapport."""

    line = serializers.IntegerField(required=False, min_value=1)
    first_name = serializers.CharField(allow_blank=True, default="")
    last_name = serializers.CharField(allow_blank=True, default="")
    parent_phone = serializers.CharField(allow_blank=True, default="")
    relationship = serializers.CharField(allow_blank=True, default="")


class ImportRequestSerializer(serializers.Serializer):
    """Un fichier CSV ou Excel (.xlsx, 1 Mo, 200 lignes) **ou** des lignes (liste collée, lignes corrigées)."""

    file = serializers.FileField(required=False)
    rows = ImportRowSerializer(many=True, required=False, max_length=200)

    def validate(self, attrs):
        if bool(attrs.get("file")) == ("rows" in attrs):
            raise serializers.ValidationError("Envoyez soit un fichier, soit des lignes.")
        return attrs


class ImportRowDataSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)
    parent_phone = serializers.CharField(required=False)
    relationship = serializers.CharField(required=False)


class ImportErrorSerializer(serializers.Serializer):
    line = serializers.IntegerField()
    code = serializers.ChoiceField(
        choices=[
            "DUPLICATE_ROW",
            "MALFORMED_ROW",
            "PHONE_INVALID",
            "ALREADY_IN_CLASSROOM",
            "LEARNER_QUOTA_EXCEEDED",
            "CONSENT_COOLDOWN",
            "INVITATION_DAILY_LIMIT",
        ]
    )
    message = serializers.CharField()
    data = ImportRowDataSerializer(help_text="Valeurs lues, pour corriger la ligne en place")


class ImportResultSerializer(serializers.Serializer):
    created = MemberSerializer(many=True)
    errors = ImportErrorSerializer(many=True)


# --- Suivi (API-L5.3) ----------------------------------------------------------------------------


class ClassroomRefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class NodeRefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()


class QuizRefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=Quiz.Kind.choices)
    title = serializers.CharField(source="display_title")
    project_title = serializers.SerializerMethodField()
    level_title = serializers.SerializerMethodField()

    def get_project_title(self, quiz) -> str:
        return (quiz.project or quiz.level.project).title

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_level_title(self, quiz):
        return quiz.level.title if quiz.level_id else None


class TeacherAttemptSerializer(serializers.Serializer):
    """Tentative vue par l'enseignant (WT05, WT07) : statut serveur (D31), jamais les réponses ni le corrigé."""

    id = serializers.IntegerField()
    quiz = QuizRefSerializer()
    percentage = serializers.IntegerField()
    status = serializers.ChoiceField(choices=QuizAttempt.Status.choices)
    passed = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    commented = serializers.BooleanField(
        help_text="L'enseignant l'a déjà commentée (sort de « À revoir »)"
    )


class ReviewSerializer(TeacherAttemptSerializer):
    """Ligne de WT07 et de « À revoir » (WT01)."""

    learner = MemberLearnerSerializer(source="learner_ref")
    classroom = ClassroomRefSerializer(source="classroom_ref")


class TeacherCommentSerializer(serializers.ModelSerializer):
    attempt_id = serializers.IntegerField(allow_null=True, read_only=True)

    class Meta:
        model = TeacherComment
        fields = ("id", "body", "attempt_id", "created_at")
        read_only_fields = fields


class CommentRequestSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=1000)
    attempt_id = serializers.IntegerField(required=False, allow_null=True)
    classroom_id = serializers.IntegerField(
        required=False, help_text="Classe concernée si l'élève est dans plusieurs de vos classes"
    )


class LearnerQuerySerializer(serializers.Serializer):
    # Paramètres d'URL : noms en camelCase, comme le reste de l'API (pas de conversion automatique ici)
    classroomId = serializers.IntegerField(required=False)


class EarnedBadgeSerializer(BadgeSerializer):
    awarded_at = serializers.DateTimeField()


class LearnerFollowUpSerializer(serializers.Serializer):
    """WT05 : l'élève sur le parcours de la classe seulement, sans donnée sensible (D64)."""

    learner = MemberLearnerSerializer()
    classroom = ClassroomSerializer()
    joined_at = serializers.DateTimeField()
    progress_pct = serializers.IntegerField()
    last_activity_at = serializers.DateTimeField()
    is_dropout = serializers.BooleanField()
    average_percentage = serializers.IntegerField(
        allow_null=True, help_text="Moyenne des tentatives du parcours (%)"
    )
    badges = EarnedBadgeSerializer(many=True, help_text="Badges du parcours de la classe")
    attempts = TeacherAttemptSerializer(many=True)
    comments = TeacherCommentSerializer(many=True)


class ReviewQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[follow_up.TO_REVIEW, *QuizAttempt.Status.values],
        required=False,
        help_text="`to_review` : tentatives `ko` non commentées (D65)",
    )
    type = serializers.ChoiceField(choices=Quiz.Kind.values, required=False)
    classroomId = serializers.IntegerField(required=False)


class DropoutSerializer(serializers.Serializer):
    learner = MemberLearnerSerializer()
    classroom = ClassroomRefSerializer()
    last_activity_at = serializers.DateTimeField()


class TeacherDashboardSerializer(serializers.Serializer):
    """WT01 : compteurs, cartes de classes, « À revoir » et « Décrochage » (5 premiers de chaque)."""

    classroom_count = serializers.IntegerField()
    learner_count = serializers.IntegerField(help_text="Élèves actifs, comptés une fois")
    pending_invitation_count = serializers.IntegerField()
    to_review_count = serializers.IntegerField()
    dropout_count = serializers.IntegerField()
    classrooms = ClassroomSerializer(many=True)
    to_review = ReviewSerializer(many=True)
    dropouts = DropoutSerializer(many=True)


class MissionReadSerializer(serializers.ModelSerializer):
    """Mission en lecture seule (WT10) : le contenu, sans progression ni quiz."""

    level = NodeRefSerializer()
    project = NodeRefSerializer(source="level.project")

    class Meta:
        model = Mission
        fields = (
            "id",
            "order",
            "title",
            "duration_min",
            "icon",
            "vimeo_id",
            "vimeo_hash",
            "blocks",
            "level",
            "project",
        )
        read_only_fields = fields


class LearnerCommentSerializer(serializers.ModelSerializer):
    """Commentaire vu par l'apprenant (WD01) et son parent (WPD03) : lecture seule, pas de réponse (S11)."""

    teacher_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source="classroom.name")
    learner_id = serializers.IntegerField()
    attempt = serializers.SerializerMethodField()

    class Meta:
        model = TeacherComment
        fields = (
            "id",
            "body",
            "created_at",
            "teacher_name",
            "classroom_name",
            "learner_id",
            "attempt",
        )
        read_only_fields = fields

    def get_teacher_name(self, comment) -> str:
        return f"{comment.teacher.first_name} {comment.teacher.last_name}".strip()

    @extend_schema_field(TeacherAttemptSerializer(allow_null=True))
    def get_attempt(self, comment):
        attempt = comment.attempt
        if attempt is None:
            return None
        attempt.commented = True
        return TeacherAttemptSerializer(attempt).data


class CommentQuerySerializer(serializers.Serializer):
    learnerId = serializers.IntegerField(required=False, help_text="Parent : un de ses enfants")


# --- Candidatures des élèves aux Steamy Events (WT09, API-L5.5) -----------------------------------


class EventApplicationQuerySerializer(serializers.Serializer):
    # Paramètres d'URL : noms en camelCase, comme le reste de l'API
    classroomId = serializers.IntegerField(required=False)
    event = serializers.SlugField(required=False, help_text="Slug de l'événement")


class ClassroomEventApplicationSerializer(serializers.Serializer):
    """Candidature d'un élève vue par son enseignant : statut seulement, ni motivation ni paiement (S8, D64)."""

    id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=EventApplication.Status.choices)
    event = EventSummarySerializer()
    learner = MemberLearnerSerializer()
    classroom = ClassroomRefSerializer(source="classroom_ref")
    created_at = serializers.DateTimeField()
