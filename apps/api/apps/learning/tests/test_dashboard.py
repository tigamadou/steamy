"""Tableau de bord (WD01, WD02), progression (WD21), recommandations et compteurs du shell (§7.3, §7.4)."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.catalog.models import Badge
from apps.catalog.tests.factories import CategoryFactory, CourseFactory
from apps.core.models import PlatformSettings
from apps.learning.models import (
    Certificate,
    Enrollment,
    LearnerBadge,
    LearningActivity,
    MissionProgress,
)
from apps.referentials.models import Goal

from .factories import EnrollmentFactory, build_course, missions_of

pytestmark = pytest.mark.django_db


@pytest.fixture
def learner():
    return LearnerFactory(first_name="Léa")


@pytest.fixture
def client(learner):
    client = APIClient()
    client.force_authenticate(learner)
    return client


def set_scale():
    settings_ = PlatformSettings.load()
    settings_.points_scale = {"mission": 10}
    settings_.rank_thresholds = [
        {"rank": "Explorateur", "points": 0},
        {"rank": "Bricoleur", "points": 100},
    ]
    settings_.save()


# --- Tableau de bord ---------------------------------------------------------------------------------


def test_dashboard_without_course_nor_scale_is_wd02(client):
    body = client.get("/api/learning/dashboard/").json()
    assert body["firstName"] == "Léa"
    assert body["resume"] is None
    assert (
        body["points"] is None and body["rank"] is None
    )  # barème non fixé (C8) : pastilles masquées
    assert body["streakDays"] == 0 and body["secondsToday"] == 0
    assert body["counters"] == {
        "activeEnrollments": 0,
        "completedEnrollments": 0,
        "certificates": 0,
        "badges": 0,
    }


def test_dashboard_resumes_the_most_recently_active_course(client, learner):
    set_scale()
    old = EnrollmentFactory(learner=learner, course=build_course(projects=1, title="Ancien"))
    recent = EnrollmentFactory(learner=learner, course=build_course(projects=1, title="Récent"))
    EnrollmentFactory(
        learner=learner, course=build_course(projects=1), status=Enrollment.Status.COMPLETED
    )
    Enrollment.objects.filter(pk=old.pk).update(last_activity_at=timezone.now() - timedelta(days=3))
    Enrollment.objects.filter(pk=recent.pk).update(last_activity_at=timezone.now())
    client.post(f"/api/learning/missions/{missions_of(recent.course)[0].id}/complete/")

    body = client.get("/api/learning/dashboard/").json()
    assert body["resume"]["id"] == recent.id
    assert body["resume"]["next"]["id"] == missions_of(recent.course)[1].id
    assert body["points"] == 10
    assert body["rank"] == {
        "label": "Explorateur",
        "minPoints": 0,
        "nextLabel": "Bricoleur",
        "nextAt": 100,
    }
    assert body["streakDays"] == 1
    assert body["counters"]["activeEnrollments"] == 2
    assert body["counters"]["completedEnrollments"] == 1
    assert len(body["recommendations"]) <= 3


def test_points_without_thresholds_gives_no_rank(client):
    settings_ = PlatformSettings.load()
    settings_.points_scale = {"mission": 10}
    settings_.save()
    body = client.get("/api/learning/dashboard/").json()
    assert body["points"] == 0 and body["rank"] is None


# --- Recommandations -------------------------------------------------------------------------------


def test_recommendations_follow_goals_and_skip_my_courses_and_drafts(client, learner):
    robots = Goal.objects.get(code="robots")
    robotics = CategoryFactory(slug="robotique-test")
    robotics.goals.add(robots)
    learner.learner_profile.goals.set([robots])
    followed = CourseFactory(category=robotics, slug="suivi")
    EnrollmentFactory(learner=learner, course=followed)
    CourseFactory(category=robotics, slug="brouillon", draft=True)
    featured = CourseFactory(slug="mis-en-avant", featured=True)
    matching = CourseFactory(category=robotics, slug="robot")
    popular = CourseFactory(slug="populaire")
    EnrollmentFactory(course=popular)
    EnrollmentFactory(course=popular)
    plain = CourseFactory(slug="simple")

    body = client.get("/api/learning/recommendations/").json()
    assert [c["slug"] for c in body] == [
        matching.slug,
        featured.slug,
        popular.slug,
        plain.slug,
    ]
    assert body[0]["matchesGoals"] is True and body[1]["matchesGoals"] is False
    assert [c["slug"] for c in client.get("/api/learning/recommendations/?limit=1").json()] == [
        "robot"
    ]
    for limit in ("0", "13", "x"):
        assert client.get(f"/api/learning/recommendations/?limit={limit}").status_code == 400


def test_recommendations_without_goals(client):
    CourseFactory(slug="seul")
    assert [c["matchesGoals"] for c in client.get("/api/learning/recommendations/").json()] == [
        False
    ]


# --- Progression (WD21) ---------------------------------------------------------------------------------


def test_progress_gives_time_points_counters_and_mastery(client, learner):
    today = timezone.localdate()
    for days_ago, seconds in [(0, 600), (1, 300), (6, 120), (7, 999)]:
        LearningActivity.objects.create(
            learner=learner, date=today - timedelta(days=days_ago), seconds=seconds
        )
    LearningActivity.objects.create(
        learner=learner, date=today, seconds=60
    )  # même jour, autre ligne
    robotics = CategoryFactory(slug="robo", order=1)
    code = CategoryFactory(slug="code-test", order=0)
    course = build_course(projects=1, levels=1, missions=4, category=robotics)
    enrollment = EnrollmentFactory(learner=learner, course=course)
    for mission in missions_of(course)[:3]:
        MissionProgress.objects.create(enrollment=enrollment, mission=mission)
    EnrollmentFactory(learner=learner, course=build_course(projects=0, category=code))
    badge = Badge.objects.create(kind="course", course=course, label="Diplômé", icon="🎓")
    LearnerBadge.objects.create(learner=learner, badge=badge)
    Certificate.objects.create(enrollment=enrollment, number="CERT-2026-000009")

    body = client.get("/api/learning/progress/").json()
    monday = today - timedelta(days=today.weekday())
    expected_week = sum(
        seconds
        for days_ago, seconds in [(0, 660), (1, 300), (6, 120), (7, 999)]
        if today - timedelta(days=days_ago) >= monday
    )
    assert body["weekSeconds"] == expected_week
    assert [d["seconds"] for d in body["lastDays"]] == [120, 0, 0, 0, 0, 300, 660]
    assert body["lastDays"][-1]["date"] == today.isoformat()
    assert body["points"] is None and body["rank"] is None
    assert body["streakDays"] == 2
    assert body["counters"]["certificates"] == 1 and body["counters"]["badges"] == 1
    assert [
        (m["category"]["slug"], m["missionsDone"], m["missionCount"], m["pct"])
        for m in body["mastery"]
    ] == [
        ("code-test", 0, 0, 0),
        ("robo", 3, 4, 75),
    ]


# --- Compteurs du shell (accounts/me) --------------------------------------------------------------------


def test_me_gives_shell_counters_to_learners_only(client, learner):
    EnrollmentFactory(learner=learner)
    assert client.get("/api/accounts/me/").json()["counters"]["activeEnrollments"] == 1
    parent = APIClient()
    parent.force_authenticate(ParentFactory())
    assert parent.get("/api/accounts/me/").json()["counters"] is None


def test_another_learners_data_never_shows(client, learner):
    other = EnrollmentFactory(course=build_course(projects=1, levels=1, missions=1))
    MissionProgress.objects.create(enrollment=other, mission=missions_of(other.course)[0])
    LearningActivity.objects.create(learner=other.learner, date=timezone.localdate(), seconds=500)
    body = client.get("/api/learning/dashboard/").json()
    assert body["resume"] is None and body["secondsToday"] == 0 and body["streakDays"] == 0
    progress = client.get("/api/learning/progress/").json()
    assert progress["mastery"] == [] and progress["weekSeconds"] == 0
