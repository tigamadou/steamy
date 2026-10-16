"""Webhook des prestataires (S5, S9) : signature avant tout, montant et devise vérifiés, idempotence, réponse neutre."""

import json

import pytest
from rest_framework.test import APIClient

from apps.core.models import AuditLog
from apps.payments.models import Order, Payment
from apps.payments.providers.fake import SIGNATURE_HEADER, sign
from apps.payments.tests.factories import OrderFactory

URL = "/api/payments/webhook/fake/"


@pytest.fixture
def order(db):
    return OrderFactory(reference="CM-0001", subtotal=5000)


def notify(payload, signature=None, raw=None, url=URL):
    body = raw if raw is not None else json.dumps(payload).encode()
    headers = {SIGNATURE_HEADER: signature if signature is not None else sign(body)}
    return APIClient().generic("POST", url, body, content_type="application/json", headers=headers)


def valid_payload(**overrides):
    payload = {
        "reference": "CM-0001",
        "transactionId": "TX-1",
        "status": "succeeded",
        "amount": 5000,
        "currency": "XOF",
    }
    return {**payload, **overrides}


def test_valid_notification_marks_order_paid(order):
    resp = notify(valid_payload())
    assert resp.status_code == 200 and resp.json() == {"ok": True}
    order.refresh_from_db()
    assert order.status == Order.Status.PAID
    assert Payment.objects.get(order=order).status == Payment.Status.SUCCEEDED


def test_failed_notification_is_recorded_without_paying(order):
    assert notify(valid_payload(status="failed")).status_code == 200
    order.refresh_from_db()
    assert order.status == Order.Status.PENDING
    assert Payment.objects.get(order=order).status == Payment.Status.FAILED


@pytest.mark.parametrize(
    "overrides", [{"amount": 1}, {"amount": 4999}, {"currency": "EUR"}, {"currency": ""}]
)
def test_falsified_amount_or_currency_does_not_pay(order, overrides):
    resp = notify(valid_payload(**overrides))
    assert resp.status_code == 400 and resp.json() == {"ok": False}
    order.refresh_from_db()
    assert order.status == Order.Status.PENDING
    payment = Payment.objects.get()
    assert (payment.status, payment.failure_code) == (Payment.Status.FAILED, "AMOUNT_MISMATCH")
    alert = AuditLog.objects.get(action="payment.amount_mismatch")
    assert alert.target_id == str(order.pk)


def test_replayed_notification_is_processed_once(order):
    assert notify(valid_payload()).status_code == 200
    assert notify(valid_payload()).status_code == 200
    assert Payment.objects.filter(provider="fake", provider_transaction_id="TX-1").count() == 1


def test_transaction_cannot_be_reused_for_another_order(order):
    other = OrderFactory(reference="CM-0002", subtotal=5000)
    assert notify(valid_payload()).status_code == 200
    assert notify(valid_payload(reference="CM-0002")).status_code == 400
    other.refresh_from_db()
    assert other.status == Order.Status.PENDING


def test_unknown_order_is_rejected(order):
    assert notify(valid_payload(reference="CM-9999")).status_code == 400


def test_invalid_signature_is_rejected_without_detail(order):
    resp = notify(valid_payload(), signature="mauvaise-signature")
    assert resp.status_code == 400 and resp.json() == {"ok": False}
    order.refresh_from_db()
    assert order.status == Order.Status.PENDING


@pytest.mark.parametrize("raw", [b"pas du json", b"[1, 2]", b"\xff\xfe"])
def test_unreadable_body_is_rejected(order, raw):
    assert notify(None, raw=raw).status_code == 400


@pytest.mark.parametrize(
    "payload",
    [
        {"reference": "CM-0001"},
        valid_payload(status="inconnu"),
        valid_payload(amount="beaucoup"),
    ],
)
def test_incomplete_notification_is_rejected(order, payload):
    assert notify(payload).status_code == 400
    assert not Payment.objects.exists()


@pytest.mark.parametrize("provider", ["kkiapay", "inconnu"])
def test_unknown_provider_is_rejected(order, provider):
    resp = notify(valid_payload(), url=f"/api/payments/webhook/{provider}/")
    assert resp.status_code == 400 and resp.json() == {"ok": False}


def test_fake_provider_webhook_is_closed_when_deployed(order, settings):
    settings.DEPLOYED = True
    assert notify(valid_payload()).status_code == 400
    order.refresh_from_db()
    assert order.status == Order.Status.PENDING


def test_events_unrelated_to_a_payment_are_acknowledged(order, monkeypatch):
    monkeypatch.setattr(
        "apps.payments.providers.fake.FakePaymentProvider.parse_event", lambda self, data: None
    )
    assert notify({"name": "customer.created"}).json() == {"ok": True}
    assert not Payment.objects.exists()


def test_internal_error_is_not_leaked(order, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("détail interne confidentiel")

    monkeypatch.setattr("apps.payments.views.handle_payment_event", boom)
    resp = notify(valid_payload())
    assert resp.status_code == 400 and resp.json() == {"ok": False}
    assert "confidentiel" not in resp.content.decode()
