"""Kits en lecture (§7.5) : refus d'abord, jamais le stock exact, kits en vente seulement."""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import (
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)
from apps.catalog.tests.factories import CategoryFactory, CourseFactory
from apps.learning.models import Enrollment
from apps.shop.models import Kit

from .factories import KitFactory

pytestmark = pytest.mark.django_db

BASE = "/api/shop/kits/"
PERSONAS = {
    "anonyme": None,
    "apprenant": LearnerFactory,
    "parent": ParentFactory,
    "enseignant": TeacherFactory,
    "personnel": StaffFactory,
}


def slugs(resp):
    return [kit["slug"] for kit in resp.json()["results"]]


# --- Refus et matrice d'accès -------------------------------------------------------------------


@pytest.mark.parametrize("persona", PERSONAS)
@pytest.mark.parametrize(
    ("method", "url", "expected"),
    [
        ("get", BASE, 200),
        ("get", f"{BASE}en-vente/", 200),
        ("get", f"{BASE}retire/", 404),
        ("post", BASE, 405),
        ("put", f"{BASE}en-vente/", 405),
        ("patch", f"{BASE}en-vente/", 405),
        ("delete", f"{BASE}en-vente/", 405),
    ],
)
def test_kits_access_matrix(persona, method, url, expected):
    KitFactory(slug="en-vente")
    KitFactory(slug="retire", withdrawn=True)
    client = APIClient()
    if PERSONAS[persona]:
        client.force_login(PERSONAS[persona]())
    resp = getattr(client, method)(url, {"stockQuantity": 0}, format="json")
    assert resp.status_code == expected
    assert Kit.objects.get(slug="en-vente").stock_quantity == 12


def test_exact_stock_is_never_exposed():
    KitFactory(slug="bot", stock_quantity=4321)
    KitFactory(slug="rupture", out_of_stock=True)
    for url in (BASE, f"{BASE}bot/", f"{BASE}rupture/"):
        body = APIClient().get(url).content.decode()
        assert "stock" not in body.lower() and "4321" not in body
    kits = {k["slug"]: k for k in APIClient().get(BASE).json()["results"]}
    assert kits["bot"]["available"] is True and kits["rupture"]["available"] is False


def test_withdrawn_kit_is_invisible():
    KitFactory(withdrawn=True)
    assert APIClient().get(BASE).json()["count"] == 0


def test_responses_do_not_depend_on_the_session_and_are_cachable():
    KitFactory(slug="bot")
    logged_in = APIClient()
    logged_in.force_login(ParentFactory())
    for url in (BASE, f"{BASE}bot/"):
        anonymous = APIClient().get(url)
        assert logged_in.get(url).json() == anonymous.json()
        assert anonymous["Cache-Control"] == "public, max-age=300"
        assert "Cookie" not in anonymous.get("Vary", "")


def test_invalid_category_is_a_validation_error():
    resp = APIClient().get(f"{BASE}?category=pas un slug")
    assert resp.status_code == 400 and "category" in resp.json()["fields"]


# --- Lecture ------------------------------------------------------------------------------------


def test_category_filter_and_card():
    robotique = CategoryFactory(slug="robotique")
    KitFactory(slug="bot", category=robotique, images=["https://cdn.steamy.test/bot.png"])
    KitFactory(slug="solaire")
    assert slugs(APIClient().get(f"{BASE}?category=robotique")) == ["bot"]
    card = APIClient().get(f"{BASE}?category=robotique").json()["results"][0]
    assert set(card) == {
        "slug",
        "name",
        "category",
        "price",
        "difficulty",
        "emoji",
        "images",
        "available",
    }
    assert card["category"]["slug"] == "robotique" and card["price"] == 35000


def test_detail_lists_contents_and_published_compatible_courses():
    kit = KitFactory(slug="bot")
    kit.compatible_courses.set(
        [CourseFactory(slug="robot", title="Robot"), CourseFactory(slug="brouillon", draft=True)]
    )
    body = APIClient().get(f"{BASE}bot/").json()
    assert body["contents"] == ["2 moteurs", "1 carte"]
    assert body["description"] == "Un robot à monter soi-même."
    assert body["compatibleCourses"] == [{"slug": "robot", "title": "Robot"}]


# --- Kit requis par un parcours (D36) -----------------------------------------------------------


def test_course_requiring_a_kit_shows_it_and_refuses_direct_enrollment():
    kit = KitFactory(slug="bot", name="Steamy Bot v1")
    course = CourseFactory(slug="robot", paid=True, required_kit=kit)
    card = APIClient().get("/api/catalog/courses/").json()["results"][0]
    assert card["requiredKit"] == {"slug": "bot", "name": "Steamy Bot v1"}
    assert APIClient().get("/api/catalog/courses/robot/").json()["requiredKit"]["slug"] == "bot"

    learner = LearnerFactory()
    client = APIClient()
    client.force_authenticate(learner)
    resp = client.post("/api/learning/enrollments/", {"course": course.id}, format="json")
    assert resp.status_code == 402 and resp.json()["code"] == "KIT_CODE_REQUIRED"
    assert not Enrollment.objects.exists()


def test_admin_and_name():
    kit = KitFactory()
    assert str(kit) == kit.name
    client = APIClient()
    client.force_login(
        StaffFactory(is_superuser=True), backend="apps.accounts.backends.StaffBackend"
    )
    assert client.get(reverse("admin:shop_kit_changelist")).status_code == 200
    assert client.get(reverse("admin:shop_kit_change", args=[kit.pk])).status_code == 200
