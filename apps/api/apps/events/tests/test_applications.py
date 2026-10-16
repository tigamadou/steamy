"""Candidatures aux Steamy Events (API-L3b.6, S8, D53, C3, C12) : accord du parent, places, tickets, paiement."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.events.models import EventApplication, EventTicket
from apps.learning.tests.factories import EnrollmentFactory
from apps.notifications.models import Notification
from apps.payments.models import Order, Refund
from apps.payments.orders import release_expired_orders
from apps.payments.providers import PaymentEvent, PaymentStatus
from apps.payments.tests.factories import PaymentFactory, link_child
from apps.payments.utils import handle_payment_event

from .factories import SteamyEventFactory

pytestmark = pytest.mark.django_db
TICKETS = "/api/events/tickets/"
LIST = "/api/events/applications/"


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def url(event):
    return f"/api/events/{event.slug}/applications/"


@pytest.fixture
def parent():
    return ParentFactory()


@pytest.fixture
def child(parent):
    return link_child(parent)


def ticket_for(learner):
    return EventTicket.objects.create(
        learner=learner, enrollment=EnrollmentFactory(learner=learner)
    )


def pay(order):
    payment = PaymentFactory(order=order)
    handle_payment_event(
        "fake",
        PaymentEvent(
            order.reference,
            payment.provider_transaction_id,
            order.total,
            "XOF",
            PaymentStatus.SUCCEEDED,
        ),
    )
    order.refresh_from_db()


def test_learner_applies_and_waits_for_the_parent(parent, child):
    event = SteamyEventFactory(capacity=2)
    resp = client_for(child).post(
        url(event), {"motivation": "J'adore", "selfLevel": "beginner"}, format="json"
    )
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert (body["status"], body["motivation"], body["selfLevel"]) == (
        "pending_parent",
        "J'adore",
        "beginner",
    )
    assert body["event"]["slug"] == event.slug and body["orderReference"] is None
    assert body["learner"] == {"id": child.pk, "firstName": child.first_name}
    assert Notification.objects.get(user=parent).type == "event_application"
    event.refresh_from_db()
    assert event.seats_left == 2  # la place n'est réservée qu'à l'accord (C3)
    again = client_for(child).post(url(event), {}, format="json")
    assert (again.status_code, again.json()["code"]) == (409, "ALREADY_APPLIED")


def test_parent_registers_a_child_to_a_free_event(parent, child):
    event = SteamyEventFactory(capacity=1)
    resp = client_for(parent).post(url(event), {"childId": child.pk}, format="json")
    assert resp.json()["status"] == "accepted" and resp.json()["parentDecidedAt"]
    assert Notification.objects.get(user=child).type == "event_confirmed"
    assert event.seats_left == 0
    other = link_child(parent)
    full = client_for(parent).post(url(event), {"childId": other.pk}, format="json")
    assert (full.status_code, full.json()["code"]) == (409, "EVENT_FULL")


def test_parent_registration_to_a_paid_event_is_confirmed_by_payment(parent, child):
    event = SteamyEventFactory(price=5000, capacity=1)
    body = client_for(parent).post(url(event), {"childId": child.pk}, format="json").json()
    assert body["status"] == "pending_payment" and body["orderReference"]
    order = Order.objects.get(reference=body["orderReference"])
    assert (order.kind, order.payer, order.beneficiary, order.total) == (
        "event",
        parent,
        child,
        5000,
    )
    assert order.items.get().event == event
    assert event.seats_left == 0  # place réservée à l'accord
    pay(order)
    application = EventApplication.objects.get()
    assert application.status == EventApplication.Status.ACCEPTED
    assert order.status == Order.Status.PAID
    listed = client_for(parent).get(LIST).json()["results"]
    assert listed[0]["orderReference"] == order.reference


def test_a_ticket_makes_the_event_free(parent, child):
    event = SteamyEventFactory(price=5000)
    ticket = ticket_for(child)
    body = client_for(parent).post(url(event), {"childId": child.pk}, format="json").json()
    assert body["status"] == "accepted" and body["ticketUsed"] is True
    assert not Order.objects.exists()
    tickets = client_for(child).get(TICKETS).json()
    assert tickets == [
        {
            "id": ticket.pk,
            "courseSlug": ticket.enrollment.course.slug,
            "courseTitle": ticket.enrollment.course.title,
            "createdAt": tickets[0]["createdAt"],
            "used": True,
            "usedFor": tickets[0]["usedFor"],
        }
    ]
    assert tickets[0]["usedFor"]["slug"] == event.slug


def test_learner_application_reserves_the_ticket(child):
    ticket = ticket_for(child)
    client_for(child).post(url(SteamyEventFactory(price=5000)), {}, format="json")
    assert EventApplication.objects.get().ticket == ticket
    second = client_for(child).post(url(SteamyEventFactory(price=5000)), {}, format="json").json()
    assert second["ticketUsed"] is False
    unused = ticket_for(child)
    assert client_for(child).get(TICKETS).json()[0] == {
        "id": unused.pk,
        "courseSlug": unused.enrollment.course.slug,
        "courseTitle": unused.enrollment.course.title,
        "createdAt": client_for(child).get(TICKETS).json()[0]["createdAt"],
        "used": False,
        "usedFor": None,
    }


def test_free_event_does_not_use_the_ticket(child):
    ticket_for(child)
    client_for(child).post(url(SteamyEventFactory(price=0)), {}, format="json")
    assert EventApplication.objects.get().ticket is None


@pytest.mark.parametrize(
    "event_kwargs",
    [
        {"application_deadline": timezone.now() - timedelta(hours=1)},
        {"past": True},
    ],
)
def test_closed_events_refuse_applications(child, event_kwargs):
    event = SteamyEventFactory(**event_kwargs)
    resp = client_for(child).post(url(event), {}, format="json")
    assert (resp.status_code, resp.json()["code"]) == (409, "EVENT_CLOSED")


def test_unknown_or_draft_events_are_not_found(child):
    assert (
        client_for(child).post(url(SteamyEventFactory(draft=True)), {}, format="json").status_code
        == 404
    )


def test_parent_must_name_one_of_their_children(parent):
    event = SteamyEventFactory()
    for payload in ({}, {"childId": LearnerFactory().pk}):
        resp = client_for(parent).post(url(event), payload, format="json")
        assert (
            resp.status_code == 404 and resp.json()["fields"]["childId"][0]["code"] == "NOT_FOUND"
        )


def test_only_learners_and_parents(child):
    event = SteamyEventFactory()
    assert client_for().post(url(event), {}, format="json").status_code == 401
    assert client_for(TeacherFactory()).post(url(event), {}, format="json").status_code == 403
    assert client_for(TeacherFactory()).get(LIST).status_code == 403
    assert client_for(ParentFactory()).get(TICKETS).status_code == 403


def test_applications_are_scoped(parent, child):
    event = SteamyEventFactory()
    client_for(child).post(url(event), {}, format="json")
    other_parent = ParentFactory()
    other_child = link_child(other_parent)
    client_for(other_child).post(url(event), {}, format="json")
    assert [a["learner"]["id"] for a in client_for(child).get(LIST).json()["results"]] == [child.pk]
    assert [a["learner"]["id"] for a in client_for(parent).get(LIST).json()["results"]] == [
        child.pk
    ]
    assert client_for(other_child).get(TICKETS).json() == []


def test_unpaid_event_order_releases_the_seat_and_late_payment_takes_it_back(parent, child):
    event = SteamyEventFactory(price=5000, capacity=1)
    body = client_for(parent).post(url(event), {"childId": child.pk}, format="json").json()
    order = Order.objects.get(reference=body["orderReference"])
    Order.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    release_expired_orders()
    application = EventApplication.objects.get()
    assert application.status == EventApplication.Status.CANCELLED and application.refusal_reason
    assert event.seats_left == 1
    pay(order)  # paiement tardif, la place est libre (C17)
    application.refresh_from_db()
    assert (
        application.status == EventApplication.Status.ACCEPTED and order.status == Order.Status.PAID
    )


def test_late_payment_is_refunded_when_the_seat_is_gone(parent, child):
    event = SteamyEventFactory(price=5000, capacity=1)
    body = client_for(parent).post(url(event), {"childId": child.pk}, format="json").json()
    order = Order.objects.get(reference=body["orderReference"])
    Order.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    release_expired_orders()
    client_for(parent).post(url(event), {"childId": link_child(parent).pk}, format="json")
    pay(order)
    assert order.status == Order.Status.REFUNDED and Refund.objects.exists()
    assert EventApplication.objects.get(learner=child).status == EventApplication.Status.CANCELLED


def test_late_payment_is_refunded_when_the_child_registered_again(parent, child):
    event = SteamyEventFactory(price=5000, capacity=3)
    body = client_for(parent).post(url(event), {"childId": child.pk}, format="json").json()
    order = Order.objects.get(reference=body["orderReference"])
    Order.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    release_expired_orders()
    client_for(child).post(url(event), {}, format="json")
    pay(order)
    assert order.status == Order.Status.REFUNDED


def test_models_read_well(child):
    event = SteamyEventFactory(capacity=1, seats_reserved=1)
    application = EventApplication.objects.create(event=event, learner=child, status="accepted")
    assert event.seats_left == 0 and str(application).endswith(event.title)


def test_release_and_reacquire_leave_other_statuses_alone(child):
    from apps.events.applications import reacquire_seat, release

    event = SteamyEventFactory(price=5000)
    accepted = EventApplication.objects.create(event=event, learner=child, status="accepted")
    release(accepted)
    accepted.refresh_from_db()
    assert accepted.status == "accepted"
    accepted.status = "pending_payment"
    assert reacquire_seat(accepted) is True
