"""
« À valider » du parent (WPD01, D52, §4.2) : tout ce qui attend sa décision, une ligne par demande, la plus récente
d'abord. La longueur de la liste est la statistique « À valider ».

Chaque type a sa source ; les demandes de paiement (API-L3b.5) et les candidatures aux événements (API-L3b.6)
s'ajoutent à `SOURCES` quand leurs modèles existent.
"""

from dataclasses import dataclass
from datetime import datetime

from . import consent as consent_service
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


SOURCES = [consents, deletions]


def for_parent(parent: User) -> list[PendingAction]:
    actions = [action for source in SOURCES for action in source(parent)]
    return sorted(actions, key=lambda action: action.created_at, reverse=True)
