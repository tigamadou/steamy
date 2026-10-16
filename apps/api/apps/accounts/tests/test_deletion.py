"""
Suppression de compte (D40, D54, §4.1) : demande de l'apprenant validée par son parent, suppression d'un enfant par
le parent, compte parent seulement sans enfant, désactivation immédiate, annulation avant J+30, anonymisation
complète à J+30 (identifiant libéré, factures intactes).
"""

from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts import deletion as service
from apps.accounts.models import (
    ConsentRequest,
    DeletionRequest,
    OtpChallenge,
    ParentChildLink,
    PublicProfileReview,
    User,
)
from apps.accounts.tasks import anonymize_due_accounts
from apps.accounts.tests.factories import (
    PASSWORD,
    LearnerFactory,
    ParentFactory,
    TeacherFactory,
)
from apps.core.models import AuditLog
from apps.notifications.models import Notification
from apps.payments.models import Invoice, Order
from apps.payments.tests.factories import OrderFactory
from apps.referentials.models import Disability, Locality, Relationship

pytestmark = pytest.mark.django_db

ME = "/api/accounts/me/deletion-request/"
CHILDREN = "/api/accounts/children/"
REQUESTS = "/api/accounts/deletion-requests/"


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def login(identifier, password=PASSWORD):
    return APIClient().post(
        "/api/auth/login/", {"identifier": identifier, "password": password}, format="json"
    )


def link(parent, learner=None):
    learner = learner or LearnerFactory()
    ParentChildLink.objects.create(
        parent=parent, learner=learner, relationship=Relationship.objects.get(code="mere")
    )
    return learner


@pytest.fixture
def parent():
    return ParentFactory()


@pytest.fixture
def child(parent):
    return link(parent, LearnerFactory(first_name="Léa"))


def child_asks(child, **payload):
    resp = as_user(child).post(ME, payload, format="json")
    assert resp.status_code == 201, resp.json()
    return DeletionRequest.objects.get(pk=resp.json()["id"])


# --- WD15 · Demande de l'apprenant --------------------------------------------------------------


def test_learner_request_waits_for_the_parent_who_is_notified(parent, child):
    deletion = child_asks(child, reason="plus-utilise", note="Je n'ai plus le temps")
    assert deletion.status == DeletionRequest.Status.PENDING_PARENT
    assert str(deletion) == f"Suppression de {child.username} (pending_parent)"
    child.refresh_from_db()
    assert child.status == User.Status.ACTIVE
    notification = Notification.objects.get(user=parent, type="deletion_request")
    assert notification.url == f"/parent/enfants/{child.pk}/supprimer?demande={deletion.pk}"
    body = as_user(child).get(ME).json()
    assert body["status"] == "pending_parent"
    assert body["requestedByLearner"] is True
    assert body["reason"]["code"] == "plus-utilise"


def test_learner_request_is_idempotent_and_reason_optional(child):
    first = child_asks(child)
    assert first.reason is None
    assert child_asks(child).pk == first.pk
    assert DeletionRequest.objects.count() == 1


def test_learner_withdraws_a_pending_request(child):
    child_asks(child)
    client = as_user(child)
    assert client.delete(ME).status_code == 204
    assert DeletionRequest.objects.get().status == DeletionRequest.Status.CANCELLED
    assert client.delete(ME).status_code == 404


def test_without_request_get_is_not_found(child):
    assert as_user(child).get(ME).status_code == 404


def test_teacher_cannot_delete_their_account():
    resp = as_user(TeacherFactory()).post(ME, {}, format="json")
    assert resp.status_code == 403
    assert APIClient().post(ME, {}, format="json").status_code == 401


# --- Validation par le parent (WPD01, WPD09) ----------------------------------------------------


def test_parent_approves_the_request_and_the_child_is_deactivated(parent, child):
    deletion = child_asks(child, reason="autre")
    resp = as_user(parent).post(f"{REQUESTS}{deletion.pk}/approve/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "scheduled"
    deletion.refresh_from_db()
    assert deletion.scheduled_for > timezone.now() + timedelta(days=29)
    child.refresh_from_db()
    assert child.status == User.Status.DEACTIVATED
    assert login(child.username).json()["code"] == "ACCOUNT_DEACTIVATED"
    again = as_user(parent).post(f"{REQUESTS}{deletion.pk}/approve/")
    assert again.status_code == 409
    assert again.json()["code"] == "DELETION_ALREADY_RESOLVED"


def test_parent_refuses_and_the_child_is_notified(parent, child):
    deletion = child_asks(child)
    resp = as_user(parent).post(f"{REQUESTS}{deletion.pk}/refuse/")
    assert resp.json()["status"] == "refused"
    child.refresh_from_db()
    assert child.status == User.Status.ACTIVE
    assert Notification.objects.filter(user=child, type="deletion_refused").exists()


def test_parent_lists_and_reads_the_requests_of_their_children(parent, child):
    deletion = child_asks(child, reason="donnees")
    child_asks(link(ParentFactory()))  # autre famille
    client = as_user(parent)
    body = client.get(REQUESTS).json()
    assert [r["id"] for r in body["results"]] == [deletion.pk]
    detail = client.get(f"{REQUESTS}{deletion.pk}/").json()
    assert detail["accountId"] == child.pk
    assert detail["firstName"] == "Léa"
    assert detail["reason"]["code"] == "donnees"


def test_learner_cannot_approve_their_own_request(child):
    deletion = child_asks(child)
    client = as_user(child)
    assert client.post(f"{REQUESTS}{deletion.pk}/approve/").status_code == 403
    assert client.post(f"{CHILDREN}{child.pk}/deletion/", {"reason": "autre"}).status_code == 403
    deletion.refresh_from_db()
    assert deletion.status == DeletionRequest.Status.PENDING_PARENT


def test_another_parent_cannot_touch_the_request_or_the_child(child):
    deletion = child_asks(child)
    other = as_user(ParentFactory())
    assert other.get(f"{REQUESTS}{deletion.pk}/").status_code == 404
    assert other.post(f"{REQUESTS}{deletion.pk}/approve/").status_code == 404
    assert other.post(f"{REQUESTS}{deletion.pk}/refuse/").status_code == 404
    payload = {"reason": "autre"}
    assert other.post(f"{CHILDREN}{child.pk}/deletion/", payload).status_code == 404
    assert other.delete(f"{CHILDREN}{child.pk}/deletion/").status_code == 404
    deletion.refresh_from_db()
    assert deletion.status == DeletionRequest.Status.PENDING_PARENT


# --- WPD09 · Suppression à l'initiative du parent, annulation (WPD02) ---------------------------


def test_parent_deletes_a_child_then_cancels(parent, child):
    client = as_user(parent)
    resp = client.post(
        f"{CHILDREN}{child.pk}/deletion/", {"reason": "plus-utilise", "note": "x"}, format="json"
    )
    assert resp.status_code == 200, resp.json()
    assert resp.json()["status"] == "deactivated"
    assert resp.json()["deletion"]["status"] == "scheduled"
    assert login(child.username).json()["code"] == "ACCOUNT_DEACTIVATED"
    row = client.get(CHILDREN).json()["results"][0]
    assert row["deletion"]["scheduledFor"]
    # idempotent
    again = client.post(f"{CHILDREN}{child.pk}/deletion/", {"reason": "autre"}, format="json")
    assert again.status_code == 200
    assert DeletionRequest.objects.count() == 1
    resp = client.delete(f"{CHILDREN}{child.pk}/deletion/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"
    assert resp.json()["deletion"] is None
    assert login(child.username).status_code == 200
    assert client.delete(f"{CHILDREN}{child.pk}/deletion/").status_code == 404


def test_deleting_a_child_validates_their_pending_request(parent, child):
    deletion = child_asks(child, reason="donnees")
    resp = as_user(parent).post(
        f"{CHILDREN}{child.pk}/deletion/", {"reason": "autre"}, format="json"
    )
    assert resp.status_code == 200
    deletion.refresh_from_db()
    assert deletion.status == DeletionRequest.Status.SCHEDULED
    assert deletion.requested_by == child
    assert deletion.reason.code == "autre"


def test_parent_must_give_a_reason(parent, child):
    resp = as_user(parent).post(f"{CHILDREN}{child.pk}/deletion/", {}, format="json")
    assert resp.status_code == 400
    assert "reason" in resp.json()["fields"]


def test_cancelling_a_pending_request_keeps_the_child_active(parent, child):
    child_asks(child)
    assert as_user(parent).delete(f"{CHILDREN}{child.pk}/deletion/").status_code == 200
    child.refresh_from_db()
    assert child.status == User.Status.ACTIVE
    assert DeletionRequest.objects.get().status == DeletionRequest.Status.CANCELLED


# --- WPD08 · Compte parent (D54) ----------------------------------------------------------------


def test_parent_with_children_cannot_delete_their_account(parent, child):
    resp = as_user(parent).post(ME, {}, format="json")
    assert resp.status_code == 409
    assert resp.json()["code"] == "CHILDREN_STILL_LINKED"


def test_parent_without_children_is_deactivated_and_logged_out(parent):
    link(parent, LearnerFactory(status=User.Status.ANONYMIZED, username=None))
    client = APIClient()
    assert login(parent.phone).status_code == 200
    client.force_login(parent)
    resp = client.post(ME, {"reason": "autre"}, format="json")
    assert resp.status_code == 201
    assert resp.json()["status"] == "scheduled"
    parent.refresh_from_db()
    assert parent.status == User.Status.DEACTIVATED
    assert client.get("/api/accounts/me/").status_code == 401
    assert login(parent.phone).json()["code"] == "ACCOUNT_DEACTIVATED"


# --- Anonymisation à J+30 -----------------------------------------------------------------------


def schedule(parent, child):
    as_user(parent).post(f"{CHILDREN}{child.pk}/deletion/", {"reason": "autre"}, format="json")
    DeletionRequest.objects.update(scheduled_for=timezone.now() - timedelta(minutes=1))


def test_child_is_fully_anonymized_and_the_username_released(parent, child):
    profile = child.learner_profile
    profile.email = "lea@exemple.bj"
    profile.locality = Locality.objects.first()
    profile.disability = Disability.objects.first()
    profile.gender = "female"
    profile.public_pseudonym = "LeaBot"
    profile.public_display_allowed = True
    profile.save()
    ConsentRequest.objects.create(
        origin="learner",
        subject={"first_name": "Léa", "username": child.username},
        learner=child,
        parent_phone=parent.phone,
        relationship=Relationship.objects.first(),
        status="accepted",
        expires_at=timezone.now(),
        refusal_note="note",
    )
    Notification.objects.create(user=child, category="account", type="x", title="Léa")
    OtpChallenge.objects.create(
        user=child,
        purpose="password_reset",
        code_hash="x",
        expires_at=timezone.now(),
        last_sent_at=timezone.now(),
    )
    PublicProfileReview.objects.create(learner=child, pseudonym="LeaBot")
    username = child.username
    schedule(parent, child)
    assert anonymize_due_accounts() == 1
    child.refresh_from_db()
    assert child.status == User.Status.ANONYMIZED
    assert (child.username, child.phone, child.email, child.first_name, child.last_name) == (
        None,
        None,
        None,
        "",
        "",
    )
    assert not child.has_usable_password()
    profile.refresh_from_db()
    assert profile.email is None and profile.locality is None and profile.disability is None
    assert profile.gender is None and profile.birth_date is None and profile.declared_age is None
    assert profile.public_pseudonym is None and profile.public_display_allowed is False
    consent = ConsentRequest.objects.get(learner=child)
    assert consent.subject == {} and consent.refusal_note == ""
    assert not Notification.objects.filter(user=child).exists()
    assert not OtpChallenge.objects.filter(user=child).exists()
    assert not PublicProfileReview.objects.filter(learner=child).exists()
    deletion = DeletionRequest.objects.get(user=child)
    assert deletion.status == DeletionRequest.Status.DONE and deletion.note == ""
    assert AuditLog.objects.filter(action="deletion.done", target_id=str(child.pk)).exists()
    # identifiant libéré, enfant retiré de la liste du parent
    assert LearnerFactory(username=username).username == username
    assert as_user(parent).get(CHILDREN).json()["count"] == 0
    # relancer ne fait rien
    assert anonymize_due_accounts() == 0


def test_parent_is_anonymized_and_invoices_are_kept(parent):
    profile = parent.parent_profile
    profile.email = "marie@exemple.bj"
    profile.profession = "Comptable"
    profile.save()
    phone = parent.phone
    order = OrderFactory(payer=parent, beneficiary=None, kind=Order.Kind.KIT, items=[], paid=True)
    invoice = Invoice.objects.create(order=order, number="F-2026-0001")
    ConsentRequest.objects.create(
        origin="learner",
        subject={},
        parent_phone=phone,
        relationship=Relationship.objects.first(),
        status="refused",
        expires_at=timezone.now(),
    )
    OtpChallenge.objects.create(
        phone=phone,
        purpose="phone_change",
        code_hash="x",
        expires_at=timezone.now(),
        last_sent_at=timezone.now(),
    )
    from apps.shop.models import DeliveryAddress, RestockAlert
    from apps.shop.tests.factories import DeliveryZoneFactory, KitFactory

    DeliveryAddress.objects.create(
        user=parent,
        zone=DeliveryZoneFactory(),
        recipient_name="Marie",
        city="Cotonou",
        address_line="Rue 12",
    )
    RestockAlert.objects.create(kit=KitFactory(), user=parent, phone=phone)
    as_user(parent).post(ME, {}, format="json")
    DeletionRequest.objects.update(scheduled_for=timezone.now())
    call_command("anonymize_due_accounts")
    parent.refresh_from_db()
    assert parent.status == User.Status.ANONYMIZED and parent.phone is None
    profile.refresh_from_db()
    assert profile.email is None and profile.profession == ""
    assert not ConsentRequest.objects.filter(parent_phone=phone).exists()
    assert not OtpChallenge.objects.filter(phone=phone).exists()
    assert not DeliveryAddress.objects.filter(user=parent).exists()
    assert not RestockAlert.objects.exists()
    invoice.refresh_from_db()
    assert invoice.order.payer == parent and invoice.number == "F-2026-0001"
    # le numéro est libéré
    assert ParentFactory(phone=phone).phone == phone


def test_cancelled_or_future_deletions_are_not_anonymized(parent, child):
    schedule(parent, child)
    other = link(parent)
    as_user(parent).post(f"{CHILDREN}{other.pk}/deletion/", {"reason": "autre"}, format="json")
    as_user(parent).delete(f"{CHILDREN}{child.pk}/deletion/")
    assert anonymize_due_accounts() == 0
    child.refresh_from_db()
    other.refresh_from_db()
    assert child.status == User.Status.ACTIVE
    assert other.status == User.Status.DEACTIVATED


def test_other_apps_are_told_about_the_anonymization(parent, child):
    received = []

    def receiver(sender, user, **kwargs):
        received.append(user.pk)

    service.account_anonymized.connect(receiver)
    try:
        schedule(parent, child)
        anonymize_due_accounts()
    finally:
        service.account_anonymized.disconnect(receiver)
    assert received == [child.pk]
