"""Jeu de démonstration de l'espace parent (critères de fin d'API-L4) : Noé, « À valider » de Marie, Mobile Money."""

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.demo import NOE_USERNAME
from apps.accounts.models import ConsentRequest, DeletionRequest, User
from apps.core.demo import DEMO_PASSWORD, EXPIRED_TEACHER_EMAIL, MARIE_PHONE

pytestmark = pytest.mark.django_db


def test_marie_has_three_requests_to_validate_and_a_preferred_mobile_money():
    call_command("seed_demo")
    marie = User.objects.get(phone=MARIE_PHONE)
    client = APIClient()
    client.force_authenticate(marie)
    actions = client.get("/api/accounts/pending-actions/").json()
    assert sorted(a["type"] for a in actions) == [
        "deletion_request",
        "event_application",
        "payment_request",
    ]
    children = client.get("/api/accounts/children/").json()["results"]
    assert sorted(c["username"] for c in children) == ["lea.adjovi", NOE_USERNAME]
    noe = User.objects.get(username=NOE_USERNAME)
    consent = ConsentRequest.objects.get(learner=noe)
    assert (consent.origin, consent.status) == ("parent", "accepted")
    profile = client.get("/api/accounts/me/parent-profile/").json()
    assert profile["mobileMoney"] == {"country": "BJ", "network": "mtn", "phone": MARIE_PHONE}
    login = APIClient().post(
        "/api/auth/login/", {"identifier": NOE_USERNAME, "password": DEMO_PASSWORD}, format="json"
    )
    assert login.status_code == 200


def test_reseeding_restores_the_pending_deletion_without_duplicates():
    call_command("seed_demo")
    noe = User.objects.get(username=NOE_USERNAME)
    DeletionRequest.objects.filter(user=noe).update(status=DeletionRequest.Status.REFUSED)
    call_command("seed_demo")
    assert list(DeletionRequest.objects.filter(user=noe).values_list("status", flat=True)) == [
        DeletionRequest.Status.PENDING_PARENT
    ]
    assert User.objects.filter(username=NOE_USERNAME).count() == 1


def test_the_demo_has_a_school_with_an_expired_offer_that_blocks_new_classes():
    """C21 : l'enseignante de l'école à l'offre échue suit sa classe, mais ne peut plus en créer."""
    call_command("seed_demo")
    client = APIClient()
    login = client.post(
        "/api/auth/login/",
        {"identifier": EXPIRED_TEACHER_EMAIL, "password": DEMO_PASSWORD},
        format="json",
    )
    assert login.status_code == 200
    school = client.get("/api/classrooms/school/").json()
    assert school["offerExpired"] is True
    assert client.get("/api/classrooms/").json()["count"] == 1
    created = client.post(
        "/api/classrooms/",
        {"name": "6e B", "courseSlug": school["courses"][0]["slug"]},
        format="json",
    )
    assert created.status_code == 403
    assert created.json()["code"] == "SCHOOL_OFFER_EXPIRED"
