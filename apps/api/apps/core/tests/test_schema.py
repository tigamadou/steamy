"""Schéma OpenAPI : réponses d'erreur déclarées sur chaque opération (`libs/schema.py`)."""

import pytest
from drf_spectacular.generators import SchemaGenerator


@pytest.fixture(scope="module")
def schema():
    # Généré directement : ne dépend pas d'ALLOW_API_DOCS (fermé en CI comme en production).
    return SchemaGenerator().get_schema(request=None, public=True)


def statuses(schema, path, method):
    return set(schema["paths"][path][method]["responses"])


def test_public_write_declares_validation_csrf_and_throttle_errors(schema):
    assert statuses(schema, "/api/auth/login/", "post") == {"200", "400", "403", "429"}


def test_protected_read_declares_authentication_errors(schema):
    assert statuses(schema, "/api/accounts/me/", "get") == {"200", "401", "403", "429"}


def test_public_read_only_declares_throttling(schema):
    assert statuses(schema, "/api/auth/csrf/", "get") == {"200", "429"}


def test_path_parameter_declares_not_found(schema):
    assert "404" in statuses(schema, "/api/payments/orders/{id}/", "get")


def test_error_component_and_session_scheme(schema):
    error = schema["paths"]["/api/accounts/me/"]["get"]["responses"]["401"]
    assert error["content"]["application/json"]["schema"]["$ref"] == "#/components/schemas/Error"
    assert schema["components"]["securitySchemes"]["cookieAuth"] == {
        "type": "apiKey",
        "in": "cookie",
        "name": "sessionid",
    }
