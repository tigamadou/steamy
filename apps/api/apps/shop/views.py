"""
Kits en lecture (§7.5, WL07, WK01, WK02) : anonymes, kits en vente seulement, indépendants de la session et
cachables (§1.2). Zones de livraison publiques (WK05). Panier : API-L3b.3 ; commande : `payments`.
"""

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny

from .models import DeliveryZone, Kit
from .serializers import DeliveryZoneSerializer, KitDetailSerializer, KitSerializer

CACHE_SECONDS = 300


class KitQuerySerializer(serializers.Serializer):
    category = serializers.SlugField(required=False, help_text="Slug de la catégorie")


class PublicKitMixin:
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = []

    def get_queryset(self):
        return Kit.objects.filter(active=True).select_related("category")


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
@extend_schema(parameters=[KitQuerySerializer])
class KitListView(PublicKitMixin, generics.ListAPIView):
    """Kits en vente, paginés."""

    serializer_class = KitSerializer

    def get_queryset(self):
        params = KitQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        queryset = super().get_queryset()
        if "category" in params.validated_data:
            queryset = queryset.filter(category__slug=params.validated_data["category"])
        return queryset


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
class KitDetailView(PublicKitMixin, generics.RetrieveAPIView):
    """Fiche kit (WK02) ; un kit retiré de la vente répond 404."""

    serializer_class = KitDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return super().get_queryset().prefetch_related("compatible_courses")


class DeliveryZoneQuerySerializer(serializers.Serializer):
    country = serializers.CharField(
        required=False, min_length=2, max_length=2, help_text="Code ISO du pays (BJ)"
    )


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
@extend_schema(parameters=[DeliveryZoneQuerySerializer])
class DeliveryZoneListView(generics.ListAPIView):
    """Zones de livraison actives, avec leurs frais et leur délai (D38, WK05). Non paginées."""

    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = []
    pagination_class = None
    serializer_class = DeliveryZoneSerializer

    def get_queryset(self):
        params = DeliveryZoneQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        queryset = DeliveryZone.objects.filter(active=True)
        if "country" in params.validated_data:
            queryset = queryset.filter(country_id=params.validated_data["country"].upper())
        return queryset
