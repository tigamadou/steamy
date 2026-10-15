"""
Règles de la pédagogie côté serveur : inscription (D27, D36), accès au contenu (§4.4, ADR 0004) et missions
terminées. Les vues ne font qu'appeler ces fonctions.
"""

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.catalog.models import Course
from libs.errors import ApiError

from .models import Enrollment, MissionProgress
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


def complete_mission(enrollment: Enrollment, mission_id: int) -> tuple[Progression, bool]:
    """
    Termine une mission disponible (séquence respectée, sinon `CONTENT_LOCKED`). Idempotent : une mission déjà
    terminée n'est pas comptée deux fois. Renvoie la progression à jour et si la mission vient d'être terminée.
    """
    progression = Progression(enrollment)
    ensure_unlocked(progression.mission_state(mission_id))
    _, created = MissionProgress.objects.get_or_create(enrollment=enrollment, mission_id=mission_id)
    if created:
        progression = Progression(enrollment, progression.course)
        touch(enrollment, progression)
    return progression, created
