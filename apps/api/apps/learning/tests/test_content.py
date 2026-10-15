"""
Contenu d'un parcours suivi (WJ01-WJ03) et progression séquentielle (§4.4, ADR 0004) : le contenu et la vidéo ne
sortent que pour un inscrit, sur une étape déverrouillée, y compris en appel direct.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory
from apps.catalog.tests.factories import LevelFactory, MissionFactory
from apps.learning.models import Enrollment, MissionProgress

from .factories import EnrollmentFactory, build_course, missions_of

pytestmark = pytest.mark.django_db

SECRETS = ("76979871", "8272103f6e", "INTRO-ID", "INTRO-HASH", "Contenu de la mission.")


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
    course = build_course()
    for level in LevelFactory._meta.model.objects.filter(project__course=course):
        level.intro_vimeo_id, level.intro_vimeo_hash = "INTRO-ID", "INTRO-HASH"
        level.save()
    return course


@pytest.fixture
def enrollment(learner, course):
    return EnrollmentFactory(learner=learner, course=course)


def assert_no_content(resp):
    body = resp.content.decode()
    assert not any(secret in body for secret in SECRETS), body


# --- Refus : non inscrit, verrouillé ---------------------------------------------------------------


def test_not_enrolled_gets_neither_content_nor_video(client, course):
    mission = missions_of(course)[0]
    level, project = mission.level, mission.level.project
    for url in (
        f"/api/learning/missions/{mission.id}/",
        f"/api/learning/levels/{level.id}/",
        f"/api/learning/projects/{project.id}/",
    ):
        resp = client.get(url)
        assert resp.status_code == 403 and resp.json()["code"] == "NOT_ENROLLED", url
        assert_no_content(resp)
    resp = client.post(f"/api/learning/missions/{mission.id}/complete/")
    assert resp.status_code == 403 and resp.json()["code"] == "NOT_ENROLLED"


def test_locked_mission_is_refused_even_by_direct_call(client, course, enrollment):
    locked = missions_of(course)[1]
    resp = client.get(f"/api/learning/missions/{locked.id}/")
    assert resp.status_code == 403 and resp.json()["code"] == "CONTENT_LOCKED"
    assert_no_content(resp)

    resp = client.post(f"/api/learning/missions/{locked.id}/complete/")
    assert resp.status_code == 403 and resp.json()["code"] == "CONTENT_LOCKED"
    assert not MissionProgress.objects.exists()


def test_locked_level_and_project_are_refused(client, course, enrollment):
    second_level = missions_of(course)[2].level
    second_project = missions_of(course)[4].level.project
    for url in (
        f"/api/learning/levels/{second_level.id}/",
        f"/api/learning/projects/{second_project.id}/",
    ):
        resp = client.get(url)
        assert resp.status_code == 403 and resp.json()["code"] == "CONTENT_LOCKED", url
        assert_no_content(resp)


def test_content_of_a_draft_course_is_not_found(client, learner):
    course = build_course(draft=True)
    EnrollmentFactory(learner=learner, course=course)
    mission = missions_of(course)[0]
    assert client.get(f"/api/learning/missions/{mission.id}/").status_code == 404
    assert client.get(f"/api/learning/levels/{mission.level_id}/").status_code == 404
    assert client.get(f"/api/learning/projects/{mission.level.project_id}/").status_code == 404
    assert client.post(f"/api/learning/missions/{mission.id}/complete/").status_code == 404


def test_unknown_ids_are_not_found(client):
    for url in ("missions/999999/", "levels/999999/", "projects/999999/"):
        assert client.get(f"/api/learning/{url}").status_code == 404


# --- Lecture d'une étape déverrouillée -------------------------------------------------------------


def test_available_mission_gives_content_and_video(client, course, enrollment):
    mission = missions_of(course)[0]
    resp = client.get(f"/api/learning/missions/{mission.id}/")
    assert resp.status_code == 200
    assert resp["Cache-Control"] == "private, no-store"
    body = resp.json()
    assert body["vimeoId"] == "76979871" and body["vimeoHash"] == "8272103f6e"
    assert body["blocks"] == [{"type": "text", "text": "Contenu de la mission."}]
    assert body["state"] == "available"
    assert body["course"] == {"slug": course.slug, "title": course.title}
    assert (
        body["level"]["id"] == mission.level_id
        and body["project"]["id"] == mission.level.project_id
    )
    assert body["next"]["id"] == missions_of(course)[1].id


def test_mission_without_video_gives_null(client, learner):
    course = build_course(projects=1, levels=1, missions=1)
    EnrollmentFactory(learner=learner, course=course)
    mission = missions_of(course)[0]
    mission.vimeo_id = mission.vimeo_hash = ""
    mission.save()
    body = client.get(f"/api/learning/missions/{mission.id}/").json()
    assert body["vimeoId"] is None and body["vimeoHash"] is None


def test_level_gives_intro_video_once_reached(client, course, enrollment):
    level = missions_of(course)[0].level
    body = client.get(f"/api/learning/levels/{level.id}/").json()
    assert body["introVimeoId"] == "INTRO-ID" and body["introVimeoHash"] == "INTRO-HASH"
    assert body["state"] == "available"
    assert [m["state"] for m in body["missions"]] == ["available", "locked"]
    assert body["project"]["id"] == level.project_id


def test_level_without_intro_video_gives_null(client, learner):
    course = build_course(projects=1, levels=1, missions=1)
    EnrollmentFactory(learner=learner, course=course)
    body = client.get(f"/api/learning/levels/{missions_of(course)[0].level_id}/").json()
    assert body["introVimeoId"] is None and body["introVimeoHash"] is None


def test_project_gives_objectives_levels_and_progress(client, course, enrollment):
    project = missions_of(course)[0].level.project
    project.objectives, project.materials = ["Construire"], ["Moteur"]
    project.save()
    MissionProgress.objects.create(enrollment=enrollment, mission=missions_of(course)[0])
    body = client.get(f"/api/learning/projects/{project.id}/").json()
    assert body["objectives"] == ["Construire"] and body["materials"] == ["Moteur"]
    assert (body["missionCount"], body["missionsDone"]) == (4, 1)
    assert [lv["state"] for lv in body["levels"]] == ["available", "locked"]
    assert "introVimeoId" not in body["levels"][0]


# --- Missions terminées, dans l'ordre --------------------------------------------------------------


def test_completing_missions_in_order_until_certification(client, learner, course, enrollment):
    missions = missions_of(course)
    for index, mission in enumerate(missions):
        resp = client.post(f"/api/learning/missions/{mission.id}/complete/")
        assert resp.status_code == 200, resp.content
        body = resp.json()
        assert body["missionId"] == mission.id
        assert body["progressPct"] == (index + 1) * 100 // len(missions)
        if index + 1 < len(missions):
            assert (
                body["next"]["type"] == "mission" and body["next"]["id"] == missions[index + 1].id
            )
    assert body["next"]["type"] == "certification"
    enrollment.refresh_from_db()
    assert enrollment.progress_pct == 100 and enrollment.last_activity_at is not None


def test_completing_twice_counts_once_and_done_mission_stays_readable(client, course, enrollment):
    first = missions_of(course)[0]
    client.post(f"/api/learning/missions/{first.id}/complete/")
    enrollment.refresh_from_db()
    touched = enrollment.last_activity_at
    again = client.post(f"/api/learning/missions/{first.id}/complete/")
    assert again.status_code == 200 and again.json()["progressPct"] == 12
    assert MissionProgress.objects.count() == 1
    enrollment.refresh_from_db()
    assert enrollment.last_activity_at == touched
    assert client.get(f"/api/learning/missions/{first.id}/").json()["state"] == "done"


def test_next_after_a_done_mission_skips_done_steps(client, learner):
    course = build_course(projects=1, levels=1, missions=3)
    enrollment = EnrollmentFactory(learner=learner, course=course)
    m1, m2, m3 = missions_of(course)
    MissionProgress.objects.create(enrollment=enrollment, mission=m1)
    MissionProgress.objects.create(enrollment=enrollment, mission=m2)
    # Relire la première mission propose la prochaine non faite, la troisième
    assert client.get(f"/api/learning/missions/{m1.id}/").json()["next"]["id"] == m3.id


def test_mission_inserted_before_done_ones_becomes_the_next_step(client, learner):
    course = build_course(projects=1, levels=1, missions=2)
    enrollment = EnrollmentFactory(learner=learner, course=course)
    m1, m2 = missions_of(course)
    for mission in (m1, m2):
        MissionProgress.objects.create(enrollment=enrollment, mission=mission)
    m1.order, m2.order = 0, 5
    m1.save(), m2.save()
    inserted = MissionFactory(level=m1.level, order=0)  # même ordre que m1 : départagé par l'id

    body = client.get(f"/api/learning/missions/{m2.id}/").json()
    assert body["state"] == "done" and body["next"]["id"] == inserted.id
    tree = client.get(f"/api/learning/enrollments/{course.slug}/tree/").json()
    assert [m["state"] for m in tree["projects"][0]["levels"][0]["missions"]] == [
        "done",
        "available",
        "done",
    ]


def test_another_learners_progress_is_not_mine(client, course, enrollment):
    other = EnrollmentFactory(course=course)
    MissionProgress.objects.create(enrollment=other, mission=missions_of(course)[0])
    second = missions_of(course)[1]
    assert client.get(f"/api/learning/missions/{second.id}/").json()["code"] == "CONTENT_LOCKED"
    assert Enrollment.objects.get(pk=enrollment.pk).progress_pct == 0
