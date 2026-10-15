"""
Domaine `accounts` : décision du parent sur les demandes de consentement (WP01 prérempli, WP04, WP05, WP06, WP11,
WP12). Règles : `apps/accounts/consent.py`.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts import consent as service
from apps.accounts import signup as signup_service
from apps.accounts.models import ConsentRequest
from apps.accounts.otp import client_ip
from apps.referentials.models import RefusalReason
from apps.referentials.serializers import RefusalReasonSerializer, RelationshipSerializer
from libs.errors import ApiError
from libs.permissions import IsParent
from libs.phone import mask_phone

from .learner_signup import ConsentRequestStateSerializer, LearnerConsentRequestSerializer
from .session import enforce_csrf


class TokenSerializer(serializers.Serializer):
    token = serializers.CharField(
        max_length=128, help_text="Jeton du lien SMS /consentement/<jeton>"
    )


class ConsentPreviewSerializer(serializers.Serializer):
    """Ce que montre le lien SMS avant toute connexion : le numéro masqué, rien de l'enfant."""

    parent_phone_masked = serializers.CharField()


class ConsentRequestSerializer(serializers.ModelSerializer):
    """Demande vue par le parent (WP04, WP05) : seulement ce qui existe à ce stade (D20)."""

    status = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    relationship = RelationshipSerializer(read_only=True)
    refusal_reason = RefusalReasonSerializer(read_only=True, allow_null=True)

    class Meta:
        model = ConsentRequest
        fields = (
            "id",
            "origin",
            "status",
            "first_name",
            "last_name",
            "username",
            "age",
            "relationship",
            "created_at",
            "expires_at",
            "resolved_at",
            "refusal_reason",
            "refusal_note",
        )
        read_only_fields = fields

    @staticmethod
    def _subject(consent, key):
        return consent.subject.get(key)

    def get_status(self, consent) -> str:
        return service.effective_status(consent)

    def get_first_name(self, consent) -> str:
        return self._subject(consent, "first_name") or ""

    def get_last_name(self, consent) -> str:
        return self._subject(consent, "last_name") or ""

    def get_username(self, consent) -> str | None:
        return self._subject(consent, "username")

    def get_age(self, consent) -> int | None:
        return self._subject(consent, "age")


class RefuseSerializer(serializers.Serializer):
    reason = serializers.SlugRelatedField(
        slug_field="code",
        queryset=RefusalReason.objects.filter(active=True),
        help_text="Motif obligatoire (référentiel `refusal-reasons`)",
    )
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")


STATUS_FILTER = OpenApiParameter(
    "status", str, enum=ConsentRequest.Status.values, description="Filtre sur le statut"
)


class ConsentRequestViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Demandes adressées au numéro vérifié du parent connecté. `create` et `resend` servent l'enfant pendant son
    inscription (session « inscription en cours », sans compte connecté) ; `preview`, le lien SMS avant connexion.
    """

    serializer_class = ConsentRequestSerializer
    permission_classes = [IsParent]
    filter_backends = []
    lookup_value_regex = r"\d+"
    #: Actions ouvertes sans connexion, et leur plafond (S9).
    PUBLIC_THROTTLES = {"create": "signup", "resend": "otp", "preview": "consent-preview"}

    def get_permissions(self):
        if self.action in self.PUBLIC_THROTTLES:
            return [AllowAny()]
        return super().get_permissions()

    def get_throttles(self):
        self.throttle_scope = self.PUBLIC_THROTTLES.get(self.action)
        return super().get_throttles()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ConsentRequest.objects.none()
        return service.for_parent(self.request.user)

    @extend_schema(parameters=[STATUS_FILTER])
    def list(self, request, *args, **kwargs):
        """WP04, WPD01 : demandes reçues, les plus récentes d'abord."""
        queryset = self.get_queryset()
        wanted = request.query_params.get("status")
        if wanted:
            queryset = [c for c in queryset if service.effective_status(c) == wanted]
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @extend_schema(request=None, responses=ConsentRequestSerializer)
    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """WP05 « Accepter » → WP06 : l'enfant est rattaché au parent et peut choisir son mot de passe (W10)."""
        consent = service.accept(pk, request.user, request=request)
        return Response(self.get_serializer(consent).data)

    @extend_schema(request=RefuseSerializer, responses=ConsentRequestSerializer)
    @action(detail=True, methods=["post"])
    def refuse(self, request, pk=None):
        """WP11 → WP12 : motif obligatoire. Le compte en attente de l'enfant est supprimé (D22)."""
        serializer = RefuseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consent = service.refuse(
            pk,
            request.user,
            serializer.validated_data["reason"],
            serializer.validated_data["note"],
            request=request,
        )
        return Response(self.get_serializer(consent).data)

    @extend_schema(request=TokenSerializer, responses=ConsentRequestSerializer)
    @action(detail=False, methods=["post"])
    def claim(self, request):
        """Lien SMS ouvert par le parent connecté : numéro concordant exigé (`CONSENT_PHONE_MISMATCH`)."""
        serializer = TokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consent = service.claim(serializer.validated_data["token"], request.user)
        return Response(self.get_serializer(consent).data)

    @extend_schema(
        request=LearnerConsentRequestSerializer,
        responses={201: ConsentRequestStateSerializer},
        auth=[],
    )
    def create(self, request):
        """W06 : l'enfant envoie la demande à son parent (SMS avec lien à jeton). Réservé à l'inscription en cours."""
        enforce_csrf(request)
        signup = signup_service.signup_from_session(request)
        serializer = LearnerConsentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consent = signup_service.create_learner_consent_request(
            signup,
            serializer.validated_data["parent_phone"],
            serializer.validated_data["relationship"],
            client_ip(request),
        )
        request.session[signup_service.CONSENT_SESSION_KEY] = consent.pk
        return Response(ConsentRequestStateSerializer(consent).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses=ConsentRequestStateSerializer, auth=[])
    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None):
        """W07 « Renvoyer le SMS » : nouveau lien (seul le dernier vaut), 60 s au moins entre deux envois."""
        enforce_csrf(request)
        signup = signup_service.signup_from_session(request)
        consent = signup.learner.consent_requests.filter(pk=pk).first()
        if consent is None:
            raise ApiError("NOT_FOUND")
        consent = signup_service.resend_consent_request(consent, client_ip(request))
        return Response(ConsentRequestStateSerializer(consent).data)

    @extend_schema(request=TokenSerializer, responses=ConsentPreviewSerializer, auth=[])
    @action(detail=False, methods=["post"])
    def preview(self, request):
        """WP01 depuis le lien SMS : numéro masqué pour guider le parent, aucune donnée de l'enfant."""
        enforce_csrf(request)
        serializer = TokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consent = service.find_by_token(serializer.validated_data["token"])
        service.ensure_open(consent)
        return Response({"parent_phone_masked": mask_phone(consent.parent_phone)})
