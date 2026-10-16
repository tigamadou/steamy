"""
Suppressions dans l'admin (D40, D54) : suivi seul, et annulation par le support, seule voie pour un parent qui a
supprimé son propre compte (désactivé aussitôt). Le compte réactivé n'est jamais anonymisé.
"""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import DeletionRequest, ParentChildLink, User
from apps.accounts.tasks import anonymize_due_accounts
from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.core.groups import FINANCE, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import verified_client
from apps.referentials.models import Relationship

pytestmark = pytest.mark.django_db

URL = "/admin/accounts/deletionrequest/"


def run_action(client, objects, **data):
    payload = {"action": "cancel", "_selected_action": [obj.pk for obj in objects]}
    if data:
        payload.update(apply="1", **data)
    return client.post(URL, payload)


def parent_deletes_own_account():
    parent = ParentFactory()
    api = APIClient()
    api.force_authenticate(parent)
    assert api.post("/api/accounts/me/deletion-request/", {}, format="json").status_code == 201
    parent.refresh_from_db()
    assert parent.status == User.Status.DEACTIVATED
    return parent, DeletionRequest.objects.get(user=parent)


def test_support_cancels_the_deletion_of_a_parent_account(client):
    staff = verified_client(client, SUPPORT)
    parent, deletion = parent_deletes_own_account()
    assert client.get(URL).status_code == 200
    assert client.get(f"{URL}{deletion.pk}/change/").status_code == 200
    form = run_action(client, [deletion])
    assert form.status_code == 200 and b"Motif" in form.content
    done = run_action(client, [deletion], reason="Le parent a changé d'avis (appel du 16/10)")
    assert done.status_code == 302
    deletion.refresh_from_db()
    parent.refresh_from_db()
    assert deletion.status == DeletionRequest.Status.CANCELLED
    assert parent.status == User.Status.ACTIVE
    entry = AuditLog.objects.get(action="deletion.cancelled_by_support")
    assert entry.data == {"reason": "Le parent a changé d'avis (appel du 16/10)"}
    assert entry.actor == staff
    # Déjà close : ignorée
    again = run_action(client, [deletion], reason="Encore")
    assert any("ignorée" in str(m) for m in again.wsgi_request._messages)


def test_the_support_cannot_edit_add_or_delete(client):
    verified_client(client, SUPPORT)
    _parent, deletion = parent_deletes_own_account()
    client.post(f"{URL}{deletion.pk}/change/", {"status": "done"})
    client.post(f"{URL}{deletion.pk}/delete/", {"post": "yes"})
    deletion.refresh_from_db()
    assert deletion.status == DeletionRequest.Status.SCHEDULED
    assert client.get(f"{URL}add/").status_code == 403


def test_finance_has_no_access(client):
    verified_client(client, FINANCE)
    _parent, deletion = parent_deletes_own_account()
    assert client.get(URL).status_code == 403
    run_action(client, [deletion], reason="x")
    deletion.refresh_from_db()
    assert deletion.status == DeletionRequest.Status.SCHEDULED


def test_an_account_reactivated_by_hand_is_never_anonymized():
    parent, deletion = parent_deletes_own_account()
    User.objects.filter(pk=parent.pk).update(status=User.Status.ACTIVE, is_active=True)
    DeletionRequest.objects.filter(pk=deletion.pk).update(scheduled_for=timezone.now())
    assert anonymize_due_accounts() == 0
    deletion.refresh_from_db()
    parent.refresh_from_db()
    assert deletion.status == DeletionRequest.Status.CANCELLED
    assert parent.status == User.Status.ACTIVE and parent.phone
    assert AuditLog.objects.filter(action="deletion.cancelled", target_id=str(parent.pk)).exists()


def test_a_suspended_account_is_still_anonymized():
    parent, deletion = parent_deletes_own_account()
    User.objects.filter(pk=parent.pk).update(status=User.Status.SUSPENDED, is_active=False)
    DeletionRequest.objects.filter(pk=deletion.pk).update(scheduled_for=timezone.now())
    assert anonymize_due_accounts() == 1
    parent.refresh_from_db()
    assert parent.status == User.Status.ANONYMIZED


def test_support_cancels_a_childs_request_that_still_waits_for_the_parent(client):
    verified_client(client, SUPPORT)
    child = LearnerFactory()
    ParentChildLink.objects.create(
        parent=ParentFactory(), learner=child, relationship=Relationship.objects.first()
    )
    deletion = DeletionRequest.objects.create(
        user=child, requested_by=child, status=DeletionRequest.Status.PENDING_PARENT
    )
    run_action(client, [deletion], reason="Demande retirée par téléphone")
    deletion.refresh_from_db()
    child.refresh_from_db()
    assert deletion.status == DeletionRequest.Status.CANCELLED
    assert child.status == User.Status.ACTIVE
