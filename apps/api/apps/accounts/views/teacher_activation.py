"""
Domaine `auth` : activation d'un compte enseignant depuis le lien de l'invitation (C6, S5).

Le jeton voyage dans le corps des requêtes (`lookup/`, `accept/`), jamais dans le chemin : il reste hors des journaux
d'accès. Les anciennes routes `<jeton>/` et `<jeton>/accept/` restent le temps du déploiement (front précédent),
dépréciées et masquées dans les journaux (`libs/access_log.py`).
"""

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


class InvitationTokenSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=128, trim_whitespace=True)


class TeacherInvitationAcceptSerializer(InvitationTokenSerializer, TeacherActivationSerializer):
    pass


class InvitationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "invitation"


def activate(request, token: str, password: str) -> Response:
    """Crée le compte enseignant (email de l'invitation, rattaché à l'école) et ouvre la session."""
    teacher = accept_invitation(token, password)
    login(request, teacher, backend="apps.accounts.backends.IdentifierBackend")
    return Response({"user": MeSerializer(teacher).data, "csrf_token": get_token(request)})


class TeacherInvitationLookupView(InvitationView):
    @extend_schema(
        request=InvitationTokenSerializer, responses=TeacherInvitationSerializer, auth=[]
    )
    def post(self, request):
        """Écran `/activation` : invitation valable pour le jeton du lien, sinon `INVITATION_INVALID`."""
        serializer = InvitationTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = open_invitation(serializer.validated_data["token"])
        return Response(TeacherInvitationSerializer(invitation).data)


class TeacherInvitationTokenAcceptView(InvitationView):
    @extend_schema(
        request=TeacherInvitationAcceptSerializer, responses=LoginResponseSerializer, auth=[]
    )
    def post(self, request):
        """Crée le compte enseignant et ouvre la session ; jeton et mot de passe dans le corps."""
        enforce_csrf(request)
        serializer = TeacherInvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return activate(request, data["token"], data["password"])


class TeacherInvitationView(InvitationView):
    @extend_schema(
        responses=TeacherInvitationSerializer,
        auth=[],
        deprecated=True,
        operation_id="auth_teacher_invitations_legacy_retrieve",
    )
    def get(self, request, token):
        """Lien `/activation/<jeton>` : invitation valable, sinon `INVITATION_INVALID`."""
        return Response(TeacherInvitationSerializer(open_invitation(token)).data)


class TeacherInvitationAcceptView(InvitationView):
    @extend_schema(
        request=TeacherActivationSerializer,
        responses=LoginResponseSerializer,
        auth=[],
        deprecated=True,
        operation_id="auth_teacher_invitations_legacy_accept",
    )
    def post(self, request, token):
        """Ancienne route (jeton dans le chemin) : préférer `teacher-invitations/accept/`."""
        enforce_csrf(request)
        serializer = TeacherActivationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return activate(request, token, serializer.validated_data["password"])
