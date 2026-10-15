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
