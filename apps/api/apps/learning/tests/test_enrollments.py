"""Inscriptions (D27, D36) et arbre d'un parcours (WD23, WC06a, WC06b)."""

from datetime import timedelta

import pytest
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory
from apps.catalog.tests.factories import CourseFactory, LevelFactory, ProjectFactory
from apps.learning.models import Enrollment, MissionProgress
from apps.learning.services import enroll_free
from apps.shop.tests.factories import KitFactory

from .factories import EnrollmentFactory, build_course, missions_of

pytestmark = pytest.mark.django_db


@pytest.fixture
def learner():
    return LearnerFactory()


@pytest.fixture
def client(learner):
    client = APIClient()
    client.force_authenticate(learner)
    return client


# --- POST learning/enrollments/ -------------------------------------------------------------------


def test_enroll_in_a_free_course_then_again_is_idempotent(client, learner):
    course = build_course(slug="gratuit")
    first = client.post("/api/learning/enrollments/", {"courseSlug": "gratuit"}, format="json")
    assert first.status_code == 201
    body = first.json()
    assert body["source"] == "free" and body["status"] == "active" and body["progressPct"] == 0
    assert body["course"]["slug"] == "gratuit"
    assert body["missionCount"] == 8 and body["missionsDone"] == 0
    assert body["next"]["type"] == "mission" and body["next"]["id"] == missions_of(course)[0].id
    assert body["currentProject"]["title"] == "Projet 1"
    assert body["currentLevel"]["title"] == "Niveau 1.1"

    again = client.post("/api/learning/enrollments/", {"courseSlug": "gratuit"}, format="json")
    assert again.status_code == 200 and again.json()["id"] == body["id"]
    assert Enrollment.objects.filter(learner=learner).count() == 1


@pytest.mark.parametrize(
    ("fields", "code"),
    [({"paid": True}, "PAYMENT_REQUIRED"), ({"kit": True}, "KIT_CODE_REQUIRED")],
)
def test_paid_or_kit_course_cannot_be_enrolled_directly(client, fields, code):
    if fields.get("kit"):
        CourseFactory(slug="cible", paid=True, required_kit=KitFactory())
    else:
        CourseFactory(slug="cible", paid=True)
    resp = client.post("/api/learning/enrollments/", {"courseSlug": "cible"}, format="json")
    assert resp.status_code == 402 and resp.json()["code"] == code
    assert not Enrollment.objects.exists()


def test_already_enrolled_by_another_source_gets_the_existing_enrollment(client, learner):
    course = CourseFactory(slug="payant", paid=True)
    enrollment = EnrollmentFactory(learner=learner, course=course, source=Enrollment.Source.ORDER)
    resp = client.post("/api/learning/enrollments/", {"courseSlug": "payant"}, format="json")
    assert resp.status_code == 200 and resp.json()["id"] == enrollment.id


@pytest.mark.parametrize("slug", ["brouillon", "inconnu"])
def test_draft_or_unknown_course_is_not_found(client, slug):
    CourseFactory(slug="brouillon", draft=True)
    resp = client.post("/api/learning/enrollments/", {"courseSlug": slug}, format="json")
    assert resp.status_code == 404
    assert not Enrollment.objects.exists()


def test_course_slug_is_required(client):
    resp = client.post("/api/learning/enrollments/", {}, format="json")
    assert resp.status_code == 400 and "courseSlug" in resp.json()["fields"]


def test_concurrent_enrollment_returns_the_one_created_by_the_other_request(learner, monkeypatch):
    course = CourseFactory()
    other = EnrollmentFactory(learner=learner, course=course)

    class Missing:  # la première lecture ne voit pas encore l'inscription de l'autre requête
        def first(self):
            return None

    def create(**kwargs):
        raise IntegrityError

    monkeypatch.setattr(Enrollment.objects, "filter", lambda **kwargs: Missing())
    monkeypatch.setattr(Enrollment.objects, "create", create)
    assert enroll_free(learner, course) == (other, False)


# --- GET learning/enrollments/ --------------------------------------------------------------------


def test_list_only_my_enrollments_most_recent_activity_first(client, learner):
    old = EnrollmentFactory(learner=learner, course=build_course(projects=1))
    recent = EnrollmentFactory(learner=learner, course=build_course(projects=1))
    never = EnrollmentFactory(learner=learner, course=build_course(projects=1))
    EnrollmentFactory(course=build_course(projects=1))  # autre apprenant
    Enrollment.objects.filter(pk=old.pk).update(last_activity_at=timezone.now() - timedelta(days=2))
    Enrollment.objects.filter(pk=recent.pk).update(last_activity_at=timezone.now())

    body = client.get("/api/learning/enrollments/").json()
    assert body["count"] == 3
    assert [e["id"] for e in body["results"]] == [recent.id, old.id, never.id]


def test_list_filters_by_status(client, learner):
    EnrollmentFactory(learner=learner)
    done = EnrollmentFactory(learner=learner, status=Enrollment.Status.COMPLETED)
    body = client.get("/api/learning/enrollments/?status=completed").json()
    assert [e["id"] for e in body["results"]] == [done.id]
    assert client.get("/api/learning/enrollments/?status=autre").status_code == 400


def test_completed_course_points_to_certification(client, learner):
    course = build_course(projects=1, levels=1, missions=1)
    enrollment = EnrollmentFactory(learner=learner, course=course)
    MissionProgress.objects.create(enrollment=enrollment, mission=missions_of(course)[0])
    item = client.get("/api/learning/enrollments/").json()["results"][0]
    assert item["next"] == {
        "type": "certification",
        "id": None,
        "title": None,
        "courseSlug": course.slug,
        "projectId": None,
        "levelId": None,
    }
    assert item["currentProject"] is None and item["currentLevel"] is None


# --- GET learning/enrollments/{slug}/tree/ --------------------------------------------------------


def test_tree_gives_states_without_content(client, learner):
    course = build_course(slug="arbre")
    enrollment = EnrollmentFactory(learner=learner, course=course)
    missions = missions_of(course)
    for mission in missions[:3]:  # niveau 1.1 fait, mission 1.2.1 faite
        MissionProgress.objects.create(enrollment=enrollment, mission=mission)

    resp = client.get("/api/learning/enrollments/arbre/tree/")
    assert resp.status_code == 200
    assert resp["Cache-Control"] == "private, no-store"
    tree = resp.json()
    p1, p2 = tree["projects"]
    assert p1["state"] == "available" and p2["state"] == "locked"
    assert (p1["missionCount"], p1["missionsDone"]) == (4, 3)
    l11, l12 = p1["levels"]
    assert l11["state"] == "done" and l12["state"] == "available"
    assert [m["state"] for m in l12["missions"]] == ["done", "available"]
    assert {m["state"] for lv in p2["levels"] for m in lv["missions"]} == {"locked"}
    assert tree["next"]["id"] == missions[3].id
    for key in ("blocks", "vimeoId", "vimeoHash", "introVimeoId", "introVimeoHash"):
        assert key not in resp.content.decode()


def test_tree_requires_an_enrollment(client):
    build_course(slug="arbre")
    resp = client.get("/api/learning/enrollments/arbre/tree/")
    assert resp.status_code == 403 and resp.json()["code"] == "NOT_ENROLLED"


def test_tree_of_a_draft_course_is_not_found(client, learner):
    course = build_course(slug="brouillon", draft=True)
    EnrollmentFactory(learner=learner, course=course)
    assert client.get("/api/learning/enrollments/brouillon/tree/").status_code == 404


def test_empty_project_and_level_are_crossed_once_reached(client, learner):
    course = build_course(projects=1, levels=1, missions=1, slug="vide")
    LevelFactory(project=course.projects.first(), order=5)  # niveau sans mission, en fin de projet
    ProjectFactory(course=course, order=9)  # projet sans niveau, en fin de parcours
    enrollment = EnrollmentFactory(learner=learner, course=course)

    tree = client.get("/api/learning/enrollments/vide/tree/").json()
    assert tree["projects"][0]["levels"][1]["state"] == "locked"
    assert tree["projects"][1]["state"] == "locked"

    MissionProgress.objects.create(enrollment=enrollment, mission=missions_of(course)[0])
    tree = client.get("/api/learning/enrollments/vide/tree/").json()
    assert tree["projects"][0]["levels"][1]["state"] == "done"
    assert tree["projects"][1]["state"] == "done"
    assert tree["progressPct"] == 0  # recalculé à la prochaine mission terminée, pas à la lecture
