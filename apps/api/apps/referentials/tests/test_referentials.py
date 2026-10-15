"""Référentiels publics (D3, §7.7) : lisibles anonymement, cachables, servis par l'API."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory
from apps.referentials.models import Country, Goal, PaymentNetwork

pytestmark = pytest.mark.django_db

BASE = "/api/referentials/"
ENDPOINTS = [
    "countries",
    "payment-networks",
    "school-grades",
    "goals",
    "avatars",
    "disabilities",
    "relationships",
    "refusal-reasons",
    "localities",
]


@pytest.mark.parametrize("name", ENDPOINTS)
def test_referentials_are_public_cachable_and_seeded(name):
    resp = APIClient().get(f"{BASE}{name}/")
    assert resp.status_code == 200
    assert resp["Cache-Control"] == "public, max-age=3600"
    assert isinstance(resp.json(), list) and resp.json()  # liste non paginée, données initiales


@pytest.mark.parametrize("name", ENDPOINTS)
def test_referentials_do_not_depend_on_the_session(name):
    anonymous = APIClient().get(f"{BASE}{name}/").json()
    client = APIClient()
    client.force_login(LearnerFactory())
    assert client.get(f"{BASE}{name}/").json() == anonymous


@pytest.mark.parametrize("name", ENDPOINTS)
def test_referentials_are_read_only(name):
    client = APIClient()
    client.force_login(LearnerFactory())
    assert client.post(f"{BASE}{name}/", {"code": "x"}, format="json").status_code in (403, 405)


def test_payment_networks_include_celtiis_and_filter_by_country():
    networks = APIClient().get(f"{BASE}payment-networks/?country=bj").json()
    assert [n["code"] for n in networks] == ["mtn", "moov", "celtiis"]  # D76
    assert {n["country"] for n in networks} == {"BJ"}


def test_disabled_network_is_hidden():
    PaymentNetwork.objects.filter(country="BJ", code="celtiis").update(enabled=False)
    codes = [n["code"] for n in APIClient().get(f"{BASE}payment-networks/?country=BJ").json()]
    assert "celtiis" not in codes


def test_inactive_entries_are_hidden():
    Goal.objects.filter(code="domotique").update(active=False)
    codes = [g["code"] for g in APIClient().get(f"{BASE}goals/").json()]
    assert "domotique" not in codes and len(codes) == 9


def test_country_exposes_its_phone_rules():
    benin = next(c for c in APIClient().get(f"{BASE}countries/").json() if c["code"] == "BJ")
    assert benin["dialCode"] == "229"
    assert benin["phoneRegex"] == r"^01[0-9]{8}$"


def test_school_grades_are_in_school_order():
    labels = [g["label"] for g in APIClient().get(f"{BASE}school-grades/").json()]
    assert labels[:3] == ["CM2", "6ᵉ", "5ᵉ"] and labels[-1] == "Terminale"


def test_localities_are_qualified_urban_or_rural():
    localities = APIClient().get(f"{BASE}localities/?country=BJ").json()
    cotonou = next(loc for loc in localities if loc["city"] == "Cotonou")
    assert cotonou["areaType"] == "urban"
    assert {loc["areaType"] for loc in localities} == {"urban", "rural"}  # D75


def test_initial_data_can_be_loaded_twice():
    from django.apps import apps

    from apps.referentials.data import load

    count = Country.objects.count()
    load(apps)
    assert Country.objects.count() == count


def test_labels():
    from apps.referentials.models import Locality

    assert str(Goal.objects.get(code="robots")) == "Construire des robots"
    assert str(PaymentNetwork.objects.get(country="BJ", code="celtiis")) == "Celtiis Cash (BJ)"
    benin = Country.objects.get(code="BJ")
    assert str(Locality(country=benin, city="Cotonou")) == "Cotonou"
    assert str(Locality(country=benin, city="Cotonou", district="Akpakpa")) == "Cotonou, Akpakpa"
