"""
Mot de passe oublié (WL02-WL05, D26, C6, C7).

- Parent : code par SMS au numéro du compte ; enseignant : code par email (C6) ; apprenant (identifiant) : refus
  explicite, son parent réinitialise depuis son espace (D26). Le choix se fait sur la **forme** de la saisie (C7),
  jamais sur l'existence du compte.
- Réponse et travail identiques que le compte existe ou non : un défi est toujours créé et la tâche d'envoi
  toujours programmée ; elle n'envoie rien si le défi ne désigne aucun compte.
- Code valide → `resetToken` (haché en base, 15 min, usage unique) → nouveau mot de passe. Changer le mot de passe
  ferme les autres sessions (empreinte de session de Django).
"""

import hashlib
import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from libs.errors import ApiError
from libs.phone import looks_like_phone, normalize_phone

from .models import OtpChallenge, PasswordResetToken, User
from .otp import start_challenge, verify_challenge

PURPOSE = OtpChallenge.Purpose.PASSWORD_RESET
TOKEN_LIFETIME = timedelta(minutes=15)


def _active(**lookup) -> User | None:
    return User.objects.filter(status=User.Status.ACTIVE, is_staff=False, **lookup).first()


def request_reset(identifier: str, ip: str) -> OtpChallenge:
    identifier = (identifier or "").strip()
    if "@" in identifier:
        email = identifier.lower()
        user = _active(role=User.Role.TEACHER, email__iexact=email)
        return start_challenge("", PURPOSE, ip, email=email, user=user)
    if looks_like_phone(identifier):
        phone = normalize_phone(identifier)
        if phone is None:
            raise ApiError("PHONE_INVALID", fields={"identifier": "PHONE_INVALID"})
        user = _active(role=User.Role.PARENT, phone=phone)
        return start_challenge(phone, PURPOSE, ip, user=user)
    raise ApiError("PASSWORD_RESET_BY_PARENT")


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_token(challenge_id, code: str) -> str:
    with transaction.atomic():
        challenge = verify_challenge(challenge_id, code, [PURPOSE])
        # Un code valide n'existe que pour un compte réel : les défis « à vide » n'envoient aucun code.
        token = secrets.token_urlsafe(32)
        PasswordResetToken.objects.create(
            user_id=challenge.user_id,
            token_hash=_hash(token),
            expires_at=timezone.now() + TOKEN_LIFETIME,
        )
        challenge.delete()
    return token


def confirm_reset(token: str, password: str) -> User:
    with transaction.atomic():
        reset = (
            PasswordResetToken.objects.select_for_update()
            .select_related("user")
            .filter(token_hash=_hash(token or ""), expires_at__gt=timezone.now())
            .first()
        )
        if reset is None or reset.user.status != User.Status.ACTIVE:
            raise ApiError("RESET_TOKEN_INVALID")
        user = reset.user
        user.set_password(password)
        user.save()
        PasswordResetToken.objects.filter(user=user).delete()
    return user
