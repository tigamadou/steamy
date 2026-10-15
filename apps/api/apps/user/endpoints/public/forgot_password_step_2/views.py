from rest_framework import generics, permissions

from .serializers import PublicForgotPasswordStep2Serializer


class PublicForgotPasswordStep2View(generics.CreateAPIView):
    throttle_scope = "password-reset"  # S9
    serializer_class = PublicForgotPasswordStep2Serializer
    permission_classes = (permissions.AllowAny,)
