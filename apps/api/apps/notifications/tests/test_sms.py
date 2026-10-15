"""SMS (S10, ADR 0002) : interface, faux fournisseur lisible dans Mailpit, Twilio, tâche et webhook de statut."""

from unittest import mock
from urllib.parse import urlencode

import pytest
import requests
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from django.http import QueryDict
from rest_framework.test import APIClient

from apps.notifications.models import SmsMessage
from apps.notifications.sms import (
    SmsError,
    SmsProvider,
    SmsTemporaryError,
    get_provider,
    queue_sms,
)
from apps.notifications.sms.fake import FakeSmsProvider, sms_email_address
from apps.notifications.sms.twilio import TwilioProvider
from apps.notifications.tasks import send_sms
from libs.phone import mask_phone

PHONE = "+22901970000"
WEBHOOK = "/api/notifications/sms/status/"
CALLBACK = "https://api.steamy.test/api/notifications/sms/status/"


@pytest.fixture
def twilio(settings):
    settings.SMS_PROVIDER = "twilio"
    settings.TWILIO_ACCOUNT_SID = "AC123"
    settings.TWILIO_AUTH_TOKEN = "secret"
    settings.TWILIO_SENDER = "STEAMY"
    settings.TWILIO_STATUS_CALLBACK_URL = CALLBACK
    return settings


def response(status_code, payload=None):
    resp = mock.Mock(status_code=status_code, ok=200 <= status_code < 300)
    if payload is None:
        resp.json.side_effect = ValueError
    else:
        resp.json.return_value = payload
    return resp


# --- Sélection du fournisseur ----------------------------------------------------------------


def test_fake_provider_is_the_default_outside_deployed_environments():
    assert isinstance(get_provider(), FakeSmsProvider)


def test_unknown_provider_is_refused(settings):
    settings.SMS_PROVIDER = "bulkgate"
    with pytest.raises(ImproperlyConfigured, match="SMS_PROVIDER inconnu"):
        get_provider()


def test_fake_provider_can_never_run_when_deployed(settings):
    settings.DEPLOYED = True
    with pytest.raises(ImproperlyConfigured, match="interdit"):
        get_provider()
    assert mail.outbox == []


def test_base_provider_accepts_no_webhook():
    assert SmsProvider().parse_status(mock.Mock()) is None


# --- Faux fournisseur : lisible dans Mailpit -------------------------------------------------


def test_fake_sms_is_sent_as_an_email_to_the_phone_address(caplog):
    caplog.set_level("INFO", logger="apps")
    message_id = FakeSmsProvider().send(PHONE, "Steamy : votre code est 123456")
    assert message_id.startswith("fake-")
    (email,) = mail.outbox
    assert email.to == [f"{PHONE}@sms.test"] == [sms_email_address(PHONE)]
    assert email.body == "Steamy : votre code est 123456"
    # Journaux sans numéro en clair (ADR 0002)
    assert PHONE not in caplog.text
    assert mask_phone(PHONE) in caplog.text


@pytest.mark.django_db
def test_queue_sms_sends_after_commit_and_records_a_masked_trace(
    django_capture_on_commit_callbacks,
):
    with django_capture_on_commit_callbacks(execute=False) as callbacks:
        queue_sms(PHONE, "Bonjour", purpose="test")
    assert mail.outbox == []  # rien avant la validation de la transaction
    for callback in callbacks:
        callback()
    assert mail.outbox[0].to == [sms_email_address(PHONE)]
    trace = SmsMessage.objects.get()
    assert (trace.provider, trace.purpose, trace.status) == ("fake", "test", "sent")
    assert trace.recipient == "+229 •• 00"
    assert PHONE not in str(trace.__dict__)
    assert str(trace) == f"fake {trace.message_id} : sent"


def test_mask_phone_hides_short_values():
    assert mask_phone("") == "••"
    assert mask_phone("+2290") == "••"


# --- Tâche : réessais exponentiels -----------------------------------------------------------


@pytest.mark.django_db
def test_send_sms_retries_temporary_errors():
    provider = mock.Mock()
    provider.name = "fake"
    provider.send.side_effect = [SmsTemporaryError("panne"), SmsTemporaryError("panne"), "id-3"]
    with mock.patch("apps.notifications.tasks.get_provider", return_value=provider):
        result = send_sms.apply(args=(PHONE, "Bonjour"))
    assert result.get() == "id-3"
    assert provider.send.call_count == 3
    assert SmsMessage.objects.get().message_id == "id-3"


@pytest.mark.django_db
def test_send_sms_does_not_retry_a_refused_message():
    provider = mock.Mock()
    provider.send.side_effect = SmsError("numéro refusé")
    with mock.patch("apps.notifications.tasks.get_provider", return_value=provider):
        with pytest.raises(SmsError):
            send_sms(PHONE, "Bonjour")
    assert provider.send.call_count == 1
    assert not SmsMessage.objects.exists()


def test_send_sms_task_retry_policy():
    assert send_sms.autoretry_for == (SmsTemporaryError,)
    assert send_sms.retry_backoff is True
    assert send_sms.max_retries == 5


# --- Twilio ----------------------------------------------------------------------------------


def test_twilio_requires_its_credentials(twilio):
    twilio.TWILIO_AUTH_TOKEN = ""
    with pytest.raises(ImproperlyConfigured, match="TWILIO_ACCOUNT_SID"):
        get_provider()


def test_twilio_sends_through_the_messages_api(twilio):
    with mock.patch("requests.post", return_value=response(201, {"sid": "SM1"})) as post:
        assert get_provider().send(PHONE, "Bonjour") == "SM1"
    url = post.call_args.args[0]
    assert url == "https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json"
    assert post.call_args.kwargs["data"] == {
        "To": PHONE,
        "From": "STEAMY",
        "Body": "Bonjour",
        "StatusCallback": CALLBACK,
    }
    assert post.call_args.kwargs["auth"] == ("AC123", "secret")
    assert post.call_args.kwargs["timeout"] == 10


def test_twilio_without_callback_url_asks_for_no_status(twilio):
    twilio.TWILIO_STATUS_CALLBACK_URL = ""
    with mock.patch("requests.post", return_value=response(201, {"sid": "SM1"})) as post:
        TwilioProvider().send(PHONE, "Bonjour")
    assert "StatusCallback" not in post.call_args.kwargs["data"]


@pytest.mark.parametrize("status_code", [429, 500, 503])
def test_twilio_temporary_failures_are_retryable(twilio, status_code):
    with mock.patch("requests.post", return_value=response(status_code)):
        with pytest.raises(SmsTemporaryError, match=str(status_code)):
            TwilioProvider().send(PHONE, "Bonjour")


def test_twilio_network_errors_are_retryable(twilio):
    with mock.patch("requests.post", side_effect=requests.ConnectionError("dns")):
        with pytest.raises(SmsTemporaryError, match="ConnectionError"):
            TwilioProvider().send(PHONE, "Bonjour")


@pytest.mark.parametrize("payload,code", [({"code": 21211}, "21211"), (None, "")])
def test_twilio_refusals_are_final(twilio, payload, code):
    with mock.patch("requests.post", return_value=response(400, payload)):
        with pytest.raises(SmsError) as error:
            TwilioProvider().send(PHONE, "Bonjour")
    assert not isinstance(error.value, SmsTemporaryError)
    assert f"code {code})" in str(error.value)


# --- Webhook de statut -----------------------------------------------------------------------


def signed_post(provider, params, signature=None):
    data = QueryDict(mutable=True)
    data.update(params)
    signature = signature if signature is not None else provider.signature(CALLBACK, data)
    return APIClient().post(
        WEBHOOK,
        urlencode(params),
        content_type="application/x-www-form-urlencoded",
        HTTP_X_TWILIO_SIGNATURE=signature,
    )


@pytest.mark.django_db
def test_twilio_status_webhook_updates_the_trace(twilio):
    SmsMessage.objects.create(provider="twilio", message_id="SM1", recipient="+229 •• 00")
    params = {"MessageSid": "SM1", "MessageStatus": "undelivered", "ErrorCode": "30003"}
    resp = signed_post(TwilioProvider(), params)
    assert resp.status_code == 204
    trace = SmsMessage.objects.get()
    assert (trace.status, trace.error_code) == ("undelivered", "30003")


@pytest.mark.django_db
def test_twilio_status_webhook_rejects_a_bad_signature(twilio):
    SmsMessage.objects.create(provider="twilio", message_id="SM1", recipient="+229 •• 00")
    params = {"MessageSid": "SM1", "MessageStatus": "delivered"}
    assert signed_post(TwilioProvider(), params, signature="faux").status_code == 403
    assert SmsMessage.objects.get().status == "sent"


@pytest.mark.django_db
def test_twilio_status_webhook_rejects_incomplete_payloads(twilio):
    assert signed_post(TwilioProvider(), {"MessageSid": "SM1"}).status_code == 403


@pytest.mark.django_db
def test_twilio_status_webhook_is_closed_without_callback_url(twilio):
    provider = TwilioProvider()
    twilio.TWILIO_STATUS_CALLBACK_URL = ""
    params = {"MessageSid": "SM1", "MessageStatus": "delivered"}
    assert signed_post(provider, params).status_code == 403


@pytest.mark.django_db
def test_fake_provider_accepts_no_status_webhook():
    resp = APIClient().post(
        WEBHOOK, "MessageSid=x", content_type="application/x-www-form-urlencoded"
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_sms_traces_are_read_only_in_the_admin():
    from django.contrib.admin.sites import site
    from rest_framework.test import APIRequestFactory

    from apps.accounts.tests.factories import StaffFactory

    request = APIRequestFactory().get("/")
    request.user = StaffFactory(is_superuser=True)
    model_admin = site._registry[SmsMessage]
    assert not model_admin.has_add_permission(request)
    assert not model_admin.has_change_permission(request)
