"""`accounts/me/` et ses actions : mot de passe, email (§7.3)."""

import pytest
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from apps.accounts.tests.factories import (
    PASSWORD,
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)

pytestmark = pytest.mark.django_db

ME = "/api/accounts/me/"
PASSWORD_URL = "/api/accounts/me/password/"
EMAIL_URL = "/api/accounts/me/email/"
NEW_PASSWORD = "Nouveau2026"


def client_for(user):
    client = APIClient()
    client.force_login(user)
    return client


@pytest.mark.parametrize("url", [ME, PASSWORD_URL, EMAIL_URL])
def test_anonymous_is_refused(url):
    resp = APIClient().get(url) if url == ME else APIClient().post(url, {}, format="json")
    assert resp.status_code == 401
    assert resp.json()["code"] == "NOT_AUTHENTICATED"


def test_me_returns_the_learner_identity_without_secrets():
    learner = LearnerFactory(username="lea", first_name="Léa", last_name="Adjovi")
    body = client_for(learner).get(ME).json()
    assert body["id"] == learner.id
    assert (body["role"], body["status"], body["username"]) == ("learner", "active", "lea")
    assert (body["firstName"], body["lastName"]) == ("Léa", "Adjovi")
    assert body["profileStep"] == "learner-info"  # date de naissance pas encore saisie (W11)
    assert (body["isStaff"], body["otpVerified"], body["staffGroups"]) == (False, False, [])
    assert "password" not in body


def test_me_exposes_staff_fields():
    staff = StaffFactory()
    staff.groups.add(Group.objects.create(name="Support"), Group.objects.create(name="Contenu"))
    client = APIClient()
    client.force_authenticate(staff)
    body = client.get(ME).json()
    assert body["role"] is None and body["isStaff"] is True
    assert body["staffGroups"] == ["Contenu", "Support"]
    assert body["otpVerified"] is False
    assert body["profileStep"] is None


def test_me_is_read_only():
    client = client_for(LearnerFactory())
    assert client.patch(ME, {"role": "teacher"}, format="json").status_code == 405


# --- Mot de passe -----------------------------------------------------------------------------


def test_password_change_keeps_the_session_and_replaces_the_password():
    learner = LearnerFactory(username="lea")
    client = client_for(learner)
    resp = client.post(
        PASSWORD_URL, {"currentPassword": PASSWORD, "newPassword": NEW_PASSWORD}, format="json"
    )
    assert resp.status_code == 204
    assert client.get(ME).status_code == 200  # session toujours valide
    learner.refresh_from_db()
    assert learner.check_password(NEW_PASSWORD)


def test_password_change_with_wrong_current_password_is_refused():
    client = client_for(LearnerFactory())
    resp = client.post(
        PASSWORD_URL, {"currentPassword": "mauvais", "newPassword": NEW_PASSWORD}, format="json"
    )
    assert resp.status_code == 400
    assert resp.json()["fields"]["currentPassword"] == [
        {"code": "INVALID_CREDENTIALS", "message": "Mot de passe actuel incorrect."}
    ]


def test_password_change_to_the_same_password_is_refused():
    client = client_for(LearnerFactory())
    resp = client.post(
        PASSWORD_URL, {"currentPassword": PASSWORD, "newPassword": PASSWORD}, format="json"
    )
    assert resp.status_code == 400 and "newPassword" in resp.json()["fields"]


# --- Email ------------------------------------------------------------------------------------


def test_teacher_changes_the_login_email():
    teacher = TeacherFactory(email="ancien@ecole.bj")
    resp = client_for(teacher).post(
        EMAIL_URL, {"password": PASSWORD, "email": "Nouveau@Ecole.BJ"}, format="json"
    )
    assert resp.status_code == 204
    teacher.refresh_from_db()
    assert teacher.email == "nouveau@ecole.bj"


def test_teacher_cannot_take_an_email_already_used():
    TeacherFactory(email="pris@ecole.bj")
    resp = client_for(TeacherFactory()).post(
        EMAIL_URL, {"password": PASSWORD, "email": "PRIS@ecole.bj"}, format="json"
    )
    assert resp.status_code == 400
    assert resp.json()["fields"]["email"] == [
        {"code": "EMAIL_TAKEN", "message": "Cette adresse email est déjà utilisée."}
    ]


def test_parent_email_is_a_contact_address_not_a_login():
    parent = ParentFactory()
    resp = client_for(parent).post(
        EMAIL_URL, {"password": PASSWORD, "email": "parent@example.com"}, format="json"
    )
    assert resp.status_code == 204
    parent.refresh_from_db()
    assert parent.email is None
    assert parent.parent_profile.email == "parent@example.com"


def test_email_change_requires_the_password():
    resp = client_for(TeacherFactory()).post(
        EMAIL_URL, {"password": "mauvais", "email": "x@ecole.bj"}, format="json"
    )
    assert resp.status_code == 400 and "password" in resp.json()["fields"]


@pytest.mark.parametrize("factory", [LearnerFactory, StaffFactory])
def test_learner_and_staff_cannot_change_email_here(factory):
    client = APIClient()
    client.force_authenticate(factory())
    resp = client.post(EMAIL_URL, {"password": PASSWORD, "email": "x@ecole.bj"}, format="json")
    assert resp.status_code == 403
    assert resp.json()["code"] == "PERMISSION_DENIED"


def test_password_change_applies_the_password_policy():
    client = client_for(LearnerFactory())
    resp = client.post(
        PASSWORD_URL, {"currentPassword": PASSWORD, "newPassword": "abc"}, format="json"
    )
    assert resp.status_code == 400 and "newPassword" in resp.json()["fields"]


def test_profile_step_of_a_parent_without_profile_and_of_a_teacher():
    assert client_for(ParentFactory(parent_profile=None)).get(ME).json()["profileStep"] == (
        "parent-location"
    )
    assert client_for(TeacherFactory()).get(ME).json()["profileStep"] is None
