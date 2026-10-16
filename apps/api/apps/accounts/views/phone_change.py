"""Domaine `accounts` : changement du numéro du parent (WPD08, D24). Règles : `apps/accounts/phone_change.py`."""

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts import phone_change as service
from apps.accounts.fields import PhoneField
from apps.accounts.otp import client_ip
from libs.permissions import IsParent

from .me import MeSerializer
from .otp import OtpChallengeSerializer
from .parent_signup import OtpVerifySerializer


class PhoneChangeSerializer(serializers.Serializer):
    phone = PhoneField(help_text="Nouveau numéro, saisi librement ; normalisé en E.164")
    password = serializers.CharField(trim_whitespace=False, help_text="Mot de passe actuel")

    def validate_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mot de passe incorrect.", code="INVALID_CREDENTIALS")
        return value


class PhoneChangeView(APIView):
    """Envoie un code au nouveau numéro ; le renvoi passe par `auth/otp/resend/`."""

    permission_classes = [IsParent]
    throttle_scope = "otp"

    @extend_schema(request=PhoneChangeSerializer, responses=OtpChallengeSerializer)
    def post(self, request):
        serializer = PhoneChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        challenge = service.start(
            request.user, serializer.validated_data["phone"], client_ip(request)
        )
        return Response(OtpChallengeSerializer(challenge).data)


class PhoneChangeVerifyView(APIView):
    """Code valide : le numéro de connexion est remplacé."""

    permission_classes = [IsParent]
    throttle_scope = "otp"

    @extend_schema(request=OtpVerifySerializer, responses=MeSerializer)
    def post(self, request):
        serializer = OtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = service.verify(
            request.user,
            serializer.validated_data["challenge_id"],
            serializer.validated_data["code"],
            request=request,
        )
        return Response(MeSerializer(user).data)
