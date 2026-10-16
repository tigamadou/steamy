"""
Enfants du parent (WPD02-WPD04, WPD10, D26, D51) et parent de l'apprenant (WD22). Priorité : le parent A ne lit ni
ne modifie l'enfant de B, sur toutes les routes (404).
"""

from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import ConsentRequest, ParentChildLink, User
from apps.accounts.tests.factories import (
    PASSWORD,
    LearnerFactory,
    ParentFactory,
    TeacherFactory,
)
from apps.core.models import AuditLog
from apps.referentials.models import Disability, Locality, Relationship, SchoolGrade

pytestmark = pytest.mark.django_db

URL = "/api/accounts/children/"


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def years_ago(years: int) -> date:
    """Date de naissance d'un enfant qui fête ses `years` ans aujourd'hui."""
    today = date.today()
    return today.replace(year=today.year - years, day=min(today.day, 28))


def link(parent, learner=None, relationship="mere"):
    learner = learner or LearnerFactory()
    ParentChildLink.objects.create(
        parent=parent, learner=learner, relationship=Relationship.objects.get(code=relationship)
    )
    return learner


def child_payload(**overrides):
    return {
        "firstName": "Léa",
        "lastName": "Dossou",
        "birthDate": years_ago(12).isoformat(),
        "relationship": "mere",
        "username": "lea.d",
        "password": "Robot2026",
        **overrides,
    }


@pytest.fixture
def parent():
    return ParentFactory()


# --- Liste et détail ----------------------------------------------------------------------------


def test_list_shows_only_my_children_without_sensitive_data(parent):
    mine = link(parent, LearnerFactory(first_name="Zoé"))
    profile = mine.learner_profile
    profile.birth_date = years_ago(13)
    profile.disability = Disability.objects.first()
    profile.save()
    link(parent, LearnerFactory(first_name="Ali", status=User.Status.ANONYMIZED))
    link(ParentFactory())  # enfant d'un autre parent
    resp = as_user(parent).get(URL)
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 1
    row = body["results"][0]
    assert row["id"] == mine.pk
    assert row["age"] == 13
    assert row["relationship"]["code"] == "mere"
    assert row["profileStep"] == "learner-info"
    assert not {"gender", "disability", "locality", "birthDate"} & row.keys()


def test_age_falls_back_to_the_declared_age(parent):
    child = link(parent)
    child.learner_profile.declared_age = 11
    child.learner_profile.save()
    assert as_user(parent).get(f"{URL}{child.pk}/").json()["age"] == 11


def test_detail_includes_the_profile(parent):
    child = link(parent)
    profile = child.learner_profile
    profile.birth_date = years_ago(14)
    profile.locality = Locality.objects.first()
    profile.public_display_allowed = True
    profile.save()
    body = as_user(parent).get(f"{URL}{child.pk}/").json()
    assert body["username"] == child.username
    assert body["birthDate"] == profile.birth_date.isoformat()
    assert body["locality"]["id"] == profile.locality_id
    assert body["publicDisplayAllowed"] is True
    assert body["goals"] == []


def test_only_a_parent_reaches_the_children():
    assert APIClient().get(URL).status_code == 401
    for user in (LearnerFactory(), TeacherFactory()):
        assert as_user(user).get(URL).status_code == 403


def test_another_parents_child_is_not_found_on_every_route(parent):
    other = link(ParentFactory())
    client = as_user(parent)
    base = f"{URL}{other.pk}/"
    assert client.get(base).status_code == 404
    assert client.patch(base, {"firstName": "Pirate"}, format="json").status_code == 404
    reset = client.post(f"{base}password-reset/", {"password": "Pirate2026"}, format="json")
    assert reset.status_code == 404
    other.refresh_from_db()
    assert other.first_name != "Pirate"
    assert other.check_password(PASSWORD)


def test_delete_is_not_offered(parent):
    child = link(parent)
    assert as_user(parent).delete(f"{URL}{child.pk}/").status_code == 405


# --- WPD04 · Création ---------------------------------------------------------------------------


def test_parent_creates_a_child_who_can_log_in(parent):
    resp = as_user(parent).post(URL, child_payload(), format="json")
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert body["username"] == "lea.d"
    assert body["age"] == 12
    assert body["status"] == "active"
    assert body["profileStep"] == "learner-info"
    child = User.objects.get(username="lea.d")
    assert child.role == User.Role.LEARNER
    assert child.learner_profile.declared_age == 12
    consent = ConsentRequest.objects.get(learner=child)
    assert consent.origin == ConsentRequest.Origin.PARENT
    assert consent.status == ConsentRequest.Status.ACCEPTED
    assert consent.parent == parent and consent.parent_phone == parent.phone
    assert consent.subject["relationship"] == "mere"
    assert child.parent_link.parent == parent
    assert child.parent_link.consent_request == consent
    assert AuditLog.objects.filter(action="child.created", target_id=str(child.pk)).exists()
    login = APIClient().post(
        "/api/auth/login/", {"identifier": "lea.d", "password": "Robot2026"}, format="json"
    )
    assert login.status_code == 200, login.json()


@pytest.mark.parametrize(
    ("overrides", "field", "code"),
    [
        ({"birthDate": years_ago(9).isoformat()}, "birthDate", "AGE_OUT_OF_RANGE"),
        ({"birthDate": years_ago(18).isoformat()}, "birthDate", "AGE_OUT_OF_RANGE"),
        ({"password": "court"}, "password", "PASSWORD_TOO_WEAK"),
        ({"username": "12345"}, "username", "USERNAME_INVALID"),
        ({"username": "a@b"}, "username", "USERNAME_INVALID"),
        ({"relationship": "inconnu"}, "relationship", "DOES_NOT_EXIST"),
    ],
)
def test_creation_errors_are_attached_to_the_field(parent, overrides, field, code):
    resp = as_user(parent).post(URL, child_payload(**overrides), format="json")
    assert resp.status_code == 400
    assert resp.json()["fields"][field][0]["code"] == code
    assert not User.objects.filter(role=User.Role.LEARNER).exists()


def test_username_taken_case_insensitive(parent):
    LearnerFactory(username="Lea.D")
    resp = as_user(parent).post(URL, child_payload(), format="json")
    assert resp.status_code == 400
    assert resp.json()["fields"]["username"][0]["code"] == "USERNAME_TAKEN"


def test_username_taken_between_check_and_write(parent, monkeypatch):
    LearnerFactory(username="lea.d")
    monkeypatch.setattr("apps.accounts.signup.username_available", lambda _username: True)
    resp = as_user(parent).post(URL, child_payload(), format="json")
    assert resp.status_code == 409
    assert resp.json()["code"] == "USERNAME_TAKEN"
    assert resp.json()["fields"]["username"][0]["code"] == "USERNAME_TAKEN"
    assert not ConsentRequest.objects.exists()


# --- WPD10 · Modification -----------------------------------------------------------------------


def test_parent_updates_the_profile(parent):
    child = link(parent)
    profile = child.learner_profile
    profile.birth_date = years_ago(12)
    profile.declared_age = 12
    profile.save()
    payload = {
        "firstName": "Léana",
        "schoolGrade": SchoolGrade.objects.first().code,
        "locality": Locality.objects.first().pk,
        "gender": "female",
        "disability": Disability.objects.first().code,
        "publicDisplayAllowed": True,
    }
    resp = as_user(parent).patch(f"{URL}{child.pk}/", payload, format="json")
    assert resp.status_code == 200, resp.json()
    body = resp.json()
    assert body["firstName"] == "Léana"
    assert body["gender"] == "female"
    assert body["publicDisplayAllowed"] is True
    child.refresh_from_db()
    assert child.first_name == "Léana"
    assert child.learner_profile.school_grade == SchoolGrade.objects.first()


def test_username_and_password_are_not_changed_by_patch(parent):
    child = link(parent)
    resp = as_user(parent).patch(
        f"{URL}{child.pk}/", {"username": "nouveau", "password": "Autre2026"}, format="json"
    )
    assert resp.status_code == 200
    child.refresh_from_db()
    assert child.username != "nouveau"
    assert child.check_password(PASSWORD)


def test_birth_date_must_match_the_declared_age(parent):
    child = link(parent)
    profile = child.learner_profile
    profile.declared_age = 12
    profile.save()
    client = as_user(parent)
    resp = client.patch(
        f"{URL}{child.pk}/", {"birthDate": years_ago(15).isoformat()}, format="json"
    )
    assert resp.json()["fields"]["birthDate"][0]["code"] == "BIRTHDATE_AGE_MISMATCH"
    resp = client.patch(f"{URL}{child.pk}/", {"birthDate": years_ago(8).isoformat()}, format="json")
    assert resp.json()["fields"]["birthDate"][0]["code"] == "AGE_OUT_OF_RANGE"
    resp = client.patch(
        f"{URL}{child.pk}/", {"birthDate": years_ago(12).isoformat()}, format="json"
    )
    assert resp.status_code == 200
    assert resp.json()["birthDate"] == years_ago(12).isoformat()


# --- WPD03 · Réinitialisation du mot de passe (D26) ---------------------------------------------


def test_password_reset_replaces_the_old_password(parent):
    child = link(parent)
    resp = as_user(parent).post(
        f"{URL}{child.pk}/password-reset/", {"password": "Nouveau2026"}, format="json"
    )
    assert resp.status_code == 204

    def login(password):
        return APIClient().post(
            "/api/auth/login/", {"identifier": child.username, "password": password}, format="json"
        )

    assert login(PASSWORD).status_code == 400
    assert login("Nouveau2026").status_code == 200
    assert AuditLog.objects.filter(action="child.password_reset", actor=parent).exists()


def test_password_reset_follows_the_policy(parent):
    child = link(parent)
    resp = as_user(parent).post(
        f"{URL}{child.pk}/password-reset/", {"password": "abcdefgh"}, format="json"
    )
    assert resp.status_code == 400
    assert resp.json()["fields"]["password"][0]["code"] == "PASSWORD_TOO_WEAK"


# --- WD22 · Mon parent --------------------------------------------------------------------------


def test_learner_sees_their_parent_without_contact_details():
    parent = ParentFactory(first_name="Marie", last_name="Dossou")
    child = link(parent, relationship="mere")
    resp = as_user(child).get("/api/accounts/me/parent/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["firstName"] == "Marie"
    assert body["relationship"]["code"] == "mere"
    assert set(body) == {"firstName", "lastName", "relationship", "linkedAt"}


def test_my_parent_is_reserved_to_a_linked_learner(parent):
    assert as_user(LearnerFactory()).get("/api/accounts/me/parent/").status_code == 404
    assert as_user(parent).get("/api/accounts/me/parent/").status_code == 403


# --- WPD01, WPD03 · Progression ----------------------------------------------------------------


def test_parent_sees_the_progress_of_their_child(parent):
    from apps.learning.models import Enrollment, MissionProgress
    from apps.learning.tests.factories import EnrollmentFactory, build_course, missions_of

    child = link(parent)
    started = EnrollmentFactory(learner=child, course=build_course(projects=1, levels=1))
    MissionProgress.objects.create(enrollment=started, mission=missions_of(started.course)[0])
    EnrollmentFactory(
        learner=child,
        course=build_course(projects=1, levels=1, missions=1),
        status=Enrollment.Status.COMPLETED,
    )
    EnrollmentFactory(course=build_course(projects=1, levels=1))  # autre apprenant
    client = as_user(parent)
    assert client.get(URL).json()["results"][0]["activeCourses"] == 1
    courses = client.get(f"{URL}{child.pk}/").json()["courses"]
    assert len(courses) == 2
    first = next(c for c in courses if c["id"] == started.pk)
    assert first["course"]["slug"] == started.course.slug
    assert (first["missionsDone"], first["missionCount"]) == (1, 2)


def test_parent_sees_the_recent_attempts_and_badges_of_their_child(parent):
    from apps.catalog.models import Quiz
    from apps.learning.models import QuizAttempt
    from apps.learning.tests.factories import EnrollmentFactory, build_course

    child = link(parent)
    enrollment = EnrollmentFactory(learner=child, course=build_course(quizzes=True))
    quiz = Quiz.objects.filter(level__project__course=enrollment.course).first()
    for percentage in (40, 60, 75, 80, 90, 100):
        QuizAttempt.objects.create(
            learner=child,
            enrollment=enrollment,
            quiz=quiz,
            score=percentage,
            total=100,
            percentage=percentage,
            threshold=70,
            status="ok" if percentage >= 70 else "ko",
            passed=percentage >= 70,
        )
    other = EnrollmentFactory(course=enrollment.course)
    QuizAttempt.objects.create(
        learner=other.learner,
        enrollment=other,
        quiz=quiz,
        score=0,
        total=100,
        percentage=0,
        threshold=70,
        status="ko",
    )
    body = as_user(parent).get(f"{URL}{child.pk}/").json()
    assert [a["percentage"] for a in body["recentAttempts"]] == [100, 90, 80, 75, 60]
    assert body["recentAttempts"][0]["status"] == "ok"
    assert body["badges"] == 0
