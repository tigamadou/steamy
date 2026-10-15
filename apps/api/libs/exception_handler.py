"""
Format d'erreur unique de l'API (D4) :

    { "code": "VALIDATION_ERROR", "message": "…", "fields": { "email": ["…"] } }

- `code` : code métier stable, en MAJUSCULES, sur lequel le front s'appuie ;
- `message` : texte en français, affichable tel quel ;
- `fields` : erreurs par champ (noms en camelCase, comme le reste de l'API), seulement pour
  les erreurs de validation.

Le catalogue complet des codes métier arrive en API-1.3 ; voici les codes génériques.
"""

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from djangorestframework_camel_case.util import camelize
from rest_framework import exceptions, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)

GENERIC_MESSAGES = {
    "VALIDATION_ERROR": "Certaines informations sont invalides.",
    "SERVER_ERROR": "Une erreur est survenue. Réessayez dans quelques instants.",
}


def _flatten(detail):
    """Détail DRF (liste, dict, ErrorDetail) → structure JSON de chaînes."""
    if isinstance(detail, dict):
        return {key: _flatten(value) for key, value in detail.items()}
    if isinstance(detail, list):
        return [
            str(item) if not isinstance(item, dict | list) else _flatten(item) for item in detail
        ]
    return [str(detail)]


def exception_handler(exc, context):
    # Exceptions Django → équivalents DRF, avec leur message français par défaut (le message
    # de Http404 de Django est en anglais et nomme le modèle).
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()
    elif isinstance(exc, DjangoValidationError):
        exc = DRFValidationError(
            detail=exc.message_dict if hasattr(exc, "message_dict") else exc.messages
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        # Erreur non prévue : journalisée, jamais renvoyée telle quelle au client.
        logger.exception("Erreur non gérée sur %s", context.get("view"))
        return Response(
            {"code": "SERVER_ERROR", "message": GENERIC_MESSAGES["SERVER_ERROR"]},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, DRFValidationError):
        detail = exc.detail
        fields = camelize(_flatten(detail)) if isinstance(detail, dict) else {}
        message = GENERIC_MESSAGES["VALIDATION_ERROR"]
        if not isinstance(detail, dict):
            message = " ".join(_flatten(detail))
        response.data = {"code": "VALIDATION_ERROR", "message": message, "fields": fields}
        return response

    code = getattr(exc, "default_code", "error")
    response.data = {"code": str(code).upper(), "message": str(getattr(exc, "detail", exc))}
    return response
