"""
Décision du parent sur une demande de consentement (WP04-WP06, WP11-WP12, §4.2, D20, D22, C9).

Toujours tranchée par le parent dont le numéro **vérifié** est celui de la demande (D70). Le lien SMS (jeton) ne
sert qu'à retrouver la demande : `preview` ne montre que le numéro masqué, sans rien de l'enfant ; `claim` la
rattache au parent connecté et consomme le jeton.
"""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.core.audit import audit
from libs.errors import ApiError

from .models import ConsentRequest, ParentChildLink, User
from .signup import hash_token

#: Demandes closes conservées 30 jours (C9), puis supprimées (`purge_refused_requests`).
RETENTION = timedelta(days=30)

Status = ConsentRequest.Status


def effective_status(consent: ConsentRequest) -> str:
    """Une demande en attente échue est expirée, même avant le passage de `expire_consent_requests`."""
    if consent.status == Status.PENDING and consent.expires_at <= timezone.now():
        return Status.EXPIRED
    return consent.status


def ensure_open(consent: ConsentRequest) -> None:
    status = effective_status(consent)
    if status == Status.EXPIRED or (status == Status.PENDING and consent.learner_id is None):
        raise ApiError("CONSENT_REQUEST_EXPIRED")
    if status != Status.PENDING:
        raise ApiError("CONSENT_ALREADY_RESOLVED")


def find_by_token(token: str) -> ConsentRequest:
    consent = ConsentRequest.objects.filter(token_hash=hash_token(token or "")).first()
    if not token or consent is None:
        raise ApiError("NOT_FOUND", "Ce lien n'est plus valable.")
    return consent


def for_parent(parent: User):
    """Demandes adressées au numéro vérifié du parent (WP04) : un parent ne voit jamais celles d'un autre."""
    return ConsentRequest.objects.filter(parent_phone=parent.phone).select_related(
        "relationship", "refusal_reason"
    )


def claim(token: str, parent: User) -> ConsentRequest:
    """Lien SMS ouvert par un parent connecté : la demande lui est rattachée et le jeton consommé."""
    consent = find_by_token(token)
    if consent.parent_phone != parent.phone:
        raise ApiError("CONSENT_PHONE_MISMATCH")
    ensure_open(consent)
    consent.parent = parent
    consent.token_hash = ""
    consent.save(update_fields=["parent", "token_hash", "updated_at"])
    return consent


def accept(consent_id, parent: User, request=None) -> ConsentRequest:
    with transaction.atomic():
        consent = for_parent(parent).select_for_update(of=("self",)).filter(pk=consent_id).first()
        if consent is None:
            raise ApiError("NOT_FOUND")
        ensure_open(consent)
        ParentChildLink.objects.create(
            parent=parent,
            learner_id=consent.learner_id,
            relationship=consent.relationship,
            consent_request=consent,
        )
        consent.status = Status.ACCEPTED
        consent.parent = parent
        consent.resolved_at = timezone.now()
        consent.token_hash = ""
        consent.save()
        audit("consent.accepted", actor=parent, target=consent, request=request)
    return consent


def refuse(consent_id, parent: User, reason, note: str = "", request=None) -> ConsentRequest:
    """Refus : la demande est close et gardée 30 jours ; le compte en attente est purgé, l'identifiant libéré (D22)."""
    with transaction.atomic():
        consent = for_parent(parent).select_for_update(of=("self",)).filter(pk=consent_id).first()
        if consent is None:
            raise ApiError("NOT_FOUND")
        ensure_open(consent)
        learner = consent.learner
        consent.status = Status.REFUSED
        consent.parent = parent
        consent.refusal_reason = reason
        consent.refusal_note = note
        consent.resolved_at = timezone.now()
        consent.token_hash = ""
        consent.save()
        if learner.status == User.Status.PENDING:
            learner.delete()
            consent.learner = None
        audit(
            "consent.refused",
            actor=parent,
            target=consent,
            data={"reason": reason.code},
            request=request,
        )
    return consent
