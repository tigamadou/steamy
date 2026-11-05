import os

import pytest

BASE_TEST_DATABASE = "test_steamy"


def check_test_database_name(name: str, agent_lot: str | None, worker: str | None) -> str | None:
    """
    Message d'erreur si `name` n'est pas la base de test attendue, sinon None.

    attendu = test_steamy[_<lot>][_<worker>] ; une égalité stricte (ni préfixe, ni motif), pour qu'aucun test
    ne tourne sur une base qui n'est pas celle de l'agent. `agent_lot == ""` (variable posée mais vide) est refusé.
    """
    if agent_lot is not None and not agent_lot:
        return "Tests refusés : AGENT_LOT est posé mais vide. Retirez la variable ou donnez-lui le nom du lot."
    expected = (
        BASE_TEST_DATABASE
        + (f"_{agent_lot}" if agent_lot else "")
        + (f"_{worker}" if worker else "")
    )
    if name == expected:
        return None
    return (
        f"Tests refusés : la base « {name} » n'est pas celle attendue (« {expected} »). "
        "Avec AGENT_LOT=<lot>, la base de test est test_steamy_<lot> ; sans, test_steamy. "
        "Lancez les tests avec `make test-cible` ou `make test-api`."
    )


def _configured_test_database_name() -> str:
    """Nom de la base de test que Django utilisera (avant suffixe xdist, sauf si pytest-django l'a déjà posé)."""
    from django.conf import settings

    db = settings.DATABASES["default"]
    return db.get("TEST", {}).get("NAME") or f"test_{db['NAME']}"


@pytest.hookimpl(trylast=True)
def pytest_configure(config):
    """Arrêt immédiat, avant toute collecte, si la base de test n'est pas celle du contexte (agent ou non)."""
    # Nom sans suffixe de worker : ce hook tourne aussi dans le processus maître de xdist
    error = check_test_database_name(
        _configured_test_database_name(), os.environ.get("AGENT_LOT"), None
    )
    if error:
        raise pytest.UsageError(error)


@pytest.fixture(scope="session", autouse=True)
def assert_test_database(django_db_modify_db_settings):
    """Contrôle le nom EFFECTIF (suffixe `_gwN` compris) avant que `django_db_setup` ne crée la moindre base."""
    error = check_test_database_name(
        _configured_test_database_name(),
        os.environ.get("AGENT_LOT"),
        os.environ.get("PYTEST_XDIST_WORKER"),
    )
    if error:
        pytest.exit(error, returncode=4)


@pytest.fixture(autouse=True)
def fast_password_hasher(settings):
    """
    MD5 au lieu de PBKDF2 (1 million d'itérations en Django 5.2) : chaque création de compte ou de connexion
    coûtait plusieurs dixièmes de seconde, soit l'essentiel des ~20 minutes de la suite. Le hachage de production
    n'est pas modifié ; les tests qui le concernent le rétablissent explicitement.
    """
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]


@pytest.fixture(autouse=True)
def isolated_cache(settings):
    """
    Cache en mémoire et vidé pour chaque test : les compteurs de throttling (S9) ne doivent ni
    fuiter d'un test à l'autre, ni toucher au Redis de la stack locale.
    """
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


class SmsInbox:
    """Faux SMS reçus (FakeSmsProvider → email à `<e164>@sms.test`), comme Playwright les lit dans Mailpit."""

    def messages(self, phone: str) -> list[str]:
        from django.core import mail

        return [m.body for m in mail.outbox if m.to == [f"{phone}@sms.test"]]

    def last(self, phone: str) -> str:
        messages = self.messages(phone)
        assert messages, f"aucun SMS pour {phone}"
        return messages[-1]

    def last_code(self, phone: str) -> str:
        import re

        return re.search(r"\b(\d{6})\b", self.last(phone)).group(1)


@pytest.fixture
def sms(monkeypatch):
    """
    Boîte des faux SMS. Les tests tournent dans une transaction jamais validée : les envois programmés par
    `transaction.on_commit` (queue_sms) sont exécutés immédiatement.
    """
    monkeypatch.setattr(
        "django.db.transaction.on_commit", lambda func, using=None, robust=False: func()
    )
    return SmsInbox()
