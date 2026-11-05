"""Webhook des prestataires (S5, S9, ADR 0008 §5) : signature avant tout, relecture chez le prestataire, idempotence,
réponse neutre. Le cas général des corps illisibles et des erreurs est dans `test_flux_webhook.py`."""

import pytest

from apps.core.models import AuditLog
from apps.payments.models import Order, Payment
from apps.payments.tests.factories import OrderFactory, PaymentFactory

from .test_flux_support import WEBHOOK_URL, post_webhook, provider_tx, stub_fetch

pytestmark = pytest.mark.django_db


@pytest.fixture
def payment():
    order = OrderFactory(reference="CM-0001", subtotal=5000)
    return PaymentFactory(order=order, provider_transaction_id="TX-1")


def test_valid_notification_marks_order_paid(payment, monkeypatch):
    stub_fetch(monkeypatch, provider_tx(payment))
    resp = post_webhook("TX-1")
    assert resp.status_code == 200 and resp.json() == {"ok": True}
    payment.refresh_from_db()
    payment.order.refresh_from_db()
    assert payment.order.status == Order.Status.PAID
    assert payment.status == Payment.Status.SUCCEEDED


def test_declined_transaction_is_recorded_without_paying(payment, monkeypatch):
    stub_fetch(monkeypatch, provider_tx(payment, raw_status="declined"))
    assert post_webhook("TX-1").status_code == 200
    payment.refresh_from_db()
    payment.order.refresh_from_db()
    assert payment.order.status == Order.Status.PENDING
    assert payment.status == Payment.Status.FAILED


@pytest.mark.parametrize(
    "overrides", [{"amount": 1}, {"amount": 4999}, {"currency": "EUR"}, {"currency": ""}]
)
def test_falsified_amount_or_currency_does_not_pay(payment, monkeypatch, overrides):
    stub_fetch(monkeypatch, provider_tx(payment, **overrides))
    assert post_webhook("TX-1").status_code == 200
    payment.refresh_from_db()
    payment.order.refresh_from_db()
    assert payment.order.status == Order.Status.PENDING
    assert (payment.status, payment.failure_code) == (Payment.Status.FAILED, "AMOUNT_MISMATCH")
    alert = AuditLog.objects.get(action="payment.amount_mismatch")
    assert alert.target_id == str(payment.order.pk)


def test_replayed_notification_is_processed_once(payment, monkeypatch):
    stub_fetch(monkeypatch, provider_tx(payment))
    assert post_webhook("TX-1").status_code == 200
    assert post_webhook("TX-1").status_code == 200
    assert Payment.objects.filter(provider="fake", provider_transaction_id="TX-1").count() == 1
    assert not payment.refunds.exists()


def test_invalid_signature_is_rejected_without_detail(payment):
    resp = post_webhook("TX-1", signed=False)
    assert resp.status_code == 400 and resp.json() == {"ok": False}
    payment.order.refresh_from_db()
    assert payment.order.status == Order.Status.PENDING


@pytest.mark.parametrize("provider", ["kkiapay", "inconnu"])
def test_unknown_provider_is_rejected(payment, provider):
    from rest_framework.test import APIClient

    resp = APIClient().generic(
        "POST",
        f"/api/payments/webhook/{provider}/",
        b"{}",
        content_type="application/json",
    )
    assert resp.status_code == 400 and resp.json() == {"ok": False}


def test_fake_provider_webhook_is_closed_when_deployed(payment, settings):
    settings.DEPLOYED = True
    assert post_webhook("TX-1").status_code == 400
    payment.order.refresh_from_db()
    assert payment.order.status == Order.Status.PENDING


def test_webhook_url_is_the_documented_one():
    assert WEBHOOK_URL == "/api/payments/webhook/fake/"
