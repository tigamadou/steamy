"""
Saisie des formulaires publics. Le champ piège `website` (invisible pour un humain) est accepté et vide : rempli, la
requête est ignorée sans le dire (anti-robot). Erreurs par champ au format D4 (`fields`).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.utils import timezone
from rest_framework import serializers

from libs.phone import looks_like_phone, normalize_phone

from .models import ContactMessage, Lead, QuoteRequest

MESSAGE_MIN_LENGTH = 20


def phone_e164(value: str) -> str:
    phone = normalize_phone(value)
    if phone is None:
        raise serializers.ValidationError(
            "Ce numéro de téléphone n'est pas valide.", code="PHONE_INVALID"
        )
    return phone


class HoneypotMixin(serializers.Serializer):
    website = serializers.CharField(
        required=False, allow_blank=True, write_only=True, help_text="Champ piège : toujours vide"
    )

    @property
    def is_robot(self) -> bool:
        return bool(self.validated_data.get("website"))

    def create(self, validated_data):
        validated_data.pop("website", None)
        return super().create(validated_data)


class QuoteRequestSerializer(HoneypotMixin, serializers.ModelSerializer):
    class Meta:
        model = QuoteRequest
        fields = ("school_name", "contact_name", "email", "phone", "offer", "message", "website")
        extra_kwargs = {"phone": {"help_text": "Numéro national (Bénin par défaut) ou E.164"}}

    def validate_phone(self, value):
        return phone_e164(value)


class LeadSerializer(HoneypotMixin, serializers.ModelSerializer):
    is_adult = serializers.BooleanField(
        write_only=True, help_text="Attestation : j'ai 18 ans ou plus (C12)"
    )
    newsletter_consent = serializers.BooleanField(
        write_only=True, help_text="Consentement explicite, case non cochée par défaut (D14)"
    )

    class Meta:
        model = Lead
        fields = ("email", "source", "is_adult", "newsletter_consent", "website")
        # Doublon accepté sans le dire : pas d'énumération des inscrits (voir `create`).
        extra_kwargs = {"email": {"validators": []}}

    def validate_is_adult(self, value):
        if not value:
            raise serializers.ValidationError(
                "La newsletter est réservée aux adultes.", code="REQUIRED"
            )
        return value

    def validate_newsletter_consent(self, value):
        if not value:
            raise serializers.ValidationError("Votre consentement est nécessaire.", code="REQUIRED")
        return value

    def create(self, validated_data):
        lead, _ = Lead.objects.update_or_create(
            email=validated_data["email"].lower(),
            defaults={"source": validated_data.get("source", ""), "consented_at": timezone.now()},
        )
        return lead


class ContactMessageSerializer(HoneypotMixin, serializers.ModelSerializer):
    contact = serializers.CharField(
        write_only=True, max_length=254, help_text="Email ou numéro de téléphone"
    )

    class Meta:
        model = ContactMessage
        fields = ("name", "contact", "subject", "message", "website")

    def validate_contact(self, value):
        value = value.strip()
        if "@" not in value and looks_like_phone(value):
            return {"phone": phone_e164(value)}
        try:
            validate_email(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(
                "Email ou numéro de téléphone invalide.", code="INVALID"
            ) from error
        return {"email": value.lower()}

    def validate_message(self, value):
        if len(value.strip()) < MESSAGE_MIN_LENGTH:
            raise serializers.ValidationError(
                f"Votre message doit contenir au moins {MESSAGE_MIN_LENGTH} caractères.",
                code="MIN_LENGTH",
            )
        return value.strip()

    def create(self, validated_data):
        validated_data.update(validated_data.pop("contact"))
        return super().create(validated_data)


class ReceivedSerializer(serializers.Serializer):
    """Réponse neutre, identique qu'il y ait eu enregistrement, doublon ou robot."""

    ok = serializers.BooleanField()
