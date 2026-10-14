import pytest
from rest_framework.test import APIClient

FRONT = "https://app.steamy.test"


@pytest.fixture(autouse=True)
def front_origin(settings):
    settings.CORS_ALLOWED_ORIGINS = [FRONT]


@pytest.mark.django_db
def test_front_origin_may_send_cookies():
    resp = APIClient().get("/api/health/", HTTP_ORIGIN=FRONT)
    assert resp["Access-Control-Allow-Origin"] == FRONT
    assert resp["Access-Control-Allow-Credentials"] == "true"
    assert "Origin" in resp["Vary"]


@pytest.mark.django_db
def test_other_origins_get_wildcard_without_cookies():
    resp = APIClient().get("/api/health/", HTTP_ORIGIN="https://evil.test")
    assert resp["Access-Control-Allow-Origin"] == "*"
    assert not resp.has_header("Access-Control-Allow-Credentials")


def test_preflight_does_not_reach_the_view():
    resp = APIClient().options(
        "/api/core/presign/", HTTP_ORIGIN=FRONT, HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST"
    )
    assert resp.status_code == 200
    assert resp["Access-Control-Allow-Origin"] == FRONT
    assert "x-csrftoken" in resp["Access-Control-Allow-Headers"]
