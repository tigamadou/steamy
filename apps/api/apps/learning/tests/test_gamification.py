"""Points, badges, rang, temps d'apprentissage et streak (D34, C8, ADR 0004 §7)."""

from datetime import date, timedelta

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory
from apps.catalog.models import Badge, Quiz
from apps.core.models import PlatformSettings
from apps.learning import gamification
from apps.learning.models import LearnerBadge, LearningActivity, MissionProgress, PointsEntry

from .factories import EnrollmentFactory, answers, build_course, missions_of

pytestmark = pytest.mark.django_db

SCALE = {"mission": 10, "formative": 20, "summative": 50, "course": 100}
RANKS = [
    {"rank": "Inventeur", "points": 300},
    {"rank": "Explorateur", "points": 0},
    {"rank": "Bricoleur", "points": 100},
]


@pytest.fixture
def scale():
    settings_ = PlatformSettings.load()
    settings_.points_scale, settings_.rank_thresholds = SCALE, RANKS
    settings_.save()


@pytest.fixture
def learner():
    return LearnerFactory()


@pytest.fixture
def client(learner):
    client = APIClient()
    client.force_authenticate(learner)
    return client


@pytest.fixture
def course():
    course = build_course(projects=1, levels=1, missions=2, quizzes=True)
    level = course.projects.get().levels.get()
    Badge.objects.create(kind="level", level=level, label="Moteurs", icon="⚙️")
    Badge.objects.create(kind="project", project=level.project, label="Robot", icon="🤖")
    return course


@pytest.fixture
def enrollment(learner, course):
    return EnrollmentFactory(learner=learner, course=course)


def points(learner) -> int:
    learner.learner_profile.refresh_from_db()
    return learner.learner_profile.points


# --- Points ------------------------------------------------------------------------------------------


def test_mission_points_are_awarded_once(scale, client, learner, course, enrollment):
    first = missions_of(course)[0]
    resp = client.post(f"/api/learning/missions/{first.id}/complete/")
    assert resp.json()["pointsEarned"] == 10
    again = client.post(f"/api/learning/missions/{first.id}/complete/")
    assert again.json()["pointsEarned"] == 0
    assert points(learner) == 10
    entry = PointsEntry.objects.get()
    assert (entry.source, entry.key) == ("mission", f"mission:{first.id}")
    assert str(entry) == f"{learner} · +10 · {entry.reason}"


def test_no_points_without_a_scale(client, learner, course, enrollment):
    resp = client.post(f"/api/learning/missions/{missions_of(course)[0].id}/complete/")
    assert resp.json()["pointsEarned"] == 0
    assert not PointsEntry.objects.exists() and points(learner) == 0
    assert gamification.points_enabled() is False


def test_quiz_points_and_badge_on_first_pass_only(scale, client, learner, course, enrollment):
    for mission in missions_of(course):
        MissionProgress.objects.create(enrollment=enrollment, mission=mission)
    formative = Quiz.objects.get(kind="formative")
    failed = client.post(
        f"/api/learning/quizzes/{formative.id}/attempts/",
        {"answers": answers(formative, 0)},
        format="json",
    ).json()
    assert failed["pointsEarned"] == 0 and failed["badge"] is None

    passed = client.post(
        f"/api/learning/quizzes/{formative.id}/attempts/",
        {"answers": answers(formative, 2)},
        format="json",
    ).json()
    assert passed["pointsEarned"] == 20
    assert passed["badge"] == {
        "id": formative.level.badge.id,
        "kind": "level",
        "label": "Moteurs",
        "icon": "⚙️",
        "description": "",
    }
    replay = client.post(
        f"/api/learning/quizzes/{formative.id}/attempts/",
        {"answers": answers(formative, 2)},
        format="json",
    ).json()
    assert replay["pointsEarned"] == 0 and replay["badge"]["label"] == "Moteurs"
    assert points(learner) == 20
    assert LearnerBadge.objects.filter(learner=learner).count() == 1

    summative = Quiz.objects.get(kind="summative")
    body = client.post(
        f"/api/learning/quizzes/{summative.id}/attempts/",
        {"answers": answers(summative, 2)},
        format="json",
    ).json()
    assert body["pointsEarned"] == 50 and body["badge"]["kind"] == "project"
    assert points(learner) == 70


def test_quiz_without_badge(scale, client, learner):
    course = build_course(projects=1, levels=1, missions=1, quizzes=True)
    enrollment = EnrollmentFactory(learner=learner, course=course)
    MissionProgress.objects.create(enrollment=enrollment, mission=missions_of(course)[0])
    quiz = Quiz.objects.get(kind="formative")
    body = client.post(
        f"/api/learning/quizzes/{quiz.id}/attempts/", {"answers": answers(quiz, 2)}, format="json"
    ).json()
    assert body["passed"] and body["badge"] is None
    assert gamification.award_badge(learner, None) is False


def test_points_entry_is_unique_per_event(learner):
    PointsEntry.objects.create(
        learner=learner, amount=1, source="mission", key="mission:1", reason="x"
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        PointsEntry.objects.create(
            learner=learner, amount=1, source="mission", key="mission:1", reason="y"
        )


# --- Rang ---------------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (0, ("Explorateur", 0, "Bricoleur", 100)),
        (99, ("Explorateur", 0, "Bricoleur", 100)),
        (100, ("Bricoleur", 100, "Inventeur", 300)),
        (5000, ("Inventeur", 300, None, None)),
    ],
)
def test_rank_is_derived_from_points(scale, value, expected):
    rank = gamification.rank_for(value)
    assert (rank["label"], rank["min_points"], rank["next_label"], rank["next_at"]) == expected


def test_no_rank_without_thresholds_or_below_the_first(learner):
    assert gamification.rank_for(500) is None
    settings_ = PlatformSettings.load()
    settings_.rank_thresholds = [{"rank": "Bricoleur", "points": 100}]
    settings_.save()
    assert gamification.rank_for(10) is None
    assert gamification.points_of(learner) == 0
    assert gamification.points_of(None) == 0


# --- Badges ---------------------------------------------------------------------------------------------


def test_badge_constraints_and_name(course):
    level = course.projects.get().levels.get()
    for fields in (
        {"kind": "level", "project": level.project},  # mauvaise cible
        {"kind": "course"},  # aucune cible
        {"kind": "project", "project": level.project, "course": course},  # deux cibles
    ):
        with pytest.raises(IntegrityError), transaction.atomic():
            Badge.objects.create(label="x", icon="x", **fields)
    assert str(Badge.objects.get(kind="level")) == "Moteurs"


def test_badge_list_is_mine_and_filtered_by_course(learner, client, course):
    level = course.projects.get().levels.get()
    other_course = build_course(projects=1, levels=1, missions=1, slug="autre")
    course_badge = Badge.objects.create(
        kind="course", course=other_course, label="Diplômé", icon="🎓"
    )
    LearnerBadge.objects.create(learner=learner, badge=level.badge)
    LearnerBadge.objects.create(learner=learner, badge=level.project.badge)
    LearnerBadge.objects.create(learner=learner, badge=course_badge)
    LearnerBadge.objects.create(learner=LearnerFactory(), badge=level.badge)  # autre apprenant

    body = client.get("/api/learning/badges/").json()
    assert body["count"] == 3
    by_kind = {item["kind"]: item for item in body["results"]}
    assert by_kind["level"]["course"]["slug"] == course.slug
    assert (by_kind["level"]["levelId"], by_kind["level"]["projectId"]) == (
        level.id,
        level.project_id,
    )
    assert (by_kind["project"]["levelId"], by_kind["project"]["projectId"]) == (
        None,
        level.project_id,
    )
    assert by_kind["course"]["course"]["slug"] == "autre" and by_kind["course"]["projectId"] is None

    filtered = client.get(f"/api/learning/badges/?course={course.slug}").json()
    assert {item["kind"] for item in filtered["results"]} == {"level", "project"}
    award = LearnerBadge.objects.filter(learner=learner).first()
    assert str(award) == f"{learner} · {award.badge}"


# --- Temps d'apprentissage ---------------------------------------------------------------------------


def test_activity_counts_seconds_with_caps(client, learner, course, enrollment, monkeypatch):
    mission = missions_of(course)[0]
    url = "/api/learning/activity/"
    body = client.post(url, {"missionId": mission.id, "seconds": 30}, format="json").json()
    assert body == {"secondsCounted": 30, "secondsToday": 30, "streakDays": 1}
    capped = client.post(url, {"missionId": mission.id, "seconds": 900}, format="json").json()
    assert capped["secondsCounted"] == gamification.MAX_SECONDS_PER_CALL
    assert LearningActivity.objects.get().seconds == 30 + gamification.MAX_SECONDS_PER_CALL

    monkeypatch.setattr(gamification, "MAX_SECONDS_PER_DAY", 200)
    last = client.post(url, {"missionId": mission.id, "seconds": 100}, format="json").json()
    assert last["secondsCounted"] == 50 and last["secondsToday"] == 200
    full = client.post(url, {"missionId": mission.id, "seconds": 100}, format="json").json()
    assert full["secondsCounted"] == 0 and full["secondsToday"] == 200
    assert str(LearningActivity.objects.get()).endswith("· 200 s")


def test_activity_is_refused_on_a_locked_or_foreign_mission(client, course, enrollment):
    locked = missions_of(course)[1]
    resp = client.post(
        "/api/learning/activity/", {"missionId": locked.id, "seconds": 30}, format="json"
    )
    assert resp.status_code == 403 and resp.json()["code"] == "CONTENT_LOCKED"
    other = missions_of(build_course(projects=1, levels=1, missions=1))[0]
    resp = client.post(
        "/api/learning/activity/", {"missionId": other.id, "seconds": 30}, format="json"
    )
    assert resp.status_code == 403 and resp.json()["code"] == "NOT_ENROLLED"
    for seconds in (0, 3601):
        resp = client.post(
            "/api/learning/activity/",
            {"missionId": missions_of(course)[0].id, "seconds": seconds},
            format="json",
        )
        assert resp.status_code == 400
    assert not LearningActivity.objects.exists()


def test_mission_completion_and_quiz_count_as_activity(client, learner, course, enrollment):
    client.post(f"/api/learning/missions/{missions_of(course)[0].id}/complete/")
    row = LearningActivity.objects.get()
    assert row.mission_id == missions_of(course)[0].id and row.seconds == 0
    assert row.date == timezone.localdate()
    learner.learner_profile.refresh_from_db()
    assert learner.learner_profile.streak_days == 1


# --- Streak ----------------------------------------------------------------------------------------------


def activity_on(learner, *days_ago):
    today = date(2026, 10, 15)
    for days in days_ago:
        LearningActivity.objects.create(
            learner=learner, date=today - timedelta(days=days), seconds=60
        )
    return today


@pytest.mark.parametrize(
    ("days_ago", "expected"),
    [
        ((), 0),
        ((0,), 1),
        ((0, 1, 2), 3),
        ((1, 2), 2),  # pas encore d'activité aujourd'hui : la série d'hier compte
        ((0, 2, 3), 1),  # trou hier
        ((2, 3), 0),  # dernière activité avant-hier
        ((0, 0, 1), 2),  # deux lignes le même jour
    ],
)
def test_streak_days(learner, days_ago, expected):
    today = activity_on(learner, *days_ago)
    assert gamification.streak_days(learner, today) == expected


def test_future_activity_is_ignored(learner):
    today = activity_on(learner, 0, -1)
    assert gamification.streak_days(learner, today) == 1


def test_award_points_twice_for_the_same_event_pays_once(scale, learner):
    assert gamification.award_points(learner, "mission", "mission:1", "Mission") == 10
    assert gamification.award_points(learner, "mission", "mission:1", "Mission") == 0
    assert points(learner) == 10
