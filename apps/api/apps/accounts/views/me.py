"""Domaine `accounts` : le compte connecté (`accounts/me/`)."""

from django.contrib.auth import password_validation, update_session_auth_hash
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import exceptions, generics, serializers, status
from rest_framework.fields import get_error_detail
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import ParentProfile, User
from apps.accounts.profile import ProfileStep, profile_step
from apps.referentials.serializers import AvatarSerializer, SchoolGradeSerializer
from libs.errors import message_for


class LearnerCountersSerializer(serializers.Serializer):
    active_enrollments = serializers.IntegerField()
    completed_enrollments = serializers.IntegerField()
    certificates = serializers.IntegerField()
    badges = serializers.IntegerField()
    wishlist = serializers.IntegerField(help_text="Parcours dans « Mes souhaits »")


class MeSerializer(serializers.ModelSerializer):
    """Identité et rôle du compte connecté : sert aux shells, à la redirection après W16 et aux gardes (§7.3)."""

    profile_step = serializers.SerializerMethodField(
        help_text="Étape de profil restante (W11-W14, WP07-WP09), null si le profil est complet"
    )
    avatar = serializers.SerializerMethodField(help_text="Avatar de l'apprenant (shell)")
    school_grade = serializers.SerializerMethodField(help_text="Classe de l'apprenant (shell)")
    city = serializers.SerializerMethodField(help_text="Ville de l'apprenant ou du parent (shell)")
    is_staff = serializers.BooleanField(read_only=True)
    otp_verified = serializers.SerializerMethodField()
    staff_groups = serializers.SerializerMethodField()
    counters = serializers.SerializerMethodField(
        help_text="Compteurs du shell de l'apprenant (parcours, certificats, badges), null pour les autres rôles"
    )

    class Meta:
        model = User
        fields = (
            "id",
            "role",
            "status",
            "username",
            "phone",
            "email",
            "first_name",
            "last_name",
            "profile_step",
            "avatar",
            "school_grade",
            "city",
            "is_staff",
            "otp_verified",
            "staff_groups",
            "counters",
        )
        read_only_fields = fields

    @extend_schema_field(serializers.ChoiceField(choices=ProfileStep.choices, allow_null=True))
    def get_profile_step(self, user) -> str | None:
        return profile_step(user)

    @staticmethod
    def _profile(user):
        if user.is_learner:
            return getattr(user, "learner_profile", None)
        if user.is_parent:
            return getattr(user, "parent_profile", None)
        return None

    @extend_schema_field(AvatarSerializer(allow_null=True))
    def get_avatar(self, user):
        avatar = getattr(self._profile(user), "avatar", None) if user.is_learner else None
        return AvatarSerializer(avatar).data if avatar else None

    @extend_schema_field(SchoolGradeSerializer(allow_null=True))
    def get_school_grade(self, user):
        grade = getattr(self._profile(user), "school_grade", None) if user.is_learner else None
        return SchoolGradeSerializer(grade).data if grade else None

    def get_city(self, user) -> str | None:
        locality = getattr(self._profile(user), "locality", None)
        return locality.city if locality else None

    def get_otp_verified(self, user) -> bool:
        """Session du personnel validée par TOTP (D72) ; toujours faux pour un persona."""
        return bool(user.is_staff and getattr(user, "is_verified", lambda: False)())

    @extend_schema_field(LearnerCountersSerializer(allow_null=True))
    def get_counters(self, user):
        if not user.is_learner:
            return None
        from apps.learning.dashboard import counters

        return LearnerCountersSerializer(counters(user)).data

    def get_staff_groups(self, user) -> list[str]:
        if not user.is_staff:
            return []
        return sorted(user.groups.values_list("name", flat=True))


class MeUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)


class MeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user

    @extend_schema(request=MeUpdateSerializer, responses=MeSerializer)
    def patch(self, request):
        """WD17, WPD08, WT08 : prénom et nom. Identifiants, rôle et statut ne se modifient pas ici (C12, S1)."""
        serializer = MeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for name, value in serializer.validated_data.items():
            setattr(request.user, name, value)
        request.user.save()
        return Response(MeSerializer(request.user).data)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError(
                "Mot de passe actuel incorrect.", code="INVALID_CREDENTIALS"
            )
        return value

    def validate(self, data):
        if data["current_password"] == data["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "Le nouveau mot de passe doit être différent de l'actuel."}
            )
        try:
            password_validation.validate_password(
                data["new_password"], self.context["request"].user
            )
        except DjangoValidationError as error:
            raise serializers.ValidationError({"new_password": get_error_detail(error)}) from error
        return data


class PasswordChangeView(APIView):
    """Changement de mot de passe (WD18, WPD08, WT08). La session en cours reste ouverte."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=PasswordChangeSerializer, responses={204: None})
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        update_session_auth_hash(request, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmailChangeSerializer(serializers.Serializer):
    password = serializers.CharField(trim_whitespace=False)
    email = serializers.EmailField(max_length=255)

    def validate_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mot de passe incorrect.", code="INVALID_CREDENTIALS")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        user = self.context["request"].user
        if (
            user.is_teacher
            and User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists()
        ):
            raise serializers.ValidationError(message_for("EMAIL_TAKEN"), code="EMAIL_TAKEN")
        return value


class EmailChangeView(APIView):
    """
    Changement d'email (WPD08, WT08). Pour l'enseignant, c'est son identifiant de connexion ; pour le parent, une
    adresse de contact (rapport hebdomadaire, D55), qui ne sert pas à se connecter (S4). L'apprenant renseigne la
    sienne dans son profil (WD17).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(request=EmailChangeSerializer, responses={204: None})
    def post(self, request):
        user = request.user
        if not (user.is_teacher or user.is_parent):
            raise exceptions.PermissionDenied()
        serializer = EmailChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        if user.is_teacher:
            user.email = email
            user.save(update_fields=["email", "updated_at"])
        else:
            ParentProfile.objects.update_or_create(user=user, defaults={"email": email})
        return Response(status=status.HTTP_204_NO_CONTENT)
