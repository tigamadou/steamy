"""Domaine `accounts` : « À valider » du parent (WPD01, D52). Règles : `apps/accounts/pending_actions.py`."""

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts import pending_actions as service
from libs.permissions import IsParent

TYPES = (
    ("consent", "Consentement (WPD05)"),
    ("payment_request", "Demande de paiement (WPD15)"),
    ("event_application", "Candidature à un événement (WPD06)"),
    ("deletion_request", "Demande de suppression (WPD09)"),
)


class PendingActionSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=TYPES)
    id = serializers.CharField(help_text="Identifiant de la demande, dans son type")
    child_id = serializers.IntegerField(
        allow_null=True,
        help_text="Enfant rattaché ; null pour un consentement (pas encore de lien)",
    )
    child_first_name = serializers.CharField()
    child_last_name = serializers.CharField()
    created_at = serializers.DateTimeField()
    url = serializers.CharField(help_text="Route du front où traiter la demande")


class PendingActionsView(APIView):
    """WPD01 « À valider » : toutes les demandes en attente, la plus récente d'abord (liste non paginée)."""

    permission_classes = [IsParent]

    @extend_schema(responses=PendingActionSerializer(many=True))
    def get(self, request):
        actions = service.for_parent(request.user)
        return Response(PendingActionSerializer(actions, many=True).data)
