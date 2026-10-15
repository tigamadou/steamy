# courses/views.py
#
# Catalogue en lecture seule (S2) : la création de contenu passe par le back-office (S5, S6).
# Seuls les parcours publiés sont visibles (S6) ; le contenu des leçons est réservé aux inscrits.
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from libs.exceptions import PaymentRequired

from .models import Course, Lesson, Module, Resource
from .serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    LessonSerializer,
    ModuleSerializer,
    ResourceSerializer,
)


def enrolled_course_filter(user, prefix):
    """Filtre « parcours publié auquel l'utilisateur est inscrit » (le personnel voit tout)."""
    if user.is_staff:
        return {}
    return {f"{prefix}published": True, f"{prefix}enrollments__user": user}


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.filter(published=True).prefetch_related("modules__lessons")
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "price", "title"]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action == "list":
            return CourseListSerializer
        return CourseDetailSerializer

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def enroll(self, request, *args, **kwargs):
        """
        Inscrit l'utilisateur courant à un parcours GRATUIT.
        Un parcours payant s'obtient par l'achat (S7) : 402 PAYMENT_REQUIRED.
        Retourne 201 si l'inscription est créée, 200 si elle existait déjà.
        """
        course = self.get_object()
        if course.price > 0:
            raise PaymentRequired()
        from apps.learning.models import Enrollment

        _, created = Enrollment.objects.get_or_create(user=request.user, course=course)
        return Response({"ok": True, "created": created}, status=201 if created else 200)


class ModuleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Module.objects.filter(course__published=True).prefetch_related("lessons")
    serializer_class = ModuleSerializer
    permission_classes = [permissions.AllowAny]


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return Lesson.objects.none()
        filters_ = enrolled_course_filter(self.request.user, "module__course__")
        return (
            Lesson.objects.filter(**filters_)
            .select_related("module__course")
            .prefetch_related("resources")
            .distinct()
        )


class ResourceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ResourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # génération du schéma OpenAPI
            return Resource.objects.none()
        filters_ = enrolled_course_filter(self.request.user, "lesson__module__course__")
        return Resource.objects.filter(**filters_).select_related("lesson").distinct()
