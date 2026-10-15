"""
Formulaires publics (§7.7) : anonymes, CSRF exigé (le jeton vient de `GET auth/csrf/`), throttle dédié par IP
(portée `public-form`, S9), champ piège anti-robot, erreurs par champ (D4). Réponse neutre `201 {ok: true}`.
"""

from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from libs.authentication import enforce_csrf

from .serializers import (
    ContactMessageSerializer,
    LeadSerializer,
    QuoteRequestSerializer,
    ReceivedSerializer,
)
from .tasks import notify_team


class PublicFormView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "public-form"
    serializer_class = None
    #: Prévenir l'équipe par email à la réception
    notify = True

    def post(self, request):
        enforce_csrf(request)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not serializer.is_robot:
            submission = serializer.save()
            if self.notify:
                name, pk = submission._meta.model_name, submission.pk
                transaction.on_commit(lambda: notify_team.delay(name, pk))
        return Response({"ok": True}, status=status.HTTP_201_CREATED)


@extend_schema(request=QuoteRequestSerializer, responses={201: ReceivedSerializer}, auth=[])
class QuoteRequestView(PublicFormView):
    """Demande de devis d'un établissement (WL11, D13)."""

    serializer_class = QuoteRequestSerializer


@extend_schema(request=LeadSerializer, responses={201: ReceivedSerializer}, auth=[])
class LeadView(PublicFormView):
    """Inscription à la newsletter (WL20, D14), réservée aux adultes (C12). Un email déjà inscrit : même réponse."""

    serializer_class = LeadSerializer
    notify = False


@extend_schema(request=ContactMessageSerializer, responses={201: ReceivedSerializer}, auth=[])
class ContactMessageView(PublicFormView):
    """Formulaire de contact (WL24, D17)."""

    serializer_class = ContactMessageSerializer
