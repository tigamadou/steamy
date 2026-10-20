"""
Steamy Events en lecture (§7.6) : anonymes, publiés seulement, indépendants de la session et cachables (§1.2).
Candidatures et tickets (API-L3b.6) : connectés, apprenant ou parent, jamais de candidature d'autrui.
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import ParentChildLink
from apps.classrooms.services import teacher_classrooms
from libs.errors import ApiError
from libs.permissions import IsLearner, IsParent, IsTeacher

from .applications import accept, apply, children_of, refuse
from .models import EventApplication, EventTicket, SteamyEvent
from .proposals import propose
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationSerializer,
    SteamyEventDetailSerializer,
    SteamyEventSerializer,
    TicketSerializer,
)

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


# --- Candidatures et tickets (API-L3b.6) ---------------------------------------------------------


class IsLearnerOrParent(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        user = request.user
        return super().has_permission(request, view) and (user.is_learner or user.is_parent)


class ApplicationCreateView(APIView):
    """
    `POST events/{slug}/applications/` (WD11, WPD12). Apprenant : candidature en attente de son parent. Parent
    (`childId` d'un de ses enfants) : accord immédiat ; payant et sans ticket → place réservée et `orderReference`
    à payer par `POST payments/orders/{reference}/payments/`. Codes : `EVENT_CLOSED`, `EVENT_FULL`,
    `ALREADY_APPLIED`.
    """

    permission_classes = [IsLearnerOrParent]

    @extend_schema(request=ApplicationCreateSerializer, responses={201: ApplicationSerializer})
    def post(self, request, slug):
        event = SteamyEvent.objects.filter(slug=slug, status=SteamyEvent.Status.PUBLISHED).first()
        if event is None:
            raise ApiError("NOT_FOUND")
        data = ApplicationCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        if request.user.is_learner:
            learner = request.user
        else:
            link = ParentChildLink.objects.filter(
                parent=request.user, learner_id=values.get("child_id")
            ).select_related("learner")
            if not link.exists():
                raise ApiError("NOT_FOUND", fields={"childId": "NOT_FOUND"})
            learner = link.get().learner
        application, _ = apply(
            event,
            learner,
            applied_by=request.user,
            motivation=values["motivation"],
            self_level=values["self_level"],
        )
        return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


class ApplicationListView(generics.ListAPIView):
    """`GET events/applications/` (WD10, WPD06) : les siennes (apprenant), celles de ses enfants (parent)."""

    permission_classes = [IsLearnerOrParent]
    serializer_class = ApplicationSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = EventApplication.objects.select_related("event", "learner")
        if not user.is_authenticated:  # génération du schéma OpenAPI
            return queryset.none()
        if user.is_learner:
            return queryset.filter(learner=user)
        return queryset.filter(learner_id__in=children_of(user))


class TicketListView(generics.ListAPIView):
    """`GET events/tickets/` (WJ07, WD10, WD11) : tickets de l'apprenant, utilisés ou non."""

    permission_classes = [IsLearner]
    serializer_class = TicketSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        queryset = EventTicket.objects.select_related("enrollment__course", "used_by__event")
        if not user.is_authenticated:  # génération du schéma OpenAPI
            return queryset.none()
        return queryset.filter(learner=user)


class ApplicationRefuseSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class ApplicationAcceptView(APIView):
    """
    `POST events/applications/{id}/accept/` (WPD06, D53) : gratuit ou ticket → confirmée ; payant → place réservée
    et commande d'événement (`orderReference`) à payer par le parent. L'apprenant ne décide jamais (S8).
    """

    permission_classes = [IsParent]

    @extend_schema(request=None, responses=ApplicationSerializer)
    def post(self, request, pk):
        application, _order = accept(request.user, pk)
        return Response(ApplicationSerializer(application).data)


class ApplicationRefuseView(APIView):
    """`POST events/applications/{id}/refuse/` (WPD06) : motif facultatif, l'enfant est prévenu."""

    permission_classes = [IsParent]

    @extend_schema(request=ApplicationRefuseSerializer, responses=ApplicationSerializer)
    def post(self, request, pk):
        body = ApplicationRefuseSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        application = refuse(request.user, pk, body.validated_data["reason"])
        return Response(ApplicationSerializer(application).data)


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
