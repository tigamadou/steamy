"""
Candidatures aux Steamy Events (S8, D41, D53, C3, C12) : règles côté serveur, appelées par les vues et par
l'exécution post-paiement.

- L'apprenant candidate : la candidature attend l'accord de son parent (`pending_parent`), qui l'accepte ou la
  refuse (WPD06, API-L4.2) ; accepter un événement payant revient à l'inscrire lui-même (place et commande).
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


def pending_for_parent(parent, application_id) -> EventApplication:
    """Candidature d'un enfant du parent qui attend sa décision ; celle d'une autre famille → 404."""
    application = (
        EventApplication.objects.select_for_update(of=("self",))
        .select_related("event", "learner")
        .filter(pk=application_id, learner_id__in=children_of(parent))
        .first()
    )
    if application is None:
        raise ApiError("NOT_FOUND")
    if application.status != EventApplication.Status.PENDING_PARENT:
        raise ApiError("APPLICATION_ALREADY_RESOLVED")
    return application


@transaction.atomic
def accept(parent, application_id):
    """
    WPD06 « Accepter » (D53) : gratuit ou couvert par un ticket → confirmée ; payant → place réservée et commande
    d'événement à payer par le parent, confirmée au paiement. Renvoie `(candidature, commande ou None)`.
    """
    application = pending_for_parent(parent, application_id)
    event = lock_open_event(application.event)
    if event.seats_left <= 0:
        raise ApiError("EVENT_FULL")
    application.parent_decided_at = timezone.now()
    order = None
    if event.price > 0 and application.ticket_id is None:
        application.status = EventApplication.Status.PENDING_PAYMENT
        order = event_order(application, payer=parent)
    else:
        application.status = EventApplication.Status.ACCEPTED
        tell_learner_confirmed(application)
    application.save(update_fields=["status", "parent_decided_at", "updated_at"])
    return application, order


@transaction.atomic
def refuse(parent, application_id, reason: str = "") -> EventApplication:
    """WPD06 « Refuser » : motif facultatif ; le ticket éventuel est rendu ; l'enfant est prévenu."""
    from apps.notifications.models import Category
    from apps.notifications.services import notify

    application = pending_for_parent(parent, application_id)
    application.status = EventApplication.Status.REFUSED
    application.refusal_reason = reason
    application.parent_decided_at = timezone.now()
    application.ticket = None
    application.save(
        update_fields=["status", "refusal_reason", "parent_decided_at", "ticket", "updated_at"]
    )
    notify(
        application.learner,
        Category.EVENTS,
        "event_refused",
        f"Ton parent n'a pas accepté ta candidature à {application.event.title}",
        reason,
        url="/apprenant/evenements",
        tone="warning",
        icon=application.event.emoji or "🎟️",
    )
    return application


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
