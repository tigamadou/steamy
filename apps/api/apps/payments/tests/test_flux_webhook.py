"""Webhook (ADR 0008 §5) : 400 seulement pour un prestataire inconnu ou une signature invalide ; dès que la signature
est valide, toujours 200, quoi que contienne le corps, et la relecture fait foi."""

import logging
from unittest import mock

import pytest
from django.core.exceptions import ImproperlyConfigured

from apps.core.models import AuditLog
from apps.payments.models import Order, Payment
from apps.payments.providers import PaymentProviderError, PaymentStatus, PaymentTemporaryError
from apps.payments.providers.fake import FakePaymentProvider
from apps.payments.tasks import deliver_fake_webhook
from apps.payments.tests.factories import OrderFactory, PaymentFactory, fake_transaction

from .test_flux_support import post_webhook, provider_tx, stub_fetch

pytestmark = pytest.mark.django_db


@pytest.fixture
def payment():
    return PaymentFactory(order=OrderFactory(reference="CM-0001", subtotal=5000))


@pytest.mark.parametrize(
    "raw",
    [
        b"pas du json",
        b"[1, 2]",
        b"\xff\xfe",
        b"{}",
        b'{"transactionId": ""}',
        b'{"transactionId": 4}',
    ],
)
def test_unusable_bodies_are_acknowledged_and_create_nothing(payment, raw):
    before = Payment.objects.count()
    resp = post_webhook(None, raw=raw)
    assert resp.status_code == 200 and resp.json() == {"ok": True}
    assert Payment.objects.count() == before


def test_unrelated_event_is_acknowledged(payment, monkeypatch):
    monkeypatch.setattr(FakePaymentProvider, "transaction_id_of", lambda self, data: None)
    assert post_webhook("x").json() == {"ok": True}


def test_the_reading_is_trusted_not_the_body(payment, monkeypatch):
    stub_fetch(monkeypatch, provider_tx(payment, raw_status="declined"))
    body = b'{"transactionId": "%s", "status": "succeeded", "amount": 5000}' % (
        payment.provider_transaction_id.encode()
    )
    assert post_webhook(None, raw=body).status_code == 200
    payment.refresh_from_db()
    assert payment.status == Payment.Status.FAILED
    payment.order.refresh_from_db()
    assert payment.order.status == Order.Status.PENDING


def test_unknown_transaction_is_acknowledged_and_audited(payment):
    FakePaymentProvider().create_transaction(
        provider_tx_id="fake-hors",
        reference="X",
        merchant_reference="HORS-1",
        amount=5000,
        currency="XOF",
    )
    before = Payment.objects.count()
    assert post_webhook("fake-hors").status_code == 200
    assert Payment.objects.count() == before
    assert AuditLog.objects.filter(action="payment.webhook_ignored").exists()


def test_transaction_known_only_by_merchant_reference_is_attached_and_verified():
    payment = PaymentFactory(unsent=True, order=OrderFactory(reference="CM-0002", subtotal=5000))
    FakePaymentProvider().create_transaction(
        provider_tx_id="fake-retrouvee",
        reference="CM-0002",
        merchant_reference=payment.merchant_reference,
        amount=5000,
        currency="XOF",
        status=PaymentStatus.SUCCEEDED,
    )
    assert post_webhook("fake-retrouvee").status_code == 200
    payment.refresh_from_db()
    assert payment.provider_transaction_id == "fake-retrouvee"
    assert payment.status == Payment.Status.SUCCEEDED


@pytest.mark.parametrize("error", [PaymentProviderError("x"), PaymentTemporaryError("x")])
def test_failed_reading_is_acknowledged_and_changes_nothing(payment, monkeypatch, error):
    stub_fetch(monkeypatch, error)
    assert post_webhook(payment.provider_transaction_id).status_code == 200
    payment.refresh_from_db()
    assert payment.status == Payment.Status.PENDING


def test_unconfigured_provider_at_processing_time_is_acknowledged(payment, monkeypatch):
    with mock.patch(
        "apps.payments.utils.get_provider", side_effect=ImproperlyConfigured("clés absentes")
    ):
        assert post_webhook(payment.provider_transaction_id).status_code == 200


def test_internal_error_is_acknowledged_and_not_leaked(payment, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("détail interne confidentiel")

    monkeypatch.setattr("apps.payments.views.handle_payment_event", boom)
    resp = post_webhook(payment.provider_transaction_id)
    assert resp.status_code == 200 and resp.json() == {"ok": True}
    assert "confidentiel" not in resp.content.decode()


def test_same_notification_twice_settles_once(payment, monkeypatch):
    stub_fetch(monkeypatch, provider_tx(payment))
    assert [post_webhook("x").status_code for _ in range(2)] == [200, 200]
    assert payment.refunds.count() == 0
    payment.order.refresh_from_db()
    assert payment.order.status == Order.Status.PAID


def test_webhook_is_not_throttled(payment, settings):
    from rest_framework.throttling import SimpleRateThrottle

    rates = {**SimpleRateThrottle.THROTTLE_RATES, "anon": "1/hour", "webhook": "1/hour"}
    with mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", rates):
        statuses = {post_webhook("x").status_code for _ in range(3)}
    assert statuses == {200}


def test_body_is_never_logged(payment, caplog):
    secret = "numero-0197000001"
    body = b'{"transactionId": "fake-inconnu", "msisdn": "%s"}' % secret.encode()
    with caplog.at_level(logging.DEBUG):
        post_webhook(None, raw=body)
    assert secret not in caplog.text


def test_fake_provider_end_to_end(django_capture_on_commit_callbacks):
    payment = PaymentFactory(order=OrderFactory(reference="CM-0003", subtotal=5000))
    fake_transaction(payment, PaymentStatus.PENDING)
    FakePaymentProvider().settle(payment.provider_transaction_id, PaymentStatus.SUCCEEDED)
    status = deliver_fake_webhook(payment.provider_transaction_id, "succeeded")
    assert status == 200
    payment.refresh_from_db()
    payment.order.refresh_from_db()
    assert payment.status == Payment.Status.SUCCEEDED and payment.order.status == "paid"
