"""
Steamy Events en lecture (§7.6) : anonymes, publiés seulement, indépendants de la session et cachables (§1.2).
Les candidatures arrivent en API-L3b.6.
"""

from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny

from .models import SteamyEvent
from .serializers import SteamyEventDetailSerializer, SteamyEventSerializer

CACHE_SECONDS = 300


class EventQuerySerializer(serializers.Serializer):
    upcoming = serializers.BooleanField(
        required=False,
        allow_null=True,
        default=None,
        help_text="true : à venir ou en cours (du plus proche au plus lointain) ; "
        "false : passés (du plus récent au plus ancien) ; absent : tous",
    )


class PublicEventMixin:
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = []

    def get_queryset(self):
        return SteamyEvent.objects.filter(status=SteamyEvent.Status.PUBLISHED)


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
@extend_schema(parameters=[EventQuerySerializer])
class EventListView(PublicEventMixin, generics.ListAPIView):
    """Événements publiés (WL21, WD10, WPD06, WT09), paginés."""

    serializer_class = SteamyEventSerializer

    def get_queryset(self):
        params = EventQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        upcoming = params.validated_data["upcoming"]
        queryset = super().get_queryset()
        if upcoming is True:
            return queryset.filter(ends_at__gt=timezone.now()).order_by("starts_at")
        if upcoming is False:
            return queryset.filter(ends_at__lte=timezone.now()).order_by("-starts_at")
        return queryset.order_by("starts_at")


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
class EventDetailView(PublicEventMixin, generics.RetrieveAPIView):
    """Fiche événement (WL23) ; un brouillon répond 404."""

    serializer_class = SteamyEventDetailSerializer
    lookup_field = "slug"
