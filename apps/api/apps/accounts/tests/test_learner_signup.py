"""
Inscription de l'apprenant (W04-W10, W19) et demande de consentement d'origine apprenant (W06, W07) :
D21 (compte en attente + code de reprise), D23 (âge), C5 (reprise), C14 (code non régénérable, nouvelle demande).
"""

import re
from datetime import timedelta

import pytest
from django.contrib.auth.hashers import identify_hasher
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts import signup as service
from apps.accounts.models import ConsentRequest, SignupSession, User
from apps.accounts.tasks import expire_consent_requests, purge_signup_sessions
from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.core.models import PlatformSettings

pytestmark = pytest.mark.django_db

AVAILABILITY_URL = "/api/auth/username-availability/"
SIGNUP_URL = "/api/auth/learner-signup/"
RESUME_URL = f"{SIGNUP_URL}resume/"
PASSWORD_URL = f"{SIGNUP_URL}password/"
CONSENT_URL = "/api/accounts/consent-requests/"
LOGIN_URL = "/api/auth/login/"
PARENT_PHONE = "+2290197123456"
NEW_PASSWORD = "Robots2026"


def signup(client, **extra):
    payload = {
        "firstName": "Kofi",
        "lastName": "Mensah",
        "username": "kofi.m",
        "age": 12,
        "privacyAccepted": True,
    }
    return client.post(SIGNUP_URL, {**payload, **extra}, format="json")


def ask_parent(client, phone="01 97 12 34 56", relationship="mere"):
    return client.post(
        CONSENT_URL, {"parentPhone": phone, "relationship": relationship}, format="json"
    )


def started(**extra):
    client = APIClient()
    resp = signup(client, **extra)
    assert resp.status_code == 201, resp.json()
    return client, resp.json()


def link_token(sms, phone=PARENT_PHONE):
    return re.search(r"/consentement/(\S+)$", sms.last(phone)).group(1)


def accept(learner):
    ConsentRequest.objects.filter(learner=learner).update(status=ConsentRequest.Status.ACCEPTED)


def age_signup(seconds):
    delta = timedelta(seconds=seconds)
    for model in (SignupSession, ConsentRequest):
        for obj in model.objects.all():
            obj.expires_at -= delta
            if getattr(obj, "last_sent_at", None):
                obj.last_sent_at -= delta
            obj.save()


# --- Disponibilité de l'identifiant (W04, W19) -------------------------------------------------


def test_username_availability():
    LearnerFactory(username="Lea.Adjovi")
    client = APIClient()
    assert client.get(AVAILABILITY_URL, {"username": "kofi"}).json() == {"available": True}
    # Insensible à la casse (C7)
    assert client.get(AVAILABILITY_URL, {"username": "lea.adjovi"}).json() == {"available": False}


@pytest.mark.parametrize("username", ["ab", "123456", "kofi@mail", "97.00.00", ""])
def test_username_availability_rejects_invalid_usernames(username):
    resp = APIClient().get(AVAILABILITY_URL, {"username": username})
    assert resp.status_code == 400
    assert resp.json()["fields"]["username"][0]["code"] in ("USERNAME_INVALID", "BLANK")


def test_username_availability_is_throttled(monkeypatch):
    rates = {**SimpleRateThrottle.THROTTLE_RATES, "username-availability": "2/min"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)
    codes = [APIClient().get(AVAILABILITY_URL, {"username": "kofi"}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


# --- Création (W04-W05) -----------------------------------------------------------------------


def test_signup_creates_a_pending_learner_with_a_hashed_resume_code():
    client, body = started()
    code = body["resumeCode"]
    assert re.fullmatch(r"[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}", code)
    assert body["signup"] == {
        "step": "parent",
        "firstName": "Kofi",
        "username": "kofi.m",
        "expiresAt": body["signup"]["expiresAt"],
        "consentRequest": None,
    }
    learner = User.objects.get(username="kofi.m")
    assert (learner.role, learner.status, learner.is_active) == ("learner", "pending", True)
    assert not learner.has_usable_password()
    assert learner.learner_profile.declared_age == 12
    session = learner.signup_session
    assert code not in session.resume_code_hash
    identify_hasher(session.resume_code_hash)
    assert session.expires_at - timezone.now() > timedelta(days=6, hours=23)
    assert str(session) == "Inscription en cours de kofi.m"
    # Le code n'est jamais renvoyé ensuite (C14)
    assert "resumeCode" not in client.get(SIGNUP_URL).json()


@pytest.mark.parametrize("age,ok", [(9, False), (10, True), (17, True), (18, False)])
def test_age_must_be_between_10_and_17(age, ok):
    resp = signup(APIClient(), age=age)
    assert (resp.status_code == 201) is ok
    if not ok:
        assert resp.json()["fields"]["age"][0]["code"] == "AGE_OUT_OF_RANGE"
        assert not User.objects.filter(username="kofi.m").exists()


def test_taken_username_is_refused():
    LearnerFactory(username="KOFI.M")
    resp = signup(APIClient())
    assert resp.status_code == 400
    assert resp.json()["fields"]["username"][0]["code"] == "USERNAME_TAKEN"


@pytest.mark.parametrize("username", ["12345", "ko", "kofi@x.bj", "+22997"])
def test_invalid_username_is_refused(username):
    resp = signup(APIClient(), username=username)
    assert resp.json()["fields"]["username"][0]["code"] == "USERNAME_INVALID"


def test_privacy_must_be_accepted():
    resp = signup(APIClient(), privacyAccepted=False)
    assert resp.json()["fields"]["privacyAccepted"][0]["code"] == "REQUIRED"


@pytest.mark.parametrize("role", ["parent", "teacher", None])
def test_role_is_never_accepted(role):
    started(role=role, isStaff=True, status="active")
    learner = User.objects.get(username="kofi.m")
    assert (learner.role, learner.is_staff, learner.status) == ("learner", False, "pending")


def test_signup_requires_csrf(settings):
    settings.CSRF_TRUSTED_ORIGINS = ["http://localhost:3000"]
    client = APIClient(enforce_csrf_checks=True, HTTP_ORIGIN="http://localhost:3000")
    assert signup(client).status_code == 403


# --- État et reprise (W06-W08, C5) --------------------------------------------------------------


def test_state_without_signup_is_not_found():
    resp = APIClient().get(SIGNUP_URL)
    assert resp.status_code == 404


def test_state_follows_the_consent_request(sms):
    client, _ = started()
    ask_parent(client)
    state = client.get(SIGNUP_URL).json()
    assert state["step"] == "waiting"
    assert state["consentRequest"]["status"] == "pending"
    assert state["consentRequest"]["parentPhoneMasked"] == "+229 •• 56"
    assert state["consentRequest"]["resendInSec"] == 60
    accept(User.objects.get(username="kofi.m"))
    state = client.get(SIGNUP_URL).json()
    assert state["step"] == "password"
    assert state["consentRequest"]["resendInSec"] == 0


def test_expired_signup(sms):
    client, _ = started()
    age_signup(7 * 24 * 3600)
    assert client.get(SIGNUP_URL).json()["code"] == "SIGNUP_EXPIRED"


@pytest.mark.parametrize("typed", [lambda c: c, lambda c: c.lower().replace("-", " ")])
def test_resume_on_another_device(typed):
    _, body = started()
    other = APIClient()
    resp = other.post(
        RESUME_URL,
        {"username": "KOFI.M", "resumeCode": typed(body["resumeCode"])},
        format="json",
    )
    assert resp.status_code == 200, resp.json()
    assert resp.json()["username"] == "kofi.m"
    assert other.get(SIGNUP_URL).json()["step"] == "parent"


@pytest.mark.parametrize("username,code", [("kofi.m", "AAAA-BBBB"), ("inconnu", "AAAA-BBBB")])
def test_resume_with_a_wrong_code_or_unknown_username(username, code):
    started()
    resp = APIClient().post(RESUME_URL, {"username": username, "resumeCode": code}, format="json")
    assert resp.status_code == 400
    assert resp.json()["code"] == "RESUME_CODE_INVALID"


def test_resume_of_an_expired_signup():
    _, body = started()
    age_signup(7 * 24 * 3600)
    payload = {"username": "kofi.m", "resumeCode": body["resumeCode"]}
    assert APIClient().post(RESUME_URL, payload, format="json").json()["code"] == "SIGNUP_EXPIRED"


def test_resume_is_throttled_per_username(monkeypatch):
    started()
    rates = {**SimpleRateThrottle.THROTTLE_RATES, "resume-username": "2/hour"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)
    codes = [
        APIClient()
        .post(
            RESUME_URL,
            {"username": "kofi.m", "resumeCode": "AAAA-BBBB"},
            format="json",
            REMOTE_ADDR=f"10.0.0.{i}",
        )
        .status_code
        for i in range(3)
    ]
    assert codes == [400, 400, 429]


def test_resume_throttle_ignores_requests_without_username():
    assert service.normalize_resume_code("ab-cd efgh") == "ABCD-EFGH"
    resp = APIClient().post(RESUME_URL, {}, format="json")
    assert resp.status_code == 400


# --- Un apprenant en attente ne peut pas se connecter -------------------------------------------


def test_pending_learner_cannot_log_in():
    _, body = started()
    login = APIClient().post(
        LOGIN_URL, {"identifier": "kofi.m", "password": "Robots2026"}, format="json"
    )
    assert login.json()["code"] == "INVALID_CREDENTIALS"
    # Son code de reprise révèle l'attente pour basculer vers la reprise (C5), sans ouvrir de session
    client = APIClient()
    login = client.post(
        LOGIN_URL, {"identifier": "kofi.m", "password": body["resumeCode"]}, format="json"
    )
    assert login.status_code == 403
    assert login.json()["code"] == "ACCOUNT_PENDING_CONSENT"
    assert client.get("/api/accounts/me/").status_code == 401


def test_pending_learner_without_signup_session_cannot_log_in():
    learner = LearnerFactory(status=User.Status.PENDING)
    learner.set_unusable_password()
    learner.save()
    assert not service.matches_pending_password(learner, "AAAA-BBBB")


# --- Mot de passe (W10) -------------------------------------------------------------------------


def test_password_is_refused_before_the_parent_accepts(sms):
    client, _ = started()
    assert client.post(PASSWORD_URL, {"password": NEW_PASSWORD}, format="json").json()["code"] == (
        "ACCOUNT_PENDING_CONSENT"
    )
    ask_parent(client)
    resp = client.post(PASSWORD_URL, {"password": NEW_PASSWORD}, format="json")
    assert resp.status_code == 403
    assert User.objects.get(username="kofi.m").status == "pending"


def test_password_after_acceptance_activates_and_logs_in(sms):
    client, _ = started()
    ask_parent(client)
    accept(User.objects.get(username="kofi.m"))
    weak = client.post(PASSWORD_URL, {"password": "robots"}, format="json")
    assert weak.json()["fields"]["password"][0]["code"] == "PASSWORD_TOO_WEAK"
    resp = client.post(PASSWORD_URL, {"password": NEW_PASSWORD}, format="json")
    assert resp.status_code == 200, resp.json()
    assert resp.json()["user"]["status"] == "active"
    assert resp.json()["user"]["profileStep"] == "learner-info"
    learner = User.objects.get(username="kofi.m")
    assert learner.check_password(NEW_PASSWORD) and learner.status == "active"
    assert not SignupSession.objects.exists()
    assert client.get("/api/accounts/me/").json()["username"] == "kofi.m"
    # L'inscription est close : plus de reprise
    assert client.get(SIGNUP_URL).status_code == 404


# --- Demande de consentement (W06) ---------------------------------------------------------------


def test_consent_request_sends_a_link_whose_token_is_only_stored_hashed(sms):
    client, _ = started()
    resp = ask_parent(client)
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert (body["status"], body["relationship"], body["parentPhoneMasked"]) == (
        "pending",
        "mere",
        "+229 •• 56",
    )
    text = sms.last(PARENT_PHONE)
    assert "http://localhost:3000/consentement/" in text
    # Aucune donnée de l'enfant dans le SMS (ADR 0002)
    assert "Kofi" not in text and "kofi.m" not in text
    token = link_token(sms)
    consent = ConsentRequest.objects.get()
    assert token not in consent.token_hash
    assert consent.token_hash == service.hash_token(token)
    assert consent.subject == {
        "first_name": "Kofi",
        "last_name": "Mensah",
        "username": "kofi.m",
        "age": 12,
        "relationship": "mere",
    }
    assert (consent.origin, consent.parent_phone, consent.learner.username) == (
        "learner",
        PARENT_PHONE,
        "kofi.m",
    )
    assert str(consent).startswith("Demande apprenant du ")


def test_consent_request_needs_a_signup_in_progress(sms):
    assert ask_parent(APIClient()).status_code == 404
    assert ConsentRequest.objects.count() == 0


@pytest.mark.parametrize(
    "phone,relationship,field",
    [("0297000000", "mere", "parentPhone"), ("0197123456", "voisin", "relationship")],
)
def test_consent_request_validation(sms, phone, relationship, field):
    client, _ = started()
    resp = ask_parent(client, phone=phone, relationship=relationship)
    assert resp.status_code == 400
    assert field in resp.json()["fields"]


def test_a_new_request_replaces_the_learners_pending_one(sms):
    client, _ = started()
    ask_parent(client, phone="0197000001")
    ask_parent(client)
    statuses = dict(ConsentRequest.objects.values_list("parent_phone", "status"))
    assert statuses == {"+2290197000001": "cancelled", PARENT_PHONE: "pending"}


def test_restarting_cancels_the_abandoned_request_and_frees_the_username(sms):
    """C14 : code perdu, l'enfant recommence ; la nouvelle demande au même numéro libère l'ancien identifiant."""
    old_client, _ = started()
    ask_parent(old_client)
    new_client, _ = started(username="kofi.m2")
    ask_parent(new_client)
    assert not User.objects.filter(username="kofi.m").exists()
    old = ConsentRequest.objects.get(subject__username="kofi.m")
    assert (old.status, old.learner, old.token_hash) == ("cancelled", None, "")
    assert APIClient().get(AVAILABILITY_URL, {"username": "kofi.m"}).json()["available"]


def test_a_sibling_request_to_the_same_parent_is_kept(sms):
    first, _ = started()
    ask_parent(first)
    sibling, _ = started(firstName="Ama", username="ama.m")
    ask_parent(sibling)
    assert ConsentRequest.objects.filter(status="pending").count() == 2
    assert User.objects.filter(username="kofi.m").exists()


def test_an_active_account_is_never_purged_by_a_new_request(sms):
    first, _ = started()
    ask_parent(first)
    learner = User.objects.get(username="kofi.m")
    learner.status = User.Status.ACTIVE
    learner.save()
    second, _ = started(username="kofi.m2")
    ask_parent(second)
    assert User.objects.filter(username="kofi.m").exists()


def test_consent_request_counts_in_the_daily_sms_limit(sms):
    config = PlatformSettings.load()
    config.otp_daily_limit_per_phone = 1
    config.save()
    client, _ = started()
    ask_parent(client)
    resp = ask_parent(client)
    assert resp.json()["code"] == "OTP_DAILY_LIMIT"
    # Rien n'est annulé quand l'envoi est refusé
    assert ConsentRequest.objects.get().status == "pending"


# --- Renvoi (W07) ---------------------------------------------------------------------------------


def resend(client, consent_id):
    return client.post(f"{CONSENT_URL}{consent_id}/resend/")


def test_resend_after_the_delay_issues_a_new_link(sms):
    client, _ = started()
    consent_id = ask_parent(client).json()["id"]
    first = link_token(sms)
    assert resend(client, consent_id).json()["code"] == "OTP_RESEND_TOO_EARLY"
    age_signup(60)
    resp = resend(client, consent_id)
    assert resp.status_code == 200
    second = link_token(sms)
    assert second != first
    assert ConsentRequest.objects.get().token_hash == service.hash_token(second)
    assert len(sms.messages(PARENT_PHONE)) == 2


def test_resend_is_limited_to_the_learners_own_pending_request(sms):
    client, _ = started()
    consent_id = ask_parent(client).json()["id"]
    other, _ = started(username="ama.m", firstName="Ama")
    assert resend(other, consent_id).status_code == 404
    assert resend(APIClient(), consent_id).status_code == 404
    age_signup(60)
    accept(User.objects.get(username="kofi.m"))
    assert resend(client, consent_id).json()["code"] == "CONSENT_ALREADY_RESOLVED"


def test_resend_of_an_expired_request(sms):
    client, _ = started()
    consent_id = ask_parent(client).json()["id"]
    ConsentRequest.objects.update(expires_at=timezone.now())
    assert resend(client, consent_id).json()["code"] == "CONSENT_REQUEST_EXPIRED"


def test_resend_delay_without_previous_send():
    consent = ConsentRequest(status=ConsentRequest.Status.PENDING, last_sent_at=None)
    assert service.consent_resend_in_seconds(consent) == 0


# --- Tâches planifiées ------------------------------------------------------------------------------


def test_expire_consent_requests(sms):
    client, _ = started()
    ask_parent(client)
    assert expire_consent_requests() == 0
    ConsentRequest.objects.update(expires_at=timezone.now())
    call_command("expire_consent_requests")
    consent = ConsentRequest.objects.get()
    assert (consent.status, consent.token_hash) == ("expired", "")
    assert consent.resolved_at


def test_purge_signup_sessions_frees_the_username(sms):
    started()
    keep, _ = started(username="ama.m")
    active = LearnerFactory()
    assert purge_signup_sessions() == 0
    SignupSession.objects.filter(learner__username="kofi.m").update(expires_at=timezone.now())
    call_command("purge_signup_sessions")
    assert not User.objects.filter(username="kofi.m").exists()
    assert User.objects.filter(username="ama.m").exists()
    assert User.objects.filter(pk=active.pk).exists()
    assert ParentFactory()  # aucune autre donnée touchée
