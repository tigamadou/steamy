"""Session Django + CSRF (S12, ADR 0001) sur les chemins hérités, renommés en API-1.2."""

import pytest
from django.conf import settings
from rest_framework.test import APIClient

from apps.accounts.tests.factories import PASSWORD, LearnerFactory, StaffFactory

FRONT = "http://localhost:3000"
CSRF_URL = "/api/public/user/csrf"
LOGIN_URL = "/api/public/user/session-login"
LOGOUT_URL = "/api/user/session-logout"
ME_URL = "/api/user/my-profile"

pytestmark = pytest.mark.django_db


@pytest.fixture
def user(db):
    return LearnerFactory(username="lea")


@pytest.fixture
def client(settings):
    settings.CSRF_TRUSTED_ORIGINS = [FRONT]
    # Le client de test désactive le CSRF par défaut : on le veut actif ici
    return APIClient(enforce_csrf_checks=True, HTTP_ORIGIN=FRONT)


def csrf(client):
    resp = client.get(CSRF_URL)
    assert resp.status_code == 200
    assert client.cookies["csrftoken"].value
    return resp.json()["csrfToken"]


def login(client, token, identifier="lea", password=PASSWORD):
    return client.post(
        LOGIN_URL,
        {"identifier": identifier, "password": password},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )


def test_sessions_are_stored_in_database_with_cache():
    assert settings.SESSION_ENGINE == "django.contrib.sessions.backends.cached_db"


def test_login_without_csrf_token_is_refused(client, user):
    csrf(client)
    resp = client.post(LOGIN_URL, {"identifier": "lea", "password": PASSWORD}, format="json")
    assert resp.status_code == 403
    assert "sessionid" not in client.cookies


def test_login_with_bad_password(client, user):
    resp = login(client, csrf(client), password="mauvais")
    assert resp.status_code == 400
    assert resp.json()["code"] == "INVALID_CREDENTIALS"
    assert "sessionid" not in client.cookies


def test_pending_learner_cannot_log_in(client):
    LearnerFactory(username="attente", status="pending")
    resp = login(client, csrf(client), identifier="attente")
    assert resp.status_code == 403
    assert resp.json()["code"] == "ACCOUNT_PENDING_CONSENT"
    assert "sessionid" not in client.cookies


def test_staff_cannot_log_in_through_the_api(client):
    StaffFactory(email="admin@steamy.test")
    resp = login(client, csrf(client), identifier="admin@steamy.test")
    assert resp.status_code == 400
    assert resp.json()["code"] == "INVALID_CREDENTIALS"


def test_session_key_rotates_on_login(client, user):
    token = csrf(client)
    client.cookies["sessionid"] = "cle-fixee-par-un-attaquant"
    resp = login(client, token)
    assert resp.status_code == 200
    assert client.cookies["sessionid"].value != "cle-fixee-par-un-attaquant"


def test_session_login_then_authenticated_calls_then_logout(client, user):
    resp = login(client, csrf(client))
    assert resp.status_code == 200
    assert resp.json()["userId"] == user.id
    assert client.cookies["sessionid"]["httponly"]
    new_token = resp.json()["csrfToken"]

    me = client.get(ME_URL)
    assert me.status_code == 200
    assert me.json()["username"] == "lea" and me.json()["role"] == "learner"

    # Écriture : le jeton CSRF est obligatoire
    assert client.post(LOGOUT_URL).status_code == 403
    assert client.post(LOGOUT_URL, HTTP_X_CSRFTOKEN=new_token).status_code == 204

    assert client.get(ME_URL).status_code in (401, 403)


def test_suspending_an_account_ends_its_session(client, user):
    login(client, csrf(client))
    user.status = "suspended"
    user.save()
    assert client.get(ME_URL).status_code in (401, 403)


def test_untrusted_origin_is_refused(client, user):
    token = csrf(client)
    resp = client.post(
        LOGIN_URL,
        {"identifier": "lea", "password": PASSWORD},
        format="json",
        HTTP_X_CSRFTOKEN=token,
        HTTP_ORIGIN="https://evil.test",
    )
    assert resp.status_code == 403
