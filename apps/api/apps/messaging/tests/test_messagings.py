import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.messaging.models import Notification

User = get_user_model()


@pytest.mark.django_db
def test_user_can_list_their_notifications():
    client = APIClient()
    alice = User.objects.create_user(email="alice_notif@example.com", password="pw")
    bob = User.objects.create_user(email="bob_notif@example.com", password="pw")

    # create notifications
    Notification.objects.create(user=alice, title="A1", body="hello A")
    Notification.objects.create(user=alice, title="A2", body="hello A2")
    Notification.objects.create(user=bob, title="B1", body="hello B")

    client.force_authenticate(user=alice)
    url = reverse("notification-list")
    resp = client.get(url, format="json")
    assert resp.status_code == 200, resp.content
    data = resp.json()
    # if pagination is used, results may be nested; accept both shapes
    items = data.get("results", data)
    assert isinstance(items, list)
    # alice should see only her notifications
    assert all(item["user"] == alice.id for item in items)


@pytest.mark.django_db
def test_user_cannot_access_others_notification_and_can_mark_read():
    client = APIClient()
    alice = User.objects.create_user(email="alice_nr@example.com", password="pw")
    bob = User.objects.create_user(email="bob_nr@example.com", password="pw")

    n_alice = Notification.objects.create(user=alice, title="A", body="hello")
    n_bob = Notification.objects.create(user=bob, title="B", body="hello")

    client.force_authenticate(user=alice)
    # try to GET bob's notification -> should be 403 or 404
    url_bob = reverse("notification-detail", args=[n_bob.id])
    resp = client.get(url_bob, format="json")
    assert resp.status_code in (403, 404), (
        f"expected forbidden or not found, got {resp.status_code}: {resp.content}"
    )

    # alice can GET her own notification
    url_alice = reverse("notification-detail", args=[n_alice.id])
    resp2 = client.get(url_alice, format="json")
    assert resp2.status_code == 200, resp2.content

    # alice can PATCH read -> true
    resp_patch = client.patch(url_alice, {"read": True}, format="json")
    assert resp_patch.status_code in (200, 202), resp_patch.content
    n_alice.refresh_from_db()
    assert n_alice.read is True


@pytest.mark.django_db
def test_staff_sees_only_their_own_notifications():
    client = APIClient()
    staff = User.objects.create_user(email="admin_n@example.com", password="pw", is_staff=True)
    user = User.objects.create_user(email="u_n@example.com", password="pw")
    Notification.objects.create(user=user, title="X", body="x")
    client.force_authenticate(user=staff)
    url = reverse("notification-list")
    resp = client.get(url, format="json")
    assert resp.status_code == 200
    # Pas de passe-droit pour le personnel dans l'API publique (S4) : il passe par le back-office.
    assert resp.json()["results"] == []
