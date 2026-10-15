"""
Pédagogie de l'apprenant (§7.4, §4.4) : apprenant connecté seulement, ses propres données seulement.

Ordre des contrôles sur le contenu : élément inconnu ou parcours non publié → 404 ; pas inscrit → 403
`NOT_ENROLLED` ; étape verrouillée → 403 `CONTENT_LOCKED`. Aucune réponse refusée ne porte de contenu ni de vidéo.
Toutes les réponses sont privées (`Cache-Control: private, no-store`, ADR 0004).
"""

from django.db.models import Count, F, Q
from django.http import FileResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Course, Level, Mission, Project, Question, Quiz
from apps.events.models import EventTicket
from libs.errors import ApiError
from libs.pagination import PagePagination
from libs.permissions import IsLearner
from libs.schema import ErrorSerializer

from . import dashboard
from . import serializers as s
from .certification import d33_status
from .gamification import (
    badge_of,
    points_enabled,
    points_of,
    rank_for,
    record_activity,
    seconds_on,
    streak_days,
)
from .models import Certificate, Enrollment, LearnerBadge, QuizAttempt
from .progression import Container, Progression, Step, load_course, quiz_of
from .services import (
    complete_mission,
    enroll_free,
    enrollment_for,
    ensure_unlocked,
    retry_in,
    submit_attempt,
)

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
            "quiz_kind": None,
        }
    return {
        "type": step.type,
        "id": step.id,
        "title": step.title,
        "course_slug": course_slug,
        "project_id": step.project_id,
        "level_id": step.level_id,
        "quiz_kind": step.quiz_kind,
    }


def counts(progression: Progression, box: Container) -> dict:
    steps = [step for step in progression.steps[box.start : box.end] if step.type == "mission"]
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
        "quiz": quiz_item(progression, quiz_of(level)),
    }


def quiz_item(progression: Progression, quiz) -> dict | None:
    if quiz is None:
        return None
    return {
        "id": quiz.id,
        "kind": quiz.kind,
        "title": quiz.display_title,
        "threshold": quiz.pass_threshold,
        "state": progression.quiz_state(quiz.id),
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
        "current_level": ref(position[1].obj) if position and position[1] else None,
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
                "quiz": quiz_item(progression, quiz_of(project)),
                "levels": [
                    {
                        **level_item(progression, level_box),
                        "missions": missions_payload(progression, level_box),
                    }
                    for level_box in box.levels
                ],
            }
        )
    return {
        **enrollment_payload(enrollment, progression),
        "certification": certification_payload(enrollment, progression),
        "projects": projects,
    }


def certification_payload(enrollment: Enrollment, progression: Progression) -> dict:
    """Où en est la certification (WJ07, WJ09) : conditions D33, certificat et ticket."""
    certificate = Certificate.objects.filter(enrollment=enrollment).first()
    return {
        **d33_status(progression),
        "certificate_enabled": progression.course.certificate_enabled,
        "certificate": certificate_item(certificate) if certificate else None,
        "event_ticket": EventTicket.objects.filter(enrollment=enrollment).exists(),
    }


def certificate_item(certificate: Certificate) -> dict:
    course = certificate.enrollment.course
    return {
        "id": certificate.id,
        "number": certificate.number,
        "course": course_ref(course),
        "issued_at": certificate.issued_at,
        "pdf_status": certificate.pdf_status,
    }


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
            "quiz": quiz_item(progression, quiz_of(box.obj)),
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
        progression, points = complete_mission(enrollment, mission.id)
        payload = {
            "mission_id": mission.id,
            "progress_pct": progression.progress_pct,
            "points_earned": points,
            "next": next_payload(progression, progression.step_after("mission", mission.id)),
        }
        return Response(s.MissionCompleteSerializer(payload).data)


# --- Quiz et tentatives (D31, D32) ---------------------------------------------------------------


def _quiz(pk) -> Quiz:
    published = Q(level__project__course__status=PUBLISHED) | Q(project__course__status=PUBLISHED)
    return get_object_or_404(
        Quiz.objects.select_related("level__project", "project").filter(published), pk=pk
    )


def quiz_ref(quiz: Quiz, course_slug: str) -> dict:
    project = quiz.project or quiz.level.project
    return {
        "id": quiz.id,
        "kind": quiz.kind,
        "title": quiz.display_title,
        "course_slug": course_slug,
        "project_id": project.id,
        "level_id": quiz.level_id,
    }


def attempt_item(attempt: QuizAttempt) -> dict:
    return {
        "id": attempt.id,
        "quiz": quiz_ref(attempt.quiz, attempt.enrollment.course.slug),
        "score": attempt.score,
        "total": attempt.total,
        "percentage": attempt.percentage,
        "threshold": attempt.threshold,
        "status": attempt.status,
        "passed": attempt.passed,
        "duration_sec": attempt.duration_sec,
        "points_earned": attempt.points_earned,
        "created_at": attempt.created_at,
    }


def attempt_detail(attempt: QuizAttempt) -> dict:
    """Résultat : notions et missions à revoir, justesse de chaque question, jamais la bonne réponse."""
    questions = {
        q.id: q
        for q in Question.objects.filter(quiz=attempt.quiz).select_related("remediation_mission")
    }
    review, remediation = [], []
    for result in attempt.results:
        question = questions.get(result["question_id"])
        if question is None:  # question supprimée depuis la tentative
            continue
        review.append(
            {
                "question_id": question.id,
                "text": question.text,
                "concept": question.concept,
                "correct": result["correct"],
                "chosen_choice_id": attempt.answers.get(str(question.id)),
                "remediation_mission_id": question.remediation_mission_id,
            }
        )
        mission = question.remediation_mission
        if (
            not result["correct"]
            and mission
            and all(r["mission_id"] != mission.id for r in remediation)
        ):
            remediation.append(
                {"mission_id": mission.id, "title": mission.title, "concept": question.concept}
            )
    next_step = None
    if attempt.passed:
        progression = Progression(attempt.enrollment)
        next_step = next_payload(progression, progression.step_after("quiz", attempt.quiz_id))
    badge = badge_of(attempt.quiz.level or attempt.quiz.project) if attempt.passed else None
    return {
        **attempt_item(attempt),
        "badge": badge_payload(badge) if badge else None,
        "failed_concepts": attempt.failed_concepts,
        "remediation": remediation,
        "questions": review,
        "retry_in_sec": retry_in(attempt.learner, attempt.quiz),
        "next": next_step,
    }


class QuizDetailView(LearnerView):
    """Quiz à passer (WJ04, WJ10) : sans corrigé, seulement une fois atteint dans la séquence."""

    @extend_schema(responses=s.QuizDetailSerializer)
    def get(self, request, pk):
        quiz = _quiz(pk)
        _, progression = _progression(request, quiz.course_id)
        state = progression.quiz_state(quiz.id)
        ensure_unlocked(state)
        project = quiz.project or quiz.level.project
        questions = quiz.questions.prefetch_related("choices")
        payload = {
            "id": quiz.id,
            "kind": quiz.kind,
            "title": quiz.display_title,
            "threshold": quiz.pass_threshold,
            "time_limit_sec": quiz.time_limit_sec,
            "question_count": len(questions),
            "state": state,
            "retry_in_sec": retry_in(request.user, quiz),
            "course": course_ref(progression.course),
            "project": ref(project),
            "level": ref(quiz.level) if quiz.level_id else None,
            "questions": [
                {
                    "id": question.id,
                    "order": question.order,
                    "text": question.text,
                    "choices": [{"id": c.id, "text": c.text} for c in question.choices.all()],
                }
                for question in questions
            ],
        }
        return Response(s.QuizDetailSerializer(payload).data)


class QuizAttemptCreateView(LearnerView):
    """Envoi groupé des réponses (WJ04, WJ10) : correction serveur, statut D31, délai D32."""

    @extend_schema(
        request=s.AttemptRequestSerializer,
        responses={201: s.AttemptDetailSerializer, 429: ErrorSerializer},
    )
    def post(self, request, pk):
        quiz = _quiz(pk)
        enrollment = enrollment_for(request.user, quiz.course_id)
        questions = {
            question.id: {choice.id for choice in question.choices.all()}
            for question in quiz.questions.prefetch_related("choices")
        }
        body = s.AttemptRequestSerializer(data=request.data, context={"questions": questions})
        body.is_valid(raise_exception=True)
        attempt = submit_attempt(
            enrollment,
            quiz,
            body.validated_data["answers"],
            body.validated_data.get("duration_sec"),
        )
        return Response(
            s.AttemptDetailSerializer(attempt_detail(attempt)).data, status=status.HTTP_201_CREATED
        )


class AttemptPagination(PagePagination):
    """Pagination de WD07, avec le bandeau `summary` calculé par la vue."""

    summary: dict = {}

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        response.data["summary"] = self.summary
        return response

    def get_paginated_response_schema(self, schema):
        paginated = super().get_paginated_response_schema(schema)
        paginated["properties"]["summary"] = {
            "type": "object",
            "description": "Bandeau de WD07, sur toutes les tentatives (filtres ignorés)",
            "properties": {
                "attemptCount": {"type": "integer"},
                "successRate": {
                    "type": "integer",
                    "description": "Part des tentatives réussies (%)",
                },
                "perfectCount": {"type": "integer", "description": "Tentatives à 100 %"},
                "streakDays": {"type": "integer"},
            },
            "required": ["attemptCount", "successRate", "perfectCount", "streakDays"],
        }
        paginated["required"] = [*paginated.get("required", []), "summary"]
        return paginated


def badge_payload(badge) -> dict:
    return {
        "id": badge.id,
        "kind": badge.kind,
        "label": badge.label,
        "icon": badge.icon,
        "description": badge.description,
    }


def attempt_summary(learner) -> dict:
    attempts = QuizAttempt.objects.filter(learner=learner).aggregate(
        count=Count("id"),
        passed=Count("id", filter=Q(passed=True)),
        perfect=Count("id", filter=Q(percentage=100)),
    )
    return {
        "attempt_count": attempts["count"],
        "success_rate": attempts["passed"] * 100 // attempts["count"] if attempts["count"] else 0,
        "perfect_count": attempts["perfect"],
        "streak_days": streak_days(learner),
    }


class AttemptListView(LearnerView, generics.ListAPIView):
    """Mes tentatives (WD07, WD09) : filtres `status` et `quiz`, plus récentes d'abord, avec le bandeau."""

    serializer_class = s.AttemptListItemSerializer
    pagination_class = AttemptPagination
    filter_backends = []

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return QuizAttempt.objects.none()
        params = s.AttemptQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        attempts = QuizAttempt.objects.filter(learner=self.request.user).select_related(
            "quiz__level__project", "quiz__project", "enrollment__course"
        )
        if "status" in params.validated_data:
            attempts = attempts.filter(status=params.validated_data["status"])
        if "quiz" in params.validated_data:
            attempts = attempts.filter(quiz_id=params.validated_data["quiz"])
        return attempts

    @extend_schema(parameters=[s.AttemptQuerySerializer])
    def get(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        self.paginator.summary = s.AttemptSummarySerializer(attempt_summary(request.user)).data
        data = [attempt_item(attempt) for attempt in page]
        return self.get_paginated_response(s.AttemptListItemSerializer(data, many=True).data)


class AttemptDetailView(LearnerView):
    """Une de mes tentatives (WD08, WJ05, WJ08) ; celle d'un autre apprenant n'existe pas (404)."""

    @extend_schema(responses=s.AttemptDetailSerializer)
    def get(self, request, pk):
        attempt = get_object_or_404(
            QuizAttempt.objects.select_related(
                "quiz__level__project", "quiz__project", "enrollment__course"
            ),
            pk=pk,
            learner=request.user,
        )
        return Response(s.AttemptDetailSerializer(attempt_detail(attempt)).data)


# --- Activité et badges (D34) --------------------------------------------------------------------


class ActivityView(LearnerView):
    """
    Temps de vidéo réellement lu (ADR 0004 §7), envoyé par le lecteur toutes les 30 s, à la pause et à la fin.
    Mission accessible seulement ; secondes plafonnées par appel et par jour.
    """

    @extend_schema(request=s.ActivityRequestSerializer, responses=s.ActivitySerializer)
    def post(self, request):
        body = s.ActivityRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        mission = _mission(body.validated_data["mission_id"])
        _, progression = _progression(request, mission.level.project.course_id)
        ensure_unlocked(progression.mission_state(mission.id))
        counted = record_activity(request.user, mission.id, body.validated_data["seconds"])
        payload = {
            "seconds_counted": counted,
            "seconds_today": seconds_on(request.user, timezone.localdate()),
            "streak_days": streak_days(request.user),
        }
        return Response(s.ActivitySerializer(payload).data)


class BadgeListView(LearnerView, generics.ListAPIView):
    """Mes badges (WJ06, WJ11), les plus récents d'abord ; `?course=` pour un parcours."""

    serializer_class = s.LearnerBadgeSerializer
    filter_backends = []

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return LearnerBadge.objects.none()
        params = s.BadgeQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        badges = LearnerBadge.objects.filter(learner=self.request.user).select_related(
            "badge__level__project__course", "badge__project__course", "badge__course"
        )
        if slug := params.validated_data.get("course"):
            badges = badges.filter(
                Q(badge__level__project__course__slug=slug)
                | Q(badge__project__course__slug=slug)
                | Q(badge__course__slug=slug)
            )
        return badges

    @extend_schema(parameters=[s.BadgeQuerySerializer])
    def get(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        data = []
        for award in page:
            badge = award.badge
            if badge.level_id:
                course, project_id = badge.level.project.course, badge.level.project_id
            elif badge.project_id:
                course, project_id = badge.project.course, badge.project_id
            else:
                course, project_id = badge.course, None
            data.append(
                {
                    **badge_payload(badge),
                    "awarded_at": award.awarded_at,
                    "course": course_ref(course),
                    "project_id": project_id,
                    "level_id": badge.level_id,
                }
            )
        return self.get_paginated_response(s.LearnerBadgeSerializer(data, many=True).data)


# --- Certificats (D33, ADR 0005) -----------------------------------------------------------------


class CertificateListView(LearnerView, generics.ListAPIView):
    """Mes certificats (WJ07, WD21), avec l'état de leur PDF."""

    serializer_class = s.CertificateSerializer
    filter_backends = []

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return Certificate.objects.none()
        return Certificate.objects.filter(enrollment__learner=self.request.user).select_related(
            "enrollment__course"
        )

    def get(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        data = [certificate_item(certificate) for certificate in page]
        return self.get_paginated_response(s.CertificateSerializer(data, many=True).data)


class CertificateDownloadView(LearnerView):
    """
    Téléchargement (ADR 0005 §6) : redirection 302 vers une URL présignée de 5 minutes, jamais stockée ; sans
    stockage objet (CI), le fichier est servi directement. PDF pas prêt : 409 `PDF_NOT_READY`. Le certificat d'un
    autre apprenant n'existe pas (404).
    """

    @extend_schema(
        responses={
            (302, "*/*"): OpenApiResponse(description="Redirection vers l'URL présignée"),
            (200, "application/pdf"): OpenApiResponse(description="Fichier PDF"),
            409: ErrorSerializer,
        }
    )
    def get(self, request, pk):
        certificate = get_object_or_404(
            Certificate.objects.select_related("enrollment__course"),
            pk=pk,
            enrollment__learner=request.user,
        )
        if certificate.pdf_status != Certificate.PdfStatus.READY or not certificate.pdf:
            raise ApiError("PDF_NOT_READY")
        filename = f"certificat-{certificate.enrollment.course.slug}.pdf"
        url = certificate.pdf.storage.signed_url(certificate.pdf.name, filename)
        if url:
            return HttpResponseRedirect(url)
        return FileResponse(
            certificate.pdf.open("rb"),
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )


# --- Tableau de bord, progression, recommandations (WD01, WD02, WD21) -----------------------------


def points_and_rank(learner) -> dict:
    """Points et rang, à `null` tant que le barème ou les paliers ne sont pas fixés (C8, D34)."""
    points = points_of(learner) if points_enabled() else None
    return {"points": points, "rank": rank_for(points) if points is not None else None}


class DashboardView(LearnerView):
    """Accueil de l'apprenant (WD01 ; WD02 si rien à reprendre)."""

    @extend_schema(responses=s.DashboardSerializer)
    def get(self, request):
        learner = request.user
        enrollment = dashboard.resume_enrollment(learner)
        payload = {
            "first_name": learner.first_name,
            **points_and_rank(learner),
            "streak_days": streak_days(learner),
            "seconds_today": seconds_on(learner, timezone.localdate()),
            "resume": enrollment_payload(enrollment, Progression(enrollment))
            if enrollment
            else None,
            "counters": dashboard.counters(learner),
            "recommendations": dashboard.recommendations(learner, 3),
        }
        return Response(s.DashboardSerializer(payload).data)


class ProgressView(LearnerView):
    """Ma progression (WD21) : temps, points, badges, histogramme des 7 jours, maîtrise par catégorie."""

    @extend_schema(responses=s.ProgressSerializer)
    def get(self, request):
        learner = request.user
        payload = {
            "week_seconds": dashboard.week_seconds(learner),
            "last_days": dashboard.last_days(learner),
            **points_and_rank(learner),
            "streak_days": streak_days(learner),
            "counters": dashboard.counters(learner),
            "mastery": dashboard.mastery_by_category(learner),
        }
        return Response(s.ProgressSerializer(payload).data)


class RecommendationListView(LearnerView):
    """Parcours recommandés (WD21, WJ07) : publiés, non suivis, liés aux objectifs d'abord."""

    @extend_schema(
        parameters=[s.RecommendationQuerySerializer],
        responses=s.RecommendationSerializer(many=True),
    )
    def get(self, request):
        params = s.RecommendationQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        courses = dashboard.recommendations(request.user, params.validated_data["limit"])
        return Response(s.RecommendationSerializer(courses, many=True).data)
