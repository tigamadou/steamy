"""
Erreurs métier de l'API (D4, SPEC-TECHNIQUE §7.1).

Une vue lève `ApiError("CODE")` : le gestionnaire d'erreurs (`libs.exception_handler`) la rend au format unique
`{code, message, fields}`, avec le message français du catalogue. Le catalogue complet arrive en API-1.3.
"""

from rest_framework import status
from rest_framework.exceptions import APIException

#: Code → (statut HTTP, message français affichable tel quel).
CATALOG = {
    # Auth
    "INVALID_CREDENTIALS": (
        status.HTTP_400_BAD_REQUEST,
        "Identifiant ou mot de passe incorrect.",
    ),
    "ACCOUNT_PENDING_CONSENT": (
        status.HTTP_403_FORBIDDEN,
        "Ton inscription attend encore l'accord de ton parent.",
    ),
    "ACCOUNT_SUSPENDED": (
        status.HTTP_403_FORBIDDEN,
        "Ce compte est suspendu. Contactez l'équipe Steamy.",
    ),
    "ACCOUNT_DEACTIVATED": (
        status.HTTP_403_FORBIDDEN,
        "Ce compte est désactivé.",
    ),
}


class ApiError(APIException):
    """Erreur métier identifiée par un code du catalogue."""

    def __init__(self, code: str, message: str | None = None, status_code: int | None = None):
        default_status, default_message = CATALOG[code]
        self.status_code = status_code or default_status
        super().__init__(detail=message or default_message, code=code)
        self.default_code = code
