"""
« Inviter un membre » (WAD13) : le Super-admin saisit email, identité et groupes ; le membre reçoit un lien
d'activation (jeton haché, usage unique, 72 h), y choisit son mot de passe, puis enrôle son TOTP (D72) avant toute
page de l'admin. Lien plafonné par IP, retiré de l'URL dès la première visite ; renvoi espacé ; révocation.
"""

import datetime
import logging
import re

import pytest
from django.contrib.auth.models import Group
from django.contrib.messages import get_messages
from django.core import mail
from django.test import TestCase
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient

from apps.accounts.models import StaffInvitation, StaffMember, User
from apps.accounts.tests.factories import PASSWORD, TeacherFactory
from apps.core.groups import CONTENT, SUPER_ADMIN, SUPPORT
from apps.core.models import AuditLog
from apps.core.staff_auth import (
    ACTIVATION_LIFETIME,
    ACTIVATION_SESSION_KEY,
    RESEND_COOLDOWN,
)
from apps.core.tests.staff import code, staff_member, verified_client
from libs.access_log import MaskSecretsFilter, install, mask_secrets

pytestmark = pytest.mark.django_db

TEAM = "/admin/accounts/staffmember/"
PASSWORD_PAGE = "/admin/activation/definir/"
NEW_PASSWORD = "Steamy-Activation-2026"
INVALID = "n'est plus valable"


def super_admin():
    client = APIClient()
    verified_client(client, SUPER_ADMIN)
    return client


def invite(client, email="ama.zinsou@steamy.bj", groups=(CONTENT,)):
    with TestCase.captureOnCommitCallbacks(execute=True):
        return client.post(
            f"{TEAM}add/",
            {
                "email": email,
                "first_name": "Ama",
                "last_name": "Zinsou",
                "groups": [Group.objects.get(name=name).pk for name in groups],
            },
            follow=True,
        )


def act(client, action, members):
    with TestCase.captureOnCommitCallbacks(execute=True):
        return client.post(
            TEAM, {"action": action, "_selected_action": [m.pk for m in members]}, follow=True
        )


def texts(response):
    return [str(message) for message in get_messages(response.wsgi_request)]


def activation_link(email) -> str:
    message = [m for m in mail.outbox if m.to == [email]][-1]
    return re.search(r"https?://\S+/admin/activation/\S+/", message.body).group(0)


def ama():
    return StaffMember.objects.get(email="ama.zinsou@steamy.bj")


def test_the_add_form_asks_no_password():
    page = super_admin().get(f"{TEAM}add/").content.decode()
    assert 'name="email"' in page and 'name="groups"' in page
    assert 'name="password1"' not in page
    assert "Le membre reçoit par email un lien" in page


def test_inviting_sends_an_activation_link_and_logs_it():
    response = invite(super_admin())
    assert "Lien d'activation envoyé à ama.zinsou@steamy.bj." in texts(response)
    member = ama()
    assert member.is_staff and member.role is None and not member.has_usable_password()
    assert list(member.groups.values_list("name", flat=True)) == [CONTENT]
    invitation = member.staff_invitation
    assert invitation.pending and len(invitation.token_hash) == 64
    assert invitation.expires_at - invitation.sent_at == ACTIVATION_LIFETIME
    assert ACTIVATION_LIFETIME == datetime.timedelta(hours=72)
    message = mail.outbox[-1]
    assert message.subject == "Votre accès au back-office Steamy"
    assert "Bonjour Ama," in message.body and "valable" in message.body
    token = activation_link(member.email).rstrip("/").rsplit("/", 1)[-1]
    assert token not in invitation.token_hash  # stocké haché seulement
    assert AuditLog.objects.filter(
        action="staff.invitation_sent", target_id=str(member.pk)
    ).exists()


def test_the_email_waits_for_the_transaction():
    client = super_admin()
    client.post(
        f"{TEAM}add/",
        {"email": "a@steamy.bj", "first_name": "A", "groups": [Group.objects.get(name=CONTENT).pk]},
    )
    assert not mail.outbox  # on_commit non exécuté : rien ne part d'une transaction annulée


def test_an_email_already_used_is_refused():
    TeacherFactory(email="prof@ecole.bj")
    response = invite(super_admin(), email="Prof@ecole.bj")
    assert "Un compte utilise déjà cette adresse email." in response.content.decode()
    assert not StaffMember.objects.filter(email__iexact="prof@ecole.bj", is_staff=True).exists()


def test_the_link_moves_the_token_to_the_session_then_sets_the_password_and_enrolls():
    invite(super_admin())
    link = activation_link("ama.zinsou@steamy.bj")
    client = APIClient()
    first = client.get(link)
    assert first.status_code == 302 and first.url == PASSWORD_PAGE
    assert ACTIVATION_SESSION_KEY in client.session
    page = client.get(PASSWORD_PAGE).content.decode()
    assert "Activer votre accès" in page
    assert "a•••@steamy.bj" in page and "ama.zinsou@steamy.bj" not in page

    # Mot de passe refusé par les validateurs : rien ne change
    weak = client.post(PASSWORD_PAGE, {"new_password1": "123", "new_password2": "123"})
    assert "Le mot de passe n'a pas été accepté." in weak.content.decode()
    assert not ama().has_usable_password()

    response = client.post(
        PASSWORD_PAGE, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD}
    )
    assert response.status_code == 302 and response.url == "/admin/totp/configuration/"
    member = ama()
    assert member.check_password(NEW_PASSWORD)
    invitation = member.staff_invitation
    assert invitation.accepted_at is not None and invitation.token_hash == ""
    assert ACTIVATION_SESSION_KEY not in client.session
    assert "_auth_user_id" not in client.session  # aucune session avant le premier code TOTP

    client.get("/admin/totp/configuration/")
    device = TOTPDevice.objects.get(user=member, confirmed=False)
    done = client.post("/admin/totp/configuration/", {"otp_token": code(device.key)})
    assert done.status_code == 302 and done.url == "/admin/"
    assert client.get("/admin/").status_code == 200
    actions = set(AuditLog.objects.filter(actor=member).values_list("action", flat=True))
    assert {"staff.activated", "staff.totp_enrolled", "staff.login"} <= actions

    # Le lien ne sert qu'une fois
    assert INVALID in APIClient().get(link).content.decode()


def test_the_password_page_without_a_valid_token_in_session_is_refused():
    assert INVALID in APIClient().get(PASSWORD_PAGE).content.decode()
    invite(super_admin())
    client = APIClient()
    client.get(activation_link("ama.zinsou@steamy.bj"))
    StaffInvitation.objects.update(expires_at=timezone.now())  # expiré entre-temps
    response = client.post(
        PASSWORD_PAGE, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD}
    )
    assert INVALID in response.content.decode()
    assert ACTIVATION_SESSION_KEY not in client.session
    assert not ama().has_usable_password()


def test_a_forged_or_expired_token_of_a_pending_member_is_refused():
    invite(super_admin())
    link = activation_link("ama.zinsou@steamy.bj")
    forged = link.rstrip("/")[:-4] + "AAAA/"
    client = APIClient()
    assert INVALID in client.get(forged).content.decode()
    assert ACTIVATION_SESSION_KEY not in client.session
    StaffInvitation.objects.update(expires_at=timezone.now())
    assert INVALID in client.get(link).content.decode()


def test_the_activation_pages_are_throttled_by_ip():
    client = APIClient()
    for _ in range(10):  # THROTTLE_STAFF_ACTIVATION = 10/min
        assert client.get("/admin/activation/jeton-faux/").status_code == 200
    assert client.get("/admin/activation/jeton-faux/").status_code == 429
    assert client.get(PASSWORD_PAGE).status_code == 429
    assert AuditLog.objects.filter(action="staff.activation_throttled").count() == 2


def test_a_resend_waits_for_the_cooldown_then_replaces_the_link():
    admin = super_admin()
    invite(admin)
    first = activation_link("ama.zinsou@steamy.bj")
    too_soon = act(admin, "send_activation", [ama()])
    assert any("lien déjà envoyé il y a moins de 10 minutes" in m for m in texts(too_soon))
    assert len(mail.outbox) == 1

    StaffInvitation.objects.update(sent_at=timezone.now() - RESEND_COOLDOWN)
    response = act(admin, "send_activation", [ama()])
    assert "Lien d'activation envoyé à ama.zinsou@steamy.bj." in texts(response)
    second = activation_link("ama.zinsou@steamy.bj")
    assert second != first
    assert INVALID in APIClient().get(first).content.decode()
    assert APIClient().get(second).status_code == 302


def test_revoking_invalidates_the_link_and_deactivates_the_account():
    admin = super_admin()
    invite(admin)
    link = activation_link("ama.zinsou@steamy.bj")
    response = act(admin, "revoke_invitation", [ama()])
    assert f"{ama()} : invitation révoquée." in texts(response)
    member = ama()
    assert (member.status, member.is_active) == (User.Status.DEACTIVATED, False)
    assert member.staff_invitation.revoked_at is not None
    assert INVALID in APIClient().get(link).content.decode()
    assert AuditLog.objects.filter(
        action="staff.invitation_revoked", target_id=str(member.pk)
    ).exists()
    # Ni renvoi, ni seconde révocation
    again = texts(act(admin, "send_activation", [member]))
    assert f"{member} : invitation révoquée." in again
    twice = texts(act(admin, "revoke_invitation", [member]))
    assert f"{member} : aucune invitation en attente." in twice


def test_an_activated_member_gets_no_new_link_and_cannot_be_revoked():
    admin = super_admin()
    colleague = staff_member(SUPPORT)
    response = act(admin, "send_activation", [colleague])
    assert f"{colleague} : compte déjà activé." in texts(response)
    assert not mail.outbox and not StaffInvitation.objects.exists()
    revoke = act(admin, "revoke_invitation", [colleague])
    assert f"{colleague} : aucune invitation en attente." in texts(revoke)
    colleague.refresh_from_db()
    assert colleague.check_password(PASSWORD) and colleague.is_active


def test_the_team_shows_who_is_activated_and_the_invitation_actions():
    admin = super_admin()
    invite(admin)
    listing = admin.get(TEAM)
    assert "Activé" in listing.content.decode()
    actions = [name for name, _ in listing.context["action_form"].fields["action"].choices]
    assert {"send_activation", "revoke_invitation"} <= set(actions)
    assert str(ama().staff_invitation) == f"Invitation de {ama()}"


# --- Journaux d'accès ---------------------------------------------------------------------------------------------


def test_the_access_log_masks_activation_tokens():
    assert mask_secrets('"GET /admin/activation/abc_DEF-123/ HTTP/1.1"') == (
        '"GET /admin/activation/•••/ HTTP/1.1"'
    )
    assert mask_secrets("/admin/activation/definir/") == "/admin/activation/definir/"
    assert mask_secrets(200) == 200

    uvicorn = logging.LogRecord(
        "uvicorn.access",
        logging.INFO,
        "",
        0,
        '%s - "%s %s"',
        ("1.2.3.4", "GET", "/admin/activation/s3cr3t/"),
        None,
    )
    MaskSecretsFilter().filter(uvicorn)
    assert "s3cr3t" not in uvicorn.getMessage()
    gunicorn = logging.LogRecord("gunicorn.access", logging.INFO, "", 0, "%(U)s", None, None)
    gunicorn.args = {"U": "/admin/activation/s3cr3t/"}
    MaskSecretsFilter().filter(gunicorn)
    assert gunicorn.getMessage() == "/admin/activation/•••/"

    plain = logging.LogRecord(
        "uvicorn.access", logging.INFO, "", 0, "GET /admin/activation/s3cr3t/", None, None
    )
    MaskSecretsFilter().filter(plain)
    assert plain.getMessage() == "GET /admin/activation/•••/"

    install()
    install()  # idempotent
    for name in ("uvicorn.access", "gunicorn.access"):
        filters = logging.getLogger(name).filters
        assert sum(isinstance(f, MaskSecretsFilter) for f in filters) == 1
