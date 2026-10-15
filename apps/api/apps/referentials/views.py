"""
Référentiels publics (D3) : lisibles sans compte, indépendants de la session et mis en cache une heure
(`Cache-Control: public, max-age=3600`). Listes courtes, non paginées.
"""

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics
from rest_framework.permissions import AllowAny

from . import serializers

CACHE_SECONDS = 3600

COUNTRY_PARAMETER = OpenApiParameter(
    "country", OpenApiTypes.STR, description="Code ISO du pays (ex. BJ)"
)


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
class ReferentialListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    pagination_class = None
    filter_backends = []

    def get_queryset(self):
        return self.serializer_class.Meta.model.objects.filter(active=True)


class CountryListView(ReferentialListView):
    serializer_class = serializers.CountrySerializer


class CountryFilteredListView(ReferentialListView):
    def get_queryset(self):
        queryset = super().get_queryset().filter(country__active=True)
        country = self.request.query_params.get("country")
        return queryset.filter(country_id=country.upper()) if country else queryset


@extend_schema_view(get=extend_schema(parameters=[COUNTRY_PARAMETER]))
class PaymentNetworkListView(CountryFilteredListView):
    """Réseaux Mobile Money activés (D76), lus par le formulaire de paiement."""

    serializer_class = serializers.PaymentNetworkSerializer

    def get_queryset(self):
        return super().get_queryset().filter(enabled=True)


@extend_schema_view(get=extend_schema(parameters=[COUNTRY_PARAMETER]))
class LocalityListView(CountryFilteredListView):
    serializer_class = serializers.LocalitySerializer


class SchoolGradeListView(ReferentialListView):
    serializer_class = serializers.SchoolGradeSerializer


class GoalListView(ReferentialListView):
    serializer_class = serializers.GoalSerializer


class AvatarListView(ReferentialListView):
    serializer_class = serializers.AvatarSerializer


class DisabilityListView(ReferentialListView):
    serializer_class = serializers.DisabilitySerializer


class RelationshipListView(ReferentialListView):
    serializer_class = serializers.RelationshipSerializer


class RefusalReasonListView(ReferentialListView):
    serializer_class = serializers.RefusalReasonSerializer
