"""Enrôlement TOTP à la première connexion (WAD15, D72) et durée de vie de la session du personnel (C20)."""

import time

import pytest
from django.contrib.messages import get_messages
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.tests.factories import PASSWORD, LearnerFactory
from apps.core.models import AuditLog
from apps.core.staff_auth import ENROLLMENT_MAX_AGE, ENROLLMENT_SESSION_KEY
from apps.core.tests.staff import code, login, staff_member

pytestmark = pytest.mark.django_db

ENROLLMENT_URL = "/admin/totp/configuration/"


@pytest.fixture
def newcomer(client):
    """Membre invité, mot de passe saisi, sans appareil confirmé : en cours d'enrôlement."""
    staff = staff_member(device=False)
    login(client, staff, otp_token="", next="http://localhost:3000/backoffice")
    return staff


def pending_device(staff):
    return TOTPDevice.objects.get(user=staff, confirmed=False)


def test_the_qr_code_is_shown_with_a_new_secret_at_each_display(client, newcomer):
    response = client.get(ENROLLMENT_URL)
    html = response.content.decode()
    assert response.status_code == 200
    assert "Configurer la double authentification" in html and "<svg" in html
    first = pending_device(newcomer)
    assert first.name == "Application d'authentification"
    client.get(ENROLLMENT_URL)
    second = pending_device(newcomer)  # un seul appareil en attente, avec un nouveau secret
    assert second.key != first.key


def test_the_first_valid_code_confirms_the_device_and_opens_a_verified_session(client, newcomer):
    client.get(ENROLLMENT_URL)
    device = pending_device(newcomer)
    response = client.post(ENROLLMENT_URL, {"otp_token": code(device.key)})
    assert response.status_code == 302 and response.url == "http://localhost:3000/backoffice"
    device.refresh_from_db()
    assert device.confirmed
    assert ENROLLMENT_SESSION_KEY not in client.session
    assert client.get("/admin/").status_code == 200
    assert client.session.get_expiry_age() == 8 * 60 * 60
    assert list(AuditLog.objects.order_by("id").values_list("action", flat=True)) == [
        "staff.totp_enrollment_started",
        "staff.totp_enrolled",
        "staff.login",
    ]


def test_without_next_the_member_lands_on_the_index(client):
    staff = staff_member(device=False)
    login(client, staff, otp_token="")
    client.get(ENROLLMENT_URL)
    response = client.post(ENROLLMENT_URL, {"otp_token": code(pending_device(staff).key)})
    assert response.url == "/admin/"


@pytest.mark.parametrize("token", ["", "abc"])
def test_a_wrong_or_missing_code_keeps_the_device_unconfirmed(client, newcomer, token):
    client.get(ENROLLMENT_URL)
    device = pending_device(newcomer)
    wrong = token or ""
    if token == "abc":
        wrong = "000000" if code(device.key) != "000000" else "111111"
    response = client.post(ENROLLMENT_URL, {"otp_token": wrong})
    assert response.status_code == 200
    assert "Le code n'a pas été accepté." in response.content.decode()
    assert not pending_device(newcomer).confirmed
    assert "_auth_user_id" not in client.session
    assert (
        AuditLog.objects.filter(action="staff.otp_failed", data__reason="enrollment").count() == 1
    )


def test_posting_before_any_display_creates_the_secret_first(client, newcomer):
    response = client.post(ENROLLMENT_URL, {"otp_token": "123456"})
    assert response.status_code == 302 and response.url == ENROLLMENT_URL


def test_without_a_pending_enrollment_the_member_goes_back_to_the_login(client):
    response = client.get(ENROLLMENT_URL)
    assert response.status_code == 302 and response.url == "/admin/login/"
    assert [str(m) for m in get_messages(response.wsgi_request)] == [
        "Session de configuration expirée : reconnectez-vous."
    ]


def test_an_expired_enrollment_is_refused(client, newcomer):
    session = client.session
    session[ENROLLMENT_SESSION_KEY]["started"] = time.time() - ENROLLMENT_MAX_AGE - 1
    session.save()
    assert client.get(ENROLLMENT_URL).url == "/admin/login/"
    assert ENROLLMENT_SESSION_KEY not in client.session


def test_an_already_enrolled_member_cannot_enroll_again(client, newcomer):
    TOTPDevice.objects.create(user=newcomer, name="Autre", confirmed=True)
    assert client.get(ENROLLMENT_URL).url == "/admin/login/"


# --- Session du personnel (C20) -------------------------------------------------------------------------------------


def test_a_persona_session_keeps_the_default_duration(client, settings):
    LearnerFactory(username="lea")
    client.get("/api/auth/csrf/")
    client.post(
        "/api/auth/login/",
        {"identifier": "lea", "password": PASSWORD},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
    )
    assert client.session.get_expiry_age() == settings.SESSION_COOKIE_AGE


def test_resetting_the_totp_closes_the_staff_sessions(client):
    staff = staff_member()
    login(client, staff)
    assert client.get("/api/accounts/me/").status_code == 200
    TOTPDevice.objects.filter(user=staff).delete()  # « Réinitialiser le TOTP » (Super-admin)
    assert client.get("/api/accounts/me/").status_code == 401
    assert client.get("/admin/").status_code == 302


def test_deactivating_a_staff_member_closes_the_sessions(client):
    staff = staff_member()
    login(client, staff)
    staff.status = "deactivated"
    staff.save()
    assert client.get("/api/accounts/me/").status_code == 401


def test_a_password_change_keeps_working_for_personas(client):
    """L'empreinte de session des personas reste celle de Django (sessions existantes conservées)."""
    learner = LearnerFactory()
    hash_before = learner.get_session_auth_hash()
    learner.first_name = "Autre"
    assert learner.get_session_auth_hash() == hash_before
    learner.set_password("Nouveau2026")
    assert learner.get_session_auth_hash() != hash_before
