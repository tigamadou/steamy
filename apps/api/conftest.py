import pytest


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
