# courses/serializers.py
from rest_framework import serializers
from .models import Path, Course, Module, Lesson, Resource


class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ["id", "title", "file", "external_url", "uploaded_at"]


class LessonSerializer(serializers.ModelSerializer):
    resources = ResourceSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ["id", "title", "content", "resource_type", "order", "resources"]


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ["id", "title", "order", "lessons", "course"]
        read_only_fields = ["course"]


class CourseListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "title", "slug", "description", "author", "path", "published", "price", "created_at"]


class CourseDetailSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "author",
            "path",
            "published",
            "price",
            "created_at",
            "updated_at",
            "modules",
        ]


class PathSerializer(serializers.ModelSerializer):
    class Meta:
        model = Path
        fields = ["id", "title", "slug", "description"]
