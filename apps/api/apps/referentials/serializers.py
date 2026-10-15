from rest_framework import serializers

from . import models

BASE = ("id", "code", "label")


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Country
        fields = (*BASE, "flag", "dial_code", "phone_format", "phone_regex")


class PaymentNetworkSerializer(serializers.ModelSerializer):
    country = serializers.CharField(source="country_id", help_text="Code ISO du pays")

    class Meta:
        model = models.PaymentNetwork
        fields = (*BASE, "country")


class SchoolGradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.SchoolGrade
        fields = BASE


class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Goal
        fields = (*BASE, "emoji")


class AvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Avatar
        fields = (*BASE, "emoji", "color")


class DisabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Disability
        fields = BASE


class RelationshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Relationship
        fields = (*BASE, "parent_label")


class RefusalReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.RefusalReason
        fields = BASE


class LocalitySerializer(serializers.ModelSerializer):
    country = serializers.CharField(source="country_id", help_text="Code ISO du pays")

    class Meta:
        model = models.Locality
        fields = ("id", "country", "city", "district", "area_type")
