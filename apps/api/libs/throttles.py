import hashlib

from rest_framework.throttling import SimpleRateThrottle

from libs.phone import looks_like_phone, normalize_phone


def normalize_identifier(identifier: str) -> str:
    """Forme canonique d'une saisie de W16 : les variantes d'un même identifiant partagent un compteur."""
    identifier = (identifier or "").strip()
    if "@" not in identifier and looks_like_phone(identifier):
        return normalize_phone(identifier) or identifier
    return identifier.lower()


class LoginIdentifierThrottle(SimpleRateThrottle):
    """
    Plafond de connexion par identifiant (S9), en plus du plafond par IP (portée `login`) : changer d'adresse IP
    ne permet pas d'essayer sans limite les mots de passe d'un même compte.
    """

    scope = "login-identifier"

    def get_cache_key(self, request, view):
        identifier = request.data.get("identifier") if hasattr(request.data, "get") else None
        if not isinstance(identifier, str) or not identifier.strip():
            return None
        digest = hashlib.sha256(normalize_identifier(identifier).encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}
