"""
Steamy Events en lecture (§7.6) : anonymes, publiés seulement, indépendants de la session et cachables (§1.2).
Les candidatures arrivent en API-L3b.6.
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.classrooms.services import teacher_classrooms
from libs.errors import ApiError
from libs.permissions import IsTeacher

from .models import SteamyEvent
from .proposals import propose
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


class ProposalRequestSerializer(serializers.Serializer):
    classroom_id = serializers.IntegerField(help_text="Une classe de l'enseignant connecté")


class ProposalSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    event = serializers.SlugField(source="event.slug")
    classroom_id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    notified_count = serializers.IntegerField(help_text="Élèves actifs et parents notifiés")


class EventProposalView(generics.GenericAPIView):
    """
    WT09 « Proposer à une classe » : notifie les élèves actifs et leurs parents (notification seulement, S8).
    `EVENT_ALREADY_PROPOSED` si la classe l'a déjà reçu, `EVENT_CLOSED` après la fin des candidatures.
    """

    permission_classes = [IsTeacher]
    filter_backends = []
    serializer_class = ProposalSerializer

    @extend_schema(request=ProposalRequestSerializer, responses={201: ProposalSerializer})
    def post(self, request, slug):
        payload = ProposalRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        event = get_object_or_404(
            SteamyEvent.objects.filter(status=SteamyEvent.Status.PUBLISHED), slug=slug
        )
        classroom = (
            teacher_classrooms(request.user)
            .filter(pk=payload.validated_data["classroom_id"])
            .first()
        )
        if classroom is None:
            raise ApiError("NOT_FOUND", fields={"classroomId": "NOT_FOUND"})
        proposal, notified = propose(event, classroom, request.user)
        proposal.notified_count = notified
        return Response(ProposalSerializer(proposal).data, status=status.HTTP_201_CREATED)
