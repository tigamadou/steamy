"""
Pédagogie de l'apprenant (§7.4, §4.4) : apprenant connecté seulement, ses propres données seulement.

Ordre des contrôles sur le contenu : élément inconnu ou parcours non publié → 404 ; pas inscrit → 403
`NOT_ENROLLED` ; étape verrouillée → 403 `CONTENT_LOCKED`. Aucune réponse refusée ne porte de contenu ni de vidéo.
Toutes les réponses sont privées (`Cache-Control: private, no-store`, ADR 0004).
"""

from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Course, Level, Mission, Project
from libs.permissions import IsLearner

from . import serializers as s
from .models import Enrollment
from .progression import Container, Progression, Step, load_course
from .services import complete_mission, enroll_free, enrollment_for, ensure_unlocked

PUBLISHED = Course.Status.PUBLISHED


# --- Construction des réponses -------------------------------------------------------------------


def ref(obj) -> dict:
    return {"id": obj.id, "order": obj.order, "title": obj.title}


def course_ref(course) -> dict:
    return {"slug": course.slug, "title": course.title}


def next_payload(progression: Progression, step: Step | None) -> dict:
    course_slug = progression.course.slug
    if step is None:
        return {
            "type": "certification",
            "id": None,
            "title": None,
            "course_slug": course_slug,
            "project_id": None,
            "level_id": None,
        }
    return {
        "type": step.type,
        "id": step.id,
        "title": step.title,
        "course_slug": course_slug,
        "project_id": step.project_id,
        "level_id": step.level_id,
    }


def counts(progression: Progression, box: Container) -> dict:
    steps = progression.steps[box.start : box.end]
    return {
        "mission_count": len(steps),
        "missions_done": sum(1 for step in steps if progression.is_done(step)),
    }


def missions_payload(progression: Progression, box: Container) -> list[dict]:
    return [
        {
            "id": mission.id,
            "order": mission.order,
            "title": mission.title,
            "duration_min": mission.duration_min,
            "icon": mission.icon,
            "state": progression.mission_state(mission.id),
        }
        for mission in box.obj.missions.all()
    ]


def level_item(progression: Progression, box: Container) -> dict:
    level = box.obj
    return {
        **ref(level),
        "duration_min": level.duration_min,
        "intro_summary": level.intro_summary,
        "state": progression.container_state(box),
        **counts(progression, box),
    }


def enrollment_payload(enrollment: Enrollment, progression: Progression) -> dict:
    position = progression.position()
    return {
        "id": enrollment.id,
        "course": progression.course,
        "source": enrollment.source,
        "status": enrollment.status,
        "progress_pct": enrollment.progress_pct,
        "mission_count": progression.mission_count,
        "missions_done": progression.missions_done,
        "created_at": enrollment.created_at,
        "last_activity_at": enrollment.last_activity_at,
        "completed_at": enrollment.completed_at,
        "current_project": ref(position[0].obj) if position else None,
        "current_level": ref(position[1].obj) if position else None,
        "next": next_payload(progression, progression.next_step()),
    }


def tree_payload(enrollment: Enrollment, progression: Progression) -> dict:
    projects = []
    for box in progression.projects:
        project = box.obj
        projects.append(
            {
                **ref(project),
                "duration_hours": project.duration_hours,
                "state": progression.container_state(box),
                **counts(progression, box),
                "levels": [
                    {
                        **level_item(progression, level_box),
                        "missions": missions_payload(progression, level_box),
                    }
                    for level_box in box.levels
                ],
            }
        )
    return {**enrollment_payload(enrollment, progression), "projects": projects}


# --- Vues ----------------------------------------------------------------------------------------


@method_decorator(cache_control(private=True, no_store=True), name="dispatch")
class LearnerView(APIView):
    permission_classes = [IsLearner]


class EnrollmentListView(LearnerView, generics.ListAPIView):
    """Mes parcours (WD23, WC06a) : inscriptions de l'apprenant, avec la prochaine étape."""

    serializer_class = s.EnrollmentSerializer
    filter_backends = []

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return Enrollment.objects.none()
        params = s.EnrollmentQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        enrollments = Enrollment.objects.filter(learner=self.request.user).order_by(
            F("last_activity_at").desc(nulls_last=True), "-created_at", "-id"
        )
        if "status" in params.validated_data:
            enrollments = enrollments.filter(status=params.validated_data["status"])
        return enrollments

    @extend_schema(parameters=[s.EnrollmentQuerySerializer])
    def get(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        data = [enrollment_payload(e, Progression(e)) for e in page]
        return self.get_paginated_response(s.EnrollmentSerializer(data, many=True).data)

    @extend_schema(
        request=s.EnrollRequestSerializer,
        responses={200: s.EnrollmentSerializer, 201: s.EnrollmentSerializer},
    )
    def post(self, request):
        """Inscription à un parcours gratuit (D27) ; déjà inscrit : 200 avec l'inscription existante."""
        body = s.EnrollRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        course = get_object_or_404(
            Course, slug=body.validated_data["course_slug"], status=PUBLISHED
        )
        enrollment, created = enroll_free(request.user, course)
        payload = enrollment_payload(enrollment, Progression(enrollment))
        return Response(
            s.EnrollmentSerializer(payload).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class EnrollmentTreeView(LearnerView):
    """Arbre d'un parcours suivi (WC06a, WC06b, WJ09)."""

    @extend_schema(responses=s.TreeSerializer)
    def get(self, request, course_slug):
        course = get_object_or_404(Course, slug=course_slug, status=PUBLISHED)
        enrollment = enrollment_for(request.user, course.id)
        return Response(s.TreeSerializer(tree_payload(enrollment, Progression(enrollment))).data)


def _progression(request, course_id: int) -> tuple[Enrollment, Progression]:
    enrollment = enrollment_for(request.user, course_id)
    return enrollment, Progression(enrollment, load_course(course_id))


class ProjectDetailView(LearnerView):
    """Projet (WJ01) : objectifs, prérequis, matériel, niveaux et progression."""

    @extend_schema(responses=s.ProjectDetailSerializer)
    def get(self, request, pk):
        project = get_object_or_404(Project, pk=pk, course__status=PUBLISHED)
        _, progression = _progression(request, project.course_id)
        box = progression.project_box(project.id)
        state = progression.container_state(box)
        ensure_unlocked(state)
        payload = {
            **ref(project),
            "duration_hours": project.duration_hours,
            "objectives": project.objectives,
            "prerequisites": project.prerequisites,
            "materials": project.materials,
            "state": state,
            **counts(progression, box),
            "course": course_ref(progression.course),
            "levels": [level_item(progression, level_box) for level_box in box.levels],
        }
        return Response(s.ProjectDetailSerializer(payload).data)


class LevelDetailView(LearnerView):
    """Niveau (WJ02) : introduction vidéo, seulement une fois le niveau atteint (ADR 0004)."""

    @extend_schema(responses=s.LevelDetailSerializer)
    def get(self, request, pk):
        level = get_object_or_404(
            Level.objects.select_related("project"), pk=pk, project__course__status=PUBLISHED
        )
        _, progression = _progression(request, level.project.course_id)
        box = progression.level_box(level.id)
        state = progression.container_state(box)
        ensure_unlocked(state)
        payload = {
            **level_item(progression, box),
            "intro_vimeo_id": level.intro_vimeo_id or None,
            "intro_vimeo_hash": level.intro_vimeo_hash or None,
            "course": course_ref(progression.course),
            "project": ref(level.project),
            "missions": missions_payload(progression, box),
        }
        return Response(s.LevelDetailSerializer(payload).data)


def _mission(pk) -> Mission:
    return get_object_or_404(
        Mission.objects.select_related("level__project"),
        pk=pk,
        level__project__course__status=PUBLISHED,
    )


class MissionDetailView(LearnerView):
    """Mission (WJ03) : contenu et vidéo, seulement si la mission est déverrouillée (§4.4, ADR 0004)."""

    @extend_schema(responses=s.MissionDetailSerializer)
    def get(self, request, pk):
        mission = _mission(pk)
        _, progression = _progression(request, mission.level.project.course_id)
        state = progression.mission_state(mission.id)
        ensure_unlocked(state)
        payload = {
            **ref(mission),
            "duration_min": mission.duration_min,
            "icon": mission.icon,
            "vimeo_id": mission.vimeo_id or None,
            "vimeo_hash": mission.vimeo_hash or None,
            "blocks": mission.blocks,
            "state": state,
            "course": course_ref(progression.course),
            "project": ref(mission.level.project),
            "level": ref(mission.level),
            "next": next_payload(progression, progression.step_after("mission", mission.id)),
        }
        return Response(s.MissionDetailSerializer(payload).data)


class MissionCompleteView(LearnerView):
    """« Marquer comme terminée » (WJ03) : dans l'ordre seulement ; renvoie l'étape suivante."""

    @extend_schema(request=None, responses=s.MissionCompleteSerializer)
    def post(self, request, pk):
        mission = _mission(pk)
        enrollment = enrollment_for(request.user, mission.level.project.course_id)
        progression, _ = complete_mission(enrollment, mission.id)
        payload = {
            "mission_id": mission.id,
            "progress_pct": progression.progress_pct,
            "next": next_payload(progression, progression.step_after("mission", mission.id)),
        }
        return Response(s.MissionCompleteSerializer(payload).data)
