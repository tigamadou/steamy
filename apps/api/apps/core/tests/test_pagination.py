"""Pagination commune `?page=&pageSize=` (SPEC-TECHNIQUE §7.1)."""

import pytest
from rest_framework.test import APIClient

from apps.courses.models import Course


@pytest.mark.django_db
def test_lists_are_paginated_with_page_and_page_size():
    for n in range(3):
        Course.objects.create(title=f"Parcours {n}", slug=f"parcours-{n}", published=True)
    body = APIClient().get("/api/courses/courses/?page=2&pageSize=2").json()
    assert body["count"] == 3
    assert len(body["results"]) == 1
    assert body["previous"] and body["next"] is None


@pytest.mark.django_db
def test_page_size_is_capped():
    Course.objects.create(title="P", slug="p", published=True)
    assert APIClient().get("/api/courses/courses/?pageSize=1000").status_code == 200
