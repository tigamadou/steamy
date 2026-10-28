"""
Schéma OpenAPI : les réponses d'erreur (format D4) sont déclarées sur chaque opération, avec le composant `Error`.

| Statut | Déclaré quand |
| --- | --- |
| 400 | l'opération a un corps (POST, PUT, PATCH) |
| 401 | la route n'est pas publique |
| 403 | la route n'est pas publique, ou l'opération écrit (CSRF) |
| 404 | le chemin a un paramètre |
| 409 | l'opération le déclare (`extend_schema(responses=error_responses(409))`) |
| 429 | toujours (throttling global, S9) |
| 500 | toujours (`SERVER_ERROR`) |

Les erreurs métier propres à une opération sont déclarées dans `OPERATION_ERRORS` : le statut de chaque code vient de
`libs.errors.CATALOG` (une seule source), et la description de la réponse liste les codes possibles pour ce statut.
"""

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.openapi import AutoSchema
from rest_framework import serializers
from rest_framework.permissions import AllowAny

from libs.errors import CATALOG, ERROR_CODES

WRITE_METHODS = {"POST", "PUT", "PATCH"}
UNSAFE_METHODS = WRITE_METHODS | {"DELETE"}


#: (méthode, chemin du schéma) → codes d'erreur métier que l'opération peut renvoyer. Un code du catalogue suffit : le
#: statut documenté est celui de `CATALOG`. Les erreurs de champ (400, `fields`) y figurent aussi.
OPERATION_ERRORS: dict[tuple[str, str], tuple[str, ...]] = {
    # --- Panier, adresse de livraison ----------------------------------------------------------
    ("POST", "/api/shop/cart/items/"): ("NOT_FOUND", "OUT_OF_STOCK"),
    ("GET", "/api/accounts/me/delivery-address/"): ("NOT_FOUND",),
    # --- Inscription -------------------------------------------------------------------------
    ("POST", "/api/learning/enrollments/"): ("KIT_CODE_REQUIRED", "PAYMENT_REQUIRED"),
    # --- Commandes -----------------------------------------------------------------------------
    ("GET", "/api/payments/orders/"): ("PERMISSION_DENIED",),
    ("POST", "/api/payments/orders/"): (
        "DELIVERY_ZONE_UNAVAILABLE",
        "OUT_OF_STOCK",
        "PARENT_APPROVAL_REQUIRED",
        "PAYMENT_REQUEST_CLOSED",
        "PERMISSION_DENIED",
    ),
    ("GET", "/api/payments/orders/{reference}/"): ("NOT_FOUND",),
    ("GET", "/api/payments/orders/{reference}/invoice/"): ("NOT_FOUND", "PDF_NOT_READY"),
    ("POST", "/api/payments/orders/{reference}/payments/"): (
        "NETWORK_UNAVAILABLE",
        "NOT_FOUND",
        "ORDER_ALREADY_PAID",
        "ORDER_EXPIRED",
        "PARENT_APPROVAL_REQUIRED",
        "PAYMENT_IN_PROGRESS",
        "PERMISSION_DENIED",
        "PHONE_INVALID",
    ),
    ("GET", "/api/payments/payments/{id}/"): ("NOT_FOUND",),
    # --- Codes de kit --------------------------------------------------------------------------
    ("POST", "/api/payments/kit-codes/redeem/"): (
        "KIT_CODE_ALREADY_USED",
        "KIT_CODE_INVALID",
        "KIT_CODE_NOT_COMPATIBLE",
        "NOT_FOUND",
    ),
    # --- Demandes de paiement ------------------------------------------------------------------
    ("POST", "/api/payments/payment-requests/"): ("PERMISSION_DENIED",),
    ("POST", "/api/payments/payment-requests/{id}/cancel/"): ("PAYMENT_REQUEST_CLOSED",),
    ("POST", "/api/payments/payment-requests/{id}/decline/"): ("PAYMENT_REQUEST_CLOSED",),
    ("POST", "/api/payments/payment-requests/{id}/resend/"): (
        "PAYMENT_REQUEST_CLOSED",
        "THROTTLED",
    ),
}


def error_statuses(codes: tuple[str, ...]) -> dict[int, list[str]]:
    """Statut HTTP (d'après `CATALOG`) → codes, triés."""
    statuses: dict[int, list[str]] = {}
    for code in sorted(codes):
        statuses.setdefault(CATALOG[code][0], []).append(code)
    return statuses


class FieldErrorSerializer(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()


class ErrorSerializer(serializers.Serializer):
    code = serializers.ChoiceField(choices=ERROR_CODES)
    message = serializers.CharField()
    fields = serializers.DictField(
        child=serializers.ListField(child=FieldErrorSerializer()),
        required=False,
        help_text="Erreurs par champ (camelCase), présentes seulement si des champs sont en cause",
    )

    class Meta:
        ref_name = "Error"


def error_responses(*codes: int) -> dict:
    """Réponses d'erreur à ajouter explicitement à une opération (`@extend_schema(responses={...})`)."""
    return {code: ErrorSerializer for code in codes}


class ApiAutoSchema(AutoSchema):
    def _is_public(self) -> bool:
        permissions = self.view.get_permissions()
        return bool(permissions) and all(isinstance(p, AllowAny) for p in permissions)

    def _get_response_bodies(self, direction="response"):
        responses = super()._get_response_bodies(direction)
        method = self.method.upper()
        codes = [429, 500]
        if method in WRITE_METHODS:
            codes.append(400)
        if not self._is_public():
            codes += [401, 403]
        elif method in UNSAFE_METHODS:
            codes.append(403)
        if "{" in self.path:
            codes.append(404)
        listed = error_statuses(OPERATION_ERRORS.get((method, self.path), ()))
        for code in sorted({*codes, *listed}):
            response = responses.setdefault(
                str(code),
                self._get_response_for_code(ErrorSerializer, str(code), direction=direction),
            )
            if code in listed:
                response["description"] = f"Codes : {', '.join(listed[code])}."
        return responses


class SessionScheme(OpenApiAuthenticationExtension):
    target_class = "libs.authentication.SessionAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "cookie", "name": "sessionid"}
