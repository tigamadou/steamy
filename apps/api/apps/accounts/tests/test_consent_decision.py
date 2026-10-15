"""
Décision du parent (WP04-WP06, WP11-WP12, §4.2) : D20 (ce que voit le parent), D22 (refus), C9 (30 jours),
jeton du lien SMS à usage unique, un parent ne voit que les demandes adressées à son numéro.
"""

import re
from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.models import ConsentRequest, ParentChildLink, User
from apps.accounts.tasks import purge_refused_requests
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.core.models import AuditLog

pytestmark = pytest.mark.django_db

URL = "/api/accounts/consent-requests/"
PARENT_PHONE = "+2290197123456"


def child_asks(sms, username="kofi.m", first_name="Kofi", phone="0197123456"):
    """Un enfant s'inscrit et envoie la demande ; renvoie (client de l'enfant, demande, jeton du SMS)."""
    client = APIClient()
    payload = {
        "firstName": first_name,
        "lastName": "Mensah",
        "username": username,
        "age": 13,
        "privacyAccepted": True,
    }
    assert client.post("/api/auth/learner-signup/", payload, format="json").status_code == 201
    resp = client.post(URL, {"parentPhone": phone, "relationship": "pere"}, format="json")
    assert resp.status_code == 201, resp.json()
    token = re.search(
        r"/consentement/(\S+)$",
        sms.last(ConsentRequest.objects.get(pk=resp.json()["id"]).parent_phone),
    ).group(1)
    return client, ConsentRequest.objects.get(pk=resp.json()["id"]), token


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def parent():
    return ParentFactory(phone=PARENT_PHONE)


# --- Lien SMS : aperçu public (WP01) ------------------------------------------------------------


def test_preview_shows_only_the_masked_number(sms):
    _, _, token = child_asks(sms)
    resp = APIClient().post(f"{URL}preview/", {"token": token}, format="json")
    assert resp.status_code == 200
    assert resp.json() == {"parentPhoneMasked": "+229 •• 56"}


def test_preview_of_an_unknown_or_expired_link(sms):
    assert (
        APIClient().post(f"{URL}preview/", {"token": "inconnu"}, format="json").status_code == 404
    )
    _, consent, token = child_asks(sms)
    ConsentRequest.objects.update(expires_at=timezone.now())
    resp = APIClient().post(f"{URL}preview/", {"token": token}, format="json")
    assert resp.json()["code"] == "CONSENT_REQUEST_EXPIRED"


def test_preview_is_throttled(sms, monkeypatch):
    rates = {**SimpleRateThrottle.THROTTLE_RATES, "consent-preview": "2/min"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)
    codes = [
        APIClient().post(f"{URL}preview/", {"token": "x"}, format="json").status_code
        for _ in range(3)
    ]
    assert codes == [404, 404, 429]


# --- Réclamation par le parent connecté --------------------------------------------------------


def test_claim_requires_a_logged_in_parent(sms, parent):
    _, _, token = child_asks(sms)
    assert APIClient().post(f"{URL}claim/", {"token": token}, format="json").status_code == 401
    for user in (LearnerFactory(), TeacherFactory()):
        assert as_user(user).post(f"{URL}claim/", {"token": token}).status_code == 403


def test_claim_by_another_number_is_refused_and_keeps_the_link(sms, parent):
    _, consent, token = child_asks(sms)
    other = ParentFactory()
    resp = as_user(other).post(f"{URL}claim/", {"token": token}, format="json")
    assert resp.status_code == 403
    assert resp.json()["code"] == "CONSENT_PHONE_MISMATCH"
    consent.refresh_from_db()
    assert consent.token_hash and consent.parent is None


def test_claim_attaches_the_request_and_the_token_is_single_use(sms, parent):
    _, consent, token = child_asks(sms)
    client = as_user(parent)
    resp = client.post(f"{URL}claim/", {"token": token}, format="json")
    assert resp.status_code == 200
    assert resp.json()["id"] == consent.pk
    consent.refresh_from_db()
    assert (consent.parent, consent.token_hash) == (parent, "")
    # Usage unique : le lien ne sert plus, ni à réclamer ni à prévisualiser
    assert client.post(f"{URL}claim/", {"token": token}, format="json").status_code == 404
    assert APIClient().post(f"{URL}preview/", {"token": token}, format="json").status_code == 404


def test_claim_of_a_resolved_request(sms, parent):
    _, consent, token = child_asks(sms)
    ConsentRequest.objects.update(status=ConsentRequest.Status.CANCELLED)
    resp = as_user(parent).post(f"{URL}claim/", {"token": token}, format="json")
    assert resp.json()["code"] == "CONSENT_ALREADY_RESOLVED"


# --- Liste et détail (WP04, WP05, D20) ----------------------------------------------------------


def test_parent_only_sees_requests_sent_to_their_number(sms, parent):
    _, mine, _ = child_asks(sms)
    child_asks(sms, username="ama.k", first_name="Ama", phone="0197000002")
    body = as_user(parent).get(URL).json()
    assert [item["id"] for item in body["results"]] == [mine.pk]
    other = as_user(ParentFactory(phone="+2290197000002"))
    assert mine.pk not in [item["id"] for item in other.get(URL).json()["results"]]
    assert other.get(f"{URL}{mine.pk}/").status_code == 404


def test_detail_shows_only_what_exists_at_this_stage(sms, parent):
    _, consent, _ = child_asks(sms)
    body = as_user(parent).get(f"{URL}{consent.pk}/").json()
    assert set(body) == {
        "id",
        "origin",
        "status",
        "firstName",
        "lastName",
        "username",
        "age",
        "relationship",
        "createdAt",
        "expiresAt",
        "resolvedAt",
        "refusalReason",
        "refusalNote",
    }
    assert (body["firstName"], body["lastName"], body["username"], body["age"]) == (
        "Kofi",
        "Mensah",
        "kofi.m",
        13,
    )
    assert body["relationship"]["code"] == "pere"
    assert body["relationship"]["parentLabel"] == "Vous êtes son père"
    assert body["status"] == "pending" and body["origin"] == "learner"


def test_list_filters_by_effective_status(sms, parent):
    child_asks(sms)
    client = as_user(parent)
    assert client.get(URL, {"status": "pending"}).json()["count"] == 1
    ConsentRequest.objects.update(expires_at=timezone.now())
    assert client.get(URL, {"status": "pending"}).json()["count"] == 0
    assert client.get(URL, {"status": "expired"}).json()["results"][0]["status"] == "expired"


@pytest.mark.parametrize("factory", [LearnerFactory, TeacherFactory])
def test_other_roles_cannot_list(factory):
    assert as_user(factory()).get(URL).status_code == 403
    assert APIClient().get(URL).status_code == 401


# --- Accepter (WP05 → WP06) ---------------------------------------------------------------------


def test_accept_links_the_child_and_unlocks_the_password_step(sms, parent):
    child, consent, _ = child_asks(sms)
    resp = as_user(parent).post(f"{URL}{consent.pk}/accept/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"
    link = ParentChildLink.objects.get()
    assert (link.parent, link.learner.username, link.relationship.code) == (
        parent,
        "kofi.m",
        "pere",
    )
    assert link.consent_request == consent
    assert str(link) == f"{parent} → kofi.m"
    assert AuditLog.objects.filter(action="consent.accepted", actor=parent).exists()
    # L'enfant choisit son mot de passe (W10) et devient actif
    assert child.get("/api/auth/learner-signup/").json()["step"] == "password"
    resp = child.post(
        "/api/auth/learner-signup/password/", {"password": "Robots2026"}, format="json"
    )
    assert resp.json()["user"]["status"] == "active"


def test_accepting_twice_is_refused(sms, parent):
    _, consent, _ = child_asks(sms)
    client = as_user(parent)
    client.post(f"{URL}{consent.pk}/accept/")
    resp = client.post(f"{URL}{consent.pk}/accept/")
    assert resp.status_code == 409
    assert resp.json()["code"] == "CONSENT_ALREADY_RESOLVED"
    assert ParentChildLink.objects.count() == 1


def test_expired_request_cannot_be_accepted(sms, parent):
    _, consent, _ = child_asks(sms)
    ConsentRequest.objects.update(expires_at=timezone.now())
    resp = as_user(parent).post(f"{URL}{consent.pk}/accept/")
    assert resp.status_code == 410
    assert resp.json()["code"] == "CONSENT_REQUEST_EXPIRED"


def test_request_whose_child_account_is_gone_cannot_be_accepted(sms, parent):
    _, consent, _ = child_asks(sms)
    User.objects.filter(username="kofi.m").delete()
    assert as_user(parent).post(f"{URL}{consent.pk}/accept/").json()["code"] == (
        "CONSENT_REQUEST_EXPIRED"
    )


def test_another_parent_cannot_decide(sms, parent):
    _, consent, _ = child_asks(sms)
    other = as_user(ParentFactory())
    assert other.post(f"{URL}{consent.pk}/accept/").status_code == 404
    reason = {"reason": "autre"}
    assert other.post(f"{URL}{consent.pk}/refuse/", reason, format="json").status_code == 404
    consent.refresh_from_db()
    assert consent.status == "pending"


# --- Refuser (WP11 → WP12, W18) -----------------------------------------------------------------


def test_refuse_requires_a_reason(sms, parent):
    _, consent, _ = child_asks(sms)
    client = as_user(parent)
    for payload in ({}, {"reason": "inexistant"}):
        resp = client.post(f"{URL}{consent.pk}/refuse/", payload, format="json")
        assert resp.status_code == 400
        assert "reason" in resp.json()["fields"]


def test_refuse_purges_the_pending_account_and_keeps_the_request(sms, parent):
    child, consent, _ = child_asks(sms)
    payload = {"reason": "trop-jeune", "note": "Dans un an."}
    resp = as_user(parent).post(f"{URL}{consent.pk}/refuse/", payload, format="json")
    assert resp.status_code == 200
    assert resp.json()["refusalReason"]["code"] == "trop-jeune"
    assert not User.objects.filter(username="kofi.m").exists()
    consent.refresh_from_db()
    assert (consent.status, consent.learner, consent.refusal_note) == (
        "refused",
        None,
        "Dans un an.",
    )
    assert AuditLog.objects.get(action="consent.refused").data == {"reason": "trop-jeune"}
    # W18 : l'enfant voit l'issue, l'identifiant est libre
    state = child.get("/api/auth/learner-signup/").json()
    assert state["step"] == "refused"
    assert state["consentRequest"]["refusalReason"]["code"] == "trop-jeune"
    assert state["username"] == "kofi.m"
    available = APIClient().get("/api/auth/username-availability/", {"username": "kofi.m"})
    assert available.json()["available"] is True
    # Le parent garde la demande refusée (C9)
    assert as_user(parent).get(f"{URL}{consent.pk}/").json()["status"] == "refused"
    assert as_user(parent).post(f"{URL}{consent.pk}/accept/").json()["code"] == (
        "CONSENT_ALREADY_RESOLVED"
    )


def test_refusing_never_deletes_an_active_account(sms, parent):
    _, consent, _ = child_asks(sms)
    User.objects.filter(username="kofi.m").update(status=User.Status.ACTIVE)
    as_user(parent).post(f"{URL}{consent.pk}/refuse/", {"reason": "autre"}, format="json")
    assert User.objects.filter(username="kofi.m").exists()


def test_new_request_to_the_same_number_within_30_days_is_refused(sms, parent):
    _, consent, _ = child_asks(sms)
    as_user(parent).post(f"{URL}{consent.pk}/refuse/", {"reason": "autre"}, format="json")
    client = APIClient()
    payload = {
        "firstName": "Ama",
        "lastName": "Mensah",
        "username": "ama.m",
        "age": 11,
        "privacyAccepted": True,
    }
    client.post("/api/auth/learner-signup/", payload, format="json")
    resp = client.post(URL, {"parentPhone": PARENT_PHONE, "relationship": "mere"}, format="json")
    assert resp.status_code == 409
    assert resp.json()["code"] == "CONSENT_COOLDOWN"
    # Après 30 jours, une nouvelle demande est possible
    ConsentRequest.objects.update(resolved_at=timezone.now() - timedelta(days=30))
    resp = client.post(URL, {"parentPhone": PARENT_PHONE, "relationship": "mere"}, format="json")
    assert resp.status_code == 201


# --- Purge à 30 jours ---------------------------------------------------------------------------


def test_purge_refused_requests_after_30_days(sms, parent):
    _, refused, _ = child_asks(sms)
    as_user(parent).post(f"{URL}{refused.pk}/refuse/", {"reason": "autre"}, format="json")
    _, pending, _ = child_asks(sms, username="ama.k", first_name="Ama", phone="0197000002")
    assert purge_refused_requests() == 0
    ConsentRequest.objects.update(resolved_at=timezone.now() - timedelta(days=30))
    call_command("purge_refused_requests")
    assert list(ConsentRequest.objects.values_list("pk", flat=True)) == [pending.pk]
