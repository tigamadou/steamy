"""Champs de saisie partagés par les flux d'inscription et de connexion."""

import re

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.fields import get_error_detail

from apps.referentials.models import Country
from libs.errors import message_for
from libs.phone import normalize_phone


def phone_country(phone: str) -> Country | None:
    """Pays actif dont l'indicatif et le format national correspondent au numéro E.164 (référentiel, D3)."""
    for country in Country.objects.filter(active=True):
        prefix = f"+{country.dial_code}"
        if phone.startswith(prefix) and re.match(country.phone_regex, phone[len(prefix) :]):
            return country
    return None


class PhoneField(serializers.CharField):
    """Numéro saisi librement (« 01 97 00 00 01 », « +229… ») → E.164, validé par le référentiel des pays."""

    default_error_messages = {"PHONE_INVALID": message_for("PHONE_INVALID")}

    def __init__(self, **kwargs):
        kwargs.setdefault("max_length", 32)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        phone = normalize_phone(super().to_internal_value(data))
        if phone is None or phone_country(phone) is None:
            self.fail("PHONE_INVALID")
        return phone


class PasswordField(serializers.CharField):
    """Mot de passe soumis à la politique D25 (`PASSWORD_TOO_WEAK`)."""

    def __init__(self, **kwargs):
        kwargs.setdefault("trim_whitespace", False)
        kwargs.setdefault("style", {"input_type": "password"})
        kwargs.setdefault("max_length", 128)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        password = super().to_internal_value(data)
        try:
            password_validation.validate_password(password)
        except DjangoValidationError as error:
            raise serializers.ValidationError(get_error_detail(error)) from error
        return password


class AcceptedField(serializers.BooleanField):
    """Case à cocher obligatoire (CGU et politique de confidentialité)."""

    default_error_messages = {"REQUIRED": "Accepte les conditions pour continuer."}

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if not value:
            self.fail("REQUIRED")
        return value
