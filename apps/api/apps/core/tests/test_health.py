import pytest
from rest_framework.test import APIClient

import apps.core.views as core_views


@pytest.mark.django_db
def test_health_is_public_and_ok():
    resp = APIClient().get("/api/health/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": True, "cache": True}


@pytest.mark.django_db
def test_health_returns_503_when_database_is_down(monkeypatch):
    def boom():
        raise RuntimeError("db down")

    monkeypatch.setattr(core_views, "_ping_database", boom)
    resp = APIClient().get("/api/health/")
    assert resp.status_code == 503
    assert resp.json()["status"] == "degraded"
    assert resp.json()["database"] is False
