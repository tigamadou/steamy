"""Domaine `auth` : mot de passe oublié (WL02-WL05). Règles : `apps/accounts/password_reset.py`."""

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts import password_reset as service
from apps.accounts.fields import PasswordField
from apps.accounts.otp import client_ip

from .otp import OtpChallengeSerializer
from .parent_signup import OtpVerifySerializer
from .session import enforce_csrf


class PasswordResetRequestSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        max_length=255, help_text="Numéro du parent ou email de l'enseignant (C7)"
    )


class ResetTokenSerializer(serializers.Serializer):
    reset_token = serializers.CharField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    reset_token = serializers.CharField(max_length=128)
    password = PasswordField()


class PasswordResetView(APIView):
    """WL02 : réponse identique que le compte existe ou non. Un identifiant d'apprenant est refusé (D26)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "password-reset"

    @extend_schema(
        request=PasswordResetRequestSerializer, responses=OtpChallengeSerializer, auth=[]
    )
    def post(self, request):
        enforce_csrf(request)
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge = service.request_reset(
            serializer.validated_data["identifier"], client_ip(request)
        )
        return Response(OtpChallengeSerializer(challenge).data)


class PasswordResetVerifyView(APIView):
    """WL03 : code valide → `resetToken` (15 min, usage unique)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "otp"

    @extend_schema(request=OtpVerifySerializer, responses=ResetTokenSerializer, auth=[])
    def post(self, request):
        enforce_csrf(request)
        serializer = OtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = service.issue_token(
            serializer.validated_data["challenge_id"], serializer.validated_data["code"]
        )
        return Response({"reset_token": token})


class PasswordResetConfirmView(APIView):
    """WL04 → WL05 : nouveau mot de passe (D25) ; les sessions ouvertes ailleurs sont fermées."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "password-reset"

    @extend_schema(request=PasswordResetConfirmSerializer, responses={204: None}, auth=[])
    def post(self, request):
        enforce_csrf(request)
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service.confirm_reset(
            serializer.validated_data["reset_token"], serializer.validated_data["password"]
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
