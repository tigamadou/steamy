# apps/payments/views.py
import json
import logging

from django.core.exceptions import ImproperlyConfigured
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView

from apps.catalog.models import Course
from apps.notifications.sms import queue_sms
from libs.authentication import enforce_csrf
from libs.errors import ApiError
from libs.permissions import IsLearner

from .checkout import initiate_payment
from .fulfillment import guest_tracking_url
from .kit_codes import redeem
from .models import Order, Payment, PaymentRequest
from .orders import GUEST_TOKEN_HEADER, create_order, order_for_guest
from .providers import PROVIDERS, get_provider
from .requests import close, create_request, resend
from .serializers import (
    BeneficiaryOrderSerializer,
    KitCodeRedeemedSerializer,
    KitCodeRedeemSerializer,
    OrderCreatedSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    PaymentCreateSerializer,
    PaymentRequestCreateSerializer,
    PaymentRequestSerializer,
    PaymentSerializer,
)
from .utils import WebhookRejected, handle_payment_event

logger = logging.getLogger(__name__)


class OrderStatusQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices, required=False)


GUEST_TOKEN_PARAMETER = OpenApiParameter(
    GUEST_TOKEN_HEADER,
    str,
    OpenApiParameter.HEADER,
    required=False,
    description="Jeton d'une commande invitée, remis à sa création (C10)",
)


@extend_schema_view(
    list=extend_schema(
        summary="Commandes du parent (payeur) ou de l'apprenant (bénéficiaire)",
        parameters=[OrderStatusQuerySerializer],
        responses=OrderSerializer(many=True),
    ),
    retrieve=extend_schema(
        summary="Commande par sa référence (payeur, bénéficiaire, ou invité avec X-Guest-Token)",
        parameters=[GUEST_TOKEN_PARAMETER],
        responses={200: OrderSerializer},
    ),
    create=extend_schema(
        summary="Créer une commande : prix, frais et total calculés par le serveur (parent ou invité)",
        request=OrderCreateSerializer,
        responses={201: OrderCreatedSerializer},
    ),
)
class OrderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Commandes (§7.5, D37). Le parent commande un parcours pour son enfant ou des kits ; un invité commande des kits
    (D12). L'apprenant ne commande jamais : il demande à son parent (`PARENT_APPROVAL_REQUIRED`, D52). Une commande
    d'autrui répond 404.
    """

    lookup_field = "reference"
    serializer_class = OrderSerializer
    queryset = Order.objects.select_related("beneficiary", "delivery_zone").prefetch_related(
        "items__course", "items__kit", "items__event"
    )

    def get_permissions(self):
        if self.action == "list":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_throttles(self):
        # Seule la création (qui réserve du stock) a son plafond dédié
        self.throttle_scope = {"create": "orders", "pay": "payments"}.get(self.action)
        return super().get_throttles()

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not user.is_authenticated:
            return queryset.none()
        if user.is_parent:
            return queryset.filter(payer=user)
        if user.is_learner:
            return queryset.filter(beneficiary=user)
        return queryset.none()

    def output(self, order):
        """Le bénéficiaire ne voit ni l'adresse de livraison ni les codes, réservés au payeur."""
        user = self.request.user
        is_beneficiary = user.is_authenticated and order.beneficiary_id == user.pk
        return (BeneficiaryOrderSerializer if is_beneficiary else OrderSerializer)(order).data

    def list(self, request, *args, **kwargs):
        if not (request.user.is_parent or request.user.is_learner):
            raise ApiError("PERMISSION_DENIED")
        params = OrderStatusQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        queryset = self.get_queryset()
        if "status" in params.validated_data:
            queryset = queryset.filter(status=params.validated_data["status"])
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response([self.output(order) for order in page])

    def retrieve(self, request, *args, **kwargs):
        reference = kwargs["reference"]
        order = self.get_queryset().filter(reference=reference).first()
        token = request.headers.get(GUEST_TOKEN_HEADER)
        if order is None and token:
            order = order_for_guest(reference, token)
        if order is None:
            raise ApiError("NOT_FOUND")
        return Response(self.output(order))

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated:
            enforce_csrf(request)
        elif user.is_learner:
            raise ApiError("PARENT_APPROVAL_REQUIRED")
        elif not user.is_parent:
            raise ApiError("PERMISSION_DENIED")
        payer = user if user.is_authenticated else None
        serializer = OrderCreateSerializer(data=request.data, context={"payer": payer})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        order, guest_token = create_order(
            kind=data["kind"],
            quote=data["quote"],
            payer=payer,
            guest=data.get("guest"),
            beneficiary=data["beneficiary"],
            delivery_zone=data.get("delivery_zone"),
            delivery_address=data.get("delivery_address"),
        )
        if (
            guest_token
        ):  # suivi par lien SMS (C10) : le seul moyen pour l'invité de retrouver sa commande
            queue_sms(
                order.guest_phone,
                f"Steamy : commande {order.reference} enregistrée. "
                f"Suivi : {guest_tracking_url(order, guest_token)}",
                purpose="order",
            )
        body = {**OrderSerializer(order).data, "guest_token": guest_token}
        return Response(body, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Payer une commande par Mobile Money (parent payeur, ou invité avec X-Guest-Token)",
        parameters=[GUEST_TOKEN_PARAMETER],
        request=PaymentCreateSerializer,
        responses={201: PaymentSerializer},
    )
    @action(detail=True, methods=["post"], url_path="payments", permission_classes=[AllowAny])
    def pay(self, request, reference=None):
        """
        Initie le débit (USSD push, sans redirection). La réponse donne le paiement `pending` (ou `failed` si le
        prestataire refuse) ; son issue se lit ensuite sur `GET payments/payments/{id}/`. Aussi pour reprendre une
        commande en attente après un échec.
        """
        user = request.user
        if not user.is_authenticated:
            enforce_csrf(request)
        elif user.is_learner:
            raise ApiError("PARENT_APPROVAL_REQUIRED")
        elif not user.is_parent:
            raise ApiError("PERMISSION_DENIED")
        order = payable_order(request, reference)
        data = PaymentCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        payment = initiate_payment(order, **data.validated_data)
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


def payable_order(request, reference) -> Order:
    """Commande payable par l'appelant : payée par lui (parent), ou ouverte par son jeton (invité)."""
    queryset = Order.objects.select_related("payer")
    if request.user.is_authenticated:
        order = queryset.filter(reference=reference, payer=request.user).first()
    else:
        token = request.headers.get(GUEST_TOKEN_HEADER, "")
        order = order_for_guest(reference, token) if token else None
    if order is None:
        raise ApiError("NOT_FOUND")
    return order


@extend_schema_view(
    retrieve=extend_schema(
        summary="État d'un paiement (payeur, ou invité avec X-Guest-Token)",
        parameters=[GUEST_TOKEN_PARAMETER],
    )
)
class PaymentViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Paiement lisible par le payeur de la commande seulement ; l'apprenant n'y a pas accès (C12)."""

    queryset = Payment.objects.select_related("order")
    serializer_class = PaymentSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        payment = self.get_queryset().filter(pk=self.kwargs["pk"]).first()
        user = self.request.user
        allowed = payment is not None and (
            (user.is_authenticated and payment.order.payer_id == user.pk)
            or (
                not user.is_authenticated
                and order_for_guest(
                    payment.order.reference, self.request.headers.get(GUEST_TOKEN_HEADER, "")
                )
            )
        )
        if not allowed:
            raise ApiError("NOT_FOUND")
        return payment


# Webhook endpoint for providers (unprotected CSRF exempt; verify signature inside)
class WebhookRateThrottle(AnonRateThrottle):
    scope = "webhook"  # S9


@extend_schema(
    summary="Webhook des prestataires de paiement (appelé par le prestataire, pas par le front)",
    parameters=[
        OpenApiParameter("provider_name", str, OpenApiParameter.PATH, enum=sorted(PROVIDERS))
    ],
    request=OpenApiTypes.OBJECT,
    responses={
        200: inline_serializer("WebhookAck", {"ok": serializers.BooleanField()}),
        400: inline_serializer("WebhookNack", {"ok": serializers.BooleanField()}),
    },
    auth=[],
)
@csrf_exempt
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([WebhookRateThrottle])
def provider_webhook(request, provider_name: str):
    """
    Point d'entrée des notifications des prestataires (S9, ADR 0003). La signature est vérifiée **avant** toute
    lecture du contenu ; le prestataire normalise ensuite la notification (`parse_event`).
    """
    # Réponses volontairement neutres (S5) : aucun détail n'est renvoyé à l'appelant, la cause
    # est journalisée côté serveur.
    rejected = Response({"ok": False}, status=status.HTTP_400_BAD_REQUEST)
    try:
        provider = get_provider(provider_name)
    except ImproperlyConfigured:
        logger.warning("Webhook %s : prestataire inconnu ou non configuré", provider_name)
        return rejected
    if not provider.verify_webhook(request):
        logger.warning("Webhook %s : signature invalide", provider_name)
        return rejected
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError("corps qui n'est pas un objet")
        event = provider.parse_event(data)
    except (ValueError, UnicodeDecodeError) as exc:
        logger.warning("Webhook %s : notification illisible (%s)", provider_name, exc)
        return rejected
    if event is None:
        return Response({"ok": True})  # événement sans rapport avec un paiement

    try:
        if not handle_payment_event(provider.name, event):
            return rejected
    except WebhookRejected as exc:
        logger.warning("Webhook %s refusé : %s", provider_name, exc)
        return rejected
    except Exception:
        logger.exception("Webhook %s : erreur de traitement", provider_name)
        return rejected

    return Response({"ok": True})


# --- Kit Codes -----------------------------------------------------------------------------------


class KitCodeUserThrottle(ScopedRateThrottle):
    """Essais de Kit Code par apprenant (D35)."""

    scope_attr = "kit_code_scope"


class KitCodeIpThrottle(SimpleRateThrottle):
    """Essais de Kit Code par adresse IP, tous comptes confondus (D35)."""

    scope = "kit-code-ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class KitCodeRedeemView(APIView):
    """
    `POST payments/kit-codes/redeem/` (WA01, WA06) : l'apprenant saisit le code de la notice et choisit le parcours ;
    le code est consommé et l'inscription créée (`source=kit_code`). Déjà inscrit : 200, code non consommé.
    """

    permission_classes = [IsLearner]
    throttle_classes = [KitCodeUserThrottle, KitCodeIpThrottle]
    kit_code_scope = "kit-code"

    @extend_schema(
        request=KitCodeRedeemSerializer,
        responses={201: KitCodeRedeemedSerializer, 200: KitCodeRedeemedSerializer},
    )
    def post(self, request):
        data = KitCodeRedeemSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        course = Course.objects.filter(
            slug=data.validated_data["course_slug"], status=Course.Status.PUBLISHED
        ).first()
        if course is None:
            raise ApiError("NOT_FOUND", fields={"courseSlug": "NOT_FOUND"})
        _, created = redeem(request.user, data.validated_data["code"], course)
        body = {"course_slug": course.slug, "course_title": course.title, "created": created}
        return Response(body, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# --- Demandes de paiement ------------------------------------------------------------------------


class PaymentRequestStatusQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=PaymentRequest.Status.choices, required=False)


class IsLearnerOrParent(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        user = request.user
        return super().has_permission(request, view) and (user.is_learner or user.is_parent)


@extend_schema_view(
    list=extend_schema(
        summary="Demandes de paiement : les siennes (apprenant), celles de ses enfants (parent)",
        parameters=[PaymentRequestStatusQuerySerializer],
    ),
    retrieve=extend_schema(summary="Une demande de paiement"),
    create=extend_schema(
        summary="Demander à son parent de payer un parcours ou des kits (apprenant)",
        request=PaymentRequestCreateSerializer,
        responses={201: PaymentRequestSerializer, 200: PaymentRequestSerializer},
    ),
)
class PaymentRequestViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Demandes de paiement (D52, C4). L'apprenant crée, relance (limité) et annule les siennes ; le parent lit et
    refuse celles de ses enfants (le paiement passe par une commande, WPD15). Une demande d'autrui répond 404.
    """

    serializer_class = PaymentRequestSerializer
    permission_classes = [IsLearnerOrParent]
    queryset = PaymentRequest.objects.select_related("course", "requested_by", "parent")

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if getattr(self, "swagger_fake_view", False):
            return queryset.none()
        if user.is_learner:
            return queryset.filter(requested_by=user)
        return queryset.filter(parent=user)

    def list(self, request, *args, **kwargs):
        params = PaymentRequestStatusQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        queryset = self.get_queryset()
        if "status" in params.validated_data:
            queryset = queryset.filter(status=params.validated_data["status"])
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    def create(self, request, *args, **kwargs):
        if not request.user.is_learner:
            raise ApiError("PERMISSION_DENIED")
        data = PaymentRequestCreateSerializer(data=request.data, context={"learner": request.user})
        data.is_valid(raise_exception=True)
        payment_request, created = create_request(request.user, **data.validated_data)
        return Response(
            self.get_serializer(payment_request).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def owned(self, learner_only: bool):
        user = self.request.user
        if learner_only != user.is_learner:
            raise ApiError("PERMISSION_DENIED")
        return self.get_object()

    @extend_schema(summary="Relancer son parent (3 envois au plus, espacés de 24 h)", request=None)
    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None):
        return Response(self.get_serializer(resend(self.owned(learner_only=True))).data)

    @extend_schema(summary="Annuler sa demande (apprenant)", request=None)
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        payment_request = close(self.owned(learner_only=True), PaymentRequest.Status.CANCELLED)
        return Response(self.get_serializer(payment_request).data)

    @extend_schema(summary="Refuser la demande de son enfant (parent)", request=None)
    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        payment_request = close(self.owned(learner_only=False), PaymentRequest.Status.DECLINED)
        return Response(self.get_serializer(payment_request).data)
