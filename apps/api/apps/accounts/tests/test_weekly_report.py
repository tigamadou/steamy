"""
Rapport hebdomadaire (WPD11, D55) : semaine ISO, temps du journal d'apprentissage, missions et quiz réussis,
navigation ; envoi du lundi dans l'app et par email selon l'adresse et la préférence « Progression ».
"""

from datetime import date, datetime, time, timedelta

import pytest
from django.core import mail
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import ParentChildLink, User, WeeklyReportSent
from apps.accounts.tasks import send_weekly_reports
from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.accounts.weekly_report import week_code
from apps.catalog.models import Quiz
from apps.learning.models import LearningActivity, MissionProgress, QuizAttempt
from apps.learning.tests.factories import EnrollmentFactory, build_course, missions_of
from apps.notifications.models import Channel, Notification, NotificationPreference
from apps.referentials.models import Relationship

pytestmark = pytest.mark.django_db

MONDAY = date(2026, 10, 5)  # semaine 2026-W41


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def link(parent, learner=None):
    learner = learner or LearnerFactory(first_name="Léa")
    ParentChildLink.objects.create(
        parent=parent, learner=learner, relationship=Relationship.objects.first()
    )
    return learner


def at(day: date, hour: int = 12):
    return timezone.make_aware(datetime.combine(day, time(hour)))


def url(child, week=None):
    base = f"/api/accounts/children/{child.pk}/weekly-report/"
    return f"{base}?week={week}" if week else base


@pytest.fixture
def parent():
    return ParentFactory()


def fill_week(child):
    """Activité de la semaine 2026-W41, plus du bruit hors semaine."""
    enrollment = EnrollmentFactory(learner=child, course=build_course(quizzes=True))
    missions = missions_of(enrollment.course)
    LearningActivity.objects.create(learner=child, date=MONDAY, seconds=600)
    LearningActivity.objects.create(learner=child, date=MONDAY, seconds=300, mission=missions[0])
    LearningActivity.objects.create(learner=child, date=MONDAY + timedelta(days=6), seconds=120)
    LearningActivity.objects.create(learner=child, date=MONDAY + timedelta(days=7), seconds=999)
    for mission, day in ((missions[0], MONDAY), (missions[1], MONDAY - timedelta(days=1))):
        progress = MissionProgress.objects.create(enrollment=enrollment, mission=mission)
        MissionProgress.objects.filter(pk=progress.pk).update(completed_at=at(day))
    quiz = Quiz.objects.filter(level__project__course=enrollment.course).first()
    for passed in (True, False):
        attempt = QuizAttempt.objects.create(
            learner=child,
            enrollment=enrollment,
            quiz=quiz,
            score=1,
            total=1,
            percentage=100 if passed else 0,
            threshold=70,
            status="ok" if passed else "ko",
            passed=passed,
        )
        QuizAttempt.objects.filter(pk=attempt.pk).update(created_at=at(MONDAY + timedelta(days=2)))


def test_report_of_a_past_week(parent):
    child = link(parent)
    fill_week(child)
    parent.parent_profile.email = "marie@exemple.bj"
    parent.parent_profile.save()
    body = as_user(parent).get(url(child, "2026-W41")).json()
    assert (body["week"], body["startDate"], body["endDate"]) == (
        "2026-W41",
        "2026-10-05",
        "2026-10-11",
    )
    assert (body["previousWeek"], body["nextWeek"]) == ("2026-W40", "2026-W42")
    assert body["seconds"] == 1020
    assert (body["missionsCompleted"], body["quizzesPassed"]) == (1, 1)
    assert [d["seconds"] for d in body["days"]] == [900, 0, 0, 0, 0, 0, 120]
    assert len(body["courses"]) == 1
    assert body["email"] == "marie@exemple.bj"


def test_current_week_by_default_without_email(parent):
    child = link(parent)
    body = as_user(parent).get(url(child)).json()
    assert body["week"] == week_code(timezone.localdate())
    assert body["nextWeek"] is None
    assert body["seconds"] == 0 and body["email"] is None


@pytest.mark.parametrize("week", ["2026-41", "2026-W54", "abc", "0001-W01", "9999-W52"])
def test_invalid_week(parent, week):
    resp = as_user(parent).get(url(link(parent), week))
    assert resp.status_code == 400
    assert resp.json()["fields"]["week"][0]["code"] == "INVALID"


@pytest.mark.parametrize(
    ("week", "previous"), [("2000-W01", None), ("2000-W02", "2000-W01"), ("9998-W52", "9998-W51")]
)
def test_limit_years_are_accepted(parent, week, previous):
    body = as_user(parent).get(url(link(parent), week)).json()
    assert body["week"] == week
    assert body["previousWeek"] == previous


def test_another_parents_child_is_not_found(parent):
    other = link(ParentFactory())
    assert as_user(parent).get(url(other)).status_code == 404
    assert as_user(other).get(url(other)).status_code == 403


def test_monday_sends_the_previous_week_in_app_and_by_email(parent, monkeypatch):
    monkeypatch.setattr(
        "django.db.transaction.on_commit", lambda func, using=None, robust=False: func()
    )
    child = link(parent)
    parent.parent_profile.email = "marie@exemple.bj"
    parent.parent_profile.save()
    link(parent, LearnerFactory(status=User.Status.DEACTIVATED))  # suppression programmée : rien
    muted = ParentFactory()
    link(muted)
    NotificationPreference.objects.create(
        user=muted, category="progress", channel=Channel.EMAIL, enabled=False
    )
    muted.parent_profile.email = "awa@exemple.bj"
    muted.parent_profile.save()
    ParentFactory()  # sans enfant
    assert send_weekly_reports() == 2
    notification = Notification.objects.get(user=parent, type="weekly_report")
    last_monday = timezone.localdate() - timedelta(days=timezone.localdate().weekday() + 7)
    assert notification.url == (
        f"/parent/enfants/{child.pk}/rapport?semaine={week_code(last_monday)}"
    )
    assert notification.title.startswith("Semaine de Léa")
    assert [m.to for m in mail.outbox] == [["marie@exemple.bj"]]
    # relancé (reprise après panne) : rien n'est renvoyé
    call_command("send_weekly_reports")
    assert Notification.objects.filter(type="weekly_report").count() == 2
    assert len(mail.outbox) == 1
    sent = WeeklyReportSent.objects.get(parent=parent)
    assert str(sent).startswith(f"Rapport {week_code(last_monday)}")


def test_a_reserved_report_is_not_sent_again(parent):
    child = link(parent)
    last_monday = timezone.localdate() - timedelta(days=timezone.localdate().weekday() + 7)
    WeeklyReportSent.objects.create(parent=parent, child=child, week=week_code(last_monday))
    assert send_weekly_reports() == 0
    assert not Notification.objects.filter(type="weekly_report").exists()


def test_reports_notified_before_the_reservation_table_are_not_sent_again(parent):
    from importlib import import_module

    from django.apps import apps

    migration = import_module("apps.accounts.migrations.0012_deletion_permission_weekly_report")
    child = link(parent)
    last_monday = timezone.localdate() - timedelta(days=timezone.localdate().weekday() + 7)
    code = week_code(last_monday)
    Notification.objects.create(
        user=parent,
        category="progress",
        type="weekly_report",
        title="Semaine de Léa",
        url=f"/parent/enfants/{child.pk}/rapport?semaine={code}",
    )
    Notification.objects.create(
        user=parent, category="progress", type="weekly_report", title="?", url="/parent"
    )
    migration.reserve_sent_reports(apps, None)
    migration.reserve_sent_reports(apps, None)
    assert list(WeeklyReportSent.objects.values_list("child_id", "week")) == [(child.pk, code)]
    assert send_weekly_reports() == 0
