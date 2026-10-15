"""OTP par SMS (D24) : code haché, 6 chiffres, 5 min, 3 essais, renvoi après 60 s, plafonds par numéro et par IP."""

import re
import uuid
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.models import OtpChallenge
from apps.accounts.otp import hash_code, start_challenge, verify_challenge
from apps.core.models import PlatformSettings
from libs.errors import ApiError

pytestmark = pytest.mark.django_db

PHONE = "+22901970001"
IP = "10.0.0.1"
RESEND_URL = "/api/auth/otp/resend/"
SIGNUP = OtpChallenge.Purpose.PARENT_SIGNUP


def start(phone=PHONE, ip=IP):
    return start_challenge(phone, SIGNUP, ip)


def verify(challenge, code):
    return verify_challenge(challenge.pk, code, [SIGNUP])


def error_code(callable_, *args):
    with pytest.raises(ApiError) as error:
        callable_(*args)
    return error.value.default_code


def age(challenge, seconds):
    """Fait vieillir le défi de `seconds` secondes."""
    delta = timedelta(seconds=seconds)
    OtpChallenge.objects.filter(pk=challenge.pk).update(
        last_sent_at=challenge.last_sent_at - delta, expires_at=challenge.expires_at - delta
    )


def resend(challenge_id, ip=IP):
    return APIClient().post(
        RESEND_URL, {"challengeId": str(challenge_id)}, format="json", REMOTE_ADDR=ip
    )


# --- Création ---------------------------------------------------------------------------------


def test_code_is_six_digits_sent_by_sms_and_only_stored_hashed(sms):
    challenge = start()
    code = sms.last_code(PHONE)
    assert len(code) == 6 and code.isdigit()
    assert "5 min" in sms.last(PHONE)
    challenge.refresh_from_db()
    assert code not in challenge.code_hash
    assert challenge.code_hash == hash_code(challenge.pk, code)
    assert challenge.expires_at - challenge.last_sent_at == timedelta(minutes=5)
    assert str(challenge).startswith("OTP Inscription parent")


def test_correct_code_is_accepted_once(sms):
    challenge = start()
    code = sms.last_code(PHONE)
    assert verify(challenge, code).verified_at is not None
    # Usage unique
    assert error_code(verify, challenge, code) == "OTP_INVALID"


def test_code_is_bound_to_its_purpose(sms):
    challenge = start()
    code = sms.last_code(PHONE)
    purpose = [OtpChallenge.Purpose.PASSWORD_RESET]
    assert error_code(verify_challenge, challenge.pk, code, purpose) == "OTP_INVALID"


def test_unknown_challenge_is_invalid():
    assert error_code(verify_challenge, uuid.uuid4(), "123456", [SIGNUP]) == "OTP_INVALID"


# --- Refus : expiré, 4ᵉ essai -----------------------------------------------------------------


def test_expired_code_is_refused(sms):
    challenge = start()
    code = sms.last_code(PHONE)
    age(challenge, 5 * 60)
    assert error_code(verify, challenge, code) == "OTP_EXPIRED"


def test_fourth_attempt_is_refused_even_with_the_right_code(sms):
    challenge = start()
    code = sms.last_code(PHONE)
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(3):
        assert error_code(verify, challenge, wrong) == "OTP_INVALID"
    assert error_code(verify, challenge, code) == "OTP_TOO_MANY_ATTEMPTS"
    challenge.refresh_from_db()
    assert challenge.attempts == 3 and challenge.verified_at is None


def test_settings_drive_the_limits(sms):
    config = PlatformSettings.load()
    config.otp_max_attempts = 1
    config.otp_length = 4
    config.save()
    challenge = start()
    code = re.search(r"est (\d+)\.", sms.last(PHONE)).group(1)
    assert len(code) == 4
    assert error_code(verify, challenge, "zz") == "OTP_INVALID"
    assert error_code(verify, challenge, code) == "OTP_TOO_MANY_ATTEMPTS"


# --- Renvoi -------------------------------------------------------------------------------------


def test_resend_too_early_is_refused(sms):
    challenge = start()
    resp = resend(challenge.pk)
    assert resp.status_code == 429
    assert resp.json()["code"] == "OTP_RESEND_TOO_EARLY"
    assert len(sms.messages(PHONE)) == 1


def test_resend_after_the_delay_sends_a_new_code_and_resets_attempts(sms):
    challenge = start()
    first = sms.last_code(PHONE)
    verify_wrong = "000000" if first != "000000" else "111111"
    error_code(verify, challenge, verify_wrong)
    age(challenge, 60)
    resp = resend(challenge.pk)
    assert resp.status_code == 200
    body = resp.json()
    assert body == {
        "challengeId": str(challenge.pk),
        "destinationMasked": "+229 •• 01",
        "expiresInSec": 300,
        "resendInSec": 60,
    }
    assert len(sms.messages(PHONE)) == 2
    second = sms.last_code(PHONE)
    challenge.refresh_from_db()
    assert challenge.attempts == 0
    if second != first:
        assert error_code(verify, challenge, first) == "OTP_INVALID"
    assert verify(challenge, second).verified_at


def test_resend_of_an_unknown_or_used_challenge_is_refused(sms):
    assert resend(uuid.uuid4()).json()["code"] == "OTP_INVALID"
    challenge = start()
    verify(challenge, sms.last_code(PHONE))
    age(challenge, 60)
    assert resend(challenge.pk).json()["code"] == "OTP_INVALID"


def test_resend_requires_a_challenge_id():
    resp = APIClient().post(RESEND_URL, {}, format="json")
    assert resp.status_code == 400
    assert "challengeId" in resp.json()["fields"]


def test_resend_is_throttled():
    rates = {**SimpleRateThrottle.THROTTLE_RATES, "otp": "2/min"}
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)
        codes = [resend(uuid.uuid4()).status_code for _ in range(3)]
    assert codes == [400, 400, 429]


# --- Plafonds quotidiens ------------------------------------------------------------------------


def test_daily_limit_per_phone(sms):
    for _ in range(5):
        start(ip=f"10.0.1.{_}")
    assert error_code(start) == "OTP_DAILY_LIMIT"
    assert len(sms.messages(PHONE)) == 5
    # Un autre numéro n'est pas concerné
    start(phone="+22901970002")


def test_daily_limit_per_ip(sms):
    config = PlatformSettings.load()
    config.otp_daily_limit_per_ip = 3
    config.save()
    for index in range(3):
        start(phone=f"+2290197100{index}")
    assert error_code(start, "+22901971009") == "OTP_DAILY_LIMIT"
    assert sms.messages("+22901971009") == []
    # Depuis une autre adresse, le même numéro reçoit son code
    start("+22901971009", "10.0.0.2")


def test_resend_counts_in_the_daily_limit(sms):
    config = PlatformSettings.load()
    config.otp_daily_limit_per_phone = 2
    config.save()
    challenge = start()
    age(challenge, 60)
    assert resend(challenge.pk).status_code == 200
    challenge.refresh_from_db()
    age(challenge, 60)
    resp = resend(challenge.pk)
    assert resp.status_code == 429
    assert resp.json()["code"] == "OTP_DAILY_LIMIT"


def test_daily_limits_reset_the_next_day(sms, monkeypatch):
    config = PlatformSettings.load()
    config.otp_daily_limit_per_phone = 1
    config.save()
    start()
    assert error_code(start) == "OTP_DAILY_LIMIT"
    tomorrow = timezone.localdate() + timedelta(days=1)
    monkeypatch.setattr("apps.accounts.otp.timezone.localdate", lambda: tomorrow)
    start()
