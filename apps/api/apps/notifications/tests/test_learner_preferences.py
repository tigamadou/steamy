"""Préférences de notification d'un apprenant (WD06, D6, D30) : ni SMS, ni marketing, in-app toujours actif."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.notifications.models import CATEGORIES_BY_ROLE, Category, Channel, NotificationPreference

pytestmark = pytest.mark.django_db


def test_learner_preferences_have_no_sms_nor_marketing():
    client = APIClient()
    learner = LearnerFactory()
    client.force_authenticate(learner)
    body = client.get("/api/notifications/preferences/").json()
    assert [c["category"] for c in body["categories"]] == CATEGORIES_BY_ROLE["learner"]
    assert all(set(c) == {"category", "label", "inApp", "email"} for c in body["categories"])
    assert all(c["inApp"] is True for c in body["categories"])

    # Un champ `sms` envoyé est ignoré : aucune préférence SMS n'est créée
    resp = client.patch(
        "/api/notifications/preferences/",
        {"categories": [{"category": "learning", "email": False, "sms": True}]},
        format="json",
    )
    assert resp.status_code == 200
    assert list(NotificationPreference.objects.values_list("channel", flat=True)) == ["email"]


@pytest.mark.parametrize(
    ("channel", "category"),
    [(Channel.SMS, Category.LEARNING), (Channel.EMAIL, Category.CONSENTS)],
)
def test_a_learner_cannot_get_an_sms_or_a_foreign_category_preference(channel, category):
    with pytest.raises(ValueError):
        NotificationPreference.objects.create(
            user=LearnerFactory(), category=category, channel=channel, enabled=True
        )
    assert not NotificationPreference.objects.exists()


def test_a_parent_keeps_its_own_channels():
    NotificationPreference.objects.create(
        user=ParentFactory(), category=Category.PAYMENTS, channel=Channel.SMS, enabled=False
    )
    assert NotificationPreference.objects.count() == 1
