"""
Inscription de l'apprenant et demande de consentement d'origine `learner` (W04-W10, D21, D23, C5, C14).

- Le compte est créé `pending`, sans mot de passe, avec une `SignupSession` et un **code de reprise** : seul le
  haché est gardé, le code n'est renvoyé qu'une fois et n'est jamais régénéré (C14).
- L'inscription en cours est rattachée à la session Django (cookie) ; un autre appareil la reprend avec
  l'identifiant et le code de reprise (C5).
- Le SMS au parent ne contient ni le nom de l'enfant ni aucune donnée personnelle (ADR 0002), seulement un lien à
  jeton, haché en base.
"""

import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.db.models.functions import Lower
from django.utils import timezone

from apps.core.models import PlatformSettings
from apps.notifications.sms import queue_sms
from libs.errors import ApiError

from .models import ConsentRequest, LearnerProfile, SignupSession, User
from .otp import consume_send_quota

#: Âges acceptés (D23).
MIN_AGE, MAX_AGE = 10, 17
#: Durée de vie d'une inscription en attente et d'une demande de consentement (D21).
SIGNUP_LIFETIME = timedelta(days=7)
SESSION_KEY = "learner_signup"
#: Code de reprise : 8 caractères sans ambiguïté de lecture (ni 0/O, ni 1/I/L), affiché « ABCD-EFGH ».
RESUME_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
RESUME_LENGTH = 8

#: Après un refus, plus de nouvelle demande vers ce numéro pendant 30 jours (D22, C9).
REFUSAL_COOLDOWN = timedelta(days=30)
#: Clé de session de la dernière demande de l'inscription : W18 l'affiche même après la purge du compte refusé.
CONSENT_SESSION_KEY = "learner_signup_consent"

CONSENT_SMS = (
    "Steamy : votre enfant demande votre accord pour s'inscrire sur Steamy. "
    "Pour voir la demande et répondre : {url}"
)


# --- Code de reprise ----------------------------------------------------------------------------


def new_resume_code() -> str:
    raw = "".join(secrets.choice(RESUME_ALPHABET) for _ in range(RESUME_LENGTH))
    return f"{raw[:4]}-{raw[4:]}"


def normalize_resume_code(code: str) -> str:
    compact = "".join(ch for ch in (code or "").upper() if ch.isalnum())
    return f"{compact[:4]}-{compact[4:]}"


# --- Inscription --------------------------------------------------------------------------------


def username_available(username: str) -> bool:
    return (
        not User.objects.annotate(lower=Lower("username")).filter(lower=username.lower()).exists()
    )


def create_learner_signup(first_name, last_name, username, age) -> tuple[User, str]:
    """Crée le compte en attente et renvoie le code de reprise en clair (une seule fois)."""
    code = new_resume_code()
    with transaction.atomic():
        learner = User.objects.create_learner(
            username,
            first_name=first_name,
            last_name=last_name,
            status=User.Status.PENDING,
        )
        LearnerProfile.objects.create(user=learner, declared_age=age)
        SignupSession.objects.create(
            learner=learner,
            resume_code_hash=make_password(code),
            expires_at=timezone.now() + SIGNUP_LIFETIME,
        )
    return learner, code


def signup_from_session(request) -> SignupSession:
    """Inscription rattachée à la session ; `NOT_FOUND` sans inscription, `SIGNUP_EXPIRED` si elle a expiré."""
    signup = (
        SignupSession.objects.select_related("learner", "learner__learner_profile")
        .filter(learner_id=request.session.get(SESSION_KEY), learner__status=User.Status.PENDING)
        .first()
    )
    if signup is None:
        raise ApiError("NOT_FOUND", "Aucune inscription en cours.")
    if signup.expires_at <= timezone.now():
        raise ApiError("SIGNUP_EXPIRED")
    return signup


def resume_signup(username: str, code: str) -> SignupSession:
    """Reprise sur un autre appareil (C5). Même erreur, et même durée, que l'identifiant existe ou non."""
    signup = (
        SignupSession.objects.select_related("learner")
        .filter(learner__username__iexact=username, learner__status=User.Status.PENDING)
        .first()
    )
    encoded = signup.resume_code_hash if signup else None
    valid = check_password(normalize_resume_code(code), encoded) if encoded else False
    if not encoded:
        make_password(code)  # hachage factice : durée constante
    if not valid:
        raise ApiError("RESUME_CODE_INVALID")
    if signup.expires_at <= timezone.now():
        raise ApiError("SIGNUP_EXPIRED")
    return signup


def matches_pending_password(user: User, password: str) -> bool:
    """Un compte en attente n'a pas de mot de passe : son code de reprise en tient lieu sur W16 (C5)."""
    signup = getattr(user, "signup_session", None)
    if signup is None:
        return False
    return check_password(normalize_resume_code(password), signup.resume_code_hash)


def current_consent_request(learner: User) -> ConsentRequest | None:
    return learner.consent_requests.order_by("-created_at").first()


# --- Demande de consentement ---------------------------------------------------------------------


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def consent_url(token: str) -> str:
    return f"{settings.WEB_URL}/consentement/{token}"


def send_consent_sms(consent: ConsentRequest, ip: str, text: str = CONSENT_SMS) -> None:
    """Nouveau jeton à chaque envoi : seul le dernier lien reçu est valable."""
    consume_send_quota(consent.parent_phone, ip, PlatformSettings.load())
    token = secrets.token_urlsafe(24)
    consent.token_hash = hash_token(token)
    consent.last_sent_at = timezone.now()
    consent.save(update_fields=["token_hash", "last_sent_at", "updated_at"])
    queue_sms(consent.parent_phone, text.format(url=consent_url(token)), purpose="consent")


def _same_child(subject: dict, learner: User) -> bool:
    def key(first, last):
        return (first or "").strip().casefold(), (last or "").strip().casefold()

    return key(subject.get("first_name"), subject.get("last_name")) == key(
        learner.first_name, learner.last_name
    )


def check_cooldown(phone: str) -> None:
    """Le délai de 30 jours après un refus s'applique au numéro du parent, quel que soit l'enfant (C9)."""
    if ConsentRequest.objects.filter(
        parent_phone=phone,
        status=ConsentRequest.Status.REFUSED,
        resolved_at__gt=timezone.now() - REFUSAL_COOLDOWN,
    ).exists():
        raise ApiError("CONSENT_COOLDOWN")


def create_learner_consent_request(
    signup: SignupSession, phone, relationship, ip
) -> ConsentRequest:
    """
    W06. Une nouvelle demande du même apprenant remplace sa demande en attente (numéro corrigé). C14 : une demande
    en attente vers le même numéro pour le **même enfant** (prénom et nom), venant d'une inscription abandonnée, est
    annulée et son compte en attente purgé, ce qui libère l'identifiant. Les demandes d'un frère ou d'une sœur
    vers le même parent ne sont pas touchées.
    """
    learner = signup.learner
    now = timezone.now()
    check_cooldown(phone)
    with transaction.atomic():
        pending = ConsentRequest.objects.select_for_update().filter(
            status=ConsentRequest.Status.PENDING, origin=ConsentRequest.Origin.LEARNER
        )
        pending.filter(learner=learner).update(
            status=ConsentRequest.Status.CANCELLED, resolved_at=now, token_hash=""
        )
        abandoned = [
            consent
            for consent in pending.filter(parent_phone=phone)
            if consent.learner_id
            and consent.learner_id != learner.pk
            and _same_child(consent.subject, learner)
        ]
        for consent in abandoned:
            consent.status = ConsentRequest.Status.CANCELLED
            consent.resolved_at = now
            consent.token_hash = ""
            consent.save(update_fields=["status", "resolved_at", "token_hash", "updated_at"])
            if consent.learner.status == User.Status.PENDING:
                consent.learner.delete()
        expires_at = now + SIGNUP_LIFETIME
        consent = ConsentRequest.objects.create(
            origin=ConsentRequest.Origin.LEARNER,
            subject={
                "first_name": learner.first_name,
                "last_name": learner.last_name,
                "username": learner.username,
                "age": learner.learner_profile.declared_age,
                "relationship": relationship.code,
            },
            learner=learner,
            requested_by=learner,
            parent_phone=phone,
            relationship=relationship,
            expires_at=expires_at,
        )
        signup.expires_at = expires_at
        signup.save(update_fields=["expires_at", "updated_at"])
        send_consent_sms(consent, ip)
    return consent


def resend_consent_request(consent: ConsentRequest, ip: str) -> ConsentRequest:
    if consent.status != ConsentRequest.Status.PENDING:
        raise ApiError("CONSENT_ALREADY_RESOLVED")
    if consent.expires_at <= timezone.now():
        raise ApiError("CONSENT_REQUEST_EXPIRED")
    if consent_resend_in_seconds(consent) > 0:
        raise ApiError("OTP_RESEND_TOO_EARLY", "Patiente un peu avant de renvoyer le SMS.")
    send_consent_sms(consent, ip)
    return consent


def consent_resend_in_seconds(consent: ConsentRequest) -> int:
    delay = timedelta(seconds=PlatformSettings.load().otp_resend_delay_seconds)
    if consent.last_sent_at is None or consent.status != ConsentRequest.Status.PENDING:
        return 0
    remaining = (consent.last_sent_at + delay - timezone.now()).total_seconds()
    return max(0, int(remaining + 0.999))
