"""
Domaine `classrooms` : espace enseignant (WT01-WT13, §7.6). Tout est cloisonné à l'enseignant connecté : la classe,
l'élève ou le parcours d'un autre enseignant n'existe pas (404, S4, D64). L'enseignant encadre, il ne crée aucun
contenu (S5) : les parcours sont en lecture seule.
"""

from django.db.models import Avg, Count, Exists, IntegerField, OuterRef, Prefetch, Q, Subquery
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from djangorestframework_camel_case.parser import CamelCaseJSONParser, CamelCaseMultiPartParser
from drf_spectacular.utils import extend_schema
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.fields import phone_country
from apps.catalog.models import Course, Level, Mission, Project
from apps.learning.models import Enrollment, MissionProgress, QuizAttempt
from apps.referentials.models import Relationship
from libs.permissions import IsTeacher

from . import follow_up, imports, services
from .learner_invitations import Invitee, invite, invite_many
from .models import Classroom, ClassroomMembership, TeacherComment
from .serializers import (
    ClassroomSerializer,
    ClassroomWriteSerializer,
    CommentQuerySerializer,
    CommentRequestSerializer,
    DashboardSerializer,
    ImportRequestSerializer,
    ImportResultSerializer,
    InvitationSerializer,
    LearnerCommentSerializer,
    LearnerFollowUpSerializer,
    LearnerQuerySerializer,
    MemberSerializer,
    MissionReadSerializer,
    ReviewQuerySerializer,
    ReviewSerializer,
    SchoolSerializer,
    SupervisedCourseDetailSerializer,
    SupervisedCourseSerializer,
    TeacherCommentSerializer,
)

Status = ClassroomMembership.Status


def annotated_classrooms(teacher):
    memberships = ClassroomMembership.objects.filter(classroom=OuterRef("pk"))
    progress = (
        Enrollment.objects.filter(
            course=OuterRef("course"),
            learner__classroom_memberships__classroom=OuterRef("pk"),
            learner__classroom_memberships__status=Status.ACTIVE,
        )
        .values("course")
        .annotate(average=Avg("progress_pct"))
        .values("average")
    )
    return (
        services.teacher_classrooms(teacher)
        .select_related("course__category", "school_grade")
        .annotate(
            member_count=Count("memberships", filter=Q(memberships__status=Status.ACTIVE)),
            pending_invitation_count=Count(
                "memberships",
                filter=Q(
                    memberships__status=Status.INVITED,
                    memberships__consent_request__status="pending",
                    memberships__consent_request__expires_at__gt=timezone.now(),
                ),
            ),
            has_members=Exists(memberships),
            average_progress=Coalesce(
                Subquery(progress, output_field=IntegerField()), 0, output_field=IntegerField()
            ),
        )
        .order_by("name", "id")
    )


class TeacherMixin:
    permission_classes = [IsTeacher]
    filter_backends = []


class SchoolView(TeacherMixin, generics.RetrieveAPIView):
    """WT03, WT06, WT13 : école, offre, parcours de l'offre et quotas restants."""

    serializer_class = SchoolSerializer

    def get_object(self):
        return services.teacher_school(self.request.user)


class ClassroomViewSet(
    TeacherMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Classes de l'enseignant connecté (WT03, WT04, WT13)."""

    serializer_class = ClassroomSerializer
    lookup_value_regex = r"\d+"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Classroom.objects.none()
        return annotated_classrooms(self.request.user)

    def _read(self, classroom, status_code=status.HTTP_200_OK):
        return Response(
            ClassroomSerializer(self.get_queryset().get(pk=classroom.pk)).data, status=status_code
        )

    @extend_schema(request=ClassroomWriteSerializer, responses={201: ClassroomSerializer})
    def create(self, request):
        """WT13 : `CLASSROOM_QUOTA_EXCEEDED`, `COURSE_NOT_IN_OFFER`, `CLASSROOM_NAME_TAKEN`."""
        payload = ClassroomWriteSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        classroom = services.create_classroom(request.user, **payload.validated_data)
        return self._read(classroom, status.HTTP_201_CREATED)

    @extend_schema(request=ClassroomWriteSerializer(partial=True), responses=ClassroomSerializer)
    def partial_update(self, request, pk=None):
        """WT13 en édition : le parcours est figé dès que la classe a eu un membre."""
        classroom = self.get_object()
        payload = ClassroomWriteSerializer(data=request.data, partial=True)
        payload.is_valid(raise_exception=True)
        services.update_classroom(classroom, payload.validated_data)
        return self._read(classroom)

    @extend_schema(responses=MemberSerializer(many=True))
    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        """WT04 : élèves actifs et invitations (en attente, refusées, expirées) ; les retirés n'y sont plus."""
        classroom = self.get_object()
        queryset = (
            classroom.memberships.exclude(status=Status.LEFT)
            .select_related("classroom")
            # Demande close purgée après 30 jours (C9) : l'invitation n'a plus rien à montrer
            .exclude(status=Status.INVITED, consent_request__isnull=True)
            .select_related("learner__learner_profile__avatar", "consent_request")
            .order_by("status", "-created_at", "-id")
        )
        page = self.paginate_queryset(queryset)
        context = {
            "follow": (
                follow_up.enrollments_for(m for m in page if m.status == Status.ACTIVE),
                follow_up.dropout_limit(),
            )
        }
        return self.get_paginated_response(MemberSerializer(page, many=True, context=context).data)

    @extend_schema(request=InvitationSerializer, responses={201: MemberSerializer})
    @action(detail=True, methods=["post"])
    def invitations(self, request, pk=None):
        """
        WT06 onglet Individuel : demande de consentement d'origine enseignant, SMS au parent (D60).
        `LEARNER_QUOTA_EXCEEDED` (invitations en attente comprises, C19), `ALREADY_IN_CLASSROOM`, `CONSENT_COOLDOWN`,
        `INVITATION_DAILY_LIMIT`.
        """
        classroom = self.get_object()
        payload = InvitationSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        membership = invite(classroom, request.user, Invitee(**payload.validated_data))
        return Response(MemberSerializer(membership).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request={
            "multipart/form-data": ImportRequestSerializer,
            "application/json": ImportRequestSerializer,
        },
        responses=ImportResultSerializer,
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="invitations/import",
        parser_classes=[CamelCaseJSONParser, CamelCaseMultiPartParser],
    )
    def import_invitations(self, request, pk=None):
        """
        WT06 onglet Import par lot (C19) : import partiel. Les lignes valides partent dans la limite du quota ; les
        autres reviennent avec leur numéro et leur code (`DUPLICATE_ROW`, `MALFORMED_ROW`, `PHONE_INVALID`,
        `ALREADY_IN_CLASSROOM`, `LEARNER_QUOTA_EXCEEDED`…). Plus de 200 lignes : `IMPORT_TOO_LARGE`.
        """
        classroom = self.get_object()
        payload = ImportRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        if payload.validated_data.get("file"):
            lines = imports.read_file(payload.validated_data["file"])
        else:
            lines = [
                (
                    row.get("line") or number,
                    [row[name] for name in imports.COLUMNS],
                )
                for number, row in enumerate(payload.validated_data["rows"], start=1)
            ]
        imports.check_size(lines)
        ready, result = imports.parse(
            lines,
            relationships=Relationship.objects.filter(active=True),
            dial_code=classroom.school.country.dial_code,
            phone_valid=lambda phone: phone_country(phone) is not None,
        )
        invite_many(classroom, request.user, ready, result)
        return Response(ImportResultSerializer(result).data)

    @extend_schema(request=None, responses=MemberSerializer)
    @action(detail=True, methods=["post"], url_path=r"members/(?P<member_id>\d+)/remove")
    def remove_member(self, request, pk=None, member_id=None):
        """WT04 « Retirer de la classe » : statut `left`, place libérée ; une invitation en attente est annulée."""
        classroom = self.get_object()
        membership = get_object_or_404(classroom.memberships, pk=member_id)
        membership = services.remove_member(membership)
        return Response(MemberSerializer(membership).data)


class SupervisedCourseMixin(TeacherMixin):
    lookup_field = "slug"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Course.objects.none()
        teacher = self.request.user
        classrooms = services.teacher_classrooms(teacher)
        return (
            Course.objects.filter(pk__in=classrooms.values("course"))
            .select_related("category")
            .annotate(
                classroom_count=Count(
                    "classrooms",
                    filter=Q(classrooms__teacher=teacher, classrooms__archived_at__isnull=True),
                    distinct=True,
                ),
                learner_count=Count(
                    "classrooms__memberships__learner",
                    filter=Q(
                        classrooms__teacher=teacher,
                        classrooms__archived_at__isnull=True,
                        classrooms__memberships__status=Status.ACTIVE,
                    ),
                    distinct=True,
                ),
            )
            .order_by("title")
        )


class SupervisedCourseListView(SupervisedCourseMixin, generics.ListAPIView):
    """WT02 : parcours encadrés, avec le nombre de classes et d'élèves actifs."""

    serializer_class = SupervisedCourseSerializer


class SupervisedCourseDetailView(SupervisedCourseMixin, generics.RetrieveAPIView):
    """WT10 : un parcours encadré, ses classes et son arbre ; un parcours non encadré → 404."""

    serializer_class = SupervisedCourseDetailSerializer

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .prefetch_related(
                Prefetch(
                    "projects",
                    queryset=Project.objects.order_by("order").prefetch_related(
                        Prefetch(
                            "levels",
                            queryset=Level.objects.order_by("order").prefetch_related("missions"),
                        )
                    ),
                )
            )
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.kwargs.get("slug") and not getattr(self, "swagger_fake_view", False):
            context["classrooms"] = annotated_classrooms(self.request.user).filter(
                course__slug=self.kwargs["slug"]
            )
            context["stats"] = course_stats(self.request.user, self.kwargs["slug"])
        return context


def _rates(rows) -> dict:
    """`{clé: (réussies, total)}` → `{clé: pourcentage arrondi}`."""
    return {key: round(100 * passed / total) for key, (passed, total) in rows.items() if total}


def course_stats(teacher, slug) -> dict:
    """Compteurs de WT10 sur les seuls élèves actifs de l'enseignant inscrits à ce parcours."""
    learners = (
        follow_up.active_seats(teacher).filter(classroom__course__slug=slug).values("learner")
    )
    completed = dict(
        MissionProgress.objects.filter(
            enrollment__course__slug=slug, enrollment__learner__in=learners
        )
        .values_list("mission")
        .annotate(count=Count("enrollment__learner", distinct=True))
    )
    tallies = {"level": {}, "project": {}, "kind": {}}
    attempts = QuizAttempt.objects.filter(
        enrollment__course__slug=slug, learner__in=learners
    ).values_list("quiz__kind", "quiz__level", "quiz__project", "passed")
    for kind, level, project, passed in attempts:
        for name, key in (("kind", kind), ("level", level), ("project", project)):
            if key is not None:
                done, total = tallies[name].get(key, (0, 0))
                tallies[name][key] = (done + passed, total + 1)
    return {
        "completed": completed,
        "level_pass_rate": _rates(tallies["level"]),
        "project_pass_rate": _rates(tallies["project"]),
        "kind_pass_rate": _rates(tallies["kind"]),
    }


class SupervisedMissionView(TeacherMixin, generics.RetrieveAPIView):
    """Mission d'un parcours encadré, en lecture seule (WT10) ; mission d'un autre parcours → 404."""

    serializer_class = MissionReadSerializer

    def get_object(self):
        teacher = self.request.user
        courses = services.teacher_classrooms(teacher).values("course")
        return get_object_or_404(
            Mission.objects.select_related("level__project"),
            pk=self.kwargs["pk"],
            level__project__course__slug=self.kwargs["slug"],
            level__project__course__in=courses,
        )


# --- Suivi (API-L5.3) ----------------------------------------------------------------------------


def review_rows(attempts):
    """Prépare des tentatives annotées par `follow_up.attempts_of` pour `ReviewSerializer`."""
    for attempt in attempts:
        attempt.learner_ref = attempt.learner
        attempt.classroom_ref = {"id": attempt.classroom_id, "name": attempt.classroom_name}
    return attempts


class DashboardView(TeacherMixin, generics.GenericAPIView):
    """WT01 : compteurs, classes, « À revoir » (D65) et « Décrochage » (D66)."""

    serializer_class = DashboardSerializer
    PREVIEW = 5

    def get(self, request):
        teacher = request.user
        classrooms = list(annotated_classrooms(teacher))
        seats = follow_up.active_seats(teacher)
        to_review = follow_up.to_review(teacher)
        dropouts = follow_up.dropouts(seats)
        data = {
            "classroom_count": len(classrooms),
            "learner_count": seats.values("learner").distinct().count(),
            "pending_invitation_count": sum(c.pending_invitation_count for c in classrooms),
            "to_review_count": to_review.count(),
            "dropout_count": len(dropouts),
            "classrooms": classrooms,
            "to_review": review_rows(to_review[: self.PREVIEW]),
            "dropouts": [
                {"learner": seat.learner, "classroom": seat.classroom, "last_activity_at": last}
                for seat, _, last in dropouts[: self.PREVIEW]
            ],
        }
        return Response(DashboardSerializer(data).data)


class ReviewListView(TeacherMixin, generics.GenericAPIView):
    """WT07 : tentatives des élèves, filtrables ; `status=to_review` = « À revoir » (D65). Paginé."""

    serializer_class = ReviewSerializer

    @extend_schema(parameters=[ReviewQuerySerializer], responses=ReviewSerializer(many=True))
    def get(self, request):
        params = ReviewQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        queryset = follow_up.filter_attempts(
            follow_up.attempts_of(request.user),
            status=params.validated_data.get("status"),
            kind=params.validated_data.get("type"),
            classroom_id=params.validated_data.get("classroomId"),
        )
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(ReviewSerializer(review_rows(page), many=True).data)


class LearnerFollowUpView(TeacherMixin, generics.GenericAPIView):
    """
    WT05 : un élève d'une classe de l'enseignant, sur le parcours de cette classe (`classroomId` si l'élève est dans
    plusieurs classes). Ni âge, ni handicap, ni localité, ni téléphone (D64). Élève d'un autre enseignant → 404.
    """

    serializer_class = LearnerFollowUpSerializer

    @extend_schema(parameters=[LearnerQuerySerializer])
    def get(self, request, pk):
        params = LearnerQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        seat = follow_up.learner_seat(request.user, pk, params.validated_data.get("classroomId"))
        classroom = seat.classroom
        enrollment = follow_up.enrollments_for([seat]).get((seat.learner_id, classroom.course_id))
        attempts = list(
            follow_up.attempts_of(request.user).filter(
                learner=seat.learner, enrollment__course=classroom.course
            )
        )
        percentages = [attempt.percentage for attempt in attempts]
        data = {
            "learner": seat.learner,
            "classroom": annotated_classrooms(request.user).get(pk=classroom.pk),
            "joined_at": seat.joined_at,
            "progress_pct": enrollment.progress_pct if enrollment else 0,
            "last_activity_at": follow_up.last_activity(seat, enrollment),
            "is_dropout": follow_up.is_dropout(seat, enrollment, follow_up.dropout_limit()),
            "average_percentage": round(sum(percentages) / len(percentages))
            if percentages
            else None,
            "attempts": attempts,
            "comments": classroom.comments.filter(learner=seat.learner),
        }
        return Response(LearnerFollowUpSerializer(data).data)


class LearnerCommentView(TeacherMixin, generics.GenericAPIView):
    """WT05 « Envoyer le commentaire » : notifié, visible de l'élève et de son parent, sans réponse (D63, S11)."""

    serializer_class = TeacherCommentSerializer

    @extend_schema(request=CommentRequestSerializer, responses={201: TeacherCommentSerializer})
    def post(self, request, pk):
        payload = CommentRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        seat = follow_up.learner_seat(request.user, pk, payload.validated_data.get("classroom_id"))
        note = follow_up.comment(
            request.user,
            seat,
            payload.validated_data["body"],
            payload.validated_data.get("attempt_id"),
            request=request,
        )
        return Response(TeacherCommentSerializer(note).data, status=status.HTTP_201_CREATED)


class IsLearnerOrParent(IsAuthenticated):
    """Apprenant ou parent connecté (anonyme : 401 ; enseignant : 403)."""

    def has_permission(self, request, view):
        user = request.user
        return super().has_permission(request, view) and (user.is_learner or user.is_parent)


class CommentListView(generics.ListAPIView):
    """Commentaires des enseignants : l'apprenant voit les siens (WD01), le parent ceux de ses enfants (WPD03)."""

    serializer_class = LearnerCommentSerializer
    permission_classes = [IsLearnerOrParent]
    filter_backends = []

    @extend_schema(parameters=[CommentQuerySerializer])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TeacherComment.objects.none()
        params = CommentQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        return follow_up.visible_comments(self.request.user, params.validated_data.get("learnerId"))
