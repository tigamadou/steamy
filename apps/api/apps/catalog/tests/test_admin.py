"""Admin du catalogue (groupe Contenu) : pages servies, ordre par glisser-déposer."""

import pytest
from django.urls import reverse

from apps.core.tests.staff import verified_client

from .factories import MissionFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_client(client):
    verified_client(client, is_superuser=True)  # session vérifiée par TOTP (WAD15)
    return client


@pytest.mark.parametrize("model", ["category", "course", "project", "level", "mission"])
def test_admin_pages_are_served(admin_client, model):
    mission = MissionFactory()
    objects = {
        "category": mission.level.project.course.category,
        "course": mission.level.project.course,
        "project": mission.level.project,
        "level": mission.level,
        "mission": mission,
    }
    assert admin_client.get(reverse(f"admin:catalog_{model}_changelist")).status_code == 200
    assert admin_client.get(reverse(f"admin:catalog_{model}_add")).status_code == 200
    change = reverse(f"admin:catalog_{model}_change", args=[objects[model].pk])
    assert admin_client.get(change).status_code == 200


def test_category_list_counts_courses(admin_client):
    MissionFactory()
    body = admin_client.get(reverse("admin:catalog_category_changelist")).content.decode()
    assert "Parcours" in body
