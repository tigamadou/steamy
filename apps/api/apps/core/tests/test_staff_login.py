"""WAD15 · connexion du personnel à l'admin Django : email, mot de passe, TOTP (D72), plafonds (S9), audit, `next`."""

import pytest
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.tests.factories import PASSWORD, TeacherFactory
from apps.core.models import AuditLog
from apps.core.staff_auth import STAFF_BACKEND, safe_next
from apps.core.tests.staff import LOGIN_URL, code, login, staff_member

pytestmark = pytest.mark.django_db


def actions():
    return list(AuditLog.objects.order_by("id").values_list("action", "data__reason"))


def test_the_login_page_asks_for_email_password_and_totp(client):
    response = client.get(LOGIN_URL)
    html = response.content.decode()
    assert response.status_code == 200
    for text in (
        "Email professionnel",
        "Mot de passe",
        "Code de vérification (2FA)",
        "Saisissez le code de votre application d&#x27;authentification.",
        "Connexion sécurisée",
        "Connexion chiffrée · journalisée",
    ):
        assert text in html
    assert 'autocomplete="one-time-code"' in html


def test_a_valid_code_opens_a_verified_session_of_eight_hours(client):
    staff = staff_member()
    response = login(client, staff)
    assert response.status_code == 302 and response.url == "/admin/"
    assert client.get("/admin/").status_code == 200
    assert client.session.get_expiry_age() == 8 * 60 * 60
    assert client.get("/api/accounts/me/").json()["otpVerified"] is True
    log = AuditLog.objects.get(action="staff.login")
    assert (log.actor, log.ip) == (staff, "127.0.0.1")


def test_without_code_the_login_is_refused_and_logged(client):
    staff = staff_member()
    response = client.post(LOGIN_URL, {"username": staff.email, "password": PASSWORD})
    assert response.status_code == 200
    assert "Saisissez le code à 6 chiffres" in response.content.decode()
    assert "_auth_user_id" not in client.session
    assert actions() == [("staff.otp_failed", "otp_missing")]


def test_a_wrong_code_is_refused_and_logged(client):
    staff = staff_member()
    response = login(client, staff, otp_token="000000" if code() != "000000" else "111111")
    assert "Code de vérification incorrect ou déjà utilisé." in response.content.decode()
    assert "_auth_user_id" not in client.session
    log = AuditLog.objects.get()
    assert (log.action, log.actor, log.data) == (
        "staff.otp_failed",
        staff,
        {"email": staff.email, "reason": "otp_invalid"},
    )


def test_a_replayed_code_is_refused(client):
    staff = staff_member()
    token = code()
    assert login(client, staff, otp_token=token).status_code == 302
    client.post("/admin/logout/")
    response = login(client, staff, otp_token=token)
    assert response.status_code == 200 and "_auth_user_id" not in client.session
    assert actions()[-1] == ("staff.otp_failed", "otp_invalid")


def test_codes_are_blocked_after_repeated_failures(client):
    staff = staff_member()
    TOTPDevice.objects.filter(user=staff).update(
        throttling_failure_count=5, throttling_failure_timestamp=timezone.now()
    )
    response = login(client, staff)
    assert "Trop de codes incorrects" in response.content.decode()
    assert actions() == [("staff.otp_failed", "otp_throttled")]


def test_a_wrong_password_is_refused_and_logged(client):
    staff = staff_member()
    response = login(client, staff, password="mauvais")
    assert "Email ou mot de passe incorrect." in response.content.decode()
    log = AuditLog.objects.get()
    assert (log.action, log.actor, log.data["reason"]) == (
        "staff.login_failed",
        None,
        "credentials",
    )


def test_a_persona_cannot_log_in_to_the_admin(client):
    teacher = TeacherFactory()
    response = client.post(
        LOGIN_URL, {"username": teacher.email, "password": PASSWORD, "otp_token": code()}
    )
    assert "Email ou mot de passe incorrect." in response.content.decode()
    assert actions() == [("staff.login_failed", "credentials")]


def test_a_deactivated_staff_member_cannot_log_in(client):
    staff = staff_member(status="deactivated")
    login(client, staff)
    assert "_auth_user_id" not in client.session


def test_a_staff_member_without_a_confirmed_device_gets_no_session(client):
    staff = staff_member(device=False)
    TOTPDevice.objects.create(user=staff, name="Abandonné", confirmed=False)
    response = login(client, staff)
    assert response.status_code == 302 and response.url == "/admin/totp/configuration/"
    assert "_auth_user_id" not in client.session
    assert client.get("/admin/").status_code == 302
    assert actions() == [("staff.totp_enrollment_started", None)]


def test_an_unverified_session_does_not_open_the_admin(client):
    staff = staff_member()
    client.force_login(staff, backend=STAFF_BACKEND)
    response = client.get("/admin/")
    assert response.status_code == 302 and response.url.startswith(LOGIN_URL)
    page = client.get(LOGIN_URL).content.decode()
    assert "n'a pas accès à cette page" in page


def test_a_verified_member_is_sent_from_the_login_page_to_the_index(client):
    login(client, staff_member())
    response = client.get(LOGIN_URL)
    assert response.status_code == 302 and response.url == "/admin/"


@pytest.mark.parametrize(
    ("next_url", "expected"),
    [
        ("/admin/core/auditlog/", "/admin/core/auditlog/"),
        ("http://localhost:3000/backoffice", "http://localhost:3000/backoffice"),
        (
            "http://localhost:3000/backoffice/impact?periode=mois",
            "http://localhost:3000/backoffice/impact?periode=mois",
        ),
        ("http://localhost:3000/apprenant", "/admin/"),
        ("http://localhost:3000/backofficex", "/admin/"),
        ("https://localhost:3000/backoffice", "/admin/"),
        ("https://pirate.example/backoffice", "/admin/"),
        ("//pirate.example/admin/", "/admin/"),
    ],
)
def test_next_is_limited_to_the_admin_and_the_backoffice(client, settings, next_url, expected):
    settings.WEB_URL = "http://localhost:3000"
    response = login(client, staff_member(), next=next_url)
    assert response.status_code == 302 and response.url == expected


def test_safe_next_without_value():
    assert safe_next("") == ""


def test_login_is_throttled_by_ip(client):
    staff = staff_member()
    for _ in range(10):  # THROTTLE_STAFF_LOGIN = 10/min
        login(client, staff_member(), password="mauvais")
    response = login(client, staff)
    assert response.status_code == 429
    assert "Trop de tentatives de connexion" in response.content.decode()
    assert "_auth_user_id" not in client.session
    assert actions()[-1] == ("staff.login_throttled", None)


def test_login_is_throttled_by_email_whatever_the_ip(client):
    staff = staff_member()
    for n in range(10):  # THROTTLE_STAFF_LOGIN_EMAIL = 10/hour
        login(client, staff, password="mauvais", REMOTE_ADDR=f"10.0.0.{n}")
    client.post(
        LOGIN_URL, {"username": "", "password": "x"}, REMOTE_ADDR="10.0.1.1"
    )  # sans email : non compté
    response = client.post(
        LOGIN_URL,
        {"username": staff.email.upper(), "password": PASSWORD, "otp_token": code()},
        REMOTE_ADDR="10.0.1.2",
    )
    assert response.status_code == 429
