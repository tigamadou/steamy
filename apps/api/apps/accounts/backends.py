"""
Backends d'authentification (ADR 0001).

- `IdentifierBackend` : connexion des personas sur W16 (`auth/login/`), champ unique « Identifiant ou numéro » (C7).
- `StaffBackend` : connexion du personnel à l'admin Django (WAD15), par email.

Les deux surfaces sont étanches : le personnel n'est jamais trouvé par `IdentifierBackend`, et `StaffBackend`
n'accepte que des comptes `is_staff`.
"""

from django.contrib.auth.backends import ModelBackend

from libs.errors import ApiError
from libs.phone import looks_like_phone, normalize_phone

from .models import User

#: Refus révélés seulement à qui a donné le bon mot de passe.
STATUS_ERRORS = {
    User.Status.PENDING: "ACCOUNT_PENDING_CONSENT",
    User.Status.SUSPENDED: "ACCOUNT_SUSPENDED",
    User.Status.DEACTIVATED: "ACCOUNT_DEACTIVATED",
}


def find_persona(identifier: str) -> User | None:
    """Résout la saisie de W16 : « @ » → email, chiffres ou « + » → téléphone, sinon identifiant (C7)."""
    identifier = (identifier or "").strip()
    if not identifier:
        return None
    personas = User.objects.filter(is_staff=False, role__isnull=False)
    if "@" in identifier:
        lookup = {"email__iexact": identifier}
    elif looks_like_phone(identifier):
        phone = normalize_phone(identifier)
        if phone is None:
            return None
        lookup = {"phone": phone}
    else:
        lookup = {"username__iexact": identifier}
    return personas.filter(**lookup).first()


class IdentifierBackend(ModelBackend):
    def authenticate(self, request, identifier=None, password=None, **kwargs):
        if identifier is None or password is None:
            return None
        user = find_persona(identifier)
        if user is None or user.status == User.Status.ANONYMIZED:
            # Hachage factice : la durée ne révèle pas si l'identifiant existe.
            User().set_password(password)
            return None
        if not user.check_password(password):
            return None
        if user.status in STATUS_ERRORS:
            raise ApiError(STATUS_ERRORS[user.status])
        return user

    def get_user(self, user_id):
        user = super().get_user(user_id)
        return user if user is not None and not user.is_staff else None


class StaffBackend(ModelBackend):
    """Admin Django : email + mot de passe d'un compte du personnel actif. Le TOTP s'y ajoute en API-L6.1."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        user = User.objects.filter(email__iexact=username.strip(), is_staff=True).first()
        if user is None:
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        user = super().get_user(user_id)
        return user if user is not None and user.is_staff else None
