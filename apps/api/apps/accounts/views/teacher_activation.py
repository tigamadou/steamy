"""Domaine `auth` : activation d'un compte enseignant depuis le lien de l'invitation (C6, S5)."""

from django.contrib.auth import login
from django.middleware.csrf import get_token
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.fields import PasswordField
from apps.classrooms.invitations import accept_invitation, open_invitation
from libs.phone import mask_email

from .me import MeSerializer
from .session import LoginResponseSerializer, enforce_csrf


class TeacherInvitationSerializer(serializers.Serializer):
    """En-tête de l'écran d'activation : école et email masqué."""

    email_masked = serializers.SerializerMethodField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    school_name = serializers.CharField(source="school.name", allow_null=True, default=None)
    expires_at = serializers.DateTimeField()

    def get_email_masked(self, invitation) -> str:
        return mask_email(invitation.email)


class TeacherActivationSerializer(serializers.Serializer):
    password = PasswordField()


class InvitationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "invitation"


class TeacherInvitationView(InvitationView):
    @extend_schema(responses=TeacherInvitationSerializer, auth=[])
    def get(self, request, token):
        """Lien `/activation/<jeton>` : invitation valable, sinon `INVITATION_INVALID`."""
        return Response(TeacherInvitationSerializer(open_invitation(token)).data)


class TeacherInvitationAcceptView(InvitationView):
    @extend_schema(request=TeacherActivationSerializer, responses=LoginResponseSerializer, auth=[])
    def post(self, request, token):
        """Crée le compte enseignant (email de l'invitation, rattaché à l'école) et ouvre la session."""
        enforce_csrf(request)
        serializer = TeacherActivationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        teacher = accept_invitation(token, serializer.validated_data["password"])
        login(request, teacher, backend="apps.accounts.backends.IdentifierBackend")
        return Response({"user": MeSerializer(teacher).data, "csrf_token": get_token(request)})
