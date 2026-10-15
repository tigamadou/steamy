"""
Authentification par session (cookie `sessionid`, HttpOnly), utilisée par le front web (ADR 0001).

Toute requête qui modifie des données renvoie le jeton CSRF dans l'en-tête X-CSRFToken ; on l'obtient avec la vue
CSRF, qui pose aussi le cookie `csrftoken`.
"""

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from libs.errors import ApiError


def enforce_csrf(request):
    # DRF ne vérifie le CSRF que pour les sessions déjà ouvertes : on l'impose aussi sur le login (attaque de
    # « login CSRF ») et le logout.
    SessionAuthentication().enforce_csrf(request)


class CsrfTokenSerializer(serializers.Serializer):
    csrf_token = serializers.CharField()


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        help_text="Identifiant, numéro de téléphone ou email (C7)", max_length=255
    )
    password = serializers.CharField(style={"input_type": "password"}, trim_whitespace=False)


class LoginResponseSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    # Django renouvelle le jeton CSRF à la connexion
    csrf_token = serializers.CharField()


class CsrfView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=CsrfTokenSerializer, auth=[])
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({"csrf_token": get_token(request)})


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses=LoginResponseSerializer, auth=[])
    def post(self, request):
        enforce_csrf(request)
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, **serializer.validated_data)
        if user is None:
            raise ApiError("INVALID_CREDENTIALS")
        login(request, user)  # change la clé de session (pas de fixation de session)
        return Response({"user_id": user.id, "csrf_token": get_token(request)})


class LogoutView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        enforce_csrf(request)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
