"""Aides communes aux tests FedaPay du lot : réponses simulées, charge type, fixtures de configuration."""

from unittest import mock

import pytest

from apps.payments.providers import Charge

SECRET_KEY = "sk_sandbox_test"
WEBHOOK_SECRET = "wh_sandbox_test"


def response(status_code, payload=None):
    resp = mock.Mock(status_code=status_code, ok=200 <= status_code < 300)
    if payload is None:
        resp.json.side_effect = ValueError
    else:
        resp.json.return_value = payload
    return resp


def charge(**overrides):
    values = {
        "reference": "CM-0001",
        "merchant_reference": "CM-0001-1",
        "metadata": {"order": "CM-0001", "payment": "7"},
        "amount": 5000,
        "currency": "XOF",
        "country": "BJ",
        "network": "mtn",
        "msisdn": "+2290164000001",
        "description": "Parcours Robotique",
        "first_name": "Marie",
        "last_name": "Houngbo",
    }
    return Charge(**{**values, **overrides})


def configure(settings, environment):
    settings.FEDAPAY_SECRET_KEY = SECRET_KEY
    settings.FEDAPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
    settings.FEDAPAY_ENVIRONMENT = environment
    return settings


@pytest.fixture
def fedapay(settings):
    return configure(settings, "sandbox")


@pytest.fixture
def live(settings):
    return configure(settings, "live")
