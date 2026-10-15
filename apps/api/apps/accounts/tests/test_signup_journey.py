"""
Parcours complet d'une famille (deux enfants, un parent) depuis une même adresse IP (box familiale, salle de classe) : inscription de
l'enfant → demande → inscription du parent → accord → mot de passe de l'enfant → profil. Throttles réels.
"""

import re

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

FRONT = "http://localhost:3000"
PHONE = "+2290197445566"


def client():
    return APIClient(enforce_csrf_checks=True, HTTP_ORIGIN=FRONT, REMOTE_ADDR="10.1.1.1")


def csrf(c):
    return c.get("/api/auth/csrf/").json()["csrfToken"]


def test_a_family_completes_both_signups_from_the_same_ip(sms, settings):
    settings.CSRF_TRUSTED_ORIGINS = [FRONT]
    child, parent = client(), client()
    ct, pt = csrf(child), csrf(parent)

    payload = {"firstName": "Ayo", "lastName": "Test", "username": "ayo", "age": 12}
    resp = child.post(
        "/api/auth/learner-signup/",
        {**payload, "privacyAccepted": True},
        format="json",
        HTTP_X_CSRFTOKEN=ct,
    )
    assert resp.status_code == 201
    resp = child.post(
        "/api/accounts/consent-requests/",
        {"parentPhone": PHONE, "relationship": "mere"},
        format="json",
        HTTP_X_CSRFTOKEN=ct,
    )
    assert resp.status_code == 201
    token = re.search(r"/consentement/(\S+)$", sms.last(PHONE)).group(1)

    # Sa sœur s'inscrit aussi, sur la même connexion
    sister = client()
    st = csrf(sister)
    sister.post(
        "/api/auth/learner-signup/",
        {**payload, "firstName": "Ama", "username": "ama", "privacyAccepted": True},
        format="json",
        HTTP_X_CSRFTOKEN=st,
    )
    resp = sister.post(
        "/api/accounts/consent-requests/",
        {"parentPhone": PHONE, "relationship": "mere"},
        format="json",
        HTTP_X_CSRFTOKEN=st,
    )
    assert resp.status_code == 201

    resp = parent.post(
        "/api/auth/parent-signup/",
        {"firstName": "Mama", "lastName": "Test", "phone": PHONE, "privacyAccepted": True},
        format="json",
        HTTP_X_CSRFTOKEN=pt,
    )
    challenge_id = resp.json()["challengeId"]
    resp = parent.post(
        "/api/auth/parent-signup/verify/",
        {"challengeId": challenge_id, "code": sms.last_code(PHONE)},
        format="json",
        HTTP_X_CSRFTOKEN=pt,
    )
    assert resp.json() == {"existingAccount": False}
    resp = parent.post(
        "/api/auth/parent-signup/password/",
        {"password": "Parent2026"},
        format="json",
        HTTP_X_CSRFTOKEN=pt,
    )
    assert resp.status_code == 200
    pt = resp.json()["csrfToken"]
    resp = parent.post(
        "/api/accounts/consent-requests/claim/",
        {"token": token},
        format="json",
        HTTP_X_CSRFTOKEN=pt,
    )
    consent_id = resp.json()["id"]
    resp = parent.post(f"/api/accounts/consent-requests/{consent_id}/accept/", HTTP_X_CSRFTOKEN=pt)
    assert resp.json()["status"] == "accepted"

    resp = child.post(
        "/api/auth/learner-signup/password/",
        {"password": "Robots2026"},
        format="json",
        HTTP_X_CSRFTOKEN=ct,
    )
    assert resp.status_code == 200, resp.json()
    assert resp.json()["user"]["profileStep"] == "learner-info"
    assert parent.get("/api/accounts/me/").json()["role"] == "parent"
