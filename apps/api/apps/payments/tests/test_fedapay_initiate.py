"""FedaPay : réglages, mode de débit, numéro, références et erreurs à l'initiation (ADR 0008 §1 à §3)."""

from django.conf import settings as django_settings


def test_default_live_modes_follow_the_adr_table():
    assert django_settings.FEDAPAY_MODES == {
        "BJ:mtn": "mtn_open",
        "BJ:moov": "moov",
        "BJ:celtiis": "sbin",
        "TG:moov": "moov_tg",
        "TG:togocel": "togocel",
        "CI:mtn": "mtn_ci",
    }


def test_sandbox_mode_defaults_to_momo_test():
    assert django_settings.FEDAPAY_SANDBOX_MODE == "momo_test"
