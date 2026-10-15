"""Format d'erreur unique (D4), catalogue des codes (§7.1), politique de mot de passe (D25)."""

import pytest
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.accounts.tests.factories import PASSWORD, LearnerFactory
from libs.errors import CATALOG, ApiError

SPEC_CODES = """
VALIDATION_ERROR NOT_AUTHENTICATED PERMISSION_DENIED NOT_FOUND THROTTLED
INVALID_CREDENTIALS ACCOUNT_PENDING_CONSENT ACCOUNT_SUSPENDED ACCOUNT_DEACTIVATED USERNAME_TAKEN
USERNAME_INVALID PHONE_TAKEN PHONE_INVALID PASSWORD_TOO_WEAK AGE_OUT_OF_RANGE OTP_INVALID OTP_EXPIRED
OTP_TOO_MANY_ATTEMPTS OTP_RESEND_TOO_EARLY OTP_DAILY_LIMIT RESUME_CODE_INVALID SIGNUP_EXPIRED
INVITATION_INVALID OTP_REQUIRED
CONSENT_REQUEST_EXPIRED CONSENT_ALREADY_RESOLVED CONSENT_COOLDOWN CONSENT_PHONE_MISMATCH
CHILDREN_STILL_LINKED BIRTHDATE_AGE_MISMATCH
PAYMENT_REQUIRED KIT_CODE_REQUIRED CONTENT_LOCKED NOT_ENROLLED QUIZ_COOLDOWN
PARENT_APPROVAL_REQUIRED KIT_CODE_INVALID KIT_CODE_ALREADY_USED KIT_CODE_NOT_COMPATIBLE OUT_OF_STOCK
DELIVERY_ZONE_UNAVAILABLE NETWORK_UNAVAILABLE ORDER_EXPIRED ORDER_ALREADY_PAID PAYMENT_FAILED
EVENT_FULL EVENT_CLOSED ALREADY_APPLIED EVENT_ALREADY_PROPOSED CLASSROOM_QUOTA_EXCEEDED
LEARNER_QUOTA_EXCEEDED COURSE_NOT_IN_OFFER CLASSROOM_NAME_TAKEN REPORT_LOCKED
DUPLICATE_ROW MALFORMED_ROW ALREADY_IN_CLASSROOM IMPORT_TOO_LARGE
""".split()


def test_catalog_covers_every_code_of_the_spec():
    assert set(SPEC_CODES) <= set(CATALOG)


@pytest.mark.parametrize("code", sorted(CATALOG))
def test_every_code_has_a_status_and_a_french_message(code):
    status, message = CATALOG[code]
    assert 400 <= status < 600
    assert message.endswith((".", "!")) and message[0].isupper()


def test_api_error_carries_its_code_status_and_message():
    error = ApiError("EVENT_FULL")
    assert (error.status_code, error.default_code, str(error.detail)) == (
        409,
        "EVENT_FULL",
        "Cet événement est complet.",
    )


# --- Format rendu par le gestionnaire --------------------------------------------------------


@pytest.mark.django_db
def test_anonymous_gets_401_not_authenticated_in_french():
    resp = APIClient().get("/api/accounts/me/")
    assert resp.status_code == 401
    assert resp.json() == {"code": "NOT_AUTHENTICATED", "message": "Connexion requise."}


@pytest.mark.django_db
def test_field_errors_carry_a_code_and_a_message():
    client = APIClient()
    client.force_login(LearnerFactory())
    resp = client.post(
        "/api/accounts/me/password/",
        {"currentPassword": PASSWORD, "newPassword": "court"},
        format="json",
    )
    assert resp.status_code == 400
    body = resp.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert body["message"] == "Certaines informations sont invalides."
    assert body["fields"]["newPassword"] == [
        {"code": "PASSWORD_TOO_WEAK", "message": "Au moins 8 caractères."},
        {"code": "PASSWORD_TOO_WEAK", "message": "Au moins une lettre et un chiffre."},
    ]


@pytest.mark.django_db
def test_method_not_allowed_is_in_french():
    client = APIClient()
    client.force_login(LearnerFactory())
    body = client.delete("/api/accounts/me/").json()
    assert body == {"code": "METHOD_NOT_ALLOWED", "message": "Méthode non autorisée."}


# --- Politique de mot de passe D25 ----------------------------------------------------------


@pytest.mark.parametrize("password", ["Steamy2026", "abcdefg1", "élève2026", "1234567a"])
def test_password_policy_accepts_8_chars_with_a_letter_and_a_digit(password):
    validate_password(password)


@pytest.mark.parametrize(
    "password,messages",
    [
        ("abc12", ["Au moins 8 caractères."]),
        ("abcdefgh", ["Au moins une lettre et un chiffre."]),
        ("12345678", ["Au moins une lettre et un chiffre."]),
        ("abc", ["Au moins 8 caractères.", "Au moins une lettre et un chiffre."]),
    ],
)
def test_password_policy_refuses_with_the_pwreq_labels(password, messages):
    with pytest.raises(ValidationError) as error:
        validate_password(password)
    assert error.value.messages == messages
    assert {e.code for e in error.value.error_list} == {"PASSWORD_TOO_WEAK"}


def test_django_default_validators_are_removed():
    # « password » serait refusé par CommonPasswordValidator : D25 ne connaît que ses deux règles.
    validate_password("password1")


# --- Gestionnaire appelé directement : cas que les vues actuelles ne produisent pas encore ------


def handle(exc):
    from libs.exception_handler import exception_handler

    return exception_handler(exc, {"view": None}).data


def test_nested_and_scalar_field_errors_are_formatted():
    from rest_framework.exceptions import ValidationError as DRFValidationError

    body = handle(
        DRFValidationError({"items": [{"quantity": ["Trop grand."]}], "kit_slug": "Inconnu."})
    )
    assert body["fields"]["items"] == [
        {"quantity": [{"code": "INVALID", "message": "Trop grand."}]}
    ]
    assert body["fields"]["kitSlug"] == [{"code": "INVALID", "message": "Inconnu."}]


def test_non_field_error_keeps_its_catalog_code_and_message():
    from rest_framework.exceptions import ValidationError as DRFValidationError

    body = handle(DRFValidationError("Code incorrect.", code="OTP_INVALID"))
    assert body == {"code": "OTP_INVALID", "message": "Code incorrect."}
    generic = handle(DRFValidationError("Autre problème."))
    assert generic == {"code": "VALIDATION_ERROR", "message": "Autre problème."}


def test_django_validation_error_becomes_a_field_error():
    body = handle(ValidationError({"email": ValidationError("Déjà pris.", code="EMAIL_TAKEN")}))
    assert body["fields"]["email"] == [{"code": "EMAIL_TAKEN", "message": "Déjà pris."}]


def test_api_error_can_point_at_fields():
    body = handle(ApiError("USERNAME_TAKEN", fields={"user_name": "USERNAME_TAKEN"}))
    assert body["code"] == "USERNAME_TAKEN"
    assert body["fields"] == {
        "userName": [
            {
                "code": "USERNAME_TAKEN",
                "message": "Cet identifiant est déjà associé à un compte Steamy.",
            }
        ]
    }


def test_password_policy_help_text_lists_the_pwreq_rules():
    from apps.accounts.password_validation import PasswordPolicyValidator

    assert PasswordPolicyValidator().get_help_text() == (
        "Au moins 8 caractères · Au moins une lettre et un chiffre"
    )


def test_error_responses_helper_declares_the_error_component():
    from libs.schema import ErrorSerializer, error_responses

    assert error_responses(409, 410) == {409: ErrorSerializer, 410: ErrorSerializer}


def test_django_permission_denied_and_unexpected_errors():
    from django.core.exceptions import PermissionDenied

    assert handle(PermissionDenied())["code"] == "PERMISSION_DENIED"
    body = handle(RuntimeError("détail technique à ne jamais renvoyer"))
    assert body == {
        "code": "SERVER_ERROR",
        "message": "Une erreur est survenue. Réessayez dans quelques instants.",
    }
