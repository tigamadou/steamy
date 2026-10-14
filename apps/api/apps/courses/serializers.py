# courses/serializers.py
from rest_framework import serializers

from .models import Course, Lesson, Module, Path, Resource


class ResourceSerializer(serializers.ModelSerializer):
    # allow creating resource by passing lesson id
    lesson = serializers.PrimaryKeyRelatedField(queryset=Lesson.objects.all())

    class Meta:
        model = Resource
        fields = ["id", "lesson", "title", "file", "external_url", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class LessonSerializer(serializers.ModelSerializer):
    # accept module id on create/update
    module = serializers.PrimaryKeyRelatedField(queryset=Module.objects.all())
    resources = ResourceSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ["id", "module", "title", "content", "resource_type", "order", "resources"]
        read_only_fields = ["id", "resources"]


class ModuleSerializer(serializers.ModelSerializer):
    # allow setting course by PK (top-level create). For nested router the view will inject the parent.
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), required=False)
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ["id", "title", "order", "lessons", "course"]
        read_only_fields = ["id", "lessons"]


class CourseListSerializer(serializers.ModelSerializer):
    # show author as string (email) and path as id/title composite
    author = serializers.StringRelatedField(read_only=True)
    path = serializers.PrimaryKeyRelatedField(
        queryset=Path.objects.all(), required=False, allow_null=True
    )

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
        ]


class CourseDetailSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)
    author = serializers.StringRelatedField(read_only=True)
    path = serializers.PrimaryKeyRelatedField(
        queryset=Path.objects.all(), required=False, allow_null=True
    )

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
        read_only_fields = ["id", "created_at", "updated_at", "author"]


class PathSerializer(serializers.ModelSerializer):
    class Meta:
        model = Path
        fields = ["id", "title", "slug", "description"]
        read_only_fields = ["id", "slug"]
