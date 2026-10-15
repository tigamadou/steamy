"""
Règles de la pédagogie côté serveur : inscription (D27, D36), accès au contenu (§4.4, ADR 0004), missions
terminées et quiz corrigés (D31, D32). Les vues ne font qu'appeler ces fonctions.
"""

import math

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.catalog.models import Course, Quiz
from apps.core.models import PlatformSettings
from libs.errors import ApiError

from .certification import complete_if_done
from .gamification import award_badge, award_points, badge_of, record_activity
from .models import Enrollment, MissionProgress, PointsEntry, QuizAttempt
from .progression import LOCKED, Progression


def enroll_free(learner, course: Course) -> tuple[Enrollment, bool]:
    """
    Inscription directe : seulement à un parcours gratuit (D27). Un parcours à kit ne s'ouvre qu'avec son Kit Code
    (D36), un parcours payant qu'après paiement (API-L3b). Déjà inscrit : l'inscription existante, sans erreur.
    """
    existing = Enrollment.objects.filter(learner=learner, course=course).first()
    if existing:
        return existing, False
    if course.required_kit_id:
        raise ApiError("KIT_CODE_REQUIRED")
    if not course.is_free:
        raise ApiError("PAYMENT_REQUIRED")
    try:
        with transaction.atomic():
            return Enrollment.objects.create(
                learner=learner, course=course, source=Enrollment.Source.FREE
            ), True
    except IntegrityError:  # double clic : l'autre requête a créé l'inscription
        return Enrollment.objects.get(learner=learner, course=course), False


def enrollment_for(learner, course_id: int) -> Enrollment:
    """Inscription de l'apprenant au parcours, sinon `NOT_ENROLLED`."""
    enrollment = Enrollment.objects.filter(learner=learner, course_id=course_id).first()
    if enrollment is None:
        raise ApiError("NOT_ENROLLED")
    return enrollment


def ensure_unlocked(state: str) -> None:
    if state == LOCKED:
        raise ApiError("CONTENT_LOCKED")


def touch(enrollment: Enrollment, progression: Progression) -> None:
    """Met à jour la progression et la date de dernière activité de l'inscription."""
    enrollment.progress_pct = progression.progress_pct
    enrollment.last_activity_at = timezone.now()
    enrollment.save(update_fields=["progress_pct", "last_activity_at"])


def complete_mission(enrollment: Enrollment, mission_id: int) -> tuple[Progression, int]:
    """
    Termine une mission disponible (séquence respectée, sinon `CONTENT_LOCKED`). Idempotent : une mission déjà
    terminée n'est ni recomptée ni payée deux fois. Renvoie la progression à jour et les points gagnés.
    """
    progression = Progression(enrollment)
    ensure_unlocked(progression.mission_state(mission_id))
    points = 0
    with transaction.atomic():
        progress, created = MissionProgress.objects.get_or_create(
            enrollment=enrollment, mission_id=mission_id
        )
        if created:
            progression = Progression(enrollment, progression.course)
            touch(enrollment, progression)
            points = award_points(
                enrollment.learner,
                PointsEntry.Source.MISSION,
                f"mission:{mission_id}",
                f"Mission terminée : {progress.mission.title}",
            )
            record_activity(enrollment.learner, mission_id)
            complete_if_done(enrollment)
            enrollment.refresh_from_db()
    return progression, points


# --- Quiz (D31, D32, C8) -------------------------------------------------------------------------

#: Sous ce pourcentage, une tentative est `ko` ; entre lui et le seuil du quiz, `warn` (D31).
WARN_FLOOR = 50


def attempt_status(score: int, total: int, threshold: int) -> str:
    """Comparaison exacte (sans arrondi) du score au seuil : `ok` ≥ seuil, `warn` ≥ 50 %, `ko` sinon."""
    if total and score * 100 >= threshold * total:
        return QuizAttempt.Status.OK
    if total and score * 100 >= WARN_FLOOR * total:
        return QuizAttempt.Status.WARN
    return QuizAttempt.Status.KO


def retry_in(learner, quiz: Quiz) -> int:
    """
    Secondes avant de pouvoir repasser le quiz : seulement après une sommative ratée (D32, délai de
    `PlatformSettings`) ; une formative se repasse immédiatement (C8), un quiz réussi aussi.
    """
    if quiz.kind != Quiz.Kind.SUMMATIVE:
        return 0
    last = QuizAttempt.objects.filter(learner=learner, quiz=quiz).order_by("-created_at").first()
    if last is None or last.passed:
        return 0
    cooldown = PlatformSettings.load().summative_retry_cooldown_seconds
    elapsed = (timezone.now() - last.created_at).total_seconds()
    return max(0, math.ceil(cooldown - elapsed))


def grade(quiz: Quiz, answers: dict[int, int]) -> dict:
    """Correction serveur : `answers` = `{questionId: choiceId}` déjà validés. Question sans réponse = fausse."""
    score = total = 0
    results, failed_concepts = [], []
    for question in quiz.questions.prefetch_related("choices"):
        correct_ids = {c.id for c in question.choices.all() if c.is_correct}
        correct = answers.get(question.id) in correct_ids
        total += question.weight
        score += question.weight if correct else 0
        results.append({"question_id": question.id, "correct": correct})
        if not correct and question.concept not in failed_concepts:
            failed_concepts.append(question.concept)
    return {"score": score, "total": total, "results": results, "failed_concepts": failed_concepts}


def submit_attempt(
    enrollment: Enrollment, quiz: Quiz, answers: dict[int, int], duration_sec: int | None
) -> QuizAttempt:
    """
    Corrige et enregistre une tentative : quiz déverrouillé (`CONTENT_LOCKED`), délai d'une sommative ratée
    respecté (`QUIZ_COOLDOWN`, avec `Retry-After`). L'inscription est verrouillée le temps de la vérification :
    deux envois simultanés ne contournent pas le délai.
    """
    with transaction.atomic():
        Enrollment.objects.select_for_update().get(pk=enrollment.pk)
        ensure_unlocked(Progression(enrollment).quiz_state(quiz.id))
        wait = retry_in(enrollment.learner, quiz)
        if wait:
            error = ApiError("QUIZ_COOLDOWN")
            error.wait = wait  # en-tête `Retry-After` posé par DRF
            raise error
        first_pass = not QuizAttempt.objects.filter(
            learner=enrollment.learner, quiz=quiz, passed=True
        ).exists()
        result = grade(quiz, answers)
        threshold = quiz.pass_threshold
        status = attempt_status(result["score"], result["total"], threshold)
        attempt = QuizAttempt.objects.create(
            learner=enrollment.learner,
            enrollment=enrollment,
            quiz=quiz,
            answers={str(q): c for q, c in answers.items()},
            results=result["results"],
            score=result["score"],
            total=result["total"],
            percentage=result["score"] * 100 // result["total"] if result["total"] else 0,
            threshold=threshold,
            status=status,
            passed=status == QuizAttempt.Status.OK,
            duration_sec=duration_sec,
            failed_concepts=result["failed_concepts"],
        )
        if attempt.passed and first_pass:
            attempt.points_earned = award_points(
                enrollment.learner, quiz.kind, f"quiz:{quiz.id}", f"Quiz réussi : {quiz}"
            )
            attempt.save(update_fields=["points_earned"])
            award_badge(enrollment.learner, badge_of(quiz.level or quiz.project))
        record_activity(enrollment.learner)
        touch(enrollment, Progression(enrollment))
        if attempt.passed:
            complete_if_done(enrollment)
    return attempt
