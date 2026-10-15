from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import User


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "role", "status", "username", "phone", "email", "first_name", "last_name")
        read_only_fields = fields


class MeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user
