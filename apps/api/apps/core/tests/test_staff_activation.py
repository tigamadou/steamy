"""
« Inviter un membre » (WAD13) : le Super-admin saisit email, identité et groupes ; le membre reçoit un lien
d'activation, y choisit son mot de passe, puis enrôle son TOTP (D72) avant toute page de l'admin.
"""

import re

import pytest
from django.contrib.auth.models import Group
from django.contrib.messages import get_messages
from django.core import mail
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient

from apps.accounts.models import StaffMember, User
from apps.accounts.tests.factories import PASSWORD, TeacherFactory
from apps.core.groups import CONTENT, SUPER_ADMIN, SUPPORT
from apps.core.models import AuditLog
from apps.core.staff_auth import activation_user
from apps.core.tests.staff import code, staff_member, verified_client

pytestmark = pytest.mark.django_db

TEAM = "/admin/accounts/staffmember/"
NEW_PASSWORD = "Steamy-Activation-2026"


def super_admin():
    client = APIClient()
    verified_client(client, SUPER_ADMIN)
    return client


def invite(client, email="ama.zinsou@steamy.bj", groups=(CONTENT,)):
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


def texts(response):
    return [str(message) for message in get_messages(response.wsgi_request)]


def activation_link(email) -> str:
    message = [m for m in mail.outbox if m.to == [email]][-1]
    return re.search(r"https?://\S+/admin/activation/\S+/", message.body).group(0)


def test_the_add_form_asks_no_password():
    page = super_admin().get(f"{TEAM}add/").content.decode()
    assert 'name="email"' in page and 'name="groups"' in page
    assert 'name="password1"' not in page
    assert "Le membre reçoit par email un lien" in page


def test_inviting_sends_an_activation_link_and_logs_it():
    response = invite(super_admin())
    assert "Lien d'activation envoyé à ama.zinsou@steamy.bj." in texts(response)
    member = User.objects.get(email="ama.zinsou@steamy.bj")
    assert member.is_staff and member.role is None and not member.has_usable_password()
    assert list(member.groups.values_list("name", flat=True)) == [CONTENT]
    message = mail.outbox[-1]
    assert message.subject == "Votre accès au back-office Steamy"
    assert "Bonjour Ama," in message.body and "valable" in message.body
    assert AuditLog.objects.filter(
        action="staff.invitation_sent", target_id=str(member.pk)
    ).exists()


def test_an_email_already_used_is_refused():
    TeacherFactory(email="prof@ecole.bj")
    response = invite(super_admin(), email="Prof@ecole.bj")
    assert "Un compte utilise déjà cette adresse email." in response.content.decode()
    assert not StaffMember.objects.filter(email__iexact="prof@ecole.bj", is_staff=True).exists()


def test_the_link_sets_the_password_then_leads_to_totp_enrollment():
    invite(super_admin())
    link = activation_link("ama.zinsou@steamy.bj")
    client = APIClient()
    page = client.get(link)
    assert "Activer votre accès" in page.content.decode()
    assert "ama.zinsou@steamy.bj" in page.content.decode()

    # Mot de passe refusé par les validateurs : rien ne change
    weak = client.post(link, {"new_password1": "123", "new_password2": "123"})
    assert "Le mot de passe n'a pas été accepté." in weak.content.decode()

    response = client.post(link, {"new_password1": NEW_PASSWORD, "new_password2": NEW_PASSWORD})
    assert response.status_code == 302 and response.url == "/admin/totp/configuration/"
    member = User.objects.get(email="ama.zinsou@steamy.bj")
    assert member.check_password(NEW_PASSWORD)
    assert "_auth_user_id" not in client.session  # aucune session avant le premier code TOTP

    client.get("/admin/totp/configuration/")
    device = TOTPDevice.objects.get(user=member, confirmed=False)
    done = client.post("/admin/totp/configuration/", {"otp_token": code(device.key)})
    assert done.status_code == 302 and done.url == "/admin/"
    assert client.get("/admin/").status_code == 200
    actions = set(AuditLog.objects.filter(actor=member).values_list("action", flat=True))
    assert {"staff.activated", "staff.totp_enrolled", "staff.login"} <= actions

    # Le lien ne sert qu'une fois
    reused = APIClient().get(link).content.decode()
    assert "Ce lien d'activation n'est plus valable" in reused


def test_a_resent_link_replaces_the_previous_one():
    admin = super_admin()
    invite(admin)
    first = activation_link("ama.zinsou@steamy.bj")
    member = StaffMember.objects.get(email="ama.zinsou@steamy.bj")
    response = admin.post(
        TEAM, {"action": "send_activation", "_selected_action": [member.pk]}, follow=True
    )
    assert "Lien d'activation envoyé à ama.zinsou@steamy.bj." in texts(response)
    second = activation_link("ama.zinsou@steamy.bj")
    assert second != first
    assert "n'est plus valable" in APIClient().get(first).content.decode()
    assert "Activer votre accès" in APIClient().get(second).content.decode()


def test_an_activated_member_gets_no_new_link():
    admin = super_admin()
    colleague = staff_member(SUPPORT)
    response = admin.post(
        TEAM, {"action": "send_activation", "_selected_action": [colleague.pk]}, follow=True
    )
    assert f"{colleague} : compte déjà activé." in texts(response)
    assert not mail.outbox
    colleague.refresh_from_db()
    assert colleague.check_password(PASSWORD)


def test_the_team_shows_who_is_activated():
    admin = super_admin()
    invite(admin)
    listing = admin.get(TEAM)
    assert "Activé" in listing.content.decode()
    actions = [name for name, _ in listing.context["action_form"].fields["action"].choices]
    assert "send_activation" in actions


@pytest.mark.parametrize("uidb64, token", [("!!", "x"), ("MTIzNDU2", "x"), ("Mg", "jeton-faux")])
def test_an_unknown_or_forged_link_is_refused(uidb64, token):
    assert activation_user(uidb64, token) is None
    page = APIClient().get(f"/admin/activation/{uidb64}/{token}/")
    assert page.status_code == 200
    assert "n'est plus valable" in page.content.decode()
