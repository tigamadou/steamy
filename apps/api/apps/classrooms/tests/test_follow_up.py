"""
API-L5.3 · Suivi : tableau de bord (WT01), profil élève (WT05), « À revoir » (WT07, D65), commentaires (D63),
parcours encadré avec compteurs (WT10). Cloisonnement (D64) : aucun élève hors des classes de l'enseignant, aucune
donnée sensible dans les réponses.
"""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import ParentChildLink
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.classrooms.models import ClassroomMembership, TeacherComment
from apps.core.models import AuditLog
from apps.learning.models import Enrollment, MissionProgress, QuizAttempt
from apps.learning.tests.factories import build_course, missions_of
from apps.notifications.models import Notification
from apps.referentials.models import Relationship

from .factories import ClassroomFactory, MembershipFactory, SchoolFactory, teacher_of

pytestmark = pytest.mark.django_db

Status = ClassroomMembership.Status
URL = "/api/classrooms/"
#: Clés interdites dans toute réponse de l'espace enseignant (D64).
SENSITIVE = {
    "disability",
    "locality",
    "birthDate",
    "age",
    "phone",
    "parentPhone",
    "username",
    "gender",
}


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def keys(data) -> set:
    found = set()
    if isinstance(data, dict):
        for key, value in data.items():
            found.add(key)
            found |= keys(value)
    elif isinstance(data, list):
        for item in data:
            found |= keys(item)
    return found


def attempt(enrollment, quiz, status, percentage=30, **fields):
    return QuizAttempt.objects.create(
        learner=enrollment.learner,
        enrollment=enrollment,
        quiz=quiz,
        score=percentage,
        total=100,
        percentage=percentage,
        threshold=70,
        status=status,
        passed=status == QuizAttempt.Status.OK,
        **fields,
    )


@pytest.fixture
def world():
    """Une classe de Koffi sur un parcours à quiz, Awa (enfant de Marie) et Bio y sont actifs."""
    course = build_course(projects=1, levels=2, missions=2, quizzes=True)
    school = SchoolFactory(courses=[course])
    teacher = teacher_of(school, first_name="Koffi", last_name="Adékambi")
    classroom = ClassroomFactory(school=school, teacher=teacher, course=course, name="4e B")
    parent = ParentFactory()
    awa = LearnerFactory(first_name="Awa", last_name="Dossou")
    ParentChildLink.objects.create(
        parent=parent, learner=awa, relationship=Relationship.objects.get(code="mere")
    )
    bio = LearnerFactory(first_name="Bio", last_name="Sanni")
    for learner in (awa, bio):
        MembershipFactory(classroom=classroom, learner=learner)
    awa_enrollment = Enrollment.objects.create(
        learner=awa,
        course=course,
        source=Enrollment.Source.CLASSROOM,
        progress_pct=50,
        last_activity_at=timezone.now(),
    )
    level_quiz = course.projects.get().levels.order_by("order").first().quiz
    project_quiz = course.projects.get().quiz
    return {
        "course": course,
        "school": school,
        "teacher": teacher,
        "classroom": classroom,
        "parent": parent,
        "awa": awa,
        "bio": bio,
        "enrollment": awa_enrollment,
        "level_quiz": level_quiz,
        "project_quiz": project_quiz,
        "api": client_for(teacher),
    }


# --- Profil élève (WT05) ---------------------------------------------------------------------


def test_learner_profile_on_the_classroom_course_only(world):
    w = world
    ko = attempt(w["enrollment"], w["level_quiz"], "ko", 30)
    attempt(w["enrollment"], w["project_quiz"], "ok", 90)
    other_course = build_course(projects=1, levels=1, missions=1, quizzes=True)
    elsewhere = Enrollment.objects.create(learner=w["awa"], course=other_course, source="free")
    attempt(elsewhere, other_course.projects.get().quiz, "ko")
    TeacherComment.objects.create(
        teacher=w["teacher"], learner=w["awa"], classroom=w["classroom"], attempt=ko, body="Revois."
    )

    response = w["api"].get(f"{URL}learners/{w['awa'].pk}/")

    assert response.status_code == 200
    body = response.json()
    assert not keys(body) & SENSITIVE
    assert body["learner"]["firstName"] == "Awa"
    assert body["classroom"]["name"] == "4e B"
    assert (body["progressPct"], body["isDropout"], body["averagePercentage"]) == (50, False, 60)
    assert [a["status"] for a in body["attempts"]] == ["ok", "ko"]
    assert body["attempts"][1]["commented"] is True
    assert body["attempts"][1]["quiz"]["levelTitle"] == "Niveau 1.1"
    assert body["attempts"][0]["quiz"]["levelTitle"] is None
    assert body["attempts"][0]["quiz"]["projectTitle"] == "Projet 1"
    assert [c["body"] for c in body["comments"]] == ["Revois."]


def test_learner_without_enrollment_nor_attempt(world):
    body = world["api"].get(f"{URL}learners/{world['bio'].pk}/").json()
    assert (body["progressPct"], body["averagePercentage"], body["attempts"]) == (0, None, [])


def test_learner_outside_my_classrooms_is_not_found(world):
    w = world
    other = ClassroomFactory(school=w["school"])
    stranger = MembershipFactory(classroom=other).learner
    left = MembershipFactory(classroom=w["classroom"], status=Status.LEFT).learner
    for learner in (stranger, left):
        assert w["api"].get(f"{URL}learners/{learner.pk}/").status_code == 404
        assert (
            w["api"]
            .post(f"{URL}learners/{learner.pk}/comments/", {"body": "x"}, format="json")
            .status_code
            == 404
        )
    # Bonne élève, mauvaise classe
    mine = ClassroomFactory(school=w["school"], teacher=w["teacher"])
    response = w["api"].get(f"{URL}learners/{w['awa'].pk}/?classroomId={mine.pk}")
    assert response.status_code == 404
    assert client_for(other.teacher).get(f"{URL}learners/{w['awa'].pk}/").status_code == 404


def test_learner_in_two_of_my_classrooms(world):
    w = world
    second = ClassroomFactory(
        school=w["school"], teacher=w["teacher"], course=w["course"], name="Club"
    )
    MembershipFactory(classroom=second, learner=w["awa"])
    body = w["api"].get(f"{URL}learners/{w['awa'].pk}/?classroomId={w['classroom'].pk}").json()
    assert body["classroom"]["name"] == "4e B"
    assert w["api"].get(f"{URL}learners/{w['awa'].pk}/").json()["classroom"]["name"] == "Club"


# --- Commentaires (D63) ----------------------------------------------------------------------


def test_comment_is_notified_to_the_learner_and_the_parent(world):
    w = world
    ko = attempt(w["enrollment"], w["level_quiz"], "ko")
    response = w["api"].post(
        f"{URL}learners/{w['awa'].pk}/comments/",
        {"body": "Revois la mission 1.1.2.", "attemptId": ko.pk},
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["attemptId"] == ko.pk
    note = TeacherComment.objects.get()
    assert (note.teacher, note.classroom, note.attempt) == (w["teacher"], w["classroom"], ko)
    to_learner = Notification.objects.get(user=w["awa"])
    assert to_learner.title == "Koffi Adékambi t'a laissé un commentaire"
    assert to_learner.message == "Revois la mission 1.1.2."
    to_parent = Notification.objects.get(user=w["parent"])
    assert to_parent.title == "Koffi Adékambi a commenté le travail de Awa"
    assert to_parent.url == f"/parent/enfants/{w['awa'].pk}"
    assert AuditLog.objects.filter(action="classroom.comment").exists()


def test_comment_without_attempt_and_learner_without_parent(world):
    w = world
    response = w["api"].post(
        f"{URL}learners/{w['bio'].pk}/comments/", {"body": "Bravo !"}, format="json"
    )
    assert response.status_code == 201
    assert response.json()["attemptId"] is None
    assert Notification.objects.filter(user=w["bio"]).count() == 1


def test_comment_on_an_attempt_from_elsewhere_is_refused(world):
    w = world
    other_course = build_course(projects=1, levels=1, missions=1, quizzes=True)
    elsewhere = Enrollment.objects.create(learner=w["awa"], course=other_course, source="free")
    foreign = attempt(elsewhere, other_course.projects.get().quiz, "ko")
    response = w["api"].post(
        f"{URL}learners/{w['awa'].pk}/comments/",
        {"body": "x", "attemptId": foreign.pk},
        format="json",
    )
    assert response.status_code == 404
    assert response.json()["fields"]["attemptId"][0]["code"] == "NOT_FOUND"


def test_comment_length_is_bounded(world):
    w = world
    response = w["api"].post(
        f"{URL}learners/{w['awa'].pk}/comments/", {"body": "x" * 1001}, format="json"
    )
    assert response.status_code == 400
    assert (
        w["api"]
        .post(f"{URL}learners/{w['awa'].pk}/comments/", {"body": ""}, format="json")
        .status_code
        == 400
    )


def test_learner_and_parent_read_the_comments(world):
    w = world
    ko = attempt(w["enrollment"], w["level_quiz"], "ko", 30)
    TeacherComment.objects.create(
        teacher=w["teacher"], learner=w["awa"], classroom=w["classroom"], attempt=ko, body="Revois."
    )
    TeacherComment.objects.create(
        teacher=w["teacher"], learner=w["bio"], classroom=w["classroom"], body="Pour Bio."
    )

    mine = client_for(w["awa"]).get(f"{URL}comments/").json()
    assert [c["body"] for c in mine["results"]] == ["Revois."]
    row = mine["results"][0]
    assert (row["teacherName"], row["classroomName"], row["learnerId"]) == (
        "Koffi Adékambi",
        "4e B",
        w["awa"].pk,
    )
    assert row["attempt"]["percentage"] == 30
    parent_api = client_for(w["parent"])
    assert [c["body"] for c in parent_api.get(f"{URL}comments/").json()["results"]] == ["Revois."]
    filtered = parent_api.get(f"{URL}comments/?learnerId={w['awa'].pk}").json()
    assert filtered["count"] == 1
    assert parent_api.get(f"{URL}comments/?learnerId={w['bio'].pk}").status_code == 404
    assert client_for(w["bio"]).get(f"{URL}comments/").json()["results"][0]["attempt"] is None


def test_comments_are_not_for_teachers_nor_anonymous(world):
    assert world["api"].get(f"{URL}comments/").status_code == 403
    assert APIClient().get(f"{URL}comments/").status_code == 401


# --- « À revoir » et évaluations (WT07) -------------------------------------------------------


def test_reviews_filters(world):
    w = world
    ko = attempt(w["enrollment"], w["level_quiz"], "ko")
    commented = attempt(w["enrollment"], w["level_quiz"], "ko")
    TeacherComment.objects.create(
        teacher=w["teacher"],
        learner=w["awa"],
        classroom=w["classroom"],
        attempt=commented,
        body="x",
    )
    warn = attempt(w["enrollment"], w["level_quiz"], "warn", 60)
    ok = attempt(w["enrollment"], w["project_quiz"], "ok", 90)
    # Hors périmètre : élève d'un collègue, élève retiré
    other = ClassroomFactory(school=w["school"], course=w["course"])
    stranger = MembershipFactory(classroom=other).learner
    attempt(
        Enrollment.objects.create(learner=stranger, course=w["course"], source="free"),
        w["level_quiz"],
        "ko",
    )

    def ids(query=""):
        body = w["api"].get(f"{URL}reviews/{query}").json()
        assert not keys(body) & SENSITIVE
        return [row["id"] for row in body["results"]]

    assert ids() == [ok.pk, warn.pk, commented.pk, ko.pk]
    assert ids("?status=to_review") == [ko.pk]
    assert ids("?status=warn") == [warn.pk]
    assert ids("?type=summative") == [ok.pk]
    assert ids(f"?classroomId={w['classroom'].pk}&type=formative") == [warn.pk, commented.pk, ko.pk]
    assert ids("?classroomId=999999") == []
    row = w["api"].get(f"{URL}reviews/?status=to_review").json()["results"][0]
    assert (row["learner"]["firstName"], row["classroom"]["name"], row["commented"]) == (
        "Awa",
        "4e B",
        False,
    )
    assert w["api"].get(f"{URL}reviews/?status=perdu").status_code == 400


# --- Tableau de bord (WT01) et membres (WT04) ---------------------------------------------------


def test_dashboard(world):
    w = world
    attempt(w["enrollment"], w["level_quiz"], "ko")
    MembershipFactory(classroom=w["classroom"], status=Status.INVITED)
    # Bio n'a jamais eu d'activité : il a rejoint il y a 10 jours
    ClassroomMembership.objects.filter(learner=w["bio"]).update(
        joined_at=timezone.now() - timedelta(days=10)
    )

    body = w["api"].get(f"{URL}dashboard/").json()

    assert not keys(body) & SENSITIVE
    assert (body["classroomCount"], body["learnerCount"], body["pendingInvitationCount"]) == (
        1,
        2,
        1,
    )
    assert (body["toReviewCount"], body["dropoutCount"]) == (1, 1)
    assert body["classrooms"][0]["averageProgress"] == 50
    assert body["toReview"][0]["learner"]["firstName"] == "Awa"
    assert body["dropouts"][0]["learner"]["firstName"] == "Bio"
    assert body["dropouts"][0]["classroom"]["name"] == "4e B"


def test_dropout_threshold_and_completed_course(world):
    from apps.core.models import PlatformSettings

    w = world
    Enrollment.objects.filter(pk=w["enrollment"].pk).update(
        last_activity_at=timezone.now() - timedelta(days=3)
    )
    settings_ = PlatformSettings.load()
    settings_.dropout_threshold_days = 2
    settings_.save()
    assert w["api"].get(f"{URL}dashboard/").json()["dropoutCount"] == 1
    Enrollment.objects.filter(pk=w["enrollment"].pk).update(status=Enrollment.Status.COMPLETED)
    assert w["api"].get(f"{URL}dashboard/").json()["dropoutCount"] == 0


def test_empty_dashboard():
    teacher = teacher_of(SchoolFactory())
    body = client_for(teacher).get(f"{URL}dashboard/").json()
    assert (body["classroomCount"], body["toReview"], body["dropouts"]) == (0, [], [])


def test_members_show_progress_and_dropout(world):
    w = world
    ClassroomMembership.objects.filter(learner=w["bio"]).update(
        joined_at=timezone.now() - timedelta(days=10)
    )
    MembershipFactory(classroom=w["classroom"], status=Status.INVITED)
    rows = w["api"].get(f"{URL}{w['classroom'].pk}/members/").json()["results"]
    by_name = {row["firstName"]: row for row in rows if row["status"] == "active"}
    assert (by_name["Awa"]["progressPct"], by_name["Awa"]["isDropout"]) == (50, False)
    assert (by_name["Bio"]["progressPct"], by_name["Bio"]["isDropout"]) == (0, True)
    assert by_name["Bio"]["lastActivityAt"] is not None
    invited = [row for row in rows if row["status"] == "invited"][0]
    assert (invited["progressPct"], invited["lastActivityAt"], invited["isDropout"]) == (
        None,
        None,
        False,
    )


# --- Parcours encadré (WT10) ---------------------------------------------------------------------


def test_course_detail_counts_completions_and_pass_rates(world):
    w = world
    first = missions_of(w["course"])[0]
    MissionProgress.objects.create(enrollment=w["enrollment"], mission=first)
    attempt(w["enrollment"], w["level_quiz"], "ko")
    attempt(w["enrollment"], w["level_quiz"], "ok", 90)
    attempt(w["enrollment"], w["project_quiz"], "ok", 90)
    # Un élève d'un collègue ne compte pas
    stranger = MembershipFactory(
        classroom=ClassroomFactory(school=w["school"], course=w["course"])
    ).learner
    other = Enrollment.objects.create(learner=stranger, course=w["course"], source="free")
    MissionProgress.objects.create(enrollment=other, mission=first)

    body = w["api"].get(f"{URL}courses/{w['course'].slug}/").json()

    assert (body["formativePassRate"], body["summativePassRate"]) == (50, 100)
    project = body["projects"][0]
    assert project["passRate"] == 100
    level = project["levels"][0]
    assert (level["passRate"], level["missions"][0]["completedCount"]) == (50, 1)
    assert project["levels"][1]["passRate"] is None
    assert body["classrooms"][0]["averageProgress"] == 50


def test_mission_is_readable_only_in_a_supervised_course(world):
    w = world
    mission = missions_of(w["course"])[0]
    response = w["api"].get(f"{URL}courses/{w['course'].slug}/missions/{mission.pk}/")
    assert response.status_code == 200
    body = response.json()
    assert (body["title"], body["vimeoId"], body["level"]["title"]) == (
        mission.title,
        mission.vimeo_id,
        "Niveau 1.1",
    )
    assert body["project"]["title"] == "Projet 1"
    assert body["blocks"][0]["type"] == "text"
    other = build_course(projects=1, levels=1, missions=1)
    foreign = missions_of(other)[0]
    assert w["api"].get(f"{URL}courses/{other.slug}/missions/{foreign.pk}/").status_code == 404
    assert (
        w["api"].get(f"{URL}courses/{w['course'].slug}/missions/{foreign.pk}/").status_code == 404
    )
    assert (
        client_for(TeacherFactory())
        .get(f"{URL}courses/{w['course'].slug}/missions/{mission.pk}/")
        .status_code
        == 404
    )


def test_comment_string(world):
    note = TeacherComment.objects.create(
        teacher=world["teacher"], learner=world["awa"], classroom=world["classroom"], body="x"
    )
    assert str(note).startswith(f"Commentaire à {world['awa']}")
