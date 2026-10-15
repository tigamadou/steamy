"""Agrégats quotidiens de la télémétrie (`TrackingEvent`)."""

import datetime

import pytest
from django.utils import timezone

from apps.accounts.tests.factories import LearnerFactory
from apps.analytics.models import DailyAggregatedStat, TrackingEvent
from apps.analytics.tasks import aggregate_daily_stats, schedule_aggregate_yesterday

pytestmark = pytest.mark.django_db

DAY = datetime.date(2026, 10, 14)


def event(event_type, entity_type=None, entity_id=None, value=None, user=None, day=DAY):
    created = TrackingEvent.objects.create(
        event_type=event_type, entity_type=entity_type, entity_id=entity_id, value=value, user=user
    )
    noon = datetime.datetime.combine(day, datetime.time(12), tzinfo=datetime.UTC)
    TrackingEvent.objects.filter(pk=created.pk).update(created_at=noon)


def stat(group_by, key, metric):
    return DailyAggregatedStat.objects.get(
        date=DAY, group_by=group_by, key=key, metric=metric
    ).value


def test_daily_aggregates_per_course_and_global():
    learner = LearnerFactory()
    event("course_view", "course", "robotique", user=learner)
    event("course_view", "course", "robotique")
    event("enrollment", "course", "robotique", user=learner)
    event("purchase", "course", "robotique", value=5000, user=learner)
    event("purchase", "kit", "kit-1", value=12000)
    event(
        "course_view", "course", "robotique", day=DAY - datetime.timedelta(days=1)
    )  # hors période

    assert aggregate_daily_stats(DAY.isoformat()) is True  # date sérialisée par Celery

    assert stat("course", "robotique", "views") == 2
    assert stat("course", "robotique", "enrollments") == 1
    assert stat("course", "robotique", "revenue") == 5000
    assert stat("global", "all", "revenue") == 17000
    assert stat("global", "active_users", "count") == 2  # l'apprenant et l'anonyme (NULL)

    # Appel direct avec une date : même résultat, sans doublon.
    assert aggregate_daily_stats(DAY) is True
    assert stat("course", "robotique", "views") == 2


def test_aggregates_default_to_yesterday(mocker):
    delay = mocker.patch("apps.analytics.tasks.aggregate_daily_stats.delay")
    yesterday = (timezone.now() - datetime.timedelta(days=1)).date()
    schedule_aggregate_yesterday()
    delay.assert_called_once_with(str(yesterday))

    assert aggregate_daily_stats() is True
    assert DailyAggregatedStat.objects.get(group_by="global", key="all").date == yesterday
