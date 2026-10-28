"""Schéma OpenAPI : réponses d'erreur déclarées sur chaque opération (`libs/schema.py`)."""

import pytest
from drf_spectacular.generators import SchemaGenerator

from libs.errors import CATALOG
from libs.schema import OPERATION_ERRORS, error_statuses


@pytest.fixture(scope="module")
def schema():
    # Généré directement : ne dépend pas d'ALLOW_API_DOCS (fermé en CI comme en production).
    return SchemaGenerator().get_schema(request=None, public=True)


def statuses(schema, path, method):
    return set(schema["paths"][path][method]["responses"])


def test_public_write_declares_validation_csrf_and_throttle_errors(schema):
    assert statuses(schema, "/api/auth/login/", "post") == {"200", "400", "403", "429", "500"}


def test_protected_read_declares_authentication_errors(schema):
    assert statuses(schema, "/api/accounts/me/", "get") == {"200", "401", "403", "429", "500"}


def test_public_read_only_declares_throttling(schema):
    assert statuses(schema, "/api/auth/csrf/", "get") == {"200", "429", "500"}


def test_path_parameter_declares_not_found(schema):
    assert "404" in statuses(schema, "/api/payments/orders/{reference}/", "get")


def test_error_component_and_session_scheme(schema):
    error = schema["paths"]["/api/accounts/me/"]["get"]["responses"]["401"]
    assert error["content"]["application/json"]["schema"]["$ref"] == "#/components/schemas/Error"
    assert schema["components"]["securitySchemes"]["cookieAuth"] == {
        "type": "apiKey",
        "in": "cookie",
        "name": "sessionid",
    }


def test_every_catalog_code_has_a_documented_http_error_status():
    for code, (http_status, message) in CATALOG.items():
        assert 400 <= http_status < 600, code
        assert message, code


def test_adding_a_code_without_status_fails():
    with pytest.raises(KeyError):
        error_statuses(("CODE_SANS_STATUT",))


def test_error_statuses_groups_codes_by_catalog_status():
    assert error_statuses(("ORDER_EXPIRED", "OUT_OF_STOCK", "ORDER_ALREADY_PAID")) == {
        409: ["ORDER_ALREADY_PAID", "OUT_OF_STOCK"],
        410: ["ORDER_EXPIRED"],
    }


def test_every_declared_operation_exists_and_documents_its_codes(schema):
    for (method, path), codes in OPERATION_ERRORS.items():
        responses = schema["paths"][path][method.lower()]["responses"]
        for http_status, listed in error_statuses(codes).items():
            response = responses[str(http_status)]
            assert response["content"]["application/json"]["schema"]["$ref"].endswith("/Error")
            assert response["description"] == f"Codes : {', '.join(listed)}."


@pytest.mark.parametrize(
    ("method", "path", "expected"),
    [
        ("post", "/api/payments/orders/{reference}/payments/", {"404", "409", "410"}),
        ("post", "/api/payments/orders/", {"409"}),
        ("post", "/api/payments/payment-requests/{id}/resend/", {"409", "429"}),
        ("get", "/api/accounts/me/delivery-address/", {"404"}),
        ("post", "/api/learning/enrollments/", {"402"}),
        ("post", "/api/shop/cart/items/", {"404", "409"}),
    ],
)
def test_business_error_statuses_are_in_the_contract(schema, method, path, expected):
    assert expected <= statuses(schema, path, method)


def test_every_operation_declares_server_error(schema):
    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            if method in {"get", "post", "put", "patch", "delete"}:
                assert "500" in operation["responses"], (method, path)
