"""
Serializers du commerce. Entrée : **aucun champ de prix** (D37), seulement des identifiants et des quantités ; tout
champ inconnu est ignoré. Sortie : un serializer par audience (payeur, bénéficiaire), le payeur seul voyant
l'adresse de livraison (et, en API-L3b.4, les Kit Codes).
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.exceptions import ErrorDetail, NotAuthenticated

from apps.accounts.fields import PhoneField
from apps.accounts.models import ParentChildLink
from apps.catalog.models import Course
from apps.shop.models import DeliveryZone, Kit
from libs.errors import message_for

from . import pricing
from .models import Order, OrderItem

#: Types de commande créables directement (l'événement passe par la candidature)
ORDER_CREATE_KINDS = [Order.Kind.COURSE, Order.Kind.KIT]
MAX_KIT_QUANTITY = 10
MAX_KIT_LINES = 10


def invalid(field: str, code: str, message: str | None = None) -> serializers.ValidationError:
    """Erreur sur un champ, avec son code (`fields.<champ>[0].code`)."""
    return serializers.ValidationError(
        {field: [ErrorDetail(message or message_for(code), code=code)]}
    )


# --- Entrée ------------------------------------------------------------------------------------


class OrderItemInputSerializer(serializers.Serializer):
    course_slug = serializers.SlugField(required=False, help_text="Commande de parcours")
    kit_slug = serializers.SlugField(required=False, help_text="Commande de kit")
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_KIT_QUANTITY, default=1)


class GuestInputSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = PhoneField(help_text="Reçoit le lien de suivi de la commande")


class DeliveryAddressInputSerializer(serializers.Serializer):
    zone_id = serializers.IntegerField(help_text="Zone de `GET shop/delivery-zones/`")
    recipient_name = serializers.CharField(max_length=150)
    phone = PhoneField(required=False, help_text="Par défaut, celui du payeur")
    city = serializers.CharField(max_length=80)
    district = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    address_line = serializers.CharField(max_length=255, help_text="Rue, repère, indications")


class OrderCreateSerializer(serializers.Serializer):
    """
    `kind=course` : un parcours payant pour un enfant du parent (`beneficiaryId`). `kind=kit` : des kits livrés
    (`deliveryAddress`), pour le parent (bénéficiaire facultatif) ou pour un invité (`guest`, sans compte, D12).
    Les commandes d'événement naissent de la candidature (API-L3b.6).
    """

    kind = serializers.ChoiceField(choices=ORDER_CREATE_KINDS)
    items = OrderItemInputSerializer(many=True, allow_empty=False)
    beneficiary_id = serializers.IntegerField(required=False, help_text="Enfant du parent")
    guest = GuestInputSerializer(required=False, help_text="Achat de kit sans compte")
    delivery_address = DeliveryAddressInputSerializer(required=False)

    def validate(self, attrs):
        payer = self.context["payer"]
        if payer is None and attrs["kind"] != Order.Kind.KIT:
            raise NotAuthenticated()  # un invité n'achète que des kits (D12)
        if payer is None and "guest" not in attrs:
            raise invalid("guest", "REQUIRED", "Champ obligatoire.")
        if payer is not None:
            attrs.pop("guest", None)
        attrs["beneficiary"] = self._beneficiary(payer, attrs.pop("beneficiary_id", None))
        if attrs["kind"] == Order.Kind.COURSE:
            attrs["quote"] = self._course_quote(attrs)
        else:
            attrs["quote"] = self._kit_quote(attrs, payer)
        return attrs

    def _beneficiary(self, payer, beneficiary_id):
        if beneficiary_id is None:
            return None
        link = ParentChildLink.objects.filter(
            parent=payer, learner_id=beneficiary_id
        ).select_related("learner")
        if payer is None or not link.exists():
            raise invalid("beneficiary_id", "NOT_FOUND")
        return link.get().learner

    def _course_quote(self, attrs):
        items = attrs["items"]
        if len(items) != 1 or "course_slug" not in items[0] or items[0]["quantity"] != 1:
            raise invalid("items", "INVALID", "Un seul parcours par commande.")
        if attrs["beneficiary"] is None:
            raise invalid("beneficiary_id", "REQUIRED", "Choisissez l'enfant inscrit au parcours.")
        course = Course.objects.filter(
            slug=items[0]["course_slug"], status=Course.Status.PUBLISHED
        ).first()
        if course is None:
            raise invalid("items", "NOT_FOUND")
        if course.required_kit_id:
            raise invalid("items", "KIT_CODE_REQUIRED")
        if course.is_free:
            raise invalid("items", "COURSE_FREE", "Ce parcours est gratuit : inscription directe.")
        already = Order.objects.filter(
            status=Order.Status.PAID, beneficiary=attrs["beneficiary"], items__course=course
        )
        if already.exists():
            raise invalid(
                "items", "ALREADY_PURCHASED", "Ce parcours est déjà acheté pour cet enfant."
            )
        return pricing.quote([pricing.course_line(course)])

    def _kit_quote(self, attrs, payer):
        items = attrs["items"]
        slugs = [item.get("kit_slug") for item in items]
        if None in slugs or len(set(slugs)) != len(slugs) or len(slugs) > MAX_KIT_LINES:
            raise invalid("items", "INVALID", "Une ligne par kit, sans doublon.")
        kits = {kit.slug: kit for kit in Kit.objects.filter(slug__in=slugs, active=True)}
        if len(kits) != len(slugs):
            raise invalid("items", "NOT_FOUND")
        address = attrs.pop("delivery_address", None)
        if address is None:
            raise invalid("delivery_address", "REQUIRED", "Champ obligatoire.")
        zone = DeliveryZone.objects.filter(pk=address["zone_id"], active=True).first()
        if zone is None:
            raise invalid("delivery_address", "DELIVERY_ZONE_UNAVAILABLE")
        attrs["delivery_zone"] = zone
        attrs["delivery_address"] = {
            "recipient_name": address["recipient_name"],
            "phone": address.get("phone") or (payer.phone if payer else attrs["guest"]["phone"]),
            "country": zone.country_id,
            "zone": zone.name,
            "city": address["city"],
            "district": address["district"],
            "address_line": address["address_line"],
        }
        lines = [pricing.kit_line(kits[item["kit_slug"]], item["quantity"]) for item in items]
        return pricing.quote(lines, zone)


# --- Sortie ------------------------------------------------------------------------------------


class OrderItemSerializer(serializers.ModelSerializer):
    course_slug = serializers.SlugRelatedField(source="course", slug_field="slug", read_only=True)
    kit_slug = serializers.SlugRelatedField(source="kit", slug_field="slug", read_only=True)
    event_slug = serializers.SlugRelatedField(source="event", slug_field="slug", read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "title",
            "course_slug",
            "kit_slug",
            "event_slug",
            "unit_price",
            "quantity",
            "total",
        )
        read_only_fields = fields


class BeneficiarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    first_name = serializers.CharField()


class DeliveryZoneSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = ("id", "name", "delay_label")
        read_only_fields = fields


class DeliveryAddressSerializer(serializers.Serializer):
    recipient_name = serializers.CharField()
    phone = serializers.CharField()
    country = serializers.CharField()
    zone = serializers.CharField()
    city = serializers.CharField()
    district = serializers.CharField(allow_blank=True)
    address_line = serializers.CharField()


class BeneficiaryOrderSerializer(serializers.ModelSerializer):
    """Commande vue par l'apprenant bénéficiaire (WD14) : ni adresse, ni payeur, ni codes."""

    items = OrderItemSerializer(many=True, read_only=True)
    beneficiary = serializers.SerializerMethodField()
    delivery_zone = DeliveryZoneSummarySerializer(read_only=True)

    class Meta:
        model = Order
        fields = (
            "reference",
            "kind",
            "status",
            "shipping_status",
            "subtotal",
            "shipping_fee",
            "total",
            "currency",
            "items",
            "beneficiary",
            "delivery_zone",
            "expires_at",
            "paid_at",
            "created_at",
        )
        read_only_fields = fields

    @extend_schema_field(BeneficiarySerializer(allow_null=True))
    def get_beneficiary(self, order):
        learner = order.beneficiary
        return {"id": learner.pk, "first_name": learner.first_name} if learner else None


class OrderSerializer(BeneficiaryOrderSerializer):
    """Commande vue par son payeur (parent ou invité) : avec l'adresse de livraison."""

    delivery_address = DeliveryAddressSerializer(read_only=True, allow_null=True)

    class Meta(BeneficiaryOrderSerializer.Meta):
        fields = (*BeneficiaryOrderSerializer.Meta.fields, "delivery_address")
        read_only_fields = fields


class OrderCreatedSerializer(OrderSerializer):
    guest_token = serializers.CharField(
        read_only=True,
        allow_null=True,
        help_text="Invité seulement, remis une seule fois : à renvoyer dans l'en-tête X-Guest-Token",
    )

    class Meta(OrderSerializer.Meta):
        fields = (*OrderSerializer.Meta.fields, "guest_token")
        read_only_fields = fields
