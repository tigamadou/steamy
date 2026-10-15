# apps/analytics/views.py
import csv

from django.core.cache import cache
from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import mixins, permissions, serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import DailyAggregatedStat, Event
from .serializers import EventSerializer

CACHE_TTL = 60  # seconds for simple endpoints (adjust)


class EventViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    Ingestion des événements de télémétrie, en ÉCRITURE SEULE (S3) : personne ne lit, ne
    modifie ni ne supprime les événements par l'API. L'utilisateur est celui de la session,
    jamais une valeur fournie par le client. Plafonné par le throttling global (S9).
    """

    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class DashboardSummarySerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    events_last_7_days = serializers.IntegerField()
    revenue_last_30_days = serializers.FloatField()


@extend_schema(responses=DashboardSummarySerializer)
@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])  # personnel uniquement (S3)
def dashboard_summary(request):
    """
    Exemple d'endpoint "dashboard" qui combine plusieurs métriques.
    On cache la réponse brièvement pour soulager la DB.
    """
    cache_key = "analytics:dashboard_summary_v1"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    # global metrics: total users, total events last 7 days, revenue last 30 days (from DailyAggregatedStat)
    from django.contrib.auth import get_user_model

    User = get_user_model()
    total_users = User.objects.count()

    now = timezone.now().date()
    last7 = now - timezone.timedelta(days=7)
    events_last7 = Event.objects.filter(created_at__date__gte=last7).count()

    revenue_last30 = (
        DailyAggregatedStat.objects.filter(
            metric="revenue", date__gte=now - timezone.timedelta(days=30)
        ).aggregate(total=Sum("value"))["total"]
        or 0
    )

    payload = {
        "total_users": total_users,
        "events_last_7_days": events_last7,
        "revenue_last_30_days": float(revenue_last30),
    }
    cache.set(cache_key, payload, CACHE_TTL)
    return Response(payload)


@extend_schema(
    parameters=[
        OpenApiParameter("start", OpenApiTypes.DATE, description="Par défaut : il y a 7 jours"),
        OpenApiParameter("end", OpenApiTypes.DATE, description="Par défaut : aujourd'hui"),
    ],
    responses={
        (200, "text/csv"): OpenApiResponse(
            OpenApiTypes.BINARY, description="Export CSV des événements"
        )
    },
)
@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])  # personnel uniquement (S3)
def export_events_csv(request):
    # parse_date(None) lève une TypeError : sans paramètre, on prend les 7 derniers jours.
    start = parse_date(request.GET.get("start") or "") or (
        timezone.now().date() - timezone.timedelta(days=7)
    )
    end = parse_date(request.GET.get("end") or "") or timezone.now().date()
    qs = Event.objects.filter(created_at__date__gte=start, created_at__date__lte=end).order_by(
        "created_at"
    )

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="events_{start}_{end}.csv"'

    writer = csv.writer(response)
    writer.writerow(
        ["created_at", "event_type", "entity_type", "entity_id", "user_id", "value", "metadata"]
    )
    for e in qs.iterator():
        writer.writerow(
            [
                e.created_at.isoformat(),
                e.event_type,
                e.entity_type,
                e.entity_id,
                getattr(e.user, "id", None),
                e.value,
                e.metadata,
            ]
        )
    return response
