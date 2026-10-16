"""
Candidatures aux Steamy Events (S8, D41, D53, C3, C12) : règles côté serveur, appelées par les vues et par
l'exécution post-paiement.

- L'apprenant candidate : la candidature attend l'accord de son parent (`pending_parent`, décision en API-L4).
- Le parent inscrit son enfant (WPD12) : c'est son accord. Gratuit ou couvert par un ticket → confirmée tout de
  suite ; payant → place réservée (`pending_payment`) et commande d'événement à payer, confirmée au paiement.
- Les places se comptent sous verrou de l'événement : premier arrivé, premier servi (C3).
"""

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import ParentChildLink
from libs.errors import ApiError

from .models import EventApplication, EventTicket, SteamyEvent


def lock_open_event(event: SteamyEvent) -> SteamyEvent:
    event = SteamyEvent.objects.select_for_update().get(pk=event.pk)
    if (
        event.status != SteamyEvent.Status.PUBLISHED
        or event.application_deadline <= timezone.now()
        or event.is_past
    ):
        raise ApiError("EVENT_CLOSED")
    return event


def free_ticket(learner):
    """Ticket offert à la certification et pas encore utilisé (D33), le plus ancien d'abord."""
    return (
        EventTicket.objects.select_for_update(of=("self",))
        .filter(learner=learner, used_by__isnull=True)
        .order_by("created_at", "id")
        .first()
    )


@transaction.atomic
def apply(event: SteamyEvent, learner, *, applied_by, motivation="", self_level=""):
    """Crée la candidature. Renvoie `(candidature, commande à payer ou None)`."""
    event = lock_open_event(event)
    if EventApplication.objects.filter(
        event=event, learner=learner, status__in=EventApplication.ACTIVE
    ).exists():
        raise ApiError("ALREADY_APPLIED")
    if event.seats_left <= 0:
        raise ApiError("EVENT_FULL")
    ticket = free_ticket(learner) if event.price > 0 else None
    by_parent = applied_by != learner
    application = EventApplication.objects.create(
        event=event,
        learner=learner,
        applied_by=applied_by,
        motivation=motivation,
        self_level=self_level,
        ticket=ticket,
        status=EventApplication.Status.PENDING_PARENT,
    )
    order = None
    if by_parent:
        application.parent_decided_at = timezone.now()
        if event.price > 0 and ticket is None:
            application.status = EventApplication.Status.PENDING_PAYMENT
            order = event_order(application, payer=applied_by)
        else:
            application.status = EventApplication.Status.ACCEPTED
            tell_learner_confirmed(application)
        application.save(update_fields=["status", "parent_decided_at"])
    else:
        tell_parent(application)
    return application, order


def event_order(application: EventApplication, *, payer):
    """Commande d'événement payée par le parent (D53) ; expire comme les autres (30 min), ce qui rend la place."""
    from apps.payments import pricing
    from apps.payments.models import Order
    from apps.payments.orders import create_order

    order, _ = create_order(
        kind=Order.Kind.EVENT,
        quote=pricing.quote([pricing.event_line(application)]),
        payer=payer,
        beneficiary=application.learner,
    )
    return order


def confirm(application: EventApplication) -> None:
    """Exécution post-paiement : la place réservée est confirmée."""
    application.status = EventApplication.Status.ACCEPTED
    application.save(update_fields=["status", "updated_at"])
    tell_learner_confirmed(application)


def release(application: EventApplication) -> None:
    """Paiement non abouti à l'échéance : la place est rendue (C3) et le ticket éventuel aussi."""
    if application.status != EventApplication.Status.PENDING_PAYMENT:
        return
    application.status = EventApplication.Status.CANCELLED
    application.refusal_reason = "Paiement non abouti."
    application.save(update_fields=["status", "refusal_reason", "updated_at"])


def reacquire_seat(application: EventApplication) -> bool:
    """Paiement tardif (C17) : la place est reprise si l'événement en a encore une."""
    event = SteamyEvent.objects.select_for_update().get(pk=application.event_id)
    if application.status == EventApplication.Status.PENDING_PAYMENT:
        return True
    if (
        event.seats_left <= 0
        or EventApplication.objects.filter(
            event=event, learner=application.learner_id, status__in=EventApplication.ACTIVE
        ).exists()
    ):
        return False
    application.status = EventApplication.Status.PENDING_PAYMENT
    application.refusal_reason = ""
    application.save(update_fields=["status", "refusal_reason", "updated_at"])
    return True


def children_of(parent):
    return ParentChildLink.objects.filter(parent=parent).values_list("learner_id", flat=True)


# --- Messages ------------------------------------------------------------------------------------


def tell_parent(application: EventApplication) -> None:
    from apps.notifications.models import Category
    from apps.notifications.services import notify

    link = (
        ParentChildLink.objects.filter(learner=application.learner).select_related("parent").first()
    )
    if (
        link is None
    ):  # pragma: no cover - un apprenant actif a toujours un parent (consentement, S3)
        return
    notify(
        link.parent,
        Category.EVENTS,
        "event_application",
        f"{application.learner.first_name} veut participer à {application.event.title}",
        "Acceptez ou refusez sa candidature.",
        url="/parent/evenements",
        tone="info",
        icon=application.event.emoji or "🎟️",
    )


def tell_learner_confirmed(application: EventApplication) -> None:
    from apps.notifications.models import Category
    from apps.notifications.services import notify

    notify(
        application.learner,
        Category.EVENTS,
        "event_confirmed",
        f"Ta place à {application.event.title} est confirmée",
        "",
        url="/apprenant/evenements",
        tone="success",
        icon=application.event.emoji or "🎟️",
    )
