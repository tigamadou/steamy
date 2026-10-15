# courses/serializers.py
#
# Lecture seule (S2). Le catalogue n'expose ni l'auteur (S6 : son email était publié) ni le
# contenu des leçons : celui-ci est réservé aux inscrits, via `lessons/` et `resources/`.
from rest_framework import serializers

from .models import Course, Lesson, Module, Resource


class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ["id", "lesson", "title", "file", "external_url", "uploaded_at"]
        read_only_fields = fields


class LessonSerializer(serializers.ModelSerializer):
    resources = ResourceSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ["id", "module", "title", "content", "resource_type", "order", "resources"]
        read_only_fields = fields


class LessonSummarySerializer(serializers.ModelSerializer):
    """Plan du parcours, sans contenu : visible avant l'inscription."""

    class Meta:
        model = Lesson
        fields = ["id", "title", "resource_type", "order"]
        read_only_fields = fields


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ["id", "title", "order", "lessons", "course"]
        read_only_fields = fields


class CourseListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "title", "slug", "description", "path", "price", "created_at"]
        read_only_fields = fields


class CourseDetailSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "path",
            "price",
            "created_at",
            "updated_at",
            "modules",
        ]
        read_only_fields = fields
