from rest_framework import generics, permissions

from .serializers import PublicForgotPasswordStep1Serializer


class PublicForgotPasswordStep1View(generics.CreateAPIView):
    throttle_scope = "password-reset"  # S9
    serializer_class = PublicForgotPasswordStep1Serializer
    permission_classes = (permissions.AllowAny,)
