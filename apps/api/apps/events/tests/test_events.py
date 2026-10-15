"""Steamy Events en lecture (§7.6, S8) : refus d'abord, publiés seulement, `seatsLeft` calculé."""

import datetime

import pytest
from django.db import IntegrityError
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import (
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)
from apps.events.models import SteamyEvent

from .factories import SteamyEventFactory

pytestmark = pytest.mark.django_db

BASE = "/api/events/"
PERSONAS = {
    "anonyme": None,
    "apprenant": LearnerFactory,
    "parent": ParentFactory,
    "enseignant": TeacherFactory,
    "personnel": StaffFactory,
}


def slugs(resp):
    return [event["slug"] for event in resp.json()["results"]]


# --- Refus et matrice d'accès -------------------------------------------------------------------


@pytest.mark.parametrize("persona", PERSONAS)
@pytest.mark.parametrize(
    ("method", "url", "expected"),
    [
        ("get", BASE, 200),
        ("get", f"{BASE}publie/", 200),
        ("get", f"{BASE}brouillon/", 404),
        ("post", BASE, 405),
        ("put", f"{BASE}publie/", 405),
        ("patch", f"{BASE}publie/", 405),
        ("delete", f"{BASE}publie/", 405),
    ],
)
def test_events_access_matrix(persona, method, url, expected):
    SteamyEventFactory(slug="publie")
    SteamyEventFactory(slug="brouillon", draft=True)
    client = APIClient()
    if PERSONAS[persona]:
        client.force_login(PERSONAS[persona]())
    assert getattr(client, method)(url, {"title": "Piraté"}, format="json").status_code == expected
    assert not SteamyEvent.objects.filter(title="Piraté").exists()


def test_draft_is_invisible():
    SteamyEventFactory(draft=True)
    assert APIClient().get(BASE).json()["count"] == 0


def test_responses_do_not_depend_on_the_session_and_are_cachable():
    SteamyEventFactory(slug="atelier")
    logged_in = APIClient()
    logged_in.force_login(LearnerFactory())
    for url in (BASE, f"{BASE}atelier/"):
        anonymous = APIClient().get(url)
        assert logged_in.get(url).json() == anonymous.json()
        assert anonymous["Cache-Control"] == "public, max-age=300"
        assert "Cookie" not in anonymous.get("Vary", "")


def test_invalid_upcoming_is_a_validation_error():
    resp = APIClient().get(f"{BASE}?upcoming=peut-etre")
    assert resp.status_code == 400 and "upcoming" in resp.json()["fields"]


# --- Lecture ------------------------------------------------------------------------------------


def test_upcoming_filter_and_order():
    now = timezone.now()
    SteamyEventFactory(slug="loin", starts_at=now + datetime.timedelta(days=30))
    SteamyEventFactory(slug="proche", starts_at=now + datetime.timedelta(days=3))
    SteamyEventFactory(slug="passe", past=True)
    SteamyEventFactory(slug="ancien", starts_at=now - datetime.timedelta(days=60))
    client = APIClient()
    assert slugs(client.get(BASE)) == ["ancien", "passe", "proche", "loin"]
    assert slugs(client.get(f"{BASE}?upcoming=true")) == ["proche", "loin"]
    assert slugs(client.get(f"{BASE}?upcoming=false")) == ["passe", "ancien"]


def test_list_item_fields_and_seats():
    SteamyEventFactory(slug="gratuit", capacity=20, seats_reserved=12)
    SteamyEventFactory(slug="complet", price=5000, full=True)
    SteamyEventFactory(slug="passe", past=True)
    events = {e["slug"]: e for e in APIClient().get(BASE).json()["results"]}
    free = events["gratuit"]
    assert free["isFree"] is True and free["price"] == 0
    assert free["seatsLeft"] == 8 and free["capacity"] == 20
    assert free["applicationsOpen"] is True and free["isPast"] is False
    assert "description" not in free
    full = events["complet"]
    assert full["isFree"] is False and full["seatsLeft"] == 0 and full["applicationsOpen"] is False
    past = events["passe"]
    assert past["isPast"] is True and past["applicationsOpen"] is False


def test_detail_has_the_description():
    SteamyEventFactory(slug="atelier", description="Monte ta veilleuse.")
    body = APIClient().get(f"{BASE}atelier/").json()
    assert body["description"] == "Monte ta veilleuse." and body["seatsLeft"] == 20


# --- Modèle et admin ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "fields",
    [
        {"ends_at": timezone.now()},  # fin avant le début
        {"application_deadline": timezone.now() + datetime.timedelta(days=30)},
        {"capacity": 5, "seats_reserved": 6},
    ],
)
def test_constraints(fields):
    with pytest.raises(IntegrityError):
        SteamyEventFactory(**fields)


def test_admin_pages_are_served(client):
    event = SteamyEventFactory()
    assert str(event) == event.title
    client.force_login(
        StaffFactory(is_superuser=True), backend="apps.accounts.backends.StaffBackend"
    )
    assert client.get(reverse("admin:events_steamyevent_changelist")).status_code == 200
    assert client.get(reverse("admin:events_steamyevent_add")).status_code == 200
    change = reverse("admin:events_steamyevent_change", args=[event.pk])
    assert client.get(change).status_code == 200
