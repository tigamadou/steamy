"""
Format d'erreur unique de l'API (D4, SPEC-TECHNIQUE §7.1) :

    {
      "code": "VALIDATION_ERROR",
      "message": "Certaines informations sont invalides.",
      "fields": { "newPassword": [{ "code": "PASSWORD_TOO_WEAK", "message": "…" }] }
    }

- `code` : code métier stable, en MAJUSCULES, du catalogue `libs.errors.CATALOG` ;
- `message` : texte en français, affichable tel quel ;
- `fields` : erreurs par champ (noms en camelCase, comme le reste de l'API), chacune avec son code ; présent
  seulement quand des champs sont en cause.
"""

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from djangorestframework_camel_case.util import camelize
from rest_framework import exceptions, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.fields import get_error_detail
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from libs.errors import CATALOG, ApiError, message_for

logger = logging.getLogger(__name__)


def _error_code(detail) -> str:
    code = str(getattr(detail, "code", None) or "invalid")
    return code if code.isupper() else code.upper()


def _field_errors(detail):
    """Détail DRF (dict, liste, ErrorDetail) → `{champ: [{code, message}]}`, imbrication comprise."""
    if isinstance(detail, dict):
        return {key: _field_errors(value) for key, value in detail.items()}
    if isinstance(detail, list):
        if any(isinstance(item, dict | list) for item in detail):
            return [_field_errors(item) for item in detail]
        return [{"code": _error_code(item), "message": str(item)} for item in detail]
    return [{"code": _error_code(detail), "message": str(detail)}]


def exception_handler(exc, context):
    # Exceptions Django → équivalents DRF (le message de Http404 de Django est en anglais et nomme le modèle).
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()
    elif isinstance(exc, DjangoValidationError):
        exc = DRFValidationError(detail=get_error_detail(exc))

    response = drf_exception_handler(exc, context)
    if response is None:
        # Erreur non prévue : journalisée, jamais renvoyée telle quelle au client.
        logger.exception("Erreur non gérée sur %s", context.get("view"))
        return Response(
            {"code": "SERVER_ERROR", "message": message_for("SERVER_ERROR")},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, DRFValidationError):
        detail = exc.detail
        body = {"code": "VALIDATION_ERROR", "message": message_for("VALIDATION_ERROR")}
        if isinstance(detail, dict):
            body["fields"] = camelize(_field_errors(detail))
        else:
            # Erreur sans champ (DRF la range toujours en liste) : son propre message, et son code s'il est au
            # catalogue.
            items = detail
            body["message"] = " ".join(str(item) for item in items)
            codes = {_error_code(item) for item in items}
            if len(codes) == 1 and (code := codes.pop()) in CATALOG:
                body["code"] = code
        response.data = body
        return response

    if isinstance(exc, ApiError):
        body = {"code": exc.default_code, "message": str(exc.detail)}
        if exc.fields:
            body["fields"] = camelize(
                {
                    name: [{"code": code, "message": message_for(code)}]
                    for name, code in exc.fields.items()
                }
            )
        response.data = body
        return response

    # Exceptions de DRF : code générique et message du catalogue (en français, sans détail technique).
    code = str(getattr(exc, "default_code", "error")).upper()
    message = message_for(code) if code in CATALOG else str(getattr(exc, "detail", exc))
    response.data = {"code": code, "message": message}
    return response
