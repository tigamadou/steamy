"""API-L5.4 · Décrochage (D66) : tâche quotidienne, seuil réglable, une alerte par période d'inactivité."""

from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.classrooms.models import ClassroomMembership
from apps.classrooms.tasks import detect_dropouts
from apps.core.models import PlatformSettings
from apps.learning.models import Enrollment
from apps.notifications.models import Notification

from .factories import ClassroomFactory, MembershipFactory

pytestmark = pytest.mark.django_db


def idle(seat, days):
    """L'élève de cette place a eu sa dernière activité il y a `days` jours."""
    Enrollment.objects.update_or_create(
        learner=seat.learner,
        course=seat.classroom.course,
        defaults={
            "source": Enrollment.Source.CLASSROOM,
            "last_activity_at": timezone.now() - timedelta(days=days),
        },
    )


@pytest.fixture
def classroom():
    return ClassroomFactory(name="4e B")


def test_teacher_is_warned_once_per_idle_period(classroom):
    seat = MembershipFactory(
        classroom=classroom, learner__first_name="Sèna", learner__last_name="Kpadé"
    )
    idle(seat, 10)
    active = MembershipFactory(classroom=classroom)
    idle(active, 1)

    assert detect_dropouts() == 1
    notification = Notification.objects.get(user=classroom.teacher)
    assert notification.type == "classroom.dropout"
    assert notification.title == "Sèna Kpadé décroche"
    assert notification.message == "Aucune activité depuis 10 jours dans la classe 4e B."
    assert notification.url == f"/enseignant/eleves/{seat.learner_id}?classe={classroom.pk}"
    # Le lendemain : toujours inactive, pas de nouvelle alerte
    assert detect_dropouts() == 0
    # Elle reprend puis décroche à nouveau : nouvelle alerte
    idle(seat, 0)
    ClassroomMembership.objects.filter(pk=seat.pk).update(
        dropout_notified_at=timezone.now() - timedelta(days=20)
    )
    idle(seat, 8)
    assert detect_dropouts() == 1


def test_threshold_comes_from_the_platform_settings(classroom):
    idle(MembershipFactory(classroom=classroom), 3)
    assert detect_dropouts() == 0
    settings_ = PlatformSettings.load()
    settings_.dropout_threshold_days = 2
    settings_.save()
    assert detect_dropouts() == 1


def test_left_invited_and_archived_are_ignored(classroom):
    idle(MembershipFactory(classroom=classroom, status=ClassroomMembership.Status.LEFT), 30)
    MembershipFactory(classroom=classroom, status=ClassroomMembership.Status.INVITED)
    archived = ClassroomFactory(archived_at=timezone.now())
    idle(MembershipFactory(classroom=archived), 30)
    assert detect_dropouts() == 0


def test_command_runs_the_task(classroom, capsys):
    idle(MembershipFactory(classroom=classroom), 30)
    call_command("detect_dropouts")
    assert "detect_dropouts : 1" in capsys.readouterr().out
