import re

from django.core.exceptions import ValidationError

#: Caractères et longueur autorisés pour l'identifiant d'un apprenant.
USERNAME_REGEX = r"^[A-Za-z0-9._-]{3,30}$"
#: Au moins une lettre : sans lettre, « 97.00.00 » serait lu comme un téléphone sur W16 (C7, ADR 0001).
HAS_LETTER_REGEX = r"[A-Za-z]"

USERNAME_INVALID_MESSAGE = (
    "L'identifiant doit faire 3 à 30 caractères (lettres, chiffres, « . », « _ » ou « - ») "
    "et contenir au moins une lettre."
)


def validate_username(value: str) -> None:
    if not re.match(USERNAME_REGEX, value or "") or not re.search(HAS_LETTER_REGEX, value):
        raise ValidationError(USERNAME_INVALID_MESSAGE, code="USERNAME_INVALID")
