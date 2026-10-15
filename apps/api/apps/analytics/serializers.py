# apps/analytics/serializers.py
from rest_framework import serializers

from .models import DailyAggregatedStat, Event


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
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
