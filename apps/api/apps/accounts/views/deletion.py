"""
Domaine `accounts` : suppression de compte (WD15, WPD01, WPD02, WPD08, WPD09 ; D40, D54). Règles :
`apps/accounts/deletion.py`.
"""

from django.contrib.auth import logout
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts import deletion as service
from apps.accounts.models import DeletionRequest
from apps.referentials.models import DeletionReason
from apps.referentials.serializers import DeletionReasonSerializer
from libs.errors import ApiError
from libs.permissions import IsParent


class DeletionRequestSerializer(serializers.ModelSerializer):
    """Demande de suppression ; `accountId` : le compte concerné (l'enfant, pour le parent)."""

    account_id = serializers.IntegerField(source="user_id", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    reason = DeletionReasonSerializer(read_only=True, allow_null=True)
    requested_by_learner = serializers.SerializerMethodField(
        help_text="Demande faite par l'apprenant lui-même (WD15), à valider par le parent"
    )

    class Meta:
        model = DeletionRequest
        fields = (
            "id",
            "account_id",
            "first_name",
            "status",
            "reason",
            "note",
            "requested_by_learner",
            "scheduled_for",
            "created_at",
            "resolved_at",
        )
        read_only_fields = fields

    def get_requested_by_learner(self, deletion) -> bool:
        return deletion.requested_by_id == deletion.user_id and deletion.user.is_learner


class DeletionRequestCreateSerializer(serializers.Serializer):
    reason = serializers.SlugRelatedField(
        slug_field="code",
        queryset=DeletionReason.objects.filter(active=True),
        required=False,
        allow_null=True,
        help_text="Motif (référentiel `deletion-reasons`) ; facultatif pour l'apprenant (WD15)",
    )
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")


class ChildDeletionSerializer(DeletionRequestCreateSerializer):
    """WPD09 : motif obligatoire."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["reason"].required = True
        self.fields["reason"].allow_null = False


class MyDeletionRequestView(APIView):
    """
    Suppression du compte connecté. Apprenant (WD15) : demande envoyée au parent, retirable tant qu'elle attend.
    Parent (WPD08) : sans enfant rattaché seulement (`CHILDREN_STILL_LINKED`) ; le compte est désactivé et la
    session fermée aussitôt.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=DeletionRequestSerializer)
    def get(self, request):
        """WD15 : demande en cours (« Demande envoyée à ton parent »), 404 sans demande."""
        deletion = request.user.deletion_requests.select_related("reason", "user").first()
        if deletion is None:
            raise ApiError("NOT_FOUND")
        return Response(DeletionRequestSerializer(deletion).data)

    @extend_schema(
        request=DeletionRequestCreateSerializer, responses={201: DeletionRequestSerializer}
    )
    def post(self, request):
        serializer = DeletionRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        deletion = service.request_own(user, **serializer.validated_data, request=request)
        data = DeletionRequestSerializer(deletion).data
        if user.is_parent:
            logout(request)
        return Response(data, status=status.HTTP_201_CREATED)

    @extend_schema(responses={204: None})
    def delete(self, request):
        """WD15 : l'apprenant retire sa demande tant que son parent ne l'a pas validée."""
        service.cancel_own(request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DeletionRequestViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Demandes de suppression des enfants du parent connecté (WPD01, WPD09 `?demande=<id>`)."""

    serializer_class = DeletionRequestSerializer
    permission_classes = [IsParent]
    filter_backends = []
    lookup_value_regex = r"\d+"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return DeletionRequest.objects.none()
        return service.requests_for_parent(self.request.user)

    @extend_schema(request=None, responses=DeletionRequestSerializer)
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """WPD09 : la demande de l'enfant est validée, son compte désactivé puis anonymisé à J+30."""
        deletion = service.approve(request.user, pk, request=request)
        return Response(self.get_serializer(deletion).data)

    @extend_schema(request=None, responses=DeletionRequestSerializer)
    @action(detail=True, methods=["post"])
    def refuse(self, request, pk=None):
        """WPD01 : refus, notifié à l'enfant."""
        deletion = service.refuse(request.user, pk, request=request)
        return Response(self.get_serializer(deletion).data)
