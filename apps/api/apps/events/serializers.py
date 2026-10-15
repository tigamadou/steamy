"""Steamy Events publics (§7.6) : aucune donnée de participant, en particulier d'aucun mineur (§4.6)."""

from rest_framework import serializers

from .models import SteamyEvent

LIST_FIELDS = (
    "slug",
    "title",
    "emoji",
    "color",
    "starts_at",
    "ends_at",
    "online",
    "place",
    "city",
    "audience",
    "price",
    "is_free",
    "capacity",
    "seats_left",
    "application_deadline",
    "applications_open",
    "is_past",
)


class SteamyEventSerializer(serializers.ModelSerializer):
    is_free = serializers.SerializerMethodField()
    seats_left = serializers.IntegerField(read_only=True)
    applications_open = serializers.BooleanField(
        read_only=True, help_text="Places restantes et date limite non dépassée"
    )
    is_past = serializers.BooleanField(read_only=True)

    class Meta:
        model = SteamyEvent
        fields = LIST_FIELDS

    def get_is_free(self, event) -> bool:
        return event.price == 0


class SteamyEventDetailSerializer(SteamyEventSerializer):
    class Meta(SteamyEventSerializer.Meta):
        fields = (*LIST_FIELDS, "description")
