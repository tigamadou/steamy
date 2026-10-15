"""
Domaine `accounts` : identité et profils du compte connecté (W11-W14, WP07-WP09, WD17, WPD08, WT08).

Chaque étape de profil envoie un `PATCH` partiel ; la réponse donne l'étape suivante (`profileStep`). Les champs
qui pointent vers un référentiel se saisissent par leur `code` (la localité par son `id`). Genre et handicap sont
facultatifs (D6).
"""

from datetime import date

from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Gender, LearnerProfile, ParentProfile
from apps.accounts.profile import ProfileStep, profile_step
from apps.accounts.signup import MAX_AGE, MIN_AGE
from apps.referentials.models import Avatar, Disability, Goal, Locality, SchoolGrade
from apps.referentials.serializers import (
    AvatarSerializer,
    DisabilitySerializer,
    GoalSerializer,
    LocalitySerializer,
    SchoolGradeSerializer,
)
from libs.errors import message_for
from libs.permissions import IsLearner, IsParent

#: Objectifs au moins (W13).
MIN_LEARNER_GOALS = 2


def age_on(birth_date: date, day: date) -> int:
    return day.year - birth_date.year - ((day.month, day.day) < (birth_date.month, birth_date.day))


def code_field(model, **kwargs):
    return serializers.SlugRelatedField(
        slug_field="code", queryset=model.objects.filter(active=True), **kwargs
    )


def locality_field():
    return serializers.PrimaryKeyRelatedField(
        queryset=Locality.objects.filter(active=True), help_text="`id` de la localité"
    )


class ProfileStepMixin(serializers.Serializer):
    profile_step = serializers.SerializerMethodField(
        help_text="Étape de profil restante, null si le profil est complet"
    )

    @extend_schema_field(serializers.ChoiceField(choices=ProfileStep.choices, allow_null=True))
    def get_profile_step(self, profile) -> str | None:
        return profile_step(profile.user)


# --- Apprenant (W11-W14, WD17) ------------------------------------------------------------------


class LearnerProfileSerializer(ProfileStepMixin, serializers.ModelSerializer):
    locality = LocalitySerializer(read_only=True, allow_null=True)
    school_grade = SchoolGradeSerializer(read_only=True, allow_null=True)
    goals = GoalSerializer(many=True, read_only=True)
    avatar = AvatarSerializer(read_only=True, allow_null=True)
    disability = DisabilitySerializer(read_only=True, allow_null=True)

    class Meta:
        model = LearnerProfile
        fields = (
            "birth_date",
            "locality",
            "email",
            "school_grade",
            "gender",
            "disability",
            "goals",
            "avatar",
            "profile_step",
        )
        read_only_fields = fields


class LearnerProfileUpdateSerializer(serializers.ModelSerializer):
    locality = locality_field()
    school_grade = code_field(SchoolGrade)
    goals = code_field(Goal, many=True, help_text=f"Au moins {MIN_LEARNER_GOALS} objectifs (W13)")
    avatar = code_field(Avatar)
    disability = code_field(Disability, allow_null=True, required=False)
    gender = serializers.ChoiceField(choices=Gender.choices, allow_null=True, required=False)

    class Meta:
        model = LearnerProfile
        fields = (
            "birth_date",
            "locality",
            "email",
            "school_grade",
            "gender",
            "disability",
            "goals",
            "avatar",
        )
        extra_kwargs = {"email": {"allow_null": True, "required": False}}

    def validate_birth_date(self, value):
        """10 à 17 ans aujourd'hui, et l'âge qu'avait l'enfant à l'inscription est celui qu'il a déclaré (D23)."""
        if not MIN_AGE <= age_on(value, date.today()) <= MAX_AGE:
            raise serializers.ValidationError(
                message_for("AGE_OUT_OF_RANGE"), code="AGE_OUT_OF_RANGE"
            )
        declared = self.instance.declared_age
        signed_up = self.instance.user.date_joined.date()
        if declared is not None and age_on(value, signed_up) != declared:
            raise serializers.ValidationError(
                message_for("BIRTHDATE_AGE_MISMATCH"), code="BIRTHDATE_AGE_MISMATCH"
            )
        return value

    def validate_goals(self, value):
        if len(set(value)) < MIN_LEARNER_GOALS:
            raise serializers.ValidationError(
                f"Choisis au moins {MIN_LEARNER_GOALS} objectifs.", code="MIN_GOALS"
            )
        return value


class LearnerProfileView(APIView):
    permission_classes = [IsLearner]

    @extend_schema(request=LearnerProfileUpdateSerializer, responses=LearnerProfileSerializer)
    def patch(self, request):
        """W11-W14 (une étape par appel) et WD17."""
        profile, _ = LearnerProfile.objects.get_or_create(user=request.user)
        serializer = LearnerProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response(LearnerProfileSerializer(profile).data)


# --- Parent (WP07-WP09, WPD08) ------------------------------------------------------------------


class ParentProfileSerializer(ProfileStepMixin, serializers.ModelSerializer):
    locality = LocalitySerializer(read_only=True, allow_null=True)
    disability = DisabilitySerializer(read_only=True, allow_null=True)
    goals_for_children = GoalSerializer(many=True, read_only=True)

    class Meta:
        model = ParentProfile
        fields = (
            "locality",
            "email",
            "gender",
            "disability",
            "profession",
            "children_to_enroll",
            "goals_for_children",
            "profile_step",
        )
        read_only_fields = fields


class ParentProfileUpdateSerializer(serializers.ModelSerializer):
    locality = locality_field()
    disability = code_field(Disability, allow_null=True, required=False)
    gender = serializers.ChoiceField(choices=Gender.choices, allow_null=True, required=False)
    goals_for_children = code_field(Goal, many=True, help_text="Au moins un objectif (WP09)")
    children_to_enroll = serializers.IntegerField(min_value=1, max_value=10)

    class Meta:
        model = ParentProfile
        fields = (
            "locality",
            "email",
            "gender",
            "disability",
            "profession",
            "children_to_enroll",
            "goals_for_children",
        )
        extra_kwargs = {
            "email": {"allow_null": True, "required": False},
            "profession": {"required": False},
        }

    def validate_goals_for_children(self, value):
        if not value:
            raise serializers.ValidationError("Choisissez au moins un objectif.", code="MIN_GOALS")
        return value


class ParentProfileView(APIView):
    permission_classes = [IsParent]

    @extend_schema(request=ParentProfileUpdateSerializer, responses=ParentProfileSerializer)
    def patch(self, request):
        """WP07-WP09 (une étape par appel) et WPD08."""
        profile, _ = ParentProfile.objects.get_or_create(user=request.user)
        serializer = ParentProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response(ParentProfileSerializer(profile).data)
