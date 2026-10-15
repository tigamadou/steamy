"""Admin Django de la pédagogie : inscriptions en lecture seule (créées par le serveur seulement, §4.3)."""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.core.tests.staff import verified_client
from apps.learning.models import MissionProgress

from .factories import EnrollmentFactory, build_course, missions_of

pytestmark = pytest.mark.django_db


def test_enrollment_admin_is_read_only():
    course = build_course(projects=1, levels=1, missions=1)
    enrollment = EnrollmentFactory(course=course)
    progress = MissionProgress.objects.create(enrollment=enrollment, mission=missions_of(course)[0])
    client = APIClient()
    verified_client(client, is_superuser=True)

    assert client.get(reverse("admin:learning_enrollment_changelist")).status_code == 200
    page = client.get(reverse("admin:learning_enrollment_change", args=[enrollment.id]))
    assert page.status_code == 200
    assert client.get(reverse("admin:learning_enrollment_add")).status_code == 403
    inline = page.context["inline_admin_formsets"][0]
    assert not inline.has_add_permission and not inline.has_delete_permission
    assert str(enrollment) == f"{enrollment.learner} → {course}"
    assert str(progress) == f"{enrollment} · {progress.mission}"
