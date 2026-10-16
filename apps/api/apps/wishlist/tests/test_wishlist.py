"""Souhaits (§7.4, WW01-WW03) : idempotents, réservés à l'apprenant, parcours publiés seulement."""

import pytest
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import (
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)
from apps.catalog.models import Course
from apps.catalog.tests.factories import CourseFactory
from apps.core.tests.staff import verified_client
from apps.wishlist.models import WishlistItem

pytestmark = pytest.mark.django_db


@pytest.fixture
def learner():
    return LearnerFactory()


@pytest.fixture
def client(learner):
    client = APIClient()
    client.force_authenticate(learner)
    return client


def test_put_is_idempotent_and_delete_too(client, learner):
    CourseFactory(slug="robot", title="Robot")
    first = client.put("/api/wishlist/robot/")
    assert first.status_code == 201
    assert first.json()["course"]["slug"] == "robot" and first.json()["addedAt"]
    assert first["Cache-Control"] == "private, no-store"
    assert client.put("/api/wishlist/robot/").status_code == 200
    assert WishlistItem.objects.filter(learner=learner).count() == 1

    assert client.delete("/api/wishlist/robot/").status_code == 204
    assert client.delete("/api/wishlist/robot/").status_code == 204  # déjà retiré
    assert client.delete("/api/wishlist/inconnu/").status_code == 204
    assert not WishlistItem.objects.exists()


@pytest.mark.parametrize("slug", ["brouillon", "inconnu"])
def test_only_published_courses_can_be_added(client, slug):
    CourseFactory(slug="brouillon", draft=True)
    assert client.put(f"/api/wishlist/{slug}/").status_code == 404
    assert not WishlistItem.objects.exists()


def test_list_is_mine_sorted_and_hides_unpublished_courses(client, learner):
    b = CourseFactory(slug="b", title="Bêta", paid=True, price=9000)
    a = CourseFactory(slug="a", title="Alpha", paid=True, price=20000)
    hidden = CourseFactory(slug="c", title="Caché")
    for course in (b, a, hidden):
        WishlistItem.objects.create(learner=learner, course=course)
    WishlistItem.objects.create(learner=LearnerFactory(), course=a)  # autre apprenant
    Course.objects.filter(pk=hidden.pk).update(status=Course.Status.DRAFT)

    def slugs(query=""):
        return [
            item["course"]["slug"]
            for item in client.get(f"/api/wishlist/{query}").json()["results"]
        ]

    assert slugs() == ["a", "b"]  # récents d'abord
    assert slugs("?sort=title") == ["a", "b"]
    assert slugs("?sort=price") == ["b", "a"]
    assert client.get("/api/wishlist/?sort=autre").status_code == 400
    assert client.get("/api/accounts/me/").json()["counters"]["wishlist"] == 2


def test_wishlist_item_is_unique(learner):
    course = CourseFactory()
    item = WishlistItem.objects.create(learner=learner, course=course)
    with pytest.raises(IntegrityError), transaction.atomic():
        WishlistItem.objects.create(learner=learner, course=course)
    assert str(item) == f"{learner} ♥ {course}"


@pytest.mark.parametrize(
    ("factory", "expected"),
    [(None, 401), (ParentFactory, 403), (TeacherFactory, 403), (StaffFactory, 403)],
)
def test_access_matrix(factory, expected):
    CourseFactory(slug="robot")
    client = APIClient()
    if factory:
        client.force_authenticate(factory())
    for method in ("get", "put", "delete"):
        url = "/api/wishlist/" if method == "get" else "/api/wishlist/robot/"
        assert getattr(client, method)(url).status_code == expected, (factory, method)
    assert not WishlistItem.objects.exists()


def test_admin_is_read_only(learner):
    WishlistItem.objects.create(learner=learner, course=CourseFactory())
    client = APIClient()
    verified_client(client, is_superuser=True)
    assert client.get(reverse("admin:wishlist_wishlistitem_changelist")).status_code == 200
    assert client.get(reverse("admin:wishlist_wishlistitem_add")).status_code == 403
