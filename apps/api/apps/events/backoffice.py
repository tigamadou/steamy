"""
Refus exceptionnel d'une candidature par le personnel (WAD12, C3, LOT-6 6.5). Le personnel ne sélectionne pas : il
suit, et peut seulement annuler une candidature en cours pour un motif sérieux (comportement, doublon…). La place est
rendue, l'enfant et son parent sont prévenus et, si la candidature était payée, un remboursement est créé, à traiter
par la Finance. Aucune voie ne fait passer une candidature à « acceptée » : seuls l'accord du parent et le paiement
la confirment (S3).
"""

from django.db import transaction
from django.utils import timezone

from apps.core.audit import audit

from .models import EventApplication


class RefusalError(ValueError):
    """Refus impossible : le message est affiché tel quel dans l'admin."""


def paid_payment(application: EventApplication):
    """Paiement réussi de la commande payée de cette candidature, s'il y en a un."""
    from apps.payments.models import Order, Payment

    return (
        Payment.objects.filter(
            status=Payment.Status.SUCCEEDED,
            order__status=Order.Status.PAID,
            order__items__event_application=application,
        )
        .select_related("order")
        .first()
    )


def refuse_exceptionally(application: EventApplication, reason: str, user, request=None):
    """Annule la candidature en cours ; renvoie le remboursement créé (candidature payée) ou `None`."""
    from apps.notifications.models import Category
    from apps.notifications.services import notify
    from apps.payments.models import Refund

    with transaction.atomic():
        application = (
            EventApplication.objects.select_for_update()
            .select_related("event", "learner")
            .get(pk=application.pk)
        )
        if application.status not in EventApplication.ACTIVE:
            raise RefusalError(f"{application} : la candidature n'est plus en cours.")
        application.status = EventApplication.Status.CANCELLED
        application.refusal_reason = reason
        application.ticket = None
        application.save(update_fields=["status", "refusal_reason", "ticket", "updated_at"])

        payment = paid_payment(application)
        refund = None
        if payment is not None:
            item = payment.order.items.get(event_application=application)
            refund = Refund.objects.create(
                payment=payment, amount=item.total, reason=f"Refus exceptionnel : {reason}"
            )
        audit(
            "event_application.refused_by_staff",
            request=request,
            actor=user,
            target=application,
            data={"reason": reason, "refund": refund.pk if refund else None},
        )

        event = application.event
        notify(
            application.learner,
            Category.EVENTS,
            "event_cancelled",
            f"Ta candidature à {event.title} est annulée",
            reason,
            url="/apprenant/evenements",
            tone="warning",
            icon=event.emoji or "🎟️",
        )
        link = getattr(application.learner, "parent_link", None)
        if link is not None:
            refunded = " Le paiement vous sera remboursé." if refund else ""
            notify(
                link.parent,
                Category.EVENTS,
                "event_cancelled",
                f"Candidature de {application.learner.first_name} à {event.title} annulée",
                f"{reason}{refunded}",
                url="/parent/evenements",
                tone="warning",
                icon=event.emoji or "🎟️",
            )
    return refund


def applicant_age(application: EventApplication) -> int | None:
    """Âge de l'apprenant à ce jour (date de naissance du profil, sinon âge déclaré)."""
    from apps.accounts.views.profiles import age_on

    profile = getattr(application.learner, "learner_profile", None)
    if profile is None:
        return None
    if profile.birth_date:
        return age_on(profile.birth_date, timezone.localdate())
    return profile.declared_age
