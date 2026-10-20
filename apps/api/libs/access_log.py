"""
Journaux d'accès sans secret : le jeton d'un lien d'activation est masqué avant écriture, pour le personnel (WAD13)
comme pour les anciennes routes de l'activation enseignant (C6, jeton désormais dans le corps des requêtes).
Filtre posé sur les journaux d'accès d'uvicorn et de gunicorn (`project/gunicorn.py`).
"""

import logging
import re

#: Chemins dont le dernier segment est un secret
SECRET_PATHS = re.compile(
    r"(/admin/activation/(?!definir/)|/auth/teacher-invitations/(?!(?:lookup|accept)/))[^/?\s\"]+"
)
MASK = r"\1•••"
ACCESS_LOGGERS = ("uvicorn.access", "gunicorn.access")


def mask_secrets(value):
    return SECRET_PATHS.sub(MASK, value) if isinstance(value, str) else value


class MaskSecretsFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = mask_secrets(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(mask_secrets(arg) for arg in record.args)
        elif isinstance(record.args, dict):
            record.args = {key: mask_secrets(arg) for key, arg in record.args.items()}
        return True


def install() -> None:
    for name in ACCESS_LOGGERS:
        logger = logging.getLogger(name)
        if not any(isinstance(f, MaskSecretsFilter) for f in logger.filters):
            logger.addFilter(MaskSecretsFilter())
