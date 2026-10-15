"""Catalogue public (§7.4, D11, S6) : refus d'abord, puis filtres, tri et plan sans contenu."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, StaffFactory
from apps.learning.models import Enrollment

from .factories import CategoryFactory, CourseFactory, LevelFactory, MissionFactory

pytestmark = pytest.mark.django_db

BASE = "/api/catalog/"


def slugs(resp):
    return [course["slug"] for course in resp.json()["results"]]


# --- Refus ------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "url"),
    [
        ("post", "categories/"),
        ("post", "courses/"),
        ("put", "courses/publie/"),
        ("patch", "courses/publie/"),
        ("delete", "courses/publie/"),
    ],
)
def test_no_write_is_possible_even_for_staff(method, url):
    CourseFactory(slug="publie")
    for client in (APIClient(), APIClient()):
        resp = getattr(client, method)(f"{BASE}{url}", {"title": "Piraté"}, format="json")
        assert resp.status_code == 405
        assert resp.json()["code"] == "METHOD_NOT_ALLOWED"
        client.force_authenticate(StaffFactory())
    assert not CourseFactory._meta.model.objects.filter(title="Piraté").exists()


def test_draft_is_invisible_in_list_detail_and_count():
    draft = CourseFactory(draft=True, slug="brouillon")
    resp = APIClient().get(f"{BASE}courses/")
    assert resp.json()["count"] == 0
    assert APIClient().get(f"{BASE}courses/brouillon/").status_code == 404
    categories = APIClient().get(f"{BASE}categories/").json()
    assert categories == [
        {
            "slug": draft.category.slug,
            "label": draft.category.label,
            "color": draft.category.color,
            "icon": draft.category.icon,
            "courseCount": 0,
        }
    ]


def test_detail_never_exposes_mission_content_nor_videos():
    mission = MissionFactory(
        blocks=[{"type": "text", "text": "CONTENU-SECRET"}],
        vimeo_id="111222333",
        vimeo_hash="hachagesecret",
        level__intro_vimeo_id="444555666",
        level__intro_vimeo_hash="introsecrete",
    )
    course = mission.level.project.course
    body = APIClient().get(f"{BASE}courses/{course.slug}/").content.decode()
    for secret in ("CONTENU-SECRET", "111222333", "hachagesecret", "444555666", "introsecrete"):
        assert secret not in body
    for field in ("blocks", "vimeoId", "vimeoHash", "introVimeoId", "rating"):
        assert f'"{field}"' not in body


def test_responses_do_not_depend_on_the_session_and_are_cachable():
    course = CourseFactory()
    Enrollment.objects.create(user=LearnerFactory(), course=course)
    logged_in = APIClient()
    logged_in.force_login(LearnerFactory())
    for url in ("categories/", "courses/", f"courses/{course.slug}/"):
        anonymous = APIClient().get(f"{BASE}{url}")
        assert logged_in.get(f"{BASE}{url}").json() == anonymous.json()
        assert anonymous["Cache-Control"] == "public, max-age=300"
        assert "Cookie" not in anonymous.get("Vary", "")
        assert "sessionid" not in anonymous.cookies and "csrftoken" not in anonymous.cookies


# --- Lecture ----------------------------------------------------------------------------------


def test_categories_count_published_courses():
    CategoryFactory(slug="energie", order=1)  # créée d'abord : l'ordre vient de `order`
    robotique = CategoryFactory(slug="robotique", order=0)
    CourseFactory.create_batch(2, category=robotique)
    CourseFactory(category=robotique, draft=True)
    body = APIClient().get(f"{BASE}categories/").json()
    assert [(c["slug"], c["courseCount"]) for c in body] == [("robotique", 2), ("energie", 0)]


def test_list_card_fields():
    course = CourseFactory(
        paid=True, emoji="⚡", cover_image=SimpleUploadedFile("c.png", b"png"), featured=True
    )
    card = APIClient().get(f"{BASE}courses/").json()["results"][0]
    assert set(card) == {
        "slug",
        "title",
        "category",
        "difficulty",
        "isFree",
        "price",
        "emoji",
        "coverImage",
        "durationHours",
        "featured",
    }
    assert card["isFree"] is False and card["price"] == 15000 and card["emoji"] == "⚡"
    assert card["coverImage"].endswith(".png")
    assert card["category"]["slug"] == course.category.slug


def test_list_filters():
    robotique = CategoryFactory(slug="robotique")
    CourseFactory(slug="robot", title="Robot suiveur", category=robotique, featured=True)
    CourseFactory(slug="scratch", title="Scratch", description="Programmer un jeu", paid=True)
    CourseFactory(slug="ia", title="IA", difficulty="advanced")
    client = APIClient()
    assert slugs(client.get(f"{BASE}courses/?category=robotique")) == ["robot"]
    assert slugs(client.get(f"{BASE}courses/?difficulty=advanced")) == ["ia"]
    assert slugs(client.get(f"{BASE}courses/?price=paid")) == ["scratch"]
    assert sorted(slugs(client.get(f"{BASE}courses/?price=free"))) == ["ia", "robot"]
    assert slugs(client.get(f"{BASE}courses/?featured=true")) == ["robot"]
    assert slugs(client.get(f"{BASE}courses/?q=jeu")) == ["scratch"]
    assert slugs(client.get(f"{BASE}courses/?q=SUIVEUR")) == ["robot"]


@pytest.mark.parametrize("query", ["difficulty=facile", "price=cher", "sort=hasard"])
def test_invalid_filter_is_a_validation_error(query):
    resp = APIClient().get(f"{BASE}courses/?{query}")
    assert resp.status_code == 400
    assert resp.json()["code"] == "VALIDATION_ERROR"
    assert query.split("=")[0] in resp.json()["fields"]


def test_sorts():
    a = CourseFactory(slug="a", title="Zèbre", paid=True, price=30000)
    b = CourseFactory(slug="b", title="Abeille", paid=True, price=10000)
    c = CourseFactory(slug="c", title="Moteur")
    for learner in LearnerFactory.create_batch(2):
        Enrollment.objects.create(user=learner, course=b)
    Enrollment.objects.create(user=LearnerFactory(), course=a)
    client = APIClient()
    assert slugs(client.get(f"{BASE}courses/")) == ["b", "a", "c"]  # popular par défaut
    assert slugs(client.get(f"{BASE}courses/?sort=popular")) == ["b", "a", "c"]
    assert slugs(client.get(f"{BASE}courses/?sort=recent")) == ["c", "b", "a"]
    assert slugs(client.get(f"{BASE}courses/?sort=price-asc")) == ["c", "b", "a"]
    assert slugs(client.get(f"{BASE}courses/?sort=price-desc")) == ["a", "b", "c"]
    assert slugs(client.get(f"{BASE}courses/?sort=title")) == [b.slug, c.slug, a.slug]


def test_list_is_paginated():
    CourseFactory.create_batch(3)
    body = APIClient().get(f"{BASE}courses/?page=2&pageSize=2").json()
    assert body["count"] == 3 and len(body["results"]) == 1


def test_detail_gives_the_ordered_plan():
    course = CourseFactory(
        slug="robot",
        outcomes=["Monter un robot"],
        trailer_vimeo_id="76979871",
        trailer_vimeo_hash="8272103f6e",
    )
    level = LevelFactory(project__course=course, project__order=1, project__title="P2", order=0)
    LevelFactory(project__course=course, project__order=0, project__title="P1", order=0)
    MissionFactory(level=level, order=1, title="M2", icon="🔌")
    MissionFactory(level=level, order=0, title="M1")

    body = APIClient().get(f"{BASE}courses/robot/").json()
    assert body["outcomes"] == ["Monter un robot"]
    assert body["trailerVimeoId"] == "76979871" and body["trailerVimeoHash"] == "8272103f6e"
    assert body["missionCount"] == 2
    assert [p["title"] for p in body["projects"]] == ["P1", "P2"]
    missions = body["projects"][1]["levels"][0]["missions"]
    assert missions == [
        {"order": 0, "title": "M1", "durationMin": 10, "icon": ""},
        {"order": 1, "title": "M2", "durationMin": 10, "icon": "🔌"},
    ]
    assert body["coverImage"] is None
