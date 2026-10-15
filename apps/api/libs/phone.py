"""
Numéros de téléphone en E.164 (« +22901970000 »), seul format stocké (§3).

La normalisation est volontairement simple (ADR 0001) : l'unicité et la connexion n'ont besoin que d'une forme
canonique. Les règles par pays (longueur, préfixes) relèvent du référentiel `Country`.
"""

import re

#: Pays par défaut d'un numéro saisi sans indicatif : le Bénin.
DEFAULT_DIAL_CODE = "229"

E164_REGEX = r"^\+[1-9][0-9]{7,14}$"
_SEPARATORS = re.compile(r"[\s.\-()/]")
_E164 = re.compile(E164_REGEX)


def looks_like_phone(value: str) -> bool:
    """Une saisie de W16 désigne un téléphone si elle commence par « + » ou n'a que des chiffres (C7)."""
    compact = _SEPARATORS.sub("", value or "")
    return bool(compact) and (compact.startswith("+") or compact.isdigit())


def normalize_phone(value: str, default_dial_code: str = DEFAULT_DIAL_CODE) -> str | None:
    """Renvoie le numéro en E.164, ou None s'il n'est pas un numéro valide."""
    compact = _SEPARATORS.sub("", value or "")
    if compact.startswith("00"):
        compact = "+" + compact[2:]
    elif compact.isdigit():
        compact = f"+{default_dial_code}{compact}"
    return compact if _E164.match(compact) else None
