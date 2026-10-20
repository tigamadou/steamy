"""API-L5.5 · Candidatures des élèves aux Steamy Events (WT09), en lecture seule pour l'enseignant."""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.classrooms.models import ClassroomMembership
from apps.classrooms.tests.factories import ClassroomFactory, MembershipFactory
from apps.events.models import EventApplication

from .factories import SteamyEventFactory

pytestmark = pytest.mark.django_db

URL = "/api/classrooms/event-applications/"


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def apply(learner, event, status=EventApplication.Status.PENDING_PARENT):
    return EventApplication.objects.create(
        event=event, learner=learner, applied_by=learner, status=status, motivation="J'adore."
    )


def test_teacher_sees_the_applications_of_active_learners_only():
    classroom = ClassroomFactory(name="4e B")
    other = ClassroomFactory(school=classroom.school, teacher=classroom.teacher, name="3e A")
    event, second = SteamyEventFactory(slug="defi"), SteamyEventFactory(slug="atelier")
    awa = MembershipFactory(classroom=classroom, learner__first_name="Awa").learner
    bio = MembershipFactory(classroom=other).learner
    left = MembershipFactory(classroom=classroom, status=ClassroomMembership.Status.LEFT).learner
    archived = MembershipFactory(
        classroom=ClassroomFactory(
            school=classroom.school, teacher=classroom.teacher, archived_at=timezone.now()
        )
    ).learner
    stranger = MembershipFactory(classroom=ClassroomFactory(school=classroom.school)).learner
    mine = apply(awa, event, EventApplication.Status.ACCEPTED)
    later = apply(bio, second)
    for learner in (left, archived, stranger, LearnerFactory()):
        apply(learner, event)

    api = client_for(classroom.teacher)
    body = api.get(URL).json()

    assert [row["id"] for row in body["results"]] == [later.pk, mine.pk]
    row = body["results"][1]
    assert (row["status"], row["event"]["slug"], row["classroom"]["name"]) == (
        "accepted",
        "defi",
        "4e B",
    )
    assert row["learner"]["firstName"] == "Awa"
    assert "motivation" not in row and "phone" not in str(body)
    assert [r["id"] for r in api.get(f"{URL}?classroomId={classroom.pk}").json()["results"]] == [
        mine.pk
    ]
    assert [r["id"] for r in api.get(f"{URL}?event=atelier").json()["results"]] == [later.pk]


def test_only_teachers_read_them():
    assert APIClient().get(URL).status_code == 401
    assert client_for(LearnerFactory()).get(URL).status_code == 403
    assert client_for(ParentFactory()).get(URL).status_code == 403
