"""
Catalogue public (§7.4) : anonyme, en lecture seule, indépendant de la session pour rester cachable par le client
anonyme du front (§1.2) ; seuls les parcours publiés sont visibles (S6), un brouillon répond 404.
"""

from django.db.models import Count, Prefetch, Q
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .filters import CourseQuerySerializer, filter_courses
from .models import Category, Course, Level, Project
from .serializers import CategorySerializer, CourseDetailSerializer, CourseListSerializer

CACHE_SECONDS = 300
PUBLISHED = Q(status=Course.Status.PUBLISHED)


class PublicReadMixin:
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = []


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
class CategoryListView(PublicReadMixin, generics.ListAPIView):
    """Catégories avec le nombre de parcours publiés (WL06, WL16) ; liste courte, non paginée."""

    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        published = Q(courses__status=Course.Status.PUBLISHED)
        return Category.objects.annotate(course_count=Count("courses", filter=published))


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
@extend_schema(parameters=[CourseQuerySerializer])
class CourseListView(PublicReadMixin, generics.ListAPIView):
    """Parcours publiés, filtrés et triés (WL01, WL06, WC01-WC03), paginés."""

    serializer_class = CourseListSerializer

    def get_queryset(self):
        params = CourseQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        queryset = (
            Course.objects.filter(PUBLISHED)
            .select_related("category", "required_kit")
            .annotate(popularity=Count("enrollments"))
        )
        return filter_courses(queryset, params.validated_data)


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
class CourseDetailView(PublicReadMixin, generics.RetrieveAPIView):
    """Fiche publique (WL22, WC04) : plan du parcours sans contenu de mission (D11)."""

    serializer_class = CourseDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        levels = Level.objects.prefetch_related("missions")
        projects = Project.objects.prefetch_related(Prefetch("levels", queryset=levels))
        return (
            Course.objects.filter(PUBLISHED)
            .select_related("category", "required_kit")
            .annotate(mission_count=Count("projects__levels__missions"))
            .prefetch_related(Prefetch("projects", queryset=projects))
        )
