"""
Mot de passe oublié (WL02-WL05) : parent par SMS, enseignant par email (C6), apprenant refusé (D26),
pas d'énumération (même réponse, même travail), jeton à usage unique, autres sessions fermées.
"""

import re
from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import OtpChallenge, PasswordResetToken, User
from apps.accounts.tasks import send_reset_code
from apps.accounts.tests.factories import (
    PASSWORD,
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)
from libs.phone import mask_email

pytestmark = pytest.mark.django_db

URL = "/api/auth/password-reset/"
VERIFY_URL = f"{URL}verify/"
CONFIRM_URL = f"{URL}confirm/"
PHONE = "+2290197888801"
NEW_PASSWORD = "Nouveau2026"


def ask(identifier, ip="10.0.0.1"):
    return APIClient().post(URL, {"identifier": identifier}, format="json", REMOTE_ADDR=ip)


def verify(challenge_id, code):
    return APIClient().post(VERIFY_URL, {"challengeId": challenge_id, "code": code}, format="json")


def confirm(token, password=NEW_PASSWORD):
    return APIClient().post(CONFIRM_URL, {"resetToken": token, "password": password}, format="json")


def email_code(address):
    message = [m for m in mail.outbox if m.to == [address]][-1]
    return re.search(r"\b(\d{6})\b", message.body).group(1)


def stable(body):
    return {k: v for k, v in body.items() if k not in ("challengeId", "destinationMasked")}


# --- Parent par SMS ---------------------------------------------------------------------------------


def test_parent_resets_by_sms_and_other_sessions_are_closed(sms):
    parent = ParentFactory(phone=PHONE)
    elsewhere = APIClient()
    elsewhere.post("/api/auth/login/", {"identifier": PHONE, "password": PASSWORD}, format="json")
    assert elsewhere.get("/api/accounts/me/").status_code == 200

    resp = ask("01 97 88 88 01")
    assert resp.status_code == 200
    assert resp.json()["destinationMasked"] == "+229 •• 01"
    token = verify(resp.json()["challengeId"], sms.last_code(PHONE)).json()["resetToken"]
    assert not OtpChallenge.objects.exists()
    assert confirm(token).status_code == 204

    parent.refresh_from_db()
    assert parent.check_password(NEW_PASSWORD)
    assert elsewhere.get("/api/accounts/me/").status_code == 401
    login = APIClient().post(
        "/api/auth/login/", {"identifier": PHONE, "password": NEW_PASSWORD}, format="json"
    )
    assert login.status_code == 200
    # Jeton à usage unique
    assert confirm(token).json()["code"] == "RESET_TOKEN_INVALID"


# --- Enseignant par email (C6) ------------------------------------------------------------------------


def test_teacher_resets_by_email(sms):
    teacher = TeacherFactory(email="koffi@ecole.bj")
    resp = ask("Koffi@Ecole.bj")
    assert resp.json()["destinationMasked"] == "k•••@ecole.bj"
    code = email_code("koffi@ecole.bj")
    assert sms.messages(PHONE) == []
    token = verify(resp.json()["challengeId"], code).json()["resetToken"]
    assert confirm(token).status_code == 204
    teacher.refresh_from_db()
    assert teacher.check_password(NEW_PASSWORD)


# --- Apprenant : refus explicite (D26) ----------------------------------------------------------------


@pytest.mark.parametrize("username", ["lea.adjovi", "inconnu"])
def test_learner_is_sent_to_their_parent(username):
    LearnerFactory(username="lea.adjovi")
    resp = ask(username)
    assert resp.status_code == 400
    assert resp.json()["code"] == "PASSWORD_RESET_BY_PARENT"
    assert not OtpChallenge.objects.exists()


def test_malformed_number_is_refused_whatever_the_accounts():
    resp = ask("0123")
    assert resp.json()["fields"]["identifier"][0]["code"] == "PHONE_INVALID"


# --- Pas d'énumération ------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "unknown,known",
    [("0197888802", "0197888801"), ("personne@ecole.bj", "koffi@ecole.bj")],
)
def test_same_response_and_same_work_whether_the_account_exists_or_not(
    django_capture_on_commit_callbacks, unknown, known
):
    ParentFactory(phone=PHONE)
    TeacherFactory(email="koffi@ecole.bj")
    with django_capture_on_commit_callbacks() as known_callbacks:
        known_resp = ask(known)
    with django_capture_on_commit_callbacks() as unknown_callbacks:
        unknown_resp = ask(unknown, ip="10.0.0.2")
    assert known_resp.status_code == unknown_resp.status_code == 200
    assert stable(known_resp.json()) == stable(unknown_resp.json())
    # Même travail dans la requête : un défi créé et une tâche d'envoi programmée
    assert len(known_callbacks) == len(unknown_callbacks) == 1
    assert OtpChallenge.objects.count() == 2


@pytest.mark.parametrize(
    "make",
    [
        lambda: None,
        lambda: ParentFactory(phone=PHONE, status=User.Status.SUSPENDED),
        lambda: TeacherFactory(email="koffi@ecole.bj", status=User.Status.DEACTIVATED),
        lambda: StaffFactory(email="koffi@ecole.bj"),
    ],
)
def test_nothing_is_sent_to_unknown_inactive_or_staff_accounts(sms, make):
    make()
    for identifier in (PHONE, "koffi@ecole.bj"):
        resp = ask(identifier)
        assert resp.status_code == 200
    assert sms.messages(PHONE) == []
    assert mail.outbox == []
    # Aucun code n'a été envoyé : aucun code ne peut être validé
    challenge = OtpChallenge.objects.first()
    assert verify(str(challenge.pk), "000000").json()["code"] == "OTP_INVALID"


def test_send_task_ignores_unknown_challenges():
    assert send_reset_code("00000000-0000-0000-0000-000000000000", "123456") is False


def test_reset_requests_count_in_the_daily_limit(sms):
    from apps.core.models import PlatformSettings

    config = PlatformSettings.load()
    config.otp_daily_limit_per_phone = 1
    config.save()
    assert ask(PHONE).status_code == 200
    resp = ask(PHONE, ip="10.0.0.9")
    assert resp.json()["code"] == "OTP_DAILY_LIMIT"


def test_resend_of_a_reset_code(sms):
    ParentFactory(phone=PHONE)
    challenge_id = ask(PHONE).json()["challengeId"]
    OtpChallenge.objects.update(last_sent_at=timezone.now() - timedelta(seconds=60))
    resp = APIClient().post("/api/auth/otp/resend/", {"challengeId": challenge_id}, format="json")
    assert resp.status_code == 200
    assert len(sms.messages(PHONE)) == 2


# --- Code et jeton --------------------------------------------------------------------------------


def test_wrong_code_gives_no_token(sms):
    ParentFactory(phone=PHONE)
    challenge_id = ask(PHONE).json()["challengeId"]
    assert verify(challenge_id, "zzzzzz").json()["code"] == "OTP_INVALID"
    assert not PasswordResetToken.objects.exists()


def test_signup_code_is_not_a_reset_code(sms):
    challenge = OtpChallenge.objects.create(
        phone=PHONE,
        purpose=OtpChallenge.Purpose.PARENT_SIGNUP,
        code_hash="x",
        expires_at=timezone.now() + timedelta(minutes=5),
        last_sent_at=timezone.now(),
    )
    assert verify(str(challenge.pk), "123456").json()["code"] == "OTP_INVALID"


def test_token_is_hashed_and_expires(sms):
    parent = ParentFactory(phone=PHONE)
    challenge_id = ask(PHONE).json()["challengeId"]
    token = verify(challenge_id, sms.last_code(PHONE)).json()["resetToken"]
    stored = PasswordResetToken.objects.get()
    assert token not in stored.token_hash
    assert str(stored) == f"Réinitialisation de {parent}"
    PasswordResetToken.objects.update(expires_at=timezone.now())
    assert confirm(token).json()["code"] == "RESET_TOKEN_INVALID"


def test_password_policy_and_suspended_account(sms):
    parent = ParentFactory(phone=PHONE)
    challenge_id = ask(PHONE).json()["challengeId"]
    token = verify(challenge_id, sms.last_code(PHONE)).json()["resetToken"]
    weak = confirm(token, "court")
    assert weak.json()["fields"]["password"][0]["code"] == "PASSWORD_TOO_WEAK"
    parent.status = User.Status.SUSPENDED
    parent.save()
    assert confirm(token).json()["code"] == "RESET_TOKEN_INVALID"
    assert confirm("").status_code == 400


def test_mask_email():
    assert mask_email("") == "••"
    assert mask_email("a@b.c") == "a•••@b.c"
