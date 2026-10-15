"""
Catalogue public (SPEC-TECHNIQUE §7.4, D11) : lecture seule, parcours publiés uniquement.

Le plan d'un parcours donne titres, durées et objectifs, jamais le contenu d'une mission (`blocks`) ni sa vidéo
(`vimeoId`, `vimeoHash`), ni l'introduction vidéo d'un niveau : ils sont réservés à un inscrit (ADR 0004, API-L3a).
Aucune donnée d'utilisateur, aucune note (`rating` masquée en v1, C8).
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Category, Course, Level, Mission, Project


class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True, help_text="Parcours publiés")

    class Meta:
        model = Category
        fields = ("slug", "label", "color", "icon", "course_count")


class CategorySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("slug", "label", "color", "icon")


class RequiredKitSerializer(serializers.Serializer):
    """Kit dont le Kit Code ouvre le parcours (D36) ; fiche : `GET shop/kits/{slug}/`."""

    slug = serializers.SlugField()
    name = serializers.CharField()


class CourseListSerializer(serializers.ModelSerializer):
    category = CategorySummarySerializer(read_only=True)
    required_kit = RequiredKitSerializer(read_only=True, allow_null=True)
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "slug",
            "title",
            "category",
            "difficulty",
            "is_free",
            "price",
            "emoji",
            "required_kit",
            "cover_image",
            "duration_hours",
            "featured",
        )

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_cover_image(self, course):
        return course.cover_image.url if course.cover_image else None


class MissionSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Mission
        fields = ("order", "title", "duration_min", "icon")


class LevelSummarySerializer(serializers.ModelSerializer):
    missions = MissionSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Level
        fields = ("order", "title", "duration_min", "intro_summary", "missions")


class ProjectSummarySerializer(serializers.ModelSerializer):
    levels = LevelSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = (
            "order",
            "title",
            "duration_hours",
            "objectives",
            "prerequisites",
            "materials",
            "levels",
        )


class CourseDetailSerializer(CourseListSerializer):
    projects = ProjectSummarySerializer(many=True, read_only=True)
    mission_count = serializers.IntegerField(read_only=True)

    class Meta(CourseListSerializer.Meta):
        fields = (
            *CourseListSerializer.Meta.fields,
            "description",
            "outcomes",
            "audience",
            "prerequisites",
            "trailer_vimeo_id",
            "trailer_vimeo_hash",
            "certificate_enabled",
            "mission_count",
            "projects",
        )
