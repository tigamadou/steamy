"""Kits publics (§7.5) : jamais le stock exact (`available` seulement), aucune donnée d'acheteur."""

from rest_framework import serializers

from apps.accounts.fields import PhoneField
from apps.catalog.models import Course
from apps.catalog.serializers import CategorySummarySerializer
from apps.payments.tax_serializers import TaxLineSerializer

from .models import CartItem, DeliveryAddress, DeliveryZone, Kit

LIST_FIELDS = ("slug", "name", "category", "price", "difficulty", "emoji", "images", "available")


class CompatibleCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("slug", "title")


class KitSerializer(serializers.ModelSerializer):
    category = CategorySummarySerializer(read_only=True)
    available = serializers.BooleanField(
        read_only=True, help_text="En stock (le stock exact reste interne)"
    )

    class Meta:
        model = Kit
        fields = LIST_FIELDS


class KitDetailSerializer(KitSerializer):
    compatible_courses = serializers.SerializerMethodField()

    class Meta(KitSerializer.Meta):
        fields = (*LIST_FIELDS, "description", "contents", "compatible_courses")

    def get_compatible_courses(self, kit) -> list[dict]:
        courses = [c for c in kit.compatible_courses.all() if c.status == Course.Status.PUBLISHED]
        return CompatibleCourseSerializer(courses, many=True).data


class DeliveryZoneSerializer(serializers.ModelSerializer):
    country = serializers.CharField(source="country_id", read_only=True)

    class Meta:
        model = DeliveryZone
        fields = ("id", "country", "name", "fee", "delay_label")
        read_only_fields = fields


#: Quantité maximale d'un kit dans un panier ou une commande
MAX_QUANTITY = 10


class CartItemSerializer(serializers.ModelSerializer):
    kit = KitSerializer(read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "kit", "quantity", "total")
        read_only_fields = fields

    def get_total(self, item) -> int:
        return item.kit.price * item.quantity


class CartSerializer(serializers.Serializer):
    """Panier (WK03, WK10) : prix courants des kits ; le total définitif est celui de la commande."""

    items = CartItemSerializer(many=True)
    count = serializers.IntegerField(help_text="Nombre d'articles (somme des quantités)")
    subtotal = serializers.IntegerField(help_text="Somme des lignes HT, hors livraison (FCFA)")
    taxes = TaxLineSerializer(
        many=True,
        help_text="Taxes qui s'ajouteront au HT (livraison exclue), d'après les réglages du moment",
    )
    total = serializers.IntegerField(help_text="HT + taxes, hors livraison (FCFA)")


class CartItemCreateSerializer(serializers.Serializer):
    kit_slug = serializers.SlugField()
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_QUANTITY, default=1)


class CartItemUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_QUANTITY)


class DeliveryAddressSerializer(serializers.ModelSerializer):
    """Adresse de livraison enregistrée (WD19, WK05). `phone` : par défaut, celui du compte."""

    zone_id = serializers.PrimaryKeyRelatedField(
        source="zone", queryset=DeliveryZone.objects.filter(active=True)
    )
    zone = DeliveryZoneSerializer(read_only=True)
    phone = PhoneField(required=False, allow_blank=True)

    class Meta:
        model = DeliveryAddress
        fields = ("zone_id", "zone", "recipient_name", "phone", "city", "district", "address_line")


class RestockAlertSerializer(serializers.Serializer):
    phone = PhoneField(
        required=False, help_text="Invité seulement : un connecté est prévenu sur son compte"
    )
