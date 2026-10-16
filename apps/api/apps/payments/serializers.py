"""
Serializers du commerce. Entrée : **aucun champ de prix** (D37), seulement des identifiants et des quantités ; tout
champ inconnu est ignoré. Sortie : un serializer par audience (payeur, bénéficiaire), le payeur seul voyant
l'adresse de livraison (et, en API-L3b.4, les Kit Codes).
"""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.exceptions import ErrorDetail, NotAuthenticated

from apps.accounts.fields import PhoneField, phone_country
from apps.accounts.models import ParentChildLink
from apps.catalog.models import Course
from apps.learning.models import Enrollment
from apps.shop.models import DeliveryZone, Kit
from libs.errors import message_for
from libs.phone import mask_phone

from . import pricing
from .models import KitCode, Order, OrderItem, Payment, PaymentRequest
from .requests import next_resend_at

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


class OrderDeliveryAddressSerializer(serializers.Serializer):
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


class KitCodeSerializer(serializers.ModelSerializer):
    kit_slug = serializers.SlugRelatedField(source="kit", slug_field="slug", read_only=True)
    redeemed = serializers.SerializerMethodField()

    class Meta:
        model = KitCode
        fields = ("code", "kit_slug", "redeemed")
        read_only_fields = fields

    def get_redeemed(self, kit_code) -> bool:
        return kit_code.redeemed_at is not None


class OrderSerializer(BeneficiaryOrderSerializer):
    """Commande vue par son payeur (parent ou invité) : avec l'adresse de livraison et les Kit Codes (C10)."""

    delivery_address = OrderDeliveryAddressSerializer(read_only=True, allow_null=True)
    kit_codes = serializers.SerializerMethodField()

    class Meta(BeneficiaryOrderSerializer.Meta):
        fields = (*BeneficiaryOrderSerializer.Meta.fields, "delivery_address", "kit_codes")
        read_only_fields = fields

    @extend_schema_field(KitCodeSerializer(many=True))
    def get_kit_codes(self, order):
        codes = KitCode.objects.filter(order_item__order=order, revoked_at__isnull=True)
        return KitCodeSerializer(codes.select_related("kit"), many=True).data


class OrderCreatedSerializer(OrderSerializer):
    guest_token = serializers.CharField(
        read_only=True,
        allow_null=True,
        help_text="Invité seulement, remis une seule fois : à renvoyer dans l'en-tête X-Guest-Token",
    )

    class Meta(OrderSerializer.Meta):
        fields = (*OrderSerializer.Meta.fields, "guest_token")
        read_only_fields = fields


# --- Paiements ---------------------------------------------------------------------------------


class PaymentCreateSerializer(serializers.Serializer):
    """Mobile Money uniquement : pays, réseau (référentiel `payment-networks`) et numéro du payeur (D76)."""

    country = serializers.CharField(min_length=2, max_length=2, help_text="Code ISO (BJ)")
    network = serializers.SlugField(max_length=40, help_text="Code du réseau (mtn, moov, celtiis…)")
    msisdn = PhoneField(help_text="Numéro Mobile Money qui validera le paiement")

    def validate(self, attrs):
        attrs["country"] = attrs["country"].upper()
        country = phone_country(attrs["msisdn"])
        if country is None or country.code != attrs["country"]:
            raise invalid("msisdn", "PHONE_INVALID", "Ce numéro n'est pas un numéro de ce pays.")
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    """État d'un paiement (WA04, WA05, WA07, WK09), interrogé jusqu'à `succeeded` ou `failed`."""

    order_reference = serializers.CharField(source="order.reference", read_only=True)
    msisdn_masked = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "order_reference",
            "status",
            "country",
            "network",
            "msisdn_masked",
            "amount",
            "currency",
            "failure_code",
            "failure_reason",
            "created_at",
            "confirmed_at",
        )
        read_only_fields = fields

    def get_msisdn_masked(self, payment) -> str:
        return mask_phone(payment.msisdn)


# --- Kit Codes ---------------------------------------------------------------------------------


class KitCodeRedeemSerializer(serializers.Serializer):
    code = serializers.CharField(
        max_length=32, help_text="STEAMY-XXXX-XXXX, casse et tirets indifférents"
    )
    course_slug = serializers.SlugField(help_text="Parcours à débloquer")


class KitCodeRedeemedSerializer(serializers.Serializer):
    course_slug = serializers.CharField()
    course_title = serializers.CharField()
    created = serializers.BooleanField(
        help_text="Faux si l'apprenant était déjà inscrit (code non consommé)"
    )


# --- Demandes de paiement ----------------------------------------------------------------------


class PaymentRequestCreateSerializer(serializers.Serializer):
    """`kind=course` : `courseSlug`. `kind=kit` : `items` (souvent le panier). Montant recalculé par le serveur."""

    kind = serializers.ChoiceField(choices=ORDER_CREATE_KINDS)
    course_slug = serializers.SlugField(required=False)
    items = OrderItemInputSerializer(many=True, required=False)

    def validate(self, attrs):
        learner = self.context["learner"]
        if attrs["kind"] == Order.Kind.COURSE:
            course = Course.objects.filter(
                slug=attrs.get("course_slug", ""), status=Course.Status.PUBLISHED
            ).first()
            if course is None:
                raise invalid("course_slug", "NOT_FOUND")
            if course.required_kit_id:
                raise invalid("course_slug", "KIT_CODE_REQUIRED")
            if course.is_free:
                raise invalid(
                    "course_slug", "COURSE_FREE", "Ce parcours est gratuit : inscris-toi."
                )
            if Enrollment.objects.filter(learner=learner, course=course).exists():
                raise invalid("course_slug", "ALREADY_ENROLLED", "Tu suis déjà ce parcours.")
            return {"kind": attrs["kind"], "course": course, "amount": course.price, "items": []}
        items = attrs.get("items") or []
        slugs = [item.get("kit_slug") for item in items]
        if (
            not slugs
            or None in slugs
            or len(set(slugs)) != len(slugs)
            or len(slugs) > MAX_KIT_LINES
        ):
            raise invalid("items", "INVALID", "Une ligne par kit, sans doublon.")
        kits = {kit.slug: kit for kit in Kit.objects.filter(slug__in=slugs, active=True)}
        if len(kits) != len(slugs):
            raise invalid("items", "NOT_FOUND")
        if not all(kit.available for kit in kits.values()):
            raise invalid("items", "OUT_OF_STOCK")
        lines = [
            {
                "kit_slug": item["kit_slug"],
                "title": kits[item["kit_slug"]].name,
                "unit_price": kits[item["kit_slug"]].price,
                "quantity": item["quantity"],
            }
            for item in items
        ]
        amount = sum(line["unit_price"] * line["quantity"] for line in lines)
        return {"kind": attrs["kind"], "course": None, "amount": amount, "items": lines}


class CourseSummarySerializer(serializers.Serializer):
    slug = serializers.CharField()
    title = serializers.CharField()


class PaymentRequestItemSerializer(serializers.Serializer):
    kit_slug = serializers.CharField()
    title = serializers.CharField()
    unit_price = serializers.IntegerField()
    quantity = serializers.IntegerField()


class PaymentRequestSerializer(serializers.ModelSerializer):
    """Demande vue par l'enfant (WA02, WK08) et par son parent (WPD01, WPD15)."""

    course = serializers.SerializerMethodField()
    items = PaymentRequestItemSerializer(many=True, read_only=True)
    learner = serializers.SerializerMethodField()
    parent_first_name = serializers.CharField(source="parent.first_name", read_only=True)
    next_resend_at = serializers.SerializerMethodField()
    order_reference = serializers.SerializerMethodField()

    class Meta:
        model = PaymentRequest
        fields = (
            "id",
            "kind",
            "status",
            "course",
            "items",
            "amount",
            "learner",
            "parent_first_name",
            "created_at",
            "expires_at",
            "last_sent_at",
            "next_resend_at",
            "decided_at",
            "order_reference",
        )
        read_only_fields = fields

    @extend_schema_field(CourseSummarySerializer(allow_null=True))
    def get_course(self, request):
        course = request.course
        return {"slug": course.slug, "title": course.title} if course else None

    @extend_schema_field(BeneficiarySerializer)
    def get_learner(self, request):
        return {"id": request.requested_by_id, "first_name": request.requested_by.first_name}

    @extend_schema_field(serializers.DateTimeField(allow_null=True))
    def get_next_resend_at(self, request):
        moment = next_resend_at(request)
        return serializers.DateTimeField().to_representation(moment) if moment else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_order_reference(self, request):
        order = request.orders.filter(status=Order.Status.PAID).first()
        return order.reference if order else None
