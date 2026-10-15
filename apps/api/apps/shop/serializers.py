"""Kits publics (§7.5) : jamais le stock exact (`available` seulement), aucune donnée d'acheteur."""

from rest_framework import serializers

from apps.catalog.models import Course
from apps.catalog.serializers import CategorySummarySerializer

from .models import DeliveryZone, Kit

LIST_FIELDS = ("slug", "name", "category", "price", "difficulty", "emoji", "images", "available")


class CompatibleCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("slug", "title")


class KitSerializer(serializers.ModelSerializer):
    category = CategorySummarySerializer(read_only=True)
    available = serializers.BooleanField(
        read_only=True, help_text="En stock (le stock exact reste interne)"
    )

    class Meta:
        model = Kit
        fields = LIST_FIELDS


class KitDetailSerializer(KitSerializer):
    compatible_courses = serializers.SerializerMethodField()

    class Meta(KitSerializer.Meta):
        fields = (*LIST_FIELDS, "description", "contents", "compatible_courses")

    def get_compatible_courses(self, kit) -> list[dict]:
        courses = [c for c in kit.compatible_courses.all() if c.status == Course.Status.PUBLISHED]
        return CompatibleCourseSerializer(courses, many=True).data


class DeliveryZoneSerializer(serializers.ModelSerializer):
    country = serializers.CharField(source="country_id", read_only=True)

    class Meta:
        model = DeliveryZone
        fields = ("id", "country", "name", "fee", "delay_label")
        read_only_fields = fields
