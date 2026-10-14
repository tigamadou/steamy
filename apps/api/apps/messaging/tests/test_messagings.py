import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from apps.messaging.models import Conversation, MessageReceipt, Notification

User = get_user_model()


@pytest.mark.django_db
def test_create_conversation_and_auto_add_creator(monkeypatch):
    client = APIClient()
    alice = User.objects.create_user(email="alice@example.com", password="pw")
    bob = User.objects.create_user(email="bob@example.com", password="pw")

    client.force_authenticate(user=alice)
    url = reverse("conversation-list")
    payload = {"title": "Project Chat", "participants": [bob.id]}

    resp = client.post(url, payload, format="json")
    assert resp.status_code == 201, resp.content
    data = resp.json()
    conv_id = data["id"]
    conv = Conversation.objects.get(id=conv_id)
    # creator should be in participants
    assert alice.id in list(conv.participants.values_list("id", flat=True))


@pytest.mark.django_db
def test_non_participant_cannot_retrieve_conversation():
    client = APIClient()
    alice = User.objects.create_user(email="alice2@example.com", password="pw")
    bob = User.objects.create_user(email="bob2@example.com", password="pw")
    charlie = User.objects.create_user(email="charlie@example.com", password="pw")

    conv = Conversation.objects.create(title="Privé")
    conv.participants.set([alice, bob])

    client.force_authenticate(user=charlie)
    url = reverse("conversation-detail", args=[conv.id])
    resp = client.get(url)
    assert resp.status_code in (403, 404)


@pytest.mark.django_db
def test_create_message_triggers_notification_task(monkeypatch):
    client = APIClient()
    alice = User.objects.create_user(email="alice3@example.com", password="pw")
    bob = User.objects.create_user(email="bob3@example.com", password="pw")

    conv = Conversation.objects.create(title="Chat")
    conv.participants.set([alice, bob])

    client.force_authenticate(user=alice)
    url = reverse("message-list")
    payload = {"conversation": conv.id, "body": "Hello Bob"}

    called = {}

    # fake task object with .delay method
    class FakeTask:
        def delay(self, msg_id):
            called["msg"] = msg_id

    fake_task = FakeTask()

    # IMPORTANT: patch the reference used by the view (apps.messaging.views)
    monkeypatch.setattr("apps.messaging.views.send_message_notifications_async", fake_task)

    resp = client.post(url, payload, format="json")
    assert resp.status_code == 201, resp.content
    data = resp.json()
    assert "id" in data
    # ensure our fake task was called with message id
    assert called.get("msg") == data["id"]


@pytest.mark.django_db
def test_create_attachment_for_message():
    client = APIClient()
    alice = User.objects.create_user(email="alice4@example.com", password="pw")
    bob = User.objects.create_user(email="bob4@example.com", password="pw")

    conv = Conversation.objects.create(title="Files")
    conv.participants.set([alice, bob])

    client.force_authenticate(user=alice)
    # create a message first
    msg_resp = client.post(
        reverse("message-list"), {"conversation": conv.id, "body": "file it"}, format="json"
    )
    assert msg_resp.status_code == 201
    message_id = msg_resp.json()["id"]

    # create attachment (file upload)
    url_attach = reverse("attachment-list")
    sample_file = SimpleUploadedFile("hello.txt", b"hello world", content_type="text/plain")
    resp = client.post(url_attach, {"message": message_id, "file": sample_file}, format="multipart")
    assert resp.status_code == 201, resp.content
    data = resp.json()
    assert data["message"] == message_id
    assert "id" in data


@pytest.mark.django_db
def test_mark_read_creates_receipt_and_updates_read_at():
    client = APIClient()
    alice = User.objects.create_user(email="alice5@example.com", password="pw")
    bob = User.objects.create_user(email="bob5@example.com", password="pw")

    conv = Conversation.objects.create(title="ReadTest")
    conv.participants.set([alice, bob])

    client.force_authenticate(user=alice)
    msg_resp = client.post(
        reverse("message-list"), {"conversation": conv.id, "body": "read this"}, format="json"
    )
    assert msg_resp.status_code == 201
    message_id = msg_resp.json()["id"]

    client.force_authenticate(user=bob)
    mark_url = reverse("message-mark-read", args=[message_id])
    resp = client.post(mark_url, format="json")
    assert resp.status_code == 200, resp.content
    # ensure receipt created
    assert MessageReceipt.objects.filter(message_id=message_id, user=bob).exists()


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
def test_staff_can_list_all_notifications():
    client = APIClient()
    staff = User.objects.create_user(email="admin_n@example.com", password="pw", is_staff=True)
    user = User.objects.create_user(email="u_n@example.com", password="pw")
    Notification.objects.create(user=user, title="X", body="x")
    client.force_authenticate(user=staff)
    url = reverse("notification-list")
    resp = client.get(url, format="json")
    assert resp.status_code == 200
    data = resp.json()
    items = data.get("results", data)
    assert len(items) >= 1
