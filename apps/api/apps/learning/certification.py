"""
Fin de parcours et certification (D33, ADR 0005) : 100 % des missions et toutes les sommatives réussies.

Vérifié dans une transaction, l'inscription verrouillée : deux requêtes simultanées (dernière mission, dernière
sommative) n'émettent qu'un certificat et qu'un ticket. Le PDF est généré après la validation, par Celery.
"""

from django.db import transaction
from django.utils import timezone
from django.utils.formats import date_format

from apps.core.models import DocumentSequence
from apps.events.models import EventTicket
from apps.notifications.models import Category, Tone
from apps.notifications.services import notify

from .gamification import award_badge, award_points, badge_of
from .models import Certificate, Enrollment, PointsEntry
from .progression import Progression

CERTIFICATE_SEQUENCE = "certificate"


def d33_status(progression: Progression) -> dict:
    summatives = [
        step for step in progression.steps if step.type == "quiz" and step.quiz_kind == "summative"
    ]
    passed = sum(1 for step in summatives if progression.is_done(step))
    missions_ok = progression.mission_count > 0 and (
        progression.missions_done == progression.mission_count
    )
    return {
        "eligible": missions_ok and passed == len(summatives),
        "missions_done": progression.missions_done,
        "mission_count": progression.mission_count,
        "summatives_passed": passed,
        "summative_count": len(summatives),
    }


def certificate_number(year: int) -> str:
    return f"CERT-{year}-{DocumentSequence.next(CERTIFICATE_SEQUENCE, year):06d}"


def complete_if_done(enrollment: Enrollment) -> Certificate | None:
    """
    Si les conditions D33 sont remplies : inscription terminée, points et badge du parcours, puis (parcours avec
    certificat) certificat numéroté, ticket Steamy Events et notification, une seule fois. Idempotent.
    """
    with transaction.atomic():
        locked = (
            Enrollment.objects.select_for_update()
            .select_related("course", "learner")
            .get(pk=enrollment.pk)
        )
        progression = Progression(locked)
        if not d33_status(progression)["eligible"]:
            return None
        course, learner = locked.course, locked.learner
        if locked.status != Enrollment.Status.COMPLETED:
            locked.status = Enrollment.Status.COMPLETED
            locked.completed_at = timezone.now()
            locked.save(update_fields=["status", "completed_at"])
            award_points(
                learner,
                PointsEntry.Source.COURSE,
                f"course:{course.id}",
                f"Parcours terminé : {course}",
            )
            award_badge(learner, badge_of(course))
        if not course.certificate_enabled:
            return None
        existing = Certificate.objects.filter(enrollment=locked).first()
        if existing:
            return existing
        now = timezone.localtime()
        certificate = Certificate.objects.create(
            enrollment=locked,
            number=certificate_number(now.year),
            snapshot={
                "learner_name": learner.get_full_name(),
                "course_title": course.title,
                "issued_on": date_format(now.date(), "j F Y"),
                "project_badges": [
                    badge.label
                    for box in progression.projects
                    if (badge := badge_of(box.obj)) is not None
                ],
            },
        )
        EventTicket.objects.get_or_create(enrollment=locked, defaults={"learner": learner})
        notify(
            learner,
            Category.REWARDS,
            "certificate_issued",
            f"Bravo, tu as terminé « {course.title} » !",
            "Ton certificat est prêt à être téléchargé, et un ticket Steamy Events t'est offert.",
            url=f"/apprenant/parcours/{course.slug}/certification",
            tone=Tone.SUCCESS,
            icon="🎓",
        )
        from .tasks import generate_certificate_pdf

        transaction.on_commit(lambda: generate_certificate_pdf.delay(certificate.id))
        return certificate
