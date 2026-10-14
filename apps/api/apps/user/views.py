from django.contrib.auth import get_user_model
from rest_framework import generics, permissions

from .serializers import UserSignupSerializer

User = get_user_model()


class UserSignupView(generics.CreateAPIView):
    serializer_class = UserSignupSerializer
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
