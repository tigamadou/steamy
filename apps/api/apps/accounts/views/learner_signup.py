"""
Domaine `auth` : inscription de l'apprenant (W04-W10, W19, C5) et domaine `accounts` : demande de consentement
d'origine apprenant (W06, W07). Voir `apps/accounts/signup.py` pour les règles.

L'inscription en cours est portée par la session Django : aucun jeton dans le front. Aucun champ `role` n'est lu (S1).
"""

from django.contrib.auth import login
from django.core.exceptions import ValidationError as DjangoValidationError
from django.middleware.csrf import get_token
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from apps.accounts import signup as service
from apps.accounts.fields import AcceptedField, PasswordField, PhoneField
from apps.accounts.models import ConsentRequest, User
from apps.accounts.otp import client_ip
from apps.accounts.validators import USERNAME_INVALID_MESSAGE, validate_username
from apps.referentials.models import Relationship
from libs.errors import ApiError, message_for
from libs.phone import mask_phone

from .me import MeSerializer
from .session import LoginResponseSerializer, enforce_csrf


class UsernameField(serializers.CharField):
    default_error_messages = {"USERNAME_INVALID": USERNAME_INVALID_MESSAGE}

    def __init__(self, **kwargs):
        kwargs.setdefault("max_length", 30)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        username = super().to_internal_value(data)
        try:
            validate_username(username)
        except DjangoValidationError:
            self.fail("USERNAME_INVALID")
        return username


# --- Sérialiseurs -------------------------------------------------------------------------------


class UsernameAvailabilitySerializer(serializers.Serializer):
    username = UsernameField()


class UsernameAvailabilityResponseSerializer(serializers.Serializer):
    available = serializers.BooleanField()


class LearnerSignupSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    username = UsernameField()
    age = serializers.IntegerField(help_text="Âge déclaré (W05), entre 10 et 17 ans (D23)")
    privacy_accepted = AcceptedField()

    def validate_username(self, value):
        if not service.username_available(value):
            raise serializers.ValidationError(message_for("USERNAME_TAKEN"), code="USERNAME_TAKEN")
        return value

    def validate_age(self, value):
        if not service.MIN_AGE <= value <= service.MAX_AGE:
            raise serializers.ValidationError(
                message_for("AGE_OUT_OF_RANGE"), code="AGE_OUT_OF_RANGE"
            )
        return value


class ConsentRequestStateSerializer(serializers.ModelSerializer):
    """Demande vue par l'enfant (W07, W08, W18) : jamais le numéro du parent en clair."""

    parent_phone_masked = serializers.SerializerMethodField()
    relationship = serializers.SlugRelatedField(slug_field="code", read_only=True)
    resend_in_sec = serializers.SerializerMethodField()

    class Meta:
        model = ConsentRequest
        fields = (
            "id",
            "status",
            "parent_phone_masked",
            "relationship",
            "expires_at",
            "resend_in_sec",
        )
        read_only_fields = fields

    def get_parent_phone_masked(self, consent) -> str:
        return mask_phone(consent.parent_phone)

    def get_resend_in_sec(self, consent) -> int:
        return service.consent_resend_in_seconds(consent)


class LearnerSignupStep:
    PARENT = "parent"  # W06 : saisir le numéro du parent
    WAITING = "waiting"  # W07 : demande envoyée, en attente
    PASSWORD = "password"  # W08 → W10 : accord donné, choisir le mot de passe
    CHOICES = [
        (PARENT, "W06 · Parent"),
        (WAITING, "W07 · Attente"),
        (PASSWORD, "W10 · Mot de passe"),
    ]


class LearnerSignupStateSerializer(serializers.Serializer):
    """État de l'inscription en cours : le serveur est la source de vérité de l'étape (W06-W10)."""

    step = serializers.ChoiceField(choices=LearnerSignupStep.CHOICES)
    first_name = serializers.CharField()
    username = serializers.CharField()
    expires_at = serializers.DateTimeField()
    consent_request = ConsentRequestStateSerializer(allow_null=True)

    @staticmethod
    def build(signup):
        consent = service.current_consent_request(signup.learner)
        consent_status = consent.status if consent else None
        if consent_status == ConsentRequest.Status.ACCEPTED:
            step = LearnerSignupStep.PASSWORD
        elif consent_status == ConsentRequest.Status.PENDING:
            step = LearnerSignupStep.WAITING
        else:
            step = LearnerSignupStep.PARENT
        return LearnerSignupStateSerializer(
            {
                "step": step,
                "first_name": signup.learner.first_name,
                "username": signup.learner.username,
                "expires_at": signup.expires_at,
                "consent_request": consent,
            }
        ).data


class LearnerSignupCreatedSerializer(serializers.Serializer):
    resume_code = serializers.CharField(
        help_text="Code de reprise, renvoyé **une seule fois** et jamais régénéré (C14)"
    )
    signup = LearnerSignupStateSerializer()


class ResumeSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=30)
    resume_code = serializers.CharField(max_length=16)


class LearnerConsentRequestSerializer(serializers.Serializer):
    parent_phone = PhoneField()
    relationship = serializers.SlugRelatedField(
        slug_field="code", queryset=Relationship.objects.filter(active=True)
    )


class LearnerPasswordSerializer(serializers.Serializer):
    password = PasswordField()


# --- Vues ---------------------------------------------------------------------------------------


class ResumeUsernameThrottle(SimpleRateThrottle):
    """Plafond de reprise par identifiant, en plus du plafond par IP : le code ne se devine pas en changeant d'IP."""

    scope = "resume-username"

    def get_cache_key(self, request, view):
        username = request.data.get("username") if hasattr(request.data, "get") else None
        if not isinstance(username, str) or not username.strip():
            return None
        return self.cache_format % {"scope": self.scope, "ident": username.strip().lower()}


class PublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


class UsernameAvailabilityView(PublicView):
    """W04, W19 : identifiant libre ? Throttlé : c'est une énumération des identifiants."""

    throttle_scope = "username-availability"

    @extend_schema(
        parameters=[OpenApiParameter("username", OpenApiTypes.STR, required=True)],
        responses=UsernameAvailabilityResponseSerializer,
        auth=[],
    )
    def get(self, request):
        serializer = UsernameAvailabilitySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        return Response(
            {"available": service.username_available(serializer.validated_data["username"])}
        )


class LearnerSignupView(PublicView):
    throttle_scope = "signup"

    @extend_schema(
        request=LearnerSignupSerializer,
        responses={201: LearnerSignupCreatedSerializer},
        auth=[],
    )
    def post(self, request):
        """W05 « Continuer » : crée le compte en attente et renvoie le code de reprise (une seule fois)."""
        enforce_csrf(request)
        serializer = LearnerSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        learner, code = service.create_learner_signup(
            data["first_name"], data["last_name"], data["username"], data["age"]
        )
        request.session[service.SESSION_KEY] = learner.pk
        signup = learner.signup_session
        return Response(
            {"resume_code": code, "signup": LearnerSignupStateSerializer.build(signup)},
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(responses=LearnerSignupStateSerializer, auth=[])
    def get(self, request):
        """W06-W10 : étape réelle de l'inscription en cours (garde du layout du flux)."""
        return Response(LearnerSignupStateSerializer.build(service.signup_from_session(request)))


class LearnerSignupResumeView(PublicView):
    throttle_scope = "resume"
    throttle_classes = [*api_settings.DEFAULT_THROTTLE_CLASSES, ResumeUsernameThrottle]

    @extend_schema(request=ResumeSerializer, responses=LearnerSignupStateSerializer, auth=[])
    def post(self, request):
        """W07 « Reprendre mon inscription » (C5) : identifiant + code de reprise."""
        enforce_csrf(request)
        serializer = ResumeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        signup = service.resume_signup(
            serializer.validated_data["username"], serializer.validated_data["resume_code"]
        )
        request.session[service.SESSION_KEY] = signup.learner_id
        return Response(LearnerSignupStateSerializer.build(signup))


class LearnerSignupPasswordView(PublicView):
    throttle_scope = "signup"

    @extend_schema(request=LearnerPasswordSerializer, responses=LoginResponseSerializer, auth=[])
    def post(self, request):
        """W10 : après l'accord du parent, choisit le mot de passe ; le compte devient actif et la session s'ouvre."""
        enforce_csrf(request)
        signup = service.signup_from_session(request)
        consent = service.current_consent_request(signup.learner)
        if consent is None or consent.status != ConsentRequest.Status.ACCEPTED:
            raise ApiError("ACCOUNT_PENDING_CONSENT")
        serializer = LearnerPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        learner = signup.learner
        learner.set_password(serializer.validated_data["password"])
        learner.status = User.Status.ACTIVE
        learner.save()
        signup.delete()
        request.session.pop(service.SESSION_KEY, None)
        login(request, learner, backend="apps.accounts.backends.IdentifierBackend")
        return Response({"user": MeSerializer(learner).data, "csrf_token": get_token(request)})


class LearnerConsentRequestView(PublicView):
    """W06 : envoie la demande au parent (SMS avec lien à jeton). Réservé à l'inscription en cours."""

    throttle_scope = "signup"

    @extend_schema(
        request=LearnerConsentRequestSerializer,
        responses={201: ConsentRequestStateSerializer},
        auth=[],
    )
    def post(self, request):
        enforce_csrf(request)
        signup = service.signup_from_session(request)
        serializer = LearnerConsentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        consent = service.create_learner_consent_request(
            signup,
            serializer.validated_data["parent_phone"],
            serializer.validated_data["relationship"],
            client_ip(request),
        )
        return Response(ConsentRequestStateSerializer(consent).data, status=status.HTTP_201_CREATED)


class LearnerConsentResendView(PublicView):
    """W07 « Renvoyer le SMS » : nouveau lien (seul le dernier est valable), 60 s au moins entre deux envois."""

    throttle_scope = "otp"

    @extend_schema(request=None, responses=ConsentRequestStateSerializer, auth=[])
    def post(self, request, pk):
        enforce_csrf(request)
        signup = service.signup_from_session(request)
        consent = signup.learner.consent_requests.filter(pk=pk).first()
        if consent is None:
            raise ApiError("NOT_FOUND")
        consent = service.resend_consent_request(consent, client_ip(request))
        return Response(ConsentRequestStateSerializer(consent).data)
