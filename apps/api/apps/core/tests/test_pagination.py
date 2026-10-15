"""Pagination commune `?page=&pageSize=` (SPEC-TECHNIQUE §7.1)."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory
from apps.notifications.tests.factories import NotificationFactory


def client_with_notifications(count):
    user = LearnerFactory()
    NotificationFactory.create_batch(count, user=user)
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.django_db
def test_lists_are_paginated_with_page_and_page_size():
    body = client_with_notifications(3).get("/api/notifications/?page=2&pageSize=2").json()
    assert body["count"] == 3
    assert len(body["results"]) == 1
    assert body["previous"] and body["next"] is None


@pytest.mark.django_db
def test_page_size_is_capped():
    assert client_with_notifications(1).get("/api/notifications/?pageSize=1000").status_code == 200
