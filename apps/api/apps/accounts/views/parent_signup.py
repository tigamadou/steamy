"""
Domaine `auth` : inscription du parent (WP01-WP03, S4, C13).

1. `POST auth/parent-signup/` : un code part **dans tous les cas**, même si le numéro est déjà inscrit (C13).
2. `POST auth/parent-signup/verify/` : code valide → `existingAccount` (compte existant → connexion W16).
3. `POST auth/parent-signup/password/` : le compte n'est créé qu'ici, après un code valide, puis connecté.

Entre les étapes, le défi vérifié est gardé dans la session Django (cookie `sessionid`) : le front ne manipule
aucun jeton. Aucun champ `role` n'est lu : le rôle est fixé par le flux (S1).
"""

from datetime import timedelta

from django.contrib.auth import login
from django.db import IntegrityError, transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.fields import AcceptedField, PasswordField, PhoneField
from apps.accounts.models import OtpChallenge, ParentProfile, User
from apps.accounts.otp import client_ip, start_challenge, verify_challenge
from libs.errors import ApiError

from .me import MeSerializer
from .otp import OtpChallengeSerializer
from .session import LoginResponseSerializer, enforce_csrf

SESSION_KEY = "parent_signup_challenge"
#: Délai pour choisir le mot de passe après la vérification du numéro.
PASSWORD_WINDOW = timedelta(minutes=30)
PURPOSE = OtpChallenge.Purpose.PARENT_SIGNUP


class ParentSignupSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = PhoneField(help_text="Numéro du parent, saisi librement ; normalisé en E.164")
    privacy_accepted = AcceptedField()


class OtpVerifySerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    code = serializers.CharField(max_length=12)


class ParentSignupVerifyResponseSerializer(serializers.Serializer):
    existing_account = serializers.BooleanField(
        help_text="Numéro déjà inscrit : aller à la connexion (W16) au lieu de créer un compte"
    )


class PasswordSerializer(serializers.Serializer):
    password = PasswordField()


class ParentSignupView(APIView):
    """WP01 : envoie un code au numéro. Réponse identique que le numéro soit inscrit ou non (C13)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "signup"

    @extend_schema(request=ParentSignupSerializer, responses=OtpChallengeSerializer, auth=[])
    def post(self, request):
        enforce_csrf(request)
        serializer = ParentSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        challenge = start_challenge(
            data["phone"],
            PURPOSE,
            client_ip(request),
            data={"first_name": data["first_name"], "last_name": data["last_name"]},
        )
        request.session.pop(SESSION_KEY, None)
        return Response(OtpChallengeSerializer(challenge).data)


class ParentSignupVerifyView(APIView):
    """WP02 : vérifie le code. Le numéro est alors prouvé : on peut dire s'il a déjà un compte (C13)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "otp"

    @extend_schema(
        request=OtpVerifySerializer, responses=ParentSignupVerifyResponseSerializer, auth=[]
    )
    def post(self, request):
        enforce_csrf(request)
        serializer = OtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge = verify_challenge(
            serializer.validated_data["challenge_id"], serializer.validated_data["code"], [PURPOSE]
        )
        existing = User.objects.filter(phone=challenge.phone).exists()
        if existing:
            request.session.pop(SESSION_KEY, None)
        else:
            request.session[SESSION_KEY] = str(challenge.pk)
        return Response({"existing_account": existing})


class ParentSignupPasswordView(APIView):
    """WP03 : crée le compte parent avec le numéro vérifié, puis ouvre la session."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "signup-step"

    @extend_schema(request=PasswordSerializer, responses=LoginResponseSerializer, auth=[])
    def post(self, request):
        enforce_csrf(request)
        challenge = self._verified_challenge(request)
        serializer = PasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = User.objects.create_parent(
                    challenge.phone,
                    serializer.validated_data["password"],
                    first_name=challenge.data.get("first_name", ""),
                    last_name=challenge.data.get("last_name", ""),
                )
                ParentProfile.objects.create(user=user)
                challenge.delete()
        except IntegrityError:
            # Inscrit entre-temps par un autre onglet : le numéro est prouvé, on peut le dire.
            raise ApiError("PHONE_TAKEN") from None
        request.session.pop(SESSION_KEY, None)
        login(request, user, backend="apps.accounts.backends.IdentifierBackend")
        return Response({"user": MeSerializer(user).data, "csrf_token": get_token(request)})

    @staticmethod
    def _verified_challenge(request) -> OtpChallenge:
        challenge = OtpChallenge.objects.filter(
            pk=request.session.get(SESSION_KEY),
            purpose=PURPOSE,
            verified_at__gt=timezone.now() - PASSWORD_WINDOW,
        ).first()
        if challenge is None:
            raise ApiError(
                "SIGNUP_EXPIRED",
                "La vérification de votre numéro a expiré. Recommencez l'inscription.",
            )
        return challenge
