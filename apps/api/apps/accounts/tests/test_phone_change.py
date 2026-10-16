"""
Changement de numéro du parent (WPD08, D24) : code OTP sur le **nouveau** numéro, mot de passe exigé, connexion
avec le nouveau numéro ; Mobile Money préféré (WPD08, D76).
"""

import pytest
from django.db import IntegrityError
from rest_framework.test import APIClient

from apps.accounts.models import ConsentRequest, User
from apps.accounts.tests.factories import PASSWORD, LearnerFactory, ParentFactory
from apps.core.models import AuditLog
from apps.referentials.models import Country, PaymentNetwork, Relationship

pytestmark = pytest.mark.django_db

URL = "/api/accounts/me/phone-change/"
VERIFY = f"{URL}verify/"
PROFILE = "/api/accounts/me/parent-profile/"
OLD = "+2290197000001"
NEW = "+2290196000002"


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def login(identifier):
    return APIClient().post(
        "/api/auth/login/", {"identifier": identifier, "password": PASSWORD}, format="json"
    )


@pytest.fixture
def parent():
    return ParentFactory(phone=OLD)


def start(client, phone="01 96 00 00 02", password=PASSWORD):
    return client.post(URL, {"phone": phone, "password": password}, format="json")


def test_the_code_goes_to_the_new_number_and_the_parent_logs_in_with_it(parent, sms):
    client = as_user(parent)
    resp = start(client)
    assert resp.status_code == 200, resp.json()
    assert resp.json()["destinationMasked"].endswith("02")
    assert sms.messages(OLD) == []
    resp = client.post(
        VERIFY,
        {"challengeId": resp.json()["challengeId"], "code": sms.last_code(NEW)},
        format="json",
    )
    assert resp.status_code == 200, resp.json()
    assert resp.json()["phone"] == NEW
    parent.refresh_from_db()
    assert parent.phone == NEW
    assert login(NEW).status_code == 200
    assert login(OLD).status_code == 400
    assert AuditLog.objects.filter(action="phone.changed", actor=parent).exists()


def test_consent_requests_follow_the_number(parent, sms):
    consent = ConsentRequest.objects.create(
        origin="learner",
        learner=LearnerFactory(status=User.Status.PENDING),
        parent_phone=OLD,
        relationship=Relationship.objects.first(),
        expires_at="2099-01-01T00:00:00Z",
    )
    refused = ConsentRequest.objects.create(
        origin="learner",
        parent_phone=OLD,
        relationship=Relationship.objects.first(),
        status=ConsentRequest.Status.REFUSED,
        expires_at="2099-01-01T00:00:00Z",
    )
    client = as_user(parent)
    challenge = start(client).json()["challengeId"]
    client.post(VERIFY, {"challengeId": challenge, "code": sms.last_code(NEW)}, format="json")
    consent.refresh_from_db()
    refused.refresh_from_db()
    assert consent.parent_phone == NEW
    assert (
        refused.parent_phone == OLD
    )  # demande close : le délai de 30 jours reste sur l'ancien numéro
    assert client.get("/api/accounts/consent-requests/").json()["count"] == 1


def test_wrong_code_and_otp_errors(parent, sms):
    client = as_user(parent)
    challenge = start(client).json()["challengeId"]
    wrong = "111111" if sms.last_code(NEW) == "000000" else "000000"
    resp = client.post(VERIFY, {"challengeId": challenge, "code": wrong}, format="json")
    assert resp.json()["code"] == "OTP_INVALID"
    resend = client.post("/api/auth/otp/resend/", {"challengeId": challenge}, format="json")
    assert resend.json()["code"] == "OTP_RESEND_TOO_EARLY"
    parent.refresh_from_db()
    assert parent.phone == OLD


def test_password_is_required(parent):
    resp = start(as_user(parent), password="mauvais")
    assert resp.status_code == 400
    assert resp.json()["fields"]["password"][0]["code"] == "INVALID_CREDENTIALS"


def test_number_already_used_or_identical(parent):
    ParentFactory(phone=NEW)
    client = as_user(parent)
    resp = start(client)
    assert resp.status_code == 409
    assert resp.json()["fields"]["phone"][0]["code"] == "PHONE_TAKEN"
    resp = start(client, phone=OLD)
    assert resp.status_code == 400
    assert resp.json()["fields"]["phone"][0]["code"] == "PHONE_INVALID"
    assert start(client, phone="123").json()["fields"]["phone"][0]["code"] == "PHONE_INVALID"


def test_number_taken_during_the_change(parent, sms, monkeypatch):
    client = as_user(parent)
    challenge = start(client).json()["challengeId"]
    code = sms.last_code(NEW)

    def save(*args, **kwargs):
        raise IntegrityError

    monkeypatch.setattr(User, "save", save)
    resp = client.post(VERIFY, {"challengeId": challenge, "code": code}, format="json")
    assert resp.status_code == 409
    assert resp.json()["code"] == "PHONE_TAKEN"


def test_another_users_challenge_is_refused(parent, sms):
    other = ParentFactory()
    challenge = start(as_user(other)).json()["challengeId"]
    resp = as_user(parent).post(
        VERIFY, {"challengeId": challenge, "code": sms.last_code(NEW)}, format="json"
    )
    assert resp.json()["code"] == "OTP_INVALID"
    other.refresh_from_db()
    parent.refresh_from_db()
    assert (parent.phone, other.phone) != (NEW, NEW)


def test_reserved_to_parents():
    learner = as_user(LearnerFactory())
    assert learner.post(URL, {}).status_code == 403
    assert learner.post(VERIFY, {}).status_code == 403


# --- Mobile Money préféré (WPD08) ---------------------------------------------------------------


def test_parent_saves_reads_and_clears_the_preferred_mobile_money(parent):
    client = as_user(parent)
    assert client.get(PROFILE).json()["mobileMoney"] is None
    payload = {"mobileMoney": {"country": "BJ", "network": "mtn", "phone": "01 97 00 00 09"}}
    resp = client.patch(PROFILE, payload, format="json")
    assert resp.status_code == 200, resp.json()
    expected = {"country": "BJ", "network": "mtn", "phone": "+2290197000009"}
    assert resp.json()["mobileMoney"] == expected
    assert client.get(PROFILE).json()["mobileMoney"] == expected
    resp = client.patch(PROFILE, {"mobileMoney": None}, format="json")
    assert resp.json()["mobileMoney"] is None


def test_preferred_mobile_money_is_checked(parent):
    client = as_user(parent)
    PaymentNetwork.objects.filter(country="BJ", code="moov").update(enabled=False)
    resp = client.patch(
        PROFILE,
        {"mobileMoney": {"country": "BJ", "network": "moov", "phone": "0197000009"}},
        format="json",
    )
    assert resp.json()["fields"]["mobileMoney"]["network"][0]["code"] == "NETWORK_UNAVAILABLE"
    Country.objects.filter(code="TG").update(active=True)
    resp = client.patch(
        PROFILE,
        {"mobileMoney": {"country": "BJ", "network": "mtn", "phone": "+22890000000"}},
        format="json",
    )
    assert resp.json()["fields"]["mobileMoney"]["phone"][0]["code"] == "PHONE_INVALID"


def test_parent_profile_get_creates_it_if_missing():
    parent = ParentFactory(parent_profile=None)
    resp = as_user(parent).get(PROFILE)
    assert resp.status_code == 200
    assert resp.json()["profileStep"] == "parent-location"
