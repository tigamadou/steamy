from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Profile

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["bio", "avatar", "country", "phone"]


class UserSignupSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ["id", "email", "password", "role", "profile"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", None)
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)

        if profile_data:
            Profile.objects.create(user=user, **profile_data)

        return user

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if hasattr(instance, "profile"):
            rep["profile"] = ProfileSerializer(instance.profile).data
        return rep
