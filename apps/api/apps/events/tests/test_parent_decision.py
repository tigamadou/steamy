"""
Décision du parent sur la candidature de son enfant (WPD06, API-L4.2, S8, D53, C3) : accepter (gratuit, ticket,
payant → commande à payer) ou refuser ; l'apprenant ne décide jamais ; rien d'une autre famille.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import ParentFactory
from apps.events.models import EventApplication, EventTicket
from apps.learning.tests.factories import EnrollmentFactory
from apps.notifications.models import Notification
from apps.payments.models import Order
from apps.payments.tests.factories import link_child

from .factories import SteamyEventFactory

pytestmark = pytest.mark.django_db


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def parent():
    return ParentFactory()


@pytest.fixture
def child(parent):
    return link_child(parent)


def candidacy(child, **event_fields):
    event = SteamyEventFactory(**event_fields)
    resp = client_for(child).post(f"/api/events/{event.slug}/applications/", {}, format="json")
    assert resp.status_code == 201, resp.json()
    return EventApplication.objects.get(pk=resp.json()["id"])


def accept(user, application):
    return client_for(user).post(f"/api/events/applications/{application.pk}/accept/")


def refuse(user, application, **body):
    return client_for(user).post(
        f"/api/events/applications/{application.pk}/refuse/", body, format="json"
    )


def test_free_event_is_confirmed_and_the_child_told(parent, child):
    application = candidacy(child, price=0)
    resp = accept(parent, application)
    assert resp.status_code == 200, resp.json()
    assert resp.json()["status"] == "accepted"
    assert resp.json()["parentDecidedAt"]
    assert Notification.objects.filter(user=child, type="event_confirmed").exists()
    again = accept(parent, application)
    assert again.status_code == 409
    assert again.json()["code"] == "APPLICATION_ALREADY_RESOLVED"


def test_paid_event_reserves_the_seat_and_creates_the_order(parent, child):
    application = candidacy(child, price=5000)
    resp = accept(parent, application)
    assert resp.json()["status"] == "pending_payment"
    order = Order.objects.get(reference=resp.json()["orderReference"])
    assert (order.kind, order.payer, order.beneficiary, order.total) == (
        Order.Kind.EVENT,
        parent,
        child,
        5000,
    )


def test_a_ticket_makes_a_paid_event_free(parent, child):
    EventTicket.objects.create(learner=child, enrollment=EnrollmentFactory(learner=child))
    application = candidacy(child, price=5000)
    assert accept(parent, application).json()["status"] == "accepted"
    assert not Order.objects.exists()


def test_full_or_closed_event(parent, child):
    application = candidacy(child, capacity=1)
    application.event.seats_reserved = 1
    application.event.save()
    assert accept(parent, application).json()["code"] == "EVENT_FULL"
    application = candidacy(child)
    application.event.status = "draft"
    application.event.save()
    assert accept(parent, application).json()["code"] == "EVENT_CLOSED"


def test_refusal_releases_the_ticket_and_tells_the_child(parent, child):
    ticket = EventTicket.objects.create(learner=child, enrollment=EnrollmentFactory(learner=child))
    application = candidacy(child, price=5000)
    resp = refuse(parent, application, reason="Nous partons en vacances")
    assert resp.status_code == 200
    assert resp.json()["status"] == "refused"
    assert resp.json()["refusalReason"] == "Nous partons en vacances"
    application.refresh_from_db()
    assert application.ticket is None
    ticket.refresh_from_db()
    assert not hasattr(ticket, "used_by") or ticket.used_by is None
    assert Notification.objects.filter(user=child, type="event_refused").exists()
    assert refuse(parent, application).status_code == 409


def test_the_learner_cannot_decide_and_another_family_does_not_see_it(child):
    application = candidacy(child)
    assert accept(child, application).status_code == 403
    assert refuse(child, application).status_code == 403
    other = ParentFactory()
    assert accept(other, application).status_code == 404
    assert refuse(other, application).status_code == 404
    application.refresh_from_db()
    assert application.status == EventApplication.Status.PENDING_PARENT
