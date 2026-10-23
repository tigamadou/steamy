"""Inscription du parent (WP01-WP03) : réponse neutre (C13), compte créé après un code valide, jamais de `role`."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import OtpChallenge, User
from apps.accounts.tests.factories import PASSWORD, ParentFactory

pytestmark = pytest.mark.django_db

URL = "/api/auth/parent-signup/"
VERIFY_URL = f"{URL}verify/"
PASSWORD_URL = f"{URL}password/"
PHONE = "+2290197555501"
NEW_PASSWORD = "Bonjour2026"


def signup(client, phone="01 97 55 55 01", **extra):
    payload = {"firstName": "Awa", "lastName": "Hounsa", "phone": phone, "privacyAccepted": True}
    return client.post(URL, {**payload, **extra}, format="json")


def verify(client, challenge_id, code):
    return client.post(VERIFY_URL, {"challengeId": challenge_id, "code": code}, format="json")


def set_password(client, password=NEW_PASSWORD, **extra):
    return client.post(PASSWORD_URL, {"password": password, **extra}, format="json")


def complete(client, sms, phone=PHONE):
    challenge_id = signup(client).json()["challengeId"]
    assert verify(client, challenge_id, sms.last_code(phone)).json() == {"existingAccount": False}
    return set_password(client)


# --- Parcours nominal --------------------------------------------------------------------------


def test_full_signup_creates_an_active_parent_and_logs_in(sms):
    client = APIClient()
    resp = complete(client, sms)
    assert resp.status_code == 200, resp.json()
    body = resp.json()
    assert body["csrfToken"]
    user = body["user"]
    assert (user["role"], user["status"], user["phone"]) == ("parent", "active", PHONE)
    assert (user["firstName"], user["lastName"]) == ("Awa", "Hounsa")
    assert user["profileStep"] == "parent-location"
    parent = User.objects.get(phone=PHONE)
    assert parent.check_password(NEW_PASSWORD) and parent.parent_profile
    # Session ouverte
    assert client.get("/api/accounts/me/").json()["phone"] == PHONE
    # Défi consommé : l'étape ne se rejoue pas
    assert not OtpChallenge.objects.exists()
    assert set_password(APIClient()).json()["code"] == "SIGNUP_EXPIRED"


def test_no_account_exists_before_a_valid_code(sms):
    client = APIClient()
    challenge_id = signup(client).json()["challengeId"]
    assert not User.objects.filter(phone=PHONE).exists()
    assert set_password(client).json()["code"] == "SIGNUP_EXPIRED"
    resp = verify(client, challenge_id, "zzzzzz")
    assert resp.json()["code"] == "OTP_INVALID"
    assert set_password(client).status_code == 410
    assert not User.objects.filter(phone=PHONE).exists()


def test_password_policy_is_enforced(sms):
    client = APIClient()
    challenge_id = signup(client).json()["challengeId"]
    verify(client, challenge_id, sms.last_code(PHONE))
    resp = set_password(client, "court")
    assert resp.status_code == 400
    assert resp.json()["fields"]["password"][0]["code"] == "PASSWORD_TOO_WEAK"
    assert not User.objects.filter(phone=PHONE).exists()


def test_password_step_expires(sms):
    client = APIClient()
    challenge_id = signup(client).json()["challengeId"]
    verify(client, challenge_id, sms.last_code(PHONE))
    OtpChallenge.objects.update(verified_at=timezone.now() - timedelta(minutes=31))
    assert set_password(client).json()["code"] == "SIGNUP_EXPIRED"


def test_a_new_signup_drops_the_previous_verification(sms):
    client = APIClient()
    challenge_id = signup(client).json()["challengeId"]
    verify(client, challenge_id, sms.last_code(PHONE))
    signup(client, phone="0197555502")
    assert set_password(client).json()["code"] == "SIGNUP_EXPIRED"


# --- Réponse neutre (C13) ----------------------------------------------------------------------


def test_registered_number_gets_the_same_response_as_a_free_one(sms):
    ParentFactory(phone=PHONE)
    free, taken = signup(APIClient(), phone="0197555502"), signup(APIClient())
    assert free.status_code == taken.status_code == 200
    assert set(free.json()) == set(taken.json())
    assert {
        k: v for k, v in free.json().items() if k not in ("challengeId", "destinationMasked")
    } == {k: v for k, v in taken.json().items() if k not in ("challengeId", "destinationMasked")}
    # L'OTP est envoyé dans les deux cas
    assert sms.messages(PHONE) and sms.messages("+2290197555502")


def test_registered_number_leads_to_login_after_verification(sms):
    parent = ParentFactory(phone=PHONE)
    client = APIClient()
    challenge_id = signup(client).json()["challengeId"]
    resp = verify(client, challenge_id, sms.last_code(PHONE))
    assert resp.json() == {"existingAccount": True}
    # Pas de second compte ni de changement de mot de passe
    assert set_password(client).json()["code"] == "SIGNUP_EXPIRED"
    parent.refresh_from_db()
    assert parent.check_password(PASSWORD)


def test_number_registered_meanwhile_is_reported_after_verification(sms):
    client = APIClient()
    challenge_id = signup(client).json()["challengeId"]
    verify(client, challenge_id, sms.last_code(PHONE))
    ParentFactory(phone=PHONE)
    resp = set_password(client)
    assert resp.status_code == 409
    assert resp.json()["code"] == "PHONE_TAKEN"


# --- Refus d'abord ------------------------------------------------------------------------------


@pytest.mark.parametrize("role", ["teacher", "learner", None, "admin"])
def test_role_is_never_accepted(sms, role):
    client = APIClient()
    challenge_id = signup(client, role=role, isStaff=True).json()["challengeId"]
    verify(client, challenge_id, sms.last_code(PHONE))
    resp = set_password(client, role=role, isStaff=True, isSuperuser=True)
    assert resp.json()["user"]["role"] == "parent"
    user = User.objects.get(phone=PHONE)
    assert (user.role, user.is_staff, user.is_superuser) == ("parent", False, False)


@pytest.mark.parametrize(
    "phone", ["12", "abc", "+33612345678", "0297000001", "", "+229019700000099"]
)
def test_invalid_phone_is_refused(sms, phone):
    resp = signup(APIClient(), phone=phone)
    assert resp.status_code == 400
    assert resp.json()["fields"]["phone"][0]["code"] in ("PHONE_INVALID", "BLANK")
    assert not OtpChallenge.objects.exists()


def test_privacy_must_be_accepted(sms):
    resp = signup(APIClient(), privacyAccepted=False)
    assert resp.json()["fields"]["privacyAccepted"][0]["code"] == "REQUIRED"
    assert not OtpChallenge.objects.exists()


def test_signup_requires_csrf(settings):
    settings.CSRF_TRUSTED_ORIGINS = ["http://localhost:3000"]
    client = APIClient(enforce_csrf_checks=True, HTTP_ORIGIN="http://localhost:3000")
    assert signup(client).status_code == 403


def test_wp02_blocks_the_right_code_after_three_wrong_ones(sms):
    client = APIClient()
    challenge_id = signup(client).json()["challengeId"]
    code = sms.last_code(PHONE)
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(3):
        assert verify(client, challenge_id, wrong).json()["code"] == "OTP_INVALID"
    assert verify(client, challenge_id, code).json()["code"] == "OTP_TOO_MANY_ATTEMPTS"
    assert OtpChallenge.objects.get(pk=challenge_id).attempts == 3
