# apps/analytics/serializers.py
from rest_framework import serializers

from .models import DailyAggregatedStat, TrackingEvent


class TrackingEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrackingEvent
        fields = [
            "id",
            "user",
            "event_type",
            "entity_type",
            "entity_id",
            "value",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]


class DailyAggregatedStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyAggregatedStat
        fields = ["id", "date", "group_by", "key", "metric", "value"]
