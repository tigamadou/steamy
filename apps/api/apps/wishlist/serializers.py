from rest_framework import serializers

from apps.catalog.serializers import CourseListSerializer


class WishlistItemSerializer(serializers.Serializer):
    course = CourseListSerializer()
    added_at = serializers.DateTimeField(source="created_at")


class WishlistQuerySerializer(serializers.Serializer):
    sort = serializers.ChoiceField(
        choices=(("recent", "Ajoutés récemment"), ("title", "Titre"), ("price", "Prix croissant")),
        default="recent",
    )
