"""
« À valider » du parent (WPD01, D52, §4.2) : tout ce qui attend sa décision, une ligne par demande, la plus récente
d'abord. La longueur de la liste est la statistique « À valider ».

Une source par type : consentements, demandes de paiement de l'enfant (WPD15), candidatures aux événements (WPD06)
et demandes de suppression (WPD09).
"""

from dataclasses import dataclass
from datetime import datetime

from django.utils import timezone

from . import consent as consent_service
from .children import children_of
from .deletion import requests_for_parent
from .models import ConsentRequest, DeletionRequest, User


@dataclass(frozen=True)
class PendingAction:
    type: str
    id: str
    child_id: int | None
    child_first_name: str
    child_last_name: str
    created_at: datetime
    url: str


def consents(parent: User) -> list[PendingAction]:
    """Demandes de consentement encore ouvertes (WPD05) ; l'enfant n'est pas encore rattaché."""
    pending = consent_service.for_parent(parent).filter(
        status=ConsentRequest.Status.PENDING, learner__isnull=False
    )
    return [
        PendingAction(
            type="consent",
            id=str(consent.pk),
            child_id=None,
            child_first_name=consent.subject.get("first_name", ""),
            child_last_name=consent.subject.get("last_name", ""),
            created_at=consent.created_at,
            url=f"/parent/consentements/{consent.pk}",
        )
        for consent in pending
        if consent_service.effective_status(consent) == ConsentRequest.Status.PENDING
    ]


def deletions(parent: User) -> list[PendingAction]:
    """Demandes de suppression faites par un enfant (WD15), à valider en WPD09."""
    pending = requests_for_parent(parent).filter(status=DeletionRequest.Status.PENDING_PARENT)
    return [
        PendingAction(
            type="deletion_request",
            id=str(deletion.pk),
            child_id=deletion.user_id,
            child_first_name=deletion.user.first_name,
            child_last_name=deletion.user.last_name,
            created_at=deletion.created_at,
            url=f"/parent/enfants/{deletion.user_id}/supprimer?demande={deletion.pk}",
        )
        for deletion in pending
    ]


def payment_requests(parent: User) -> list[PendingAction]:
    """Demandes de paiement de l'enfant encore ouvertes (WPD15)."""
    from apps.payments.models import PaymentRequest

    pending = PaymentRequest.objects.filter(
        parent=parent,
        status=PaymentRequest.Status.PENDING,
        expires_at__gt=timezone.now(),
        requested_by__in=children_of(parent),
    ).select_related("requested_by")
    return [
        PendingAction(
            type="payment_request",
            id=str(request.pk),
            child_id=request.requested_by_id,
            child_first_name=request.requested_by.first_name,
            child_last_name=request.requested_by.last_name,
            created_at=request.created_at,
            url=f"/parent/demandes/{request.pk}",
        )
        for request in pending
    ]


def event_applications(parent: User) -> list[PendingAction]:
    """Candidatures d'un enfant à un Steamy Event, à accepter ou refuser (WPD06)."""
    from apps.events.models import EventApplication

    pending = EventApplication.objects.filter(
        learner__in=children_of(parent), status=EventApplication.Status.PENDING_PARENT
    ).select_related("learner")
    return [
        PendingAction(
            type="event_application",
            id=str(application.pk),
            child_id=application.learner_id,
            child_first_name=application.learner.first_name,
            child_last_name=application.learner.last_name,
            created_at=application.created_at,
            url="/parent/evenements",
        )
        for application in pending
    ]


SOURCES = [consents, payment_requests, event_applications, deletions]


def for_parent(parent: User) -> list[PendingAction]:
    actions = [action for source in SOURCES for action in source(parent)]
    return sorted(actions, key=lambda action: action.created_at, reverse=True)
