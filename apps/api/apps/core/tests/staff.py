"""Outils des tests du personnel : membre d'un groupe avec un appareil TOTP confirmé, code courant, connexion WAD15."""

from django.contrib.auth.models import Group
from django_otp.oath import TOTP
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.tests.factories import PASSWORD, StaffFactory

#: Secret de test (vecteur RFC 6238)
KEY = "3132333435363738393031323334353637383930"
LOGIN_URL = "/admin/login/"


def staff_member(group=None, *, device=True, **fields):
    staff = StaffFactory(**fields)
    if group:
        staff.groups.add(Group.objects.get(name=group))
    if device:
        TOTPDevice.objects.create(user=staff, name="Test", key=KEY, confirmed=True)
    return staff


def code(key=KEY, offset=0) -> str:
    """Code TOTP de la fenêtre courante (`offset` en pas de 30 s)."""
    totp = TOTP(bytes.fromhex(key))
    totp.time = totp.time + offset * 30
    return f"{totp.token():06d}"


def login(client, staff, otp_token=None, **extra):
    data = {
        "username": staff.email,
        "password": PASSWORD,
        "otp_token": otp_token or code(),
        **extra,
    }
    return client.post(LOGIN_URL, data)


def verified_client(client, group=None, **fields):
    """Client connecté par WAD15 (session vérifiée par TOTP)."""
    staff = staff_member(group, **fields)
    response = login(client, staff)
    assert response.status_code == 302, response.content
    return staff
