"""
Ajout d'élèves par l'enseignant (WT06, D60, C19) : une demande de consentement d'origine `teacher` par élève, tranchée
par le parent (`apps.classrooms.joining`). Aucun compte apprenant n'existe avant l'accord du parent.

- Le SMS au parent ne contient que le lien `/consentement/<jeton>` (ADR 0002) ; il part par Celery après la validation
  de la transaction (`queue_sms`).
- Les invitations en attente comptent dans le quota d'élèves de l'école (C19) ; l'école est verrouillée pendant la
  création, les requêtes concurrentes ne dépassent donc pas le quota.
- Plafond d'invitations par enseignant et par jour (`CLASSROOM_INVITATIONS_PER_DAY`) contre les rafales de SMS.
- Import partiel : chaque ligne valide part dans la limite du quota, les autres reviennent avec leur code.
"""

import secrets
import unicodedata
from dataclasses import dataclass, field
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import ConsentRequest
from apps.accounts.signup import check_cooldown, consent_url, hash_token
from apps.notifications.sms import queue_sms
from libs.errors import ApiError, message_for

from . import quotas
from .models import Classroom, ClassroomMembership

LIFETIME = timedelta(days=7)
INVITATION_SMS = (
    "Steamy : l'enseignant de votre enfant l'invite à rejoindre sa classe sur Steamy. "
    "Pour voir la demande et répondre : {url}"
)

Status = ClassroomMembership.Status


def daily_limit() -> int:
    return settings.CLASSROOM_INVITATIONS_PER_DAY


def phone_daily_limit() -> int:
    return settings.CLASSROOM_INVITATIONS_PER_PHONE_PER_DAY


#: Plafond atteint pour un numéro de parent (même code que le plafond de l'enseignant, message propre).
PHONE_LIMIT_MESSAGE = "Ce parent a reçu trop d'invitations aujourd'hui. Réessayez demain."


def fold(value) -> str:
    """Comparaison des noms sans casse, sans accents ni espaces superflus (« Kémi » = « kemi »)."""
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode()
    return " ".join(text.casefold().split())


@dataclass
class Invitee:
    first_name: str
    last_name: str
    parent_phone: str
    relationship: object  # referentials.Relationship

    def key(self):
        return (fold(self.first_name), fold(self.last_name), self.parent_phone)


@dataclass
class ImportResult:
    created: list = field(default_factory=list)
    errors: list = field(default_factory=list)

    def fail(self, line: int, code: str, data: dict):
        self.errors.append({"line": line, "code": code, "message": message_for(code), "data": data})


def _today():
    start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
    return ConsentRequest.objects.filter(
        origin=ConsentRequest.Origin.TEACHER, created_at__gte=start
    )


def sent_today(teacher) -> int:
    return _today().filter(requested_by=teacher).count()


def sent_today_to(phone: str) -> int:
    """Invitations reçues aujourd'hui par ce numéro de parent, toutes classes confondues."""
    return _today().filter(parent_phone=phone).count()


def _same_child(invitee: Invitee, first_name: str, last_name: str) -> bool:
    return invitee.key()[:2] == (fold(first_name), fold(last_name))


def check_not_in_classroom(classroom: Classroom, invitee: Invitee) -> None:
    """Même enfant (prénom, nom) du même parent : déjà invité et en attente, ou déjà actif dans la classe."""
    seats = classroom.memberships.select_related("consent_request", "learner__parent_link__parent")
    for seat in seats.filter(status=Status.INVITED, consent_request__status="pending"):
        consent = seat.consent_request
        if (
            consent.expires_at > timezone.now()
            and consent.parent_phone == invitee.parent_phone
            and _same_child(invitee, consent.subject["first_name"], consent.subject["last_name"])
        ):
            raise ApiError("ALREADY_IN_CLASSROOM")
    for seat in seats.filter(status=Status.ACTIVE):
        link = getattr(seat.learner, "parent_link", None)
        if (
            link is not None
            and link.parent.phone == invitee.parent_phone
            and _same_child(invitee, seat.learner.first_name, seat.learner.last_name)
        ):
            raise ApiError("ALREADY_IN_CLASSROOM")


def _create(classroom: Classroom, teacher, invitee: Invitee) -> ClassroomMembership:
    token = secrets.token_urlsafe(24)
    now = timezone.now()
    consent = ConsentRequest.objects.create(
        origin=ConsentRequest.Origin.TEACHER,
        subject={
            "first_name": invitee.first_name.strip(),
            "last_name": invitee.last_name.strip(),
            "relationship": invitee.relationship.code,
        },
        requested_by=teacher,
        parent_phone=invitee.parent_phone,
        relationship=invitee.relationship,
        token_hash=hash_token(token),
        expires_at=now + LIFETIME,
        last_sent_at=now,
    )
    queue_sms(
        invitee.parent_phone,
        INVITATION_SMS.format(url=consent_url(token)),
        purpose="classroom_invitation",
    )
    return ClassroomMembership.objects.create(
        classroom=classroom, consent_request=consent, status=Status.INVITED
    )


def invite(classroom: Classroom, teacher, invitee: Invitee) -> ClassroomMembership:
    """WT06 onglet Individuel."""
    with transaction.atomic():
        school = quotas.lock_school(classroom.school)
        quotas.check_offer(school)
        if sent_today(teacher) >= daily_limit():
            raise ApiError("INVITATION_DAILY_LIMIT")
        if sent_today_to(invitee.parent_phone) >= phone_daily_limit():
            raise ApiError("INVITATION_DAILY_LIMIT", PHONE_LIMIT_MESSAGE)
        check_not_in_classroom(classroom, invitee)
        check_cooldown(invitee.parent_phone)
        if quotas.learners_used(school) >= school.learner_quota:
            raise ApiError("LEARNER_QUOTA_EXCEEDED")
        return _create(classroom, teacher, invitee)


def invite_many(classroom: Classroom, teacher, rows, result: ImportResult) -> ImportResult:
    """
    WT06 onglet Import par lot : `rows` = [(ligne, Invitee, données saisies)] déjà validés en forme. Les lignes en
    double dans le fichier ont été écartées par l'appelant.
    """
    with transaction.atomic():
        school = quotas.lock_school(classroom.school)
        quotas.check_offer(school)
        seats_left = school.learner_quota - quotas.learners_used(school)
        sends_left = daily_limit() - sent_today(teacher)
        per_phone = {}
        for line, invitee, data in rows:
            try:
                check_not_in_classroom(classroom, invitee)
                check_cooldown(invitee.parent_phone)
            except ApiError as error:
                result.fail(line, error.default_code, data)
                continue
            if seats_left <= 0:
                result.fail(line, "LEARNER_QUOTA_EXCEEDED", data)
                continue
            phone = invitee.parent_phone
            per_phone.setdefault(phone, sent_today_to(phone))
            if sends_left <= 0 or per_phone[phone] >= phone_daily_limit():
                result.fail(line, "INVITATION_DAILY_LIMIT", data)
                continue
            per_phone[phone] += 1
            result.created.append(_create(classroom, teacher, invitee))
            seats_left -= 1
            sends_left -= 1
    result.errors.sort(key=lambda error: error["line"])
    return result
