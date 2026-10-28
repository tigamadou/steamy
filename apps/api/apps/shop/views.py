"""
Kits en lecture (§7.5, WL07, WK01, WK02) : anonymes, kits en vente seulement, indépendants de la session et
cachables (§1.2). Zones de livraison publiques (WK05). Panier, adresse de livraison et alertes de réassort
(API-L3b.3, D38) ; la commande est dans `payments`.
"""

from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import ErrorDetail
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import PlatformSettings
from apps.payments.taxes import compute_taxes
from libs.authentication import enforce_csrf
from libs.errors import ApiError

from .models import Cart, CartItem, DeliveryAddress, DeliveryZone, Kit
from .restock import request_alert
from .serializers import (
    MAX_QUANTITY,
    CartItemCreateSerializer,
    CartItemUpdateSerializer,
    CartSerializer,
    DeliveryAddressSerializer,
    DeliveryZoneSerializer,
    KitDetailSerializer,
    KitSerializer,
    RestockAlertSerializer,
)

CACHE_SECONDS = 300


class KitQuerySerializer(serializers.Serializer):
    category = serializers.SlugField(required=False, help_text="Slug de la catégorie")


class PublicKitMixin:
    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = []

    def get_queryset(self):
        return Kit.objects.filter(active=True).select_related("category")


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
@extend_schema(parameters=[KitQuerySerializer])
class KitListView(PublicKitMixin, generics.ListAPIView):
    """Kits en vente, paginés."""

    serializer_class = KitSerializer

    def get_queryset(self):
        params = KitQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        queryset = super().get_queryset()
        if "category" in params.validated_data:
            queryset = queryset.filter(category__slug=params.validated_data["category"])
        return queryset


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
class KitDetailView(PublicKitMixin, generics.RetrieveAPIView):
    """Fiche kit (WK02) ; un kit retiré de la vente répond 404."""

    serializer_class = KitDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return super().get_queryset().prefetch_related("compatible_courses")


class DeliveryZoneQuerySerializer(serializers.Serializer):
    country = serializers.CharField(
        required=False, min_length=2, max_length=2, help_text="Code ISO du pays (BJ)"
    )


@method_decorator(cache_control(public=True, max_age=CACHE_SECONDS), name="dispatch")
@extend_schema(parameters=[DeliveryZoneQuerySerializer])
class DeliveryZoneListView(generics.ListAPIView):
    """Zones de livraison actives, avec leurs frais et leur délai (D38, WK05). Non paginées."""

    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = []
    pagination_class = None
    serializer_class = DeliveryZoneSerializer

    def get_queryset(self):
        params = DeliveryZoneQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        queryset = DeliveryZone.objects.filter(active=True)
        if "country" in params.validated_data:
            queryset = queryset.filter(country_id=params.validated_data["country"].upper())
        return queryset


# --- Panier (connecté) ---------------------------------------------------------------------------


class IsShopper(permissions.IsAuthenticated):
    """Parent ou apprenant connecté : l'apprenant prépare un panier qu'il envoie à son parent (D52)."""

    def has_permission(self, request, view):
        user = request.user
        return super().has_permission(request, view) and (user.is_parent or user.is_learner)


def cart_body(user) -> dict:
    cart, _ = Cart.objects.get_or_create(user=user)
    items = list(cart.items.select_related("kit__category"))
    subtotal = sum(item.kit.price * item.quantity for item in items)
    quote = compute_taxes(subtotal, 0, PlatformSettings.load())
    return CartSerializer(
        {
            "items": items,
            "count": sum(item.quantity for item in items),
            "subtotal": subtotal,
            "taxes": quote.lines(),
            "total": quote.total,
        }
    ).data


class CartView(APIView):
    """Panier côté serveur (D38) ; celui d'un invité reste dans le navigateur et part avec la commande."""

    permission_classes = [IsShopper]

    @extend_schema(responses=CartSerializer)
    def get(self, request):
        return Response(cart_body(request.user))


class CartItemsView(APIView):
    permission_classes = [IsShopper]

    @extend_schema(
        summary="Ajouter un kit au panier (ajoute à la quantité déjà présente)",
        request=CartItemCreateSerializer,
        responses={201: CartSerializer},
    )
    def post(self, request):
        data = CartItemCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        kit = Kit.objects.filter(slug=data.validated_data["kit_slug"], active=True).first()
        if kit is None:
            raise ApiError("NOT_FOUND", fields={"kitSlug": "NOT_FOUND"})
        if not kit.available:
            raise ApiError("OUT_OF_STOCK")
        cart, _ = Cart.objects.get_or_create(user=request.user)
        with transaction.atomic():
            item, created = CartItem.objects.select_for_update().get_or_create(
                cart=cart, kit=kit, defaults={"quantity": data.validated_data["quantity"]}
            )
            if not created:
                item.quantity = min(item.quantity + data.validated_data["quantity"], MAX_QUANTITY)
                item.save(update_fields=["quantity"])
        return Response(cart_body(request.user), status=status.HTTP_201_CREATED)


class CartItemView(APIView):
    permission_classes = [IsShopper]

    def item(self, request, pk):
        item = CartItem.objects.filter(pk=pk, cart__user=request.user).first()
        if item is None:
            raise ApiError("NOT_FOUND")
        return item

    @extend_schema(request=CartItemUpdateSerializer, responses=CartSerializer)
    def patch(self, request, pk):
        item = self.item(request, pk)
        data = CartItemUpdateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        item.quantity = data.validated_data["quantity"]
        item.save(update_fields=["quantity"])
        return Response(cart_body(request.user))

    @extend_schema(responses={200: CartSerializer})
    def delete(self, request, pk):
        self.item(request, pk).delete()
        return Response(cart_body(request.user))


# --- Adresse de livraison (connecté) ---------------------------------------------------------------


class DeliveryAddressView(APIView):
    """`accounts/me/delivery-address/` (WD19, WK05) : adresse proposée par défaut à la commande."""

    permission_classes = [IsShopper]

    @extend_schema(responses={200: DeliveryAddressSerializer})
    def get(self, request):
        address = DeliveryAddress.objects.filter(user=request.user).select_related("zone").first()
        if address is None:
            raise ApiError("NOT_FOUND")
        return Response(DeliveryAddressSerializer(address).data)

    @extend_schema(request=DeliveryAddressSerializer, responses={200: DeliveryAddressSerializer})
    def put(self, request):
        address = DeliveryAddress.objects.filter(user=request.user).first()
        serializer = DeliveryAddressSerializer(address, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data)


# --- Alerte de réassort ----------------------------------------------------------------------------


@extend_schema(
    summary="Être prévenu du retour en stock d'un kit (WK11)",
    request=RestockAlertSerializer,
    responses={201: inline_serializer("RestockAlertAck", {"ok": serializers.BooleanField()})},
)
class RestockAlertView(APIView):
    """
    Invité : `{ phone }`, un seul SMS (D38). Parent connecté : SMS sur le numéro du compte, sans corps.
    Apprenant : notification dans l'application, jamais de téléphone (D30). Réponse identique si la demande
    existait déjà.
    """

    permission_classes = [AllowAny]
    throttle_scope = "restock-alert"

    def post(self, request, slug):
        kit = Kit.objects.filter(slug=slug, active=True).first()
        if kit is None:
            raise ApiError("NOT_FOUND")
        user = request.user
        if not user.is_authenticated:
            enforce_csrf(request)
            data = RestockAlertSerializer(data=request.data)
            data.is_valid(raise_exception=True)
            if not data.validated_data.get("phone"):
                required = ErrorDetail("Ce champ est obligatoire.", code="REQUIRED")
                raise serializers.ValidationError({"phone": [required]})
            request_alert(kit, phone=data.validated_data["phone"])
        elif user.is_parent or user.is_learner:
            request_alert(kit, user=user)
        else:
            raise ApiError("PERMISSION_DENIED")
        return Response({"ok": True}, status=status.HTTP_201_CREATED)
