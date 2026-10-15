"""Notifications (§7.7, D7) : scoping propriétaire, lecture, préférences, envoi par email (C12)."""

import pytest
from django.core import mail
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient

from apps.accounts.tests.factories import (
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import notify
from apps.notifications.tests.factories import NotificationFactory

pytestmark = pytest.mark.django_db

BASE = "/api/notifications/"


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.mark.parametrize(
    "method,url",
    [
        ("get", BASE),
        ("get", f"{BASE}unread-count/"),
        ("post", f"{BASE}1/read/"),
        ("post", f"{BASE}read-all/"),
        ("get", f"{BASE}preferences/"),
        ("patch", f"{BASE}preferences/"),
    ],
)
def test_anonymous_is_refused(method, url):
    assert getattr(APIClient(), method)(url).status_code == 401


# --- Scoping propriétaire (S4) ---------------------------------------------------------------


def test_list_and_count_only_show_the_callers_notifications():
    me, other = LearnerFactory(), LearnerFactory()
    NotificationFactory.create_batch(2, user=me)
    NotificationFactory(user=other)
    client = client_for(me)
    body = client.get(BASE).json()
    assert body["count"] == 2
    assert client.get(f"{BASE}unread-count/").json() == {"count": 2}
    # Personnel : pas de passe-droit dans l'API publique.
    assert client_for(StaffFactory()).get(BASE).json()["count"] == 0


def test_cannot_read_someone_elses_notification():
    notification = NotificationFactory()
    resp = client_for(LearnerFactory()).post(f"{BASE}{notification.id}/read/")
    assert resp.status_code == 404
    notification.refresh_from_db()
    assert notification.read_at is None


def test_read_all_does_not_touch_other_users():
    me, other = LearnerFactory(), LearnerFactory()
    NotificationFactory.create_batch(3, user=me)
    theirs = NotificationFactory(user=other)
    assert client_for(me).post(f"{BASE}read-all/").json() == {"updated": 3}
    theirs.refresh_from_db()
    assert theirs.read_at is None


# --- Lecture ----------------------------------------------------------------------------------


def test_list_is_newest_first_and_filters_unread():
    me = LearnerFactory()
    old = NotificationFactory(user=me, title="Ancienne")
    new = NotificationFactory(user=me, title="Récente")
    client = client_for(me)
    assert [n["id"] for n in client.get(BASE).json()["results"]] == [new.id, old.id]

    resp = client.post(f"{BASE}{old.id}/read/")
    assert resp.status_code == 200 and resp.json()["readAt"]
    first_read_at = resp.json()["readAt"]
    # Idempotent : relire ne change pas la date de lecture.
    assert client.post(f"{BASE}{old.id}/read/").json()["readAt"] == first_read_at

    unread = client.get(f"{BASE}?unread=true").json()["results"]
    assert [n["id"] for n in unread] == [new.id]
    assert client.get(f"{BASE}unread-count/").json() == {"count": 1}


def test_notification_fields():
    item = client_for((n := NotificationFactory()).user).get(BASE).json()["results"][0]
    assert set(item) == {
        "id",
        "type",
        "category",
        "tone",
        "icon",
        "title",
        "message",
        "url",
        "readAt",
        "createdAt",
    }
    assert item["url"] == n.url


def test_url_is_always_a_front_path():
    with pytest.raises(IntegrityError), transaction.atomic():
        NotificationFactory(url="https://evil.test/")


# --- Préférences ------------------------------------------------------------------------------


def test_preferences_list_the_categories_of_the_role():
    def categories(user):
        return [
            c["category"] for c in client_for(user).get(f"{BASE}preferences/").json()["categories"]
        ]

    assert categories(LearnerFactory()) == ["learning", "rewards", "coaching", "events", "payments"]
    assert categories(ParentFactory()) == ["consents", "payments", "progress", "events"]
    assert categories(TeacherFactory()) == ["progress", "reviews", "events"]


def test_preferences_show_the_email_address_and_in_app_always_on():
    teacher = TeacherFactory(email="prof@ecole.bj")
    body = client_for(teacher).get(f"{BASE}preferences/").json()
    assert body["emailAddress"] == "prof@ecole.bj"
    assert all(c["inApp"] and c["email"] for c in body["categories"])
    assert client_for(LearnerFactory()).get(f"{BASE}preferences/").json()["emailAddress"] is None


def test_patch_preferences_disables_email_for_a_category():
    teacher = TeacherFactory()
    resp = client_for(teacher).patch(
        f"{BASE}preferences/",
        {"categories": [{"category": "events", "email": False}]},
        format="json",
    )
    assert resp.status_code == 200
    events = next(c for c in resp.json()["categories"] if c["category"] == "events")
    assert events["email"] is False
    assert NotificationPreference.objects.get(user=teacher).enabled is False


def test_patch_preferences_refuses_a_category_of_another_role():
    resp = client_for(LearnerFactory()).patch(
        f"{BASE}preferences/",
        {"categories": [{"category": "reviews", "email": False}]},
        format="json",
    )
    assert resp.status_code == 400
    assert not NotificationPreference.objects.exists()


# --- Service notify() -------------------------------------------------------------------------


def test_notify_creates_in_app_and_sends_email_when_allowed(django_capture_on_commit_callbacks):
    teacher = TeacherFactory(email="prof@ecole.bj")
    with django_capture_on_commit_callbacks(execute=True):
        notification = notify(
            teacher,
            "reviews",
            "attempt_to_review",
            "Tentative à revoir",
            url="/enseignant/eleves/3",
        )
    assert Notification.objects.get() == notification
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["prof@ecole.bj"]
    assert mail.outbox[0].subject == "Tentative à revoir"
    assert "/enseignant/eleves/3" in mail.outbox[0].body


def test_notify_respects_the_email_preference(django_capture_on_commit_callbacks):
    teacher = TeacherFactory()
    NotificationPreference.objects.create(
        user=teacher, category="reviews", channel="email", enabled=False
    )
    with django_capture_on_commit_callbacks(execute=True):
        notify(teacher, "reviews", "attempt_to_review", "Tentative à revoir")
    assert Notification.objects.count() == 1  # dans l'application : toujours
    assert mail.outbox == []


def test_notify_sends_no_email_without_address(django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        notify(LearnerFactory(), "rewards", "badge_awarded", "Nouveau badge !")
    assert Notification.objects.count() == 1
    assert mail.outbox == []


def test_parent_email_goes_to_the_contact_address(django_capture_on_commit_callbacks):
    parent = ParentFactory()
    parent.parent_profile.email = "maman@example.com"
    parent.parent_profile.save()
    with django_capture_on_commit_callbacks(execute=True):
        notify(parent, "consents", "consent_request", "Demande de consentement")
    assert mail.outbox[0].to == ["maman@example.com"]


def test_account_category_cannot_be_disabled(django_capture_on_commit_callbacks):
    teacher = TeacherFactory()
    NotificationPreference.objects.create(
        user=teacher, category="account", channel="email", enabled=False
    )
    with django_capture_on_commit_callbacks(execute=True):
        notify(teacher, "account", "password_changed", "Mot de passe modifié")
    assert len(mail.outbox) == 1


def test_notify_refuses_a_category_outside_the_role():
    with pytest.raises(ValueError):
        notify(LearnerFactory(), "reviews", "attempt_to_review", "x")


def test_email_delivery_without_address_or_notification_sends_nothing():
    from apps.notifications.services import deliver_email
    from apps.notifications.tasks import send_notification_email

    assert deliver_email(NotificationFactory()) is False  # apprenant sans email de contact
    assert send_notification_email(123456) is False  # notification supprimée entre-temps
    assert mail.outbox == []


def test_labels():
    notification = NotificationFactory(user=LearnerFactory(username="lea"), type="badge_awarded")
    assert str(notification) == "badge_awarded → lea"
    preference = NotificationPreference(
        user=notification.user, category="events", channel="email", enabled=False
    )
    assert str(preference) == "lea · events · email : non"
    preference.enabled = True
    assert str(preference).endswith(": oui")
