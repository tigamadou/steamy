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
"""

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.openapi import AutoSchema
from rest_framework import serializers
from rest_framework.permissions import AllowAny

from libs.errors import ERROR_CODES

WRITE_METHODS = {"POST", "PUT", "PATCH"}
UNSAFE_METHODS = WRITE_METHODS | {"DELETE"}


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
        codes = [429]
        if method in WRITE_METHODS:
            codes.append(400)
        if not self._is_public():
            codes += [401, 403]
        elif method in UNSAFE_METHODS:
            codes.append(403)
        if "{" in self.path:
            codes.append(404)
        for code in sorted(codes):
            responses.setdefault(
                str(code),
                self._get_response_for_code(ErrorSerializer, str(code), direction=direction),
            )
        return responses


class SessionScheme(OpenApiAuthenticationExtension):
    target_class = "libs.authentication.SessionAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "cookie", "name": "sessionid"}
