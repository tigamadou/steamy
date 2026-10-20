"""Tâches planifiées de l'encadrement (CELERY_BEAT_SCHEDULE), relançables sans effet double ; `manage.py <tâche>`."""

from celery import shared_task
from django.utils import timezone

from apps.notifications.models import Category
from apps.notifications.services import notify

from . import follow_up
from .models import ClassroomMembership


@shared_task
def detect_dropouts() -> int:
    """
    Décrochage (D66) : chaque élève actif sans activité sur le parcours de sa classe depuis le seuil de
    `PlatformSettings` (7 jours par défaut) est signalé à son enseignant, une seule fois par période d'inactivité.
    Renvoie le nombre d'alertes envoyées.
    """
    seats = ClassroomMembership.objects.filter(
        status=ClassroomMembership.Status.ACTIVE, classroom__archived_at__isnull=True
    ).select_related("classroom__teacher")
    sent = 0
    for seat, _, last_activity in follow_up.dropouts(seats):
        if seat.dropout_notified_at and seat.dropout_notified_at >= last_activity:
            continue
        days = (timezone.now() - last_activity).days
        notify(
            seat.classroom.teacher,
            Category.PROGRESS,
            "classroom.dropout",
            f"{seat.learner.first_name} {seat.learner.last_name} décroche",
            f"Aucune activité depuis {days} jours dans la classe {seat.classroom.name}.",
            url=f"/enseignant/eleves/{seat.learner_id}?classe={seat.classroom_id}",
            tone="warning",
            icon="alert",
        )
        seat.dropout_notified_at = timezone.now()
        seat.save(update_fields=["dropout_notified_at", "updated_at"])
        sent += 1
    return sent
