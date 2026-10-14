"""
Authentification par session (cookie `sessionid`), utilisée par le front web.

Le cookie est posé sur le domaine parent partagé (COOKIE_DOMAIN), HttpOnly.
Toute requête qui modifie des données doit renvoyer le jeton CSRF dans l'en-tête
X-CSRFToken : on l'obtient avec GET /api/public/user/csrf (qui pose aussi le cookie
`csrftoken`).

Le login par token (/api/public/user/login) reste disponible pour les autres clients.
"""
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.user.endpoints.public.login.serializers import CustomAuthTokenSerializer

from .serializers import CsrfTokenSerializer, SessionLoginResponseSerializer


def enforce_csrf(request):
    # DRF ne vérifie le CSRF que pour les utilisateurs déjà connectés par session :
    # on l'impose aussi sur le login (attaque de « login CSRF ») et le logout.
    SessionAuthentication().enforce_csrf(request)


class CsrfView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=CsrfTokenSerializer, auth=[])
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({"csrf_token": get_token(request)})


class SessionLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=CustomAuthTokenSerializer, responses=SessionLoginResponseSerializer, auth=[])
    def post(self, request):
        enforce_csrf(request)
        serializer = CustomAuthTokenSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        return Response({"user_id": user.id, "csrf_token": get_token(request)})


class SessionLogoutView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        enforce_csrf(request)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
