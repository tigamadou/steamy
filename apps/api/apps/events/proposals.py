"""
Proposition d'un Steamy Event à une classe (WT09, §7.6) : l'enseignant prévient ses élèves actifs et leurs parents.
Rien d'autre : pas d'inscription collective, chaque élève candidate seul avec l'accord de son parent (S8, C3).
"""

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.classrooms.models import ClassroomMembership
from apps.notifications.models import Category
from apps.notifications.services import notify
from libs.errors import ApiError

from .models import EventProposal, SteamyEvent


def propose(event: SteamyEvent, classroom, teacher) -> tuple[EventProposal, int]:
    """Renvoie la proposition et le nombre de personnes notifiées (élèves et parents)."""
    if event.application_deadline <= timezone.now():
        raise ApiError("EVENT_CLOSED")
    try:
        with transaction.atomic():
            proposal = EventProposal.objects.create(
                event=event, classroom=classroom, teacher=teacher
            )
    except IntegrityError:
        raise ApiError("EVENT_ALREADY_PROPOSED") from None
    learners = [
        membership.learner
        for membership in classroom.memberships.filter(
            status=ClassroomMembership.Status.ACTIVE
        ).select_related("learner__parent_link__parent")
    ]
    notified = 0
    for learner in learners:
        notify(
            learner,
            Category.EVENTS,
            "event.proposed",
            f"Ton enseignant te propose un Steamy Event : {event.title}",
            "Si tu veux y participer, envoie ta candidature : ton parent devra l'accepter.",
            url=f"/apprenant/evenements/{event.slug}",
            icon=event.emoji,
        )
        notified += 1
        link = getattr(learner, "parent_link", None)
        if link is not None:
            notify(
                link.parent,
                Category.EVENTS,
                "event.proposed",
                f"L'enseignant de {learner.first_name} propose un Steamy Event : {event.title}",
                f"Classe {classroom.name}. Si {learner.first_name} candidate, vous recevrez une demande d'accord.",
                url="/parent/evenements",
                icon=event.emoji,
            )
            notified += 1
    return proposal, notified
