"""Formulaires publics (§7.7, D13, D14, D17, C12) : CSRF, throttle, champ piège, erreurs par champ, email."""

import pytest
from django.core import mail
from django.urls import reverse
from rest_framework.test import APIClient

from apps.core.tests.staff import verified_client
from apps.public.models import ContactMessage, Lead, QuoteRequest
from apps.public.tasks import notify_team

pytestmark = pytest.mark.django_db

BASE = "/api/public/"
FRONT = "http://localhost:3000"
QUOTE = {
    "schoolName": "Collège Les Pépinières",
    "contactName": "Awa Dossou",
    "email": "direction@pepinieres.bj",
    "phone": "01 97 00 00 01",
    "offer": "classe",
    "message": "Nous souhaitons équiper deux classes.",
}
LEAD = {"email": "Marie@Exemple.bj", "isAdult": True, "newsletterConsent": True, "source": "guides"}
CONTACT = {
    "name": "Marie Adjovi",
    "contact": "marie@exemple.bj",
    "subject": "livraison",
    "message": "Bonjour, ma fille n'arrive pas à saisir le Kit Code reçu.",
}
FORMS = [
    ("quote-requests/", QUOTE, QuoteRequest),
    ("leads/", LEAD, Lead),
    ("contact-messages/", CONTACT, ContactMessage),
]


@pytest.fixture
def csrf_client(settings):
    settings.CSRF_TRUSTED_ORIGINS = [FRONT]
    client = APIClient(enforce_csrf_checks=True, HTTP_ORIGIN=FRONT)
    token = client.get("/api/auth/csrf/").json()["csrfToken"]
    client.credentials(HTTP_X_CSRFTOKEN=token)
    return client


def post(client, url, data):
    return client.post(f"{BASE}{url}", data, format="json")


# --- Refus ------------------------------------------------------------------------------------


@pytest.mark.parametrize(("url", "data", "model"), FORMS)
def test_csrf_is_required(settings, url, data, model):
    settings.CSRF_TRUSTED_ORIGINS = [FRONT]
    resp = post(APIClient(enforce_csrf_checks=True, HTTP_ORIGIN=FRONT), url, data)
    assert resp.status_code == 403
    assert not model.objects.exists()


@pytest.mark.parametrize(("url", "data", "model"), FORMS)
def test_only_post_is_allowed(url, data, model):
    assert APIClient().get(f"{BASE}{url}").status_code == 405


@pytest.mark.parametrize(("url", "data", "model"), FORMS)
def test_forms_are_throttled_by_ip(csrf_client, url, data, model):
    for _ in range(10):
        assert post(csrf_client, url, data).status_code == 201
    resp = post(csrf_client, url, data)
    assert resp.status_code == 429 and resp.json()["code"] == "THROTTLED"


@pytest.mark.parametrize(("url", "data", "model"), FORMS)
def test_honeypot_is_silently_ignored(csrf_client, url, data, model):
    resp = post(csrf_client, url, {**data, "website": "https://spam.test"})
    assert resp.status_code == 201 and resp.json() == {"ok": True}
    assert not model.objects.exists() and not mail.outbox


def test_quote_request_field_errors(csrf_client):
    resp = post(
        csrf_client,
        "quote-requests/",
        {**QUOTE, "email": "pas-un-email", "phone": "12", "schoolName": ""},
    )
    assert resp.status_code == 400
    fields = resp.json()["fields"]
    assert fields["phone"][0]["code"] == "PHONE_INVALID"
    assert set(fields) == {"email", "phone", "schoolName"}


@pytest.mark.parametrize("field", ["isAdult", "newsletterConsent"])
def test_lead_requires_adult_attestation_and_consent(csrf_client, field):
    resp = post(csrf_client, "leads/", {**LEAD, field: False})
    assert resp.status_code == 400
    assert resp.json()["fields"][field][0]["code"] == "REQUIRED"
    assert not Lead.objects.exists()


@pytest.mark.parametrize(
    ("data", "field", "code"),
    [
        ({"contact": "pas un contact"}, "contact", "INVALID"),
        ({"contact": "12"}, "contact", "PHONE_INVALID"),
        ({"message": "Trop court"}, "message", "MIN_LENGTH"),
        ({"subject": "reclamation"}, "subject", "INVALID_CHOICE"),
    ],
)
def test_contact_message_field_errors(csrf_client, data, field, code):
    resp = post(csrf_client, "contact-messages/", {**CONTACT, **data})
    assert resp.status_code == 400
    assert resp.json()["fields"][field][0]["code"] == code


# --- Cas nominaux ---------------------------------------------------------------------------


def test_quote_request_is_saved_and_the_team_notified(
    csrf_client, settings, django_capture_on_commit_callbacks
):
    settings.TEAM_EMAIL = "equipe@steamy.test"
    with django_capture_on_commit_callbacks(execute=True):
        resp = post(csrf_client, "quote-requests/", QUOTE)
    assert resp.status_code == 201 and resp.json() == {"ok": True}
    quote = QuoteRequest.objects.get()
    assert quote.phone == "+2290197000001" and quote.notified_at
    assert str(quote) == "Collège Les Pépinières · Awa Dossou"
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["equipe@steamy.test"]
    assert "Collège Les Pépinières" in mail.outbox[0].body


@pytest.mark.parametrize(
    ("contact", "email", "phone"),
    [("Marie@Exemple.bj", "marie@exemple.bj", ""), ("+229 01 90 00 00 01", "", "+2290190000001")],
)
def test_contact_message_accepts_email_or_phone(
    csrf_client, django_capture_on_commit_callbacks, contact, email, phone
):
    with django_capture_on_commit_callbacks(execute=True):
        assert (
            post(csrf_client, "contact-messages/", {**CONTACT, "contact": contact}).status_code
            == 201
        )
    message = ContactMessage.objects.get()
    assert (message.email, message.phone) == (email, phone)
    assert str(message) == "Livraison · Marie Adjovi"
    assert mail.outbox[0].subject == "[Steamy] Nouveau message de contact"


def test_lead_is_deduplicated_without_telling_and_never_mailed(
    csrf_client, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        assert post(csrf_client, "leads/", LEAD).status_code == 201
        assert (
            post(
                csrf_client, "leads/", {**LEAD, "email": "marie@exemple.bj", "source": "footer"}
            ).status_code
            == 201
        )
    lead = Lead.objects.get()
    assert str(lead) == "marie@exemple.bj" and lead.source == "footer"
    assert not mail.outbox


def test_notify_team_is_idempotent():
    quote = QuoteRequest.objects.create(
        school_name="École", contact_name="A", email="a@b.bj", phone="+2290197000001"
    )
    assert notify_team("quoterequest", quote.pk) is True
    assert notify_team("quoterequest", quote.pk) is False
    assert notify_team("quoterequest", 999999) is False
    assert len(mail.outbox) == 1


@pytest.mark.parametrize("model", ["quoterequest", "lead", "contactmessage"])
def test_admin_pages_are_served(client, model):
    verified_client(client, is_superuser=True)  # session vérifiée par TOTP (WAD15)
    assert client.get(reverse(f"admin:public_{model}_changelist")).status_code == 200
