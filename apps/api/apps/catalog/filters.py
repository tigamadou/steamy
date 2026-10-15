"""
Filtres du catalogue public : `category`, `difficulty`, `price`, `featured`, `q`, `sort` (§7.4).

Validés par un serializer (valeur inconnue → 400 `VALIDATION_ERROR` avec le champ en cause) et déclarés tels quels
dans le schéma OpenAPI.
"""

from django.db.models import Q
from rest_framework import serializers

from .models import Course

#: Tri → `order_by`. `popular` (défaut) : nombre d'inscriptions, puis mis en avant et récents.
SORTS = {
    "popular": ("-popularity", "-featured", "-created_at"),
    "recent": ("-created_at",),
    "price-asc": ("price", "title"),
    "price-desc": ("-price", "title"),
    "title": ("title",),
}


class CourseQuerySerializer(serializers.Serializer):
    category = serializers.SlugField(required=False, help_text="Slug de la catégorie")
    difficulty = serializers.ChoiceField(choices=Course.Difficulty.choices, required=False)
    price = serializers.ChoiceField(
        choices=[("free", "Gratuit"), ("paid", "Payant")], required=False
    )
    featured = serializers.BooleanField(
        required=False, allow_null=True, default=None, help_text="Parcours mis en avant (WL01)"
    )
    q = serializers.CharField(
        required=False, max_length=100, help_text="Recherche dans le titre et la description"
    )
    sort = serializers.ChoiceField(choices=list(SORTS), default="popular")


def filter_courses(queryset, params):
    """Applique les paramètres validés par `CourseQuerySerializer`."""
    if "category" in params:
        queryset = queryset.filter(category__slug=params["category"])
    if "difficulty" in params:
        queryset = queryset.filter(difficulty=params["difficulty"])
    if "price" in params:
        queryset = queryset.filter(is_free=params["price"] == "free")
    if params["featured"] is not None:
        queryset = queryset.filter(featured=params["featured"])
    if "q" in params:
        queryset = queryset.filter(
            Q(title__icontains=params["q"]) | Q(description__icontains=params["q"])
        )
    return queryset.order_by(*SORTS[params["sort"]])
