import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

FRONT = "http://localhost:3000"


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(email="eleve@example.com", password="secret123")


@pytest.fixture
def client(settings):
    settings.CSRF_TRUSTED_ORIGINS = [FRONT]
    # Le client de test désactive le CSRF par défaut : on le veut actif ici
    return APIClient(enforce_csrf_checks=True, HTTP_ORIGIN=FRONT)


def csrf(client):
    resp = client.get("/api/public/user/csrf")
    assert resp.status_code == 200
    token = resp.json()["csrfToken"]
    assert client.cookies["csrftoken"].value
    return token


def login(client, token, password="secret123"):
    return client.post(
        "/api/public/user/session-login",
        {"email": "eleve@example.com", "password": password},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )


def test_login_without_csrf_token_is_refused(client, user):
    csrf(client)
    resp = client.post(
        "/api/public/user/session-login",
        {"email": "eleve@example.com", "password": "secret123"},
        format="json",
    )
    assert resp.status_code == 403


def test_login_with_bad_password(client, user):
    resp = login(client, csrf(client), password="wrong")
    assert resp.status_code == 400
    assert "sessionid" not in client.cookies


def test_session_login_then_authenticated_calls_then_logout(client, user):
    resp = login(client, csrf(client))
    assert resp.status_code == 200
    assert resp.json()["userId"] == user.id
    assert client.cookies["sessionid"]["httponly"]
    new_token = resp.json()["csrfToken"]

    # Lecture authentifiée par le seul cookie de session
    assert client.get("/api/user/my-profile").status_code == 200

    # Écriture : le jeton CSRF est obligatoire
    assert client.post("/api/user/session-logout").status_code == 403
    assert client.post("/api/user/session-logout", HTTP_X_CSRFTOKEN=new_token).status_code == 204

    assert client.get("/api/user/my-profile").status_code in (401, 403)


def test_untrusted_origin_is_refused(client, user):
    token = csrf(client)
    resp = client.post(
        "/api/public/user/session-login",
        {"email": "eleve@example.com", "password": "secret123"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
        HTTP_ORIGIN="https://evil.test",
    )
    assert resp.status_code == 403
