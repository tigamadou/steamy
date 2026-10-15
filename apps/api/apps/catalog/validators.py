"""
Validation des champs saisis dans l'admin par le groupe Contenu : identifiants Vimeo (ADR 0004) et blocs de
mission (texte, média, astuce : SPEC-TECHNIQUE §3.2).
"""

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

#: Identifiant numérique d'une vidéo Vimeo.
validate_vimeo_id = RegexValidator(r"^\d+$", "L'identifiant Vimeo ne contient que des chiffres.")
#: Hachage de confidentialité d'une vidéo non listée : alphanumérique, sans longueur fixe (ADR 0004).
validate_vimeo_hash = RegexValidator(
    r"^[0-9A-Za-z]+$", "Le hachage Vimeo ne contient que des lettres et des chiffres."
)

#: Champs de chaque type de bloc : obligatoires, puis facultatifs.
BLOCK_FIELDS = {
    "text": ({"text"}, set()),
    "tip": ({"text"}, set()),
    "media": ({"src", "alt"}, {"caption"}),
}


def validate_string_list(value):
    """Listes simples (objectifs, prérequis, matériel) : chaînes non vides."""
    if not isinstance(value, list) or not all(
        isinstance(item, str) and item.strip() for item in value
    ):
        raise ValidationError("Saisissez une liste de textes non vides.")


def validate_mission_blocks(value):
    """
    `blocks` : liste ordonnée de blocs `{"type": "text", "text"}`, `{"type": "tip", "text"}` ou
    `{"type": "media", "src", "alt", "caption"?}` (`src` : URL https ou chemin du stockage).
    """
    if not isinstance(value, list):
        raise ValidationError("Les blocs forment une liste.")
    for position, block in enumerate(value, start=1):
        if not isinstance(block, dict) or block.get("type") not in BLOCK_FIELDS:
            raise ValidationError(
                f"Bloc {position} : type attendu parmi « text », « media », « tip »."
            )
        required, optional = BLOCK_FIELDS[block["type"]]
        keys = set(block) - {"type"}
        if not required <= keys or keys - required - optional:
            expected = ", ".join(sorted(required | optional))
            raise ValidationError(f"Bloc {position} : champs attendus {expected}.")
        if not all(isinstance(block[key], str) and block[key].strip() for key in required):
            raise ValidationError(f"Bloc {position} : champ vide.")
        if not all(isinstance(block[key], str) for key in keys & optional):
            raise ValidationError(f"Bloc {position} : texte attendu.")
        if block["type"] == "media" and ":" in block["src"]:
            if not block["src"].startswith("https://"):
                raise ValidationError(f"Bloc {position} : l'image doit être servie en https.")
