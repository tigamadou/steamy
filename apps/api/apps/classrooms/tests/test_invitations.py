"""
Activation des enseignants (C6, S5) : invitation envoyée depuis l'admin, jeton haché, expiré ou réutilisé refusé.
Le jeton voyage dans le corps des requêtes (`lookup/`, `accept/`) ; les anciennes routes restent pour la transition.
"""

import re
from datetime import timedelta

import pytest
from django.contrib.admin.sites import site
from django.contrib.messages.storage.fallback import FallbackStorage
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory

from apps.accounts.models import User
from apps.accounts.tests.factories import StaffFactory, TeacherFactory
from apps.classrooms.invitations import hash_token, send_invitation
from apps.classrooms.models import School, TeacherInvitation

pytestmark = pytest.mark.django_db

URL = "/api/auth/teacher-invitations/"
PASSWORD = "Tableau2026"


def link_token(address="nadia@ecole.bj"):
    message = [m for m in mail.outbox if m.to == [address]][-1]
    return re.search(r"/activation#jeton=([\w-]+)", message.body).group(1)


def accept(token, password=PASSWORD, client=None, **extra):
    return (client or APIClient()).post(
        f"{URL}accept/", {"token": token, "password": password, **extra}, format="json"
    )


def lookup(token):
    return APIClient().post(f"{URL}lookup/", {"token": token}, format="json")


@pytest.fixture(autouse=True)
def country():
    from apps.referentials.models import Country

    return Country.objects.get(code="BJ")


@pytest.fixture
def school_bj(country):
    return School.objects.create(name="Lycée de Porto-Novo", country=country, city="Porto-Novo")


# --- Admin : action « Envoyer » ---------------------------------------------------------------------


def admin_request(user):
    request = APIRequestFactory().post("/")
    request.user = user
    request.session = {}
    request._messages = FallbackStorage(request)
    return request


def test_admin_send_action_emails_a_hashed_link(school_bj):
    invitation = TeacherInvitation.objects.create(email="Nadia@Ecole.bj", school=school_bj)
    accepted = TeacherInvitation.objects.create(
        email="deja@ecole.bj", school=school_bj, accepted_at=timezone.now()
    )
    staff = StaffFactory(is_superuser=True)
    model_admin = site._registry[TeacherInvitation]
    request = admin_request(staff)
    model_admin.send(request, TeacherInvitation.objects.filter(pk__in=[invitation.pk, accepted.pk]))
    assert [m.to for m in mail.outbox] == [["nadia@ecole.bj"]]
    body = mail.outbox[0].body
    assert "Lycée de Porto-Novo" in body and "http://localhost:3000/activation#jeton=" in body
    token = link_token()
    invitation.refresh_from_db()
    assert invitation.token_hash == hash_token(token) and token not in invitation.token_hash
    assert invitation.invited_by == staff
    assert invitation.expires_at - invitation.sent_at == timedelta(days=7)
    assert [str(m) for m in request._messages] == [
        "1 invitation envoyée.",
        "1 invitation déjà acceptée, ignorée.",
    ]
    assert str(invitation) == "Invitation de nadia@ecole.bj"
    assert str(school_bj) == "Lycée de Porto-Novo"


def test_resending_invalidates_the_previous_link(school_bj):
    invitation = TeacherInvitation.objects.create(email="nadia@ecole.bj", school=school_bj)
    first = send_invitation(invitation)
    second = send_invitation(invitation)
    assert APIClient().get(f"{URL}{first}/").json()["code"] == "INVITATION_INVALID"
    assert APIClient().get(f"{URL}{second}/").status_code == 200


def test_invitation_without_school_or_first_name(country):
    invitation = TeacherInvitation.objects.create(email="x@ecole.bj")
    token = send_invitation(invitation)
    assert mail.outbox[0].body.startswith("Bonjour,\n\nL'équipe Steamy vous invite")
    assert APIClient().get(f"{URL}{token}/").json()["schoolName"] is None


# --- Lien d'activation ------------------------------------------------------------------------------


def test_invitation_preview(school_bj):
    invitation = TeacherInvitation.objects.create(
        email="nadia@ecole.bj", first_name="Nadia", last_name="Houngbo", school=school_bj
    )
    token = send_invitation(invitation)
    body = lookup(token).json()
    assert body == {
        "emailMasked": "n•••@ecole.bj",
        "firstName": "Nadia",
        "lastName": "Houngbo",
        "schoolName": "Lycée de Porto-Novo",
        "expiresAt": body["expiresAt"],
    }


def test_accept_creates_the_teacher_in_the_school_and_logs_in(school_bj):
    invitation = TeacherInvitation.objects.create(
        email="nadia@ecole.bj", first_name="Nadia", last_name="Houngbo", school=school_bj
    )
    token = send_invitation(invitation)
    client = APIClient()
    resp = accept(token, client=client)
    assert resp.status_code == 200, resp.json()
    user = resp.json()["user"]
    assert (user["role"], user["email"], user["firstName"]) == (
        "teacher",
        "nadia@ecole.bj",
        "Nadia",
    )
    teacher = User.objects.get(email="nadia@ecole.bj")
    assert teacher.check_password(PASSWORD) and teacher.teacher_profile.school == school_bj
    assert client.get("/api/accounts/me/").json()["role"] == "teacher"
    invitation.refresh_from_db()
    assert invitation.accepted_at and invitation.token_hash == ""


def test_reused_link_is_refused(school_bj):
    token = send_invitation(TeacherInvitation.objects.create(email="nadia@ecole.bj"))
    assert accept(token).status_code == 200
    for resp in (accept(token), lookup(token)):
        assert resp.status_code == 400
        assert resp.json()["code"] == "INVITATION_INVALID"
    assert User.objects.filter(role="teacher").count() == 1


def test_expired_link_is_refused(school_bj):
    token = send_invitation(TeacherInvitation.objects.create(email="nadia@ecole.bj"))
    TeacherInvitation.objects.update(expires_at=timezone.now())
    assert accept(token).json()["code"] == "INVITATION_INVALID"
    assert not User.objects.filter(email="nadia@ecole.bj").exists()


def test_unknown_or_unsent_link_is_refused():
    TeacherInvitation.objects.create(email="nadia@ecole.bj")  # jamais envoyée : aucun jeton
    assert lookup("inconnu").json()["code"] == "INVITATION_INVALID"
    assert lookup("").status_code == 400  # jeton obligatoire


def test_existing_email_is_refused(school_bj):
    TeacherFactory(email="nadia@ecole.bj")
    token = send_invitation(TeacherInvitation.objects.create(email="nadia@ecole.bj"))
    resp = accept(token)
    assert resp.status_code == 409
    assert resp.json()["code"] == "EMAIL_TAKEN"


def test_password_policy_applies(school_bj):
    token = send_invitation(TeacherInvitation.objects.create(email="nadia@ecole.bj"))
    resp = accept(token, password="court")
    assert resp.json()["fields"]["password"][0]["code"] == "PASSWORD_TOO_WEAK"


@pytest.mark.parametrize("role", ["learner", "parent", None])
def test_role_is_never_accepted(school_bj, role):
    token = send_invitation(TeacherInvitation.objects.create(email="nadia@ecole.bj"))
    resp = accept(token, role=role, isStaff=True, email="autre@x.bj")
    teacher = User.objects.get(email="nadia@ecole.bj")
    assert resp.json()["user"]["role"] == "teacher"
    assert (teacher.role, teacher.is_staff) == ("teacher", False)


def test_accept_requires_csrf(settings, school_bj):
    settings.CSRF_TRUSTED_ORIGINS = ["http://localhost:3000"]
    token = send_invitation(TeacherInvitation.objects.create(email="nadia@ecole.bj"))
    client = APIClient(enforce_csrf_checks=True, HTTP_ORIGIN="http://localhost:3000")
    assert accept(token, client=client).status_code == 403


# --- Transition : anciennes routes (jeton dans le chemin), dépréciées ----------------------------------------------


def test_the_former_routes_still_work_during_the_deployment(school_bj):
    invitation = TeacherInvitation.objects.create(email="nadia@ecole.bj", school=school_bj)
    token = send_invitation(invitation)
    assert APIClient().get(f"{URL}{token}/").json()["schoolName"] == "Lycée de Porto-Novo"
    resp = APIClient().post(f"{URL}{token}/accept/", {"password": PASSWORD}, format="json")
    assert resp.status_code == 200 and resp.json()["user"]["role"] == "teacher"
    assert APIClient().get(f"{URL}{token}/").json()["code"] == "INVITATION_INVALID"


def test_tokens_in_former_paths_are_masked_in_access_logs():
    from libs.access_log import mask_secrets

    line = '"GET /api/auth/teacher-invitations/s3cr3t-T0k/ HTTP/1.1" "POST /api/auth/teacher-invitations/abc/accept/"'
    assert mask_secrets(line) == (
        '"GET /api/auth/teacher-invitations/•••/ HTTP/1.1" "POST /api/auth/teacher-invitations/•••/accept/"'
    )
    for path in ("/api/auth/teacher-invitations/lookup/", "/api/auth/teacher-invitations/accept/"):
        assert mask_secrets(path) == path
