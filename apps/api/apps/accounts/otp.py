"""
Codes OTP par SMS (D24, SPEC-TECHNIQUE §3.1) : création, renvoi, vérification.

Plafonds (`PlatformSettings`) : 6 chiffres, valable 5 min, 3 essais, renvoi après 60 s, et un nombre maximal de
SMS par jour **par numéro et par adresse IP**. Les compteurs quotidiens vivent dans le cache (Redis), par jour local
(`TIME_ZONE`) : ils bornent le coût des SMS (ADR 0002) et l'énumération.
"""

import hmac
import secrets
from datetime import timedelta

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import salted_hmac
from rest_framework.throttling import BaseThrottle

from apps.core.models import PlatformSettings
from apps.notifications.sms import queue_sms
from libs.errors import ApiError

from .models import OtpChallenge

SMS_TEXT = (
    "Steamy : votre code de vérification est {code}. Il expire dans {minutes} min. "
    "Ne le communiquez à personne."
)
DAY_SECONDS = 24 * 3600


def hash_code(challenge_id, code: str) -> str:
    return salted_hmac(f"otp:{challenge_id}", code, algorithm="sha256").hexdigest()


def client_ip(request) -> str:
    """Même identification de l'adresse que le throttling de DRF (S9)."""
    return BaseThrottle().get_ident(request)


def _counter_key(kind: str, value: str) -> str:
    today = timezone.localdate().isoformat()
    return f"otp-daily:{kind}:{today}:{value}"


def consume_sms_quota(phone: str, ip: str, config: PlatformSettings) -> None:
    """Compte un SMS pour le numéro et pour l'IP ; refuse au-delà des plafonds quotidiens (D24)."""
    limits = (
        ("phone", phone, config.otp_daily_limit_per_phone),
        ("ip", ip, config.otp_daily_limit_per_ip),
    )
    for kind, value, limit in limits:
        if cache.get(_counter_key(kind, value), 0) >= limit:
            raise ApiError("OTP_DAILY_LIMIT")
    for kind, value, _limit in limits:
        key = _counter_key(kind, value)
        cache.add(key, 0, DAY_SECONDS)
        cache.incr(key)


def _send_code(challenge: OtpChallenge, config: PlatformSettings) -> None:
    code = f"{secrets.randbelow(10**config.otp_length):0{config.otp_length}d}"
    now = timezone.now()
    challenge.code_hash = hash_code(challenge.id, code)
    challenge.expires_at = now + timedelta(seconds=config.otp_validity_seconds)
    challenge.last_sent_at = now
    challenge.attempts = 0
    challenge.save()
    minutes = max(1, config.otp_validity_seconds // 60)
    queue_sms(
        challenge.phone, SMS_TEXT.format(code=code, minutes=minutes), purpose=challenge.purpose
    )


def start_challenge(phone: str, purpose: str, ip: str, data: dict | None = None) -> OtpChallenge:
    """Crée un défi et envoie son code. `phone` est déjà normalisé en E.164."""
    config = PlatformSettings.load()
    consume_sms_quota(phone, ip, config)
    challenge = OtpChallenge(phone=phone, purpose=purpose, data=data or {})
    _send_code(challenge, config)
    return challenge


def get_open_challenge(challenge_id, purposes=None) -> OtpChallenge:
    """Défi non encore validé ; un identifiant inconnu ou déjà utilisé donne `OTP_INVALID`."""
    queryset = OtpChallenge.objects.filter(verified_at__isnull=True)
    if purposes:
        queryset = queryset.filter(purpose__in=purposes)
    challenge = queryset.filter(pk=challenge_id).first()
    if challenge is None:
        raise ApiError("OTP_INVALID")
    return challenge


def resend_challenge(challenge_id, ip: str) -> OtpChallenge:
    config = PlatformSettings.load()
    challenge = get_open_challenge(challenge_id)
    if resend_in_seconds(challenge, config) > 0:
        raise ApiError("OTP_RESEND_TOO_EARLY")
    consume_sms_quota(challenge.phone, ip, config)
    _send_code(challenge, config)
    return challenge


def resend_in_seconds(challenge: OtpChallenge, config: PlatformSettings | None = None) -> int:
    config = config or PlatformSettings.load()
    ready_at = challenge.last_sent_at + timedelta(seconds=config.otp_resend_delay_seconds)
    return max(0, int((ready_at - timezone.now()).total_seconds() + 0.999))


def verify_challenge(challenge_id, code: str, purposes) -> OtpChallenge:
    """
    Vérifie le code. Au-delà du nombre d'essais (3), même le bon code est refusé : il faut en redemander un.
    Un code valide ne sert qu'une fois.
    """
    config = PlatformSettings.load()
    with transaction.atomic():
        challenge = get_open_challenge(challenge_id, purposes)
        challenge = OtpChallenge.objects.select_for_update().get(pk=challenge.pk)
        if challenge.expires_at <= timezone.now():
            error = "OTP_EXPIRED"
        elif challenge.attempts >= config.otp_max_attempts:
            error = "OTP_TOO_MANY_ATTEMPTS"
        elif hmac.compare_digest(challenge.code_hash, hash_code(challenge.id, code or "")):
            challenge.verified_at = timezone.now()
            challenge.save(update_fields=["verified_at", "updated_at"])
            return challenge
        else:
            challenge.attempts += 1
            challenge.save(update_fields=["attempts", "updated_at"])
            error = "OTP_INVALID"
    raise ApiError(error)
