"""
WAD12 · Steamy Events dans l'admin Django (LOT-6 6.5) : événements saisis par Contenu ; candidatures suivies par le
Support, statut en lecture seule ; seul le refus exceptionnel motivé les modifie (C3), avec remboursement d'une
candidature payée. Aucune voie de l'admin ne confirme une candidature (S3).
"""

import datetime

import pytest
from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import LearnerProfile
from apps.accounts.tests.factories import ParentFactory
from apps.core.groups import CONTENT, FINANCE, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import verified_client
from apps.events.models import EventApplication
from apps.notifications.models import Notification
from apps.payments.models import Order, OrderItem, Payment, Refund
from apps.payments.tests.factories import OrderFactory, PaymentFactory, link_child

from .factories import SteamyEventFactory

pytestmark = pytest.mark.django_db

APPLICATIONS = reverse("admin:events_eventapplication_changelist")


def member(group):
    client = APIClient()
    verified_client(client, group)
    return client


def application(status=EventApplication.Status.PENDING_PARENT, **event_fields):
    parent = ParentFactory()
    child = link_child(parent)
    event = SteamyEventFactory(**event_fields)
    return EventApplication.objects.create(
        event=event, learner=child, applied_by=child, status=status
    )


def paid(app: EventApplication) -> Payment:
    order = OrderFactory(
        kind=Order.Kind.EVENT, items=[], paid=True, payer=app.learner.parent_link.parent
    )
    OrderItem.objects.create(
        order=order,
        event=app.event,
        event_application=app,
        title=app.event.title,
        unit_price=2000,
        quantity=1,
        total=2000,
    )
    return PaymentFactory(order=order, status=Payment.Status.SUCCEEDED, amount=2000)


def refuse(client, apps, **extra):
    # Les notifications partent après la transaction (`on_commit`) : exécutées ici comme en production
    with TestCase.captureOnCommitCallbacks(execute=True):
        return client.post(
            APPLICATIONS,
            {"action": "refuse", "_selected_action": [a.pk for a in apps], **extra},
            follow=True,
        )


def texts(response):
    return [str(message) for message in get_messages(response.wsgi_request)]


def test_support_refuses_an_application_with_a_reason_and_both_are_told():
    support = member(SUPPORT)
    app = application()
    form = refuse(support, [app])
    assert "Motif (communiqué à l&#x27;enfant et à son parent)" in form.content.decode()
    refuse(support, [app], apply="1", reason="")  # motif obligatoire
    app.refresh_from_db()
    assert app.status == EventApplication.Status.PENDING_PARENT

    response = refuse(support, [app], apply="1", reason="Inscription en double.")
    assert "Candidatures annulées : 1." in texts(response)
    app.refresh_from_db()
    assert (app.status, app.refusal_reason) == ("cancelled", "Inscription en double.")
    parent = app.learner.parent_link.parent
    assert Notification.objects.filter(user=app.learner, type="event_cancelled").exists()
    assert (
        Notification.objects.get(user=parent, type="event_cancelled").message
        == "Inscription en double."
    )
    assert AuditLog.objects.filter(
        action="event_application.refused_by_staff", target_id=str(app.pk)
    ).exists()
    assert not Refund.objects.exists()


def test_refusing_a_paid_application_frees_the_seat_and_creates_a_refund():
    support = member(SUPPORT)
    app = application(EventApplication.Status.ACCEPTED, price=2000, capacity=3)
    payment = paid(app)
    seats_before = app.event.seats_left
    response = refuse(support, [app], apply="1", reason="Comportement")
    assert any("remboursement de 2000 FCFA créé" in message for message in texts(response))
    refund = Refund.objects.get()
    assert (refund.payment, refund.amount, refund.processed) == (payment, 2000, False)
    app.event.refresh_from_db()
    assert app.event.seats_left == seats_before + 1
    parent = app.learner.parent_link.parent
    assert "remboursé" in Notification.objects.get(user=parent, type="event_cancelled").message


def test_an_application_no_longer_running_cannot_be_refused():
    support = member(SUPPORT)
    app = application(EventApplication.Status.REFUSED)
    response = refuse(support, [app], apply="1", reason="Doublon")
    assert any("la candidature n'est plus en cours" in message for message in texts(response))


def test_a_learner_without_parent_link_is_told_alone():
    from apps.accounts.tests.factories import LearnerFactory

    learner = LearnerFactory()
    app = EventApplication.objects.create(
        event=SteamyEventFactory(), learner=learner, applied_by=learner, status="pending_parent"
    )
    refuse(member(SUPPORT), [app], apply="1", reason="Doublon")
    assert Notification.objects.filter(type="event_cancelled").count() == 1


def test_no_admin_path_accepts_an_application():
    app = application()
    for group in (SUPPORT, CONTENT, FINANCE):
        client = member(group)
        change = reverse("admin:events_eventapplication_change", args=[app.pk])
        assert client.post(change, {"status": "accepted"}).status_code == 403
        response = client.get(APPLICATIONS)
        form = response.context["action_form"] if response.status_code == 200 else None
        names = [name for name, _ in form.fields["action"].choices] if form else []
        # Seul le Support refuse ; personne n'a d'action qui confirme
        assert names == (["", "refuse"] if group == SUPPORT else [])
    app.refresh_from_db()
    assert app.status == EventApplication.Status.PENDING_PARENT


def test_content_cannot_refuse_but_edits_events():
    content = member(CONTENT)
    event = SteamyEventFactory(price=0)
    assert (
        content.get(reverse("admin:events_steamyevent_change", args=[event.pk])).status_code == 200
    )
    listing = content.get(reverse("admin:events_steamyevent_changelist")).content.decode()
    assert "Gratuit" in listing and "Maison des jeunes" in listing
    SteamyEventFactory(price=5000)
    assert (
        "5 000 FCFA" in content.get(reverse("admin:events_steamyevent_changelist")).content.decode()
    )


def test_application_list_shows_age_parent_decision_and_payment():
    support = member(SUPPORT)
    with_birth = application()
    LearnerProfile.objects.update_or_create(
        user=with_birth.learner,
        defaults={"birth_date": datetime.date(2014, 1, 1), "declared_age": None},
    )
    declared = application(price=2000)
    LearnerProfile.objects.update_or_create(
        user=declared.learner, defaults={"birth_date": None, "declared_age": 13}
    )
    paid_app = application(EventApplication.Status.ACCEPTED, price=2000)
    paid(paid_app)
    listing = support.get(APPLICATIONS).content.decode()
    assert "Sans paiement" in listing and "Non payée" in listing and "Payée" in listing
    assert ">13<" in listing


def test_age_is_unknown_without_profile():
    from apps.events.backoffice import applicant_age

    app = application()
    LearnerProfile.objects.filter(user=app.learner).delete()
    app.learner.refresh_from_db()
    assert applicant_age(EventApplication.objects.get(pk=app.pk)) is None


def test_a_payment_after_a_staff_refusal_is_refunded_never_accepted():
    """Refus en attente de paiement : la commande est annulée ; un paiement reçu ensuite part en remboursement (C17)."""
    from apps.payments.fulfillment import settle

    support = member(SUPPORT)
    app = application(EventApplication.Status.PENDING_PAYMENT, price=2000)
    order = OrderFactory(kind=Order.Kind.EVENT, items=[], payer=app.learner.parent_link.parent)
    OrderItem.objects.create(
        order=order,
        event=app.event,
        event_application=app,
        title=app.event.title,
        unit_price=2000,
        quantity=1,
        total=2000,
    )
    refuse(support, [app], apply="1", reason="Comportement")
    order.refresh_from_db()
    assert order.status == Order.Status.CANCELLED

    payment = PaymentFactory(order=order, status=Payment.Status.SUCCEEDED, amount=2000)
    settle(order, payment)
    app.refresh_from_db()
    order.refresh_from_db()
    assert app.status == EventApplication.Status.CANCELLED
    assert order.status == Order.Status.REFUNDED
    assert Refund.objects.filter(payment=payment, amount=2000).exists()


def test_confirm_and_reacquire_ignore_a_staff_refusal():
    from apps.events.applications import PAYMENT_TIMEOUT_REASON, confirm, reacquire_seat

    app = application(EventApplication.Status.CANCELLED)
    app.refusal_reason = "Comportement"
    app.save()
    confirm(app)
    assert reacquire_seat(app) is False
    app.refresh_from_db()
    assert app.status == EventApplication.Status.CANCELLED
    # Un paiement non abouti, lui, se relance
    app.refusal_reason = PAYMENT_TIMEOUT_REASON
    app.save()
    assert reacquire_seat(app) is True


def _queries(client, url) -> int:
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    client.get(url)  # échauffement : session, types de contenu
    with CaptureQueriesContext(connection) as queries:
        assert client.get(url).status_code == 200
    return len(queries)


def test_the_lists_do_not_query_per_row():
    support = member(SUPPORT)
    events = reverse("admin:events_steamyevent_changelist")
    for _ in range(3):
        paid(application(EventApplication.Status.ACCEPTED, price=2000))
    few = (_queries(support, APPLICATIONS), _queries(support, events))
    for _ in range(3):
        paid(application(EventApplication.Status.ACCEPTED, price=2000))
    assert (_queries(support, APPLICATIONS), _queries(support, events)) == few
