# apps/analytics/views.py
import csv

from django.core.cache import cache
from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import DailyAggregatedStat, Event
from .serializers import EventSerializer

CACHE_TTL = 60  # seconds for simple endpoints (adjust)


class EventViewSet(viewsets.ModelViewSet):
    """
    Endpoint d'ingestion d'événements. Permission : authenticated or AllowAny depending required.
    Clients (frontend/mobile/backend) envoient les events ici.
    """

    queryset = Event.objects.all().order_by("-created_at")
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny]  # souvent public, mais tu peux limiter

    def create(self, request, *args, **kwargs):
        # Option: enrichir metadata serveur-side (IP, UA parsing)
        data = request.data.copy()
        # inject user if authenticated
        if request.user and request.user.is_authenticated:
            data["user"] = request.user.id
        ser = self.get_serializer(data=data)
        ser.is_valid(raise_exception=True)
        self.perform_create(ser)
        return Response(ser.data, status=status.HTTP_201_CREATED)


class DashboardSummarySerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    events_last_7_days = serializers.IntegerField()
    revenue_last_30_days = serializers.FloatField()


@extend_schema(responses=DashboardSummarySerializer)
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
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
@permission_classes([permissions.IsAuthenticated])
def export_events_csv(request):
    start = parse_date(request.GET.get("start")) or (
        timezone.now().date() - timezone.timedelta(days=7)
    )
    end = parse_date(request.GET.get("end")) or timezone.now().date()
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
