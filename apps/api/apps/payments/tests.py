import hashlib
import hmac
import json

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.tests.factories import ParentFactory
from apps.payments.models import Order, Payment

User = get_user_model()
SECRET = "secret-de-test"
URL = "/api/payments/webhook/kkiapay/"


@pytest.fixture(autouse=True)
def provider_secret(settings):
    settings.PAYMENTS_KKIAPAY_SECRET = SECRET


@pytest.fixture
def order(db):
    user = ParentFactory()
    return Order.objects.create(user=user, reference="CM-0001", total=5000, currency="XOF")


def notify(payload, secret=SECRET, raw=None):
    body = raw if raw is not None else json.dumps(payload).encode()
    signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return APIClient().generic(
        "POST", URL, body, content_type="application/json", HTTP_X_SIGNATURE=signature
    )


def valid_payload(**overrides):
    payload = {
        "reference": "CM-0001",
        "transaction_id": "TX-1",
        "status": "success",
        "amount": "5000",
        "currency": "XOF",
    }
    return {**payload, **overrides}


def test_valid_notification_marks_order_paid(order):
    resp = notify(valid_payload())
    assert resp.status_code == 200 and resp.json() == {"ok": True}
    order.refresh_from_db()
    assert order.paid is True
    assert Payment.objects.get(order=order).success is True


@pytest.mark.parametrize(
    "overrides", [{"amount": "1"}, {"amount": "4999.99"}, {"currency": "EUR"}, {"currency": ""}]
)
def test_falsified_amount_or_currency_does_not_pay(order, overrides):
    resp = notify(valid_payload(**overrides))
    assert resp.status_code == 400 and resp.json() == {"ok": False}
    order.refresh_from_db()
    assert order.paid is False
    assert not Payment.objects.exists()


def test_replayed_notification_is_processed_once(order):
    assert notify(valid_payload()).status_code == 200
    assert notify(valid_payload()).status_code == 200
    assert Payment.objects.filter(provider="kkiapay", provider_transaction_id="TX-1").count() == 1


def test_transaction_cannot_be_reused_for_another_order(order):
    other = Order.objects.create(user=order.user, reference="CM-0002", total=5000, currency="XOF")
    assert notify(valid_payload()).status_code == 200
    assert notify(valid_payload(reference="CM-0002")).status_code == 400
    other.refresh_from_db()
    assert other.paid is False


def test_invalid_signature_is_rejected_without_detail(order):
    resp = notify(valid_payload(), secret="mauvais-secret")
    assert resp.status_code == 400 and resp.json() == {"ok": False}
    order.refresh_from_db()
    assert order.paid is False


def test_internal_error_is_not_leaked(order, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("détail interne confidentiel")

    monkeypatch.setattr("apps.payments.utils.handle_provider_event", boom)
    resp = notify(valid_payload())
    assert resp.status_code == 400 and resp.json() == {"ok": False}
    assert "confidentiel" not in resp.content.decode()


def test_orders_are_read_only_for_clients(order):
    client = APIClient()
    client.force_authenticate(order.user)
    resp = client.post(
        "/api/payments/orders/",
        {"items": [{"title": "Parcours", "unit_price": "1", "quantity": 1}]},
        format="json",
    )
    assert resp.status_code == 405
    assert "providerPayload" not in client.get("/api/payments/payments/").content.decode()
