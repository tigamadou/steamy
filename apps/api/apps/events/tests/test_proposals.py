"""API-L5.5 · Proposer un Steamy Event à une classe (WT09) : notification des élèves actifs et de leurs parents."""

import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import ParentChildLink
from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.classrooms.models import ClassroomMembership
from apps.classrooms.tests.factories import ClassroomFactory, MembershipFactory
from apps.core.tests.staff import verified_client
from apps.events.models import EventProposal
from apps.notifications.models import Notification
from apps.referentials.models import Relationship

from .factories import SteamyEventFactory

pytestmark = pytest.mark.django_db


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def classroom():
    return ClassroomFactory(name="4e B")


@pytest.fixture
def event():
    return SteamyEventFactory(title="Défi robots", slug="defi-robots")


def propose(user, event, classroom_id):
    return client_for(user).post(
        f"/api/events/{event.slug}/proposals/", {"classroomId": classroom_id}, format="json"
    )


def test_proposal_notifies_active_learners_and_their_parents(classroom, event):
    parent = ParentFactory()
    learner = LearnerFactory(first_name="Léa")
    ParentChildLink.objects.create(
        parent=parent, learner=learner, relationship=Relationship.objects.get(code="mere")
    )
    MembershipFactory(classroom=classroom, learner=learner)
    orphan = MembershipFactory(classroom=classroom).learner  # sans parent rattaché
    MembershipFactory(classroom=classroom, status=ClassroomMembership.Status.INVITED)
    left = MembershipFactory(classroom=classroom, status=ClassroomMembership.Status.LEFT)

    response = propose(classroom.teacher, event, classroom.pk)

    assert response.status_code == 201
    body = response.json()
    assert (body["event"], body["classroomId"], body["notifiedCount"]) == (
        "defi-robots",
        classroom.pk,
        3,
    )
    assert EventProposal.objects.get().teacher == classroom.teacher
    to_learner = Notification.objects.get(user=learner)
    assert to_learner.title == "Ton enseignant te propose un Steamy Event : Défi robots"
    assert to_learner.url == "/apprenant/evenements/defi-robots"
    to_parent = Notification.objects.get(user=parent)
    assert to_parent.title == "L'enseignant de Léa propose un Steamy Event : Défi robots"
    assert to_parent.url == "/parent/evenements"
    assert Notification.objects.filter(user=orphan).exists()
    assert not Notification.objects.filter(user=left.learner).exists()


def test_same_event_twice_to_the_same_classroom(classroom, event):
    propose(classroom.teacher, event, classroom.pk)
    response = propose(classroom.teacher, event, classroom.pk)
    assert response.status_code == 409
    assert response.json()["code"] == "EVENT_ALREADY_PROPOSED"
    other = ClassroomFactory(school=classroom.school, teacher=classroom.teacher)
    assert propose(classroom.teacher, event, other.pk).status_code == 201


def test_closed_or_unpublished_event(classroom):
    closed = SteamyEventFactory(application_deadline=timezone.now() - datetime.timedelta(hours=1))
    assert propose(classroom.teacher, closed, classroom.pk).json()["code"] == "EVENT_CLOSED"
    draft = SteamyEventFactory(draft=True)
    assert propose(classroom.teacher, draft, classroom.pk).status_code == 404


def test_only_my_own_active_classrooms(classroom, event):
    other = ClassroomFactory()
    response = propose(other.teacher, event, classroom.pk)
    assert response.status_code == 404
    assert response.json()["fields"]["classroomId"][0]["code"] == "NOT_FOUND"
    archived = ClassroomFactory(
        teacher=classroom.teacher, school=classroom.school, archived_at=timezone.now()
    )
    assert propose(classroom.teacher, event, archived.pk).status_code == 404
    assert not EventProposal.objects.exists()


def test_only_teachers_can_propose(classroom, event):
    assert (
        APIClient()
        .post(f"/api/events/{event.slug}/proposals/", {"classroomId": classroom.pk}, format="json")
        .status_code
        == 401
    )
    assert propose(LearnerFactory(), event, classroom.pk).status_code == 403
    assert propose(ParentFactory(), event, classroom.pk).status_code == 403


def test_classroom_is_required(classroom, event):
    response = client_for(classroom.teacher).post(
        f"/api/events/{event.slug}/proposals/", {}, format="json"
    )
    assert response.status_code == 400


def test_admin_follows_proposals(client, classroom, event):
    verified_client(client, is_superuser=True)
    proposal = EventProposal.objects.create(
        event=event, classroom=classroom, teacher=classroom.teacher
    )
    assert str(proposal) == "Défi robots → 4e B"
    assert client.get("/admin/events/eventproposal/").status_code == 200
    assert client.get("/admin/events/eventproposal/add/").status_code == 403
