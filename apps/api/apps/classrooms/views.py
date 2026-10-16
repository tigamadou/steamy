"""
Domaine `classrooms` : espace enseignant (WT01-WT13, §7.6). Tout est cloisonné à l'enseignant connecté : la classe,
l'élève ou le parcours d'un autre enseignant n'existe pas (404, S4, D64). L'enseignant encadre, il ne crée aucun
contenu (S5) : les parcours sont en lecture seule.
"""

from django.db.models import Count, Exists, OuterRef, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.catalog.models import Course, Level, Project
from libs.permissions import IsTeacher

from . import services
from .models import Classroom, ClassroomMembership
from .serializers import (
    ClassroomSerializer,
    ClassroomWriteSerializer,
    MemberSerializer,
    SchoolSerializer,
    SupervisedCourseDetailSerializer,
    SupervisedCourseSerializer,
)

Status = ClassroomMembership.Status


def annotated_classrooms(teacher):
    memberships = ClassroomMembership.objects.filter(classroom=OuterRef("pk"))
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
            .select_related("learner__learner_profile__avatar", "consent_request")
            .order_by("status", "-created_at", "-id")
        )
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(MemberSerializer(page, many=True).data)

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
        return context
