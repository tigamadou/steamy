"""« À valider » du parent (WPD01, D52) : consentements et suppressions en attente, rien d'une autre famille."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import ConsentRequest, DeletionRequest, ParentChildLink, User
from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.referentials.models import Relationship

pytestmark = pytest.mark.django_db

URL = "/api/accounts/pending-actions/"


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def consent(phone, first_name="Kofi", **fields):
    learner = LearnerFactory(status=User.Status.PENDING)
    return ConsentRequest.objects.create(
        origin="learner",
        subject={"first_name": first_name, "last_name": "Mensah"},
        learner=learner,
        parent_phone=phone,
        relationship=Relationship.objects.first(),
        expires_at=timezone.now() + timedelta(days=7),
        **fields,
    )


def child_of(parent):
    child = LearnerFactory(first_name="Léa", last_name="Dossou")
    ParentChildLink.objects.create(
        parent=parent, learner=child, relationship=Relationship.objects.first()
    )
    return child


def test_pending_consents_and_deletions_newest_first():
    parent = ParentFactory()
    received = consent(parent.phone)
    child = child_of(parent)
    deletion = DeletionRequest.objects.create(
        user=child, requested_by=child, status=DeletionRequest.Status.PENDING_PARENT
    )
    # Hors liste : demande traitée, expirée, sans compte, d'un autre numéro ; suppression déjà programmée
    consent(parent.phone, status=ConsentRequest.Status.ACCEPTED)
    expired = consent(parent.phone)
    ConsentRequest.objects.filter(pk=expired.pk).update(expires_at=timezone.now())
    ConsentRequest.objects.filter(pk=consent(parent.phone).pk).update(learner=None)
    consent(ParentFactory().phone)
    DeletionRequest.objects.create(user=child_of(parent), status=DeletionRequest.Status.SCHEDULED)
    other_child = child_of(ParentFactory())
    DeletionRequest.objects.create(
        user=other_child, requested_by=other_child, status=DeletionRequest.Status.PENDING_PARENT
    )

    body = as_user(parent).get(URL).json()
    assert body == [
        {
            "type": "deletion_request",
            "id": str(deletion.pk),
            "childId": child.pk,
            "childFirstName": "Léa",
            "childLastName": "Dossou",
            "createdAt": body[0]["createdAt"],
            "url": f"/parent/enfants/{child.pk}/supprimer?demande={deletion.pk}",
        },
        {
            "type": "consent",
            "id": str(received.pk),
            "childId": None,
            "childFirstName": "Kofi",
            "childLastName": "Mensah",
            "createdAt": body[1]["createdAt"],
            "url": f"/parent/consentements/{received.pk}",
        },
    ]


def test_empty_and_reserved_to_parents():
    assert as_user(ParentFactory()).get(URL).json() == []
    assert as_user(LearnerFactory()).get(URL).status_code == 403
    assert APIClient().get(URL).status_code == 401


def test_payment_requests_and_event_applications_are_listed():
    from apps.catalog.tests.factories import CourseFactory
    from apps.events.models import EventApplication
    from apps.events.tests.factories import SteamyEventFactory
    from apps.payments.models import PaymentRequest

    parent = ParentFactory()
    child = child_of(parent)
    child_client = as_user(child)
    course = CourseFactory(paid=True, price=15000)
    resp = child_client.post(
        "/api/payments/payment-requests/",
        {"kind": "course", "courseSlug": course.slug},
        format="json",
    )
    request_id = resp.json()["id"]
    event = SteamyEventFactory()
    resp = child_client.post(f"/api/events/{event.slug}/applications/", {}, format="json")
    application_id = resp.json()["id"]
    # Hors liste : demande expirée, candidature déjà acceptée
    expired = PaymentRequest.objects.get(pk=request_id)
    PaymentRequest.objects.create(
        requested_by=child,
        parent=parent,
        kind="course",
        course=CourseFactory(paid=True),
        amount=1,
        last_sent_at=expired.last_sent_at,
        expires_at=timezone.now(),
    )
    EventApplication.objects.create(
        event=SteamyEventFactory(), learner=child, applied_by=parent, status="accepted"
    )
    body = as_user(parent).get(URL).json()
    by_type = {action["type"]: action for action in body}
    assert set(by_type) == {"payment_request", "event_application"}
    assert by_type["payment_request"]["url"] == f"/parent/demandes/{request_id}"
    assert by_type["payment_request"]["childId"] == child.pk
    assert by_type["event_application"]["id"] == str(application_id)
    assert by_type["event_application"]["url"] == f"/parent/evenements?candidature={application_id}"
