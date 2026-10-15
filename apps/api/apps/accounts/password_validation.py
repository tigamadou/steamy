"""
Politique de mot de passe (D25) : 8 caractères minimum, au moins une lettre et un chiffre, validée par le serveur.

Les messages reprennent mot pour mot les règles affichées par `PwReq` sur tous les écrans (« Au moins 8
caractères » · « Au moins une lettre et un chiffre »). Les validateurs par défaut de Django (mots courants,
similarité) sont retirés : leurs messages ne figurent pas dans `PwReq`.
"""

import re

from django.core.exceptions import ValidationError

MIN_LENGTH = 8
RULES = (
    ("Au moins 8 caractères", lambda password: len(password) >= MIN_LENGTH),
    (
        "Au moins une lettre et un chiffre",
        lambda password: bool(re.search(r"[^\W\d_]", password) and re.search(r"\d", password)),
    ),
)


class PasswordPolicyValidator:
    def validate(self, password, user=None):
        errors = [
            ValidationError(f"{label}.", code="PASSWORD_TOO_WEAK")
            for label, ok in RULES
            if not ok(password or "")
        ]
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return " · ".join(label for label, _ in RULES)
