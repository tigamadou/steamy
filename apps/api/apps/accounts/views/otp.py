"""Domaine `auth` : renvoi d'un code OTP (WP02, WL03). La vérification se fait dans chaque flux."""

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.otp import client_ip, resend_challenge, resend_in_seconds
from apps.core.models import PlatformSettings
from libs.phone import mask_phone

from .session import enforce_csrf


class OtpChallengeSerializer(serializers.Serializer):
    """Défi OTP en cours : sert au compte à rebours de WP02 / WL03."""

    challenge_id = serializers.UUIDField(source="id")
    destination_masked = serializers.SerializerMethodField(
        help_text="Destinataire du code (numéro ou email), masqué"
    )
    expires_in_sec = serializers.SerializerMethodField(help_text="Validité du code (s)")
    resend_in_sec = serializers.SerializerMethodField(
        help_text="Délai avant un renvoi possible (s)"
    )

    def get_destination_masked(self, challenge) -> str:
        return mask_phone(challenge.phone)

    def get_expires_in_sec(self, challenge) -> int:
        return PlatformSettings.load().otp_validity_seconds

    def get_resend_in_sec(self, challenge) -> int:
        return resend_in_seconds(challenge)


class OtpResendSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()


class OtpResendView(APIView):
    """Nouveau code pour un défi en cours (60 s après le précédent, plafonds quotidiens D24)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "otp"

    @extend_schema(request=OtpResendSerializer, responses=OtpChallengeSerializer, auth=[])
    def post(self, request):
        enforce_csrf(request)
        serializer = OtpResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge = resend_challenge(serializer.validated_data["challenge_id"], client_ip(request))
        return Response(OtpChallengeSerializer(challenge).data)
