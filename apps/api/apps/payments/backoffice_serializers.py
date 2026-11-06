"""
Schémas de l'API du backoffice pour les paiements et les remboursements (ADR 0008 § 9). Les noms sont en snake_case
ici ; le rendu les passe en camelCase. Le numéro Mobile Money n'est jamais sérialisé en clair, le `payload` du paiement
jamais.
"""

from rest_framework import serializers

from apps.accounts.models import User

from . import backoffice
from .models import Order, Payment, Refund


def full_name(user) -> str | None:
    return user.get_full_name() if user else None


def payer_name(order: Order) -> str:
    """Parent payeur ; invité : « Prénom Nom (invité) », sinon « Invité » ; vide si le compte est anonymisé."""
    if order.is_guest:
        name = f"{order.guest_first_name} {order.guest_last_name}".strip()
        return f"{name} (invité)" if name else "Invité"
    if order.payer is None or order.payer.status == User.Status.ANONYMIZED:
        return ""
    return order.payer.get_full_name()


class PaymentQuerySerializer(serializers.Serializer):
    """Filtres de `GET payments/` ; `from` et `to` se déclarent dans `get_fields()` (mots réservés)."""

    status = serializers.ChoiceField(choices=Payment.Status.choices, required=False)
    network = serializers.CharField(required=False)
    country = serializers.CharField(required=False)
    kind = serializers.ChoiceField(choices=Order.Kind.choices, required=False)
    q = serializers.CharField(
        required=False,
        help_text="Référence de commande, référence marchande ou identifiant de transaction (sous-chaîne)",
    )

    def get_fields(self):
        fields = super().get_fields()
        fields["from"] = serializers.DateField(
            required=False, help_text="Créés à partir de cette date (AAAA-MM-JJ, incluse)"
        )
        fields["to"] = serializers.DateField(
            required=False, help_text="Créés jusqu'à cette date (AAAA-MM-JJ, incluse)"
        )
        return fields


class RefundQuerySerializer(serializers.Serializer):
    processed = serializers.BooleanField(
        default=False, help_text="Faux (défaut) : à traiter ; vrai : déjà traités"
    )


class PaymentTotalsSerializer(serializers.Serializer):
    volume = serializers.IntegerField(
        help_text="Somme des paiements réussis, brut hors remboursements"
    )
    count = serializers.IntegerField()
    succeeded = serializers.IntegerField()
    failed = serializers.IntegerField(help_text="Tous codes d'échec confondus")
    failure_rate = serializers.FloatField(
        allow_null=True,
        help_text="Échoués / (réussis + échoués) en %, une décimale ; nul sans paiement réglé",
    )


class PaymentRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    order_reference = serializers.CharField(source="order.reference")
    merchant_reference = serializers.CharField()
    provider_transaction_id = serializers.CharField(allow_null=True)
    payer = serializers.SerializerMethodField()
    beneficiary = serializers.SerializerMethodField()
    kind = serializers.CharField(source="order.kind", help_text="course, kit ou event")
    country = serializers.CharField()
    network = serializers.CharField()
    masked_msisdn = serializers.SerializerMethodField()
    amount = serializers.IntegerField()
    currency = serializers.CharField()
    status = serializers.CharField(help_text="initiated, pending, succeeded ou failed")
    provider_status = serializers.CharField(help_text="Vide si inconnu")
    failure_code = serializers.CharField(help_text="Vide si aucun")
    failure_reason = serializers.CharField()

    def get_payer(self, payment) -> str:
        return payer_name(payment.order)

    def get_beneficiary(self, payment) -> str | None:
        return full_name(payment.order.beneficiary)

    def get_masked_msisdn(self, payment) -> str:
        return backoffice.masked(payment.msisdn)


class PaymentPageSerializer(serializers.Serializer):
    """Page de paiements ; `totals` porte sur tout le filtre, pas sur la page."""

    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = PaymentRowSerializer(many=True)
    totals = PaymentTotalsSerializer()


class PaymentOrderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    reference = serializers.CharField()
    kind = serializers.CharField()
    status = serializers.CharField()
    total = serializers.IntegerField()
    currency = serializers.CharField()
    payer = serializers.SerializerMethodField()
    beneficiary = serializers.SerializerMethodField()

    def get_payer(self, order) -> str:
        return payer_name(order)

    def get_beneficiary(self, order) -> str | None:
        return full_name(order.beneficiary)


class PaymentAttemptSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    merchant_reference = serializers.CharField()
    provider_transaction_id = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    provider_status = serializers.CharField()
    failure_code = serializers.CharField()
    amount = serializers.IntegerField()


class RefundSummarySerializer(serializers.Serializer):
    """Remboursement vu depuis son paiement."""

    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    amount = serializers.IntegerField()
    reason = serializers.CharField()
    processed = serializers.BooleanField()
    processed_at = serializers.DateTimeField(allow_null=True)
    processed_by = serializers.SerializerMethodField()
    reference = serializers.CharField(help_text="Vide tant que le remboursement n'est pas fait")

    def get_processed_by(self, refund) -> str | None:
        return full_name(refund.processed_by)


class BackofficeRefundSerializer(RefundSummarySerializer):
    payment_id = serializers.IntegerField()
    order_reference = serializers.CharField(source="payment.order.reference")
    merchant_reference = serializers.CharField(source="payment.merchant_reference")
    provider_transaction_id = serializers.CharField(
        source="payment.provider_transaction_id", allow_null=True
    )
    network = serializers.CharField(source="payment.network")
    masked_msisdn = serializers.SerializerMethodField()
    payment_amount = serializers.IntegerField(source="payment.amount")
    payer = serializers.SerializerMethodField()
    beneficiary = serializers.SerializerMethodField()

    def get_masked_msisdn(self, refund) -> str:
        return backoffice.masked(refund.payment.msisdn)

    def get_payer(self, refund) -> str:
        return payer_name(refund.payment.order)

    def get_beneficiary(self, refund) -> str | None:
        return full_name(refund.payment.order.beneficiary)


class AuditEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    action = serializers.CharField()
    actor = serializers.SerializerMethodField()
    target = serializers.SerializerMethodField(help_text="payment ou order")
    data = serializers.DictField()

    def get_actor(self, entry) -> str | None:
        return full_name(entry.actor)

    def get_target(self, entry) -> str:
        return "payment" if entry.target_type == Payment._meta.label_lower else "order"


class PaymentDetailSerializer(PaymentRowSerializer):
    """Lit les attributs posés par `backoffice_api.load_detail` (`attempts`, `refund_list`, `audit_entries`)."""

    provider = serializers.CharField()
    provider_fees = serializers.IntegerField(allow_null=True)
    checked_at = serializers.DateTimeField(allow_null=True)
    confirmed_at = serializers.DateTimeField(allow_null=True)
    refundable = serializers.SerializerMethodField(
        help_text="Reste remboursable ; 0 si le paiement n'est pas réussi"
    )
    order = PaymentOrderSerializer()
    attempts = PaymentAttemptSerializer(many=True)
    refunds = RefundSummarySerializer(many=True, source="refund_list")
    audit_log = AuditEntrySerializer(many=True, source="audit_entries")

    def get_refundable(self, payment) -> int:
        if payment.status != Payment.Status.SUCCEEDED:
            return 0
        return backoffice.refundable(payment)


class RefundRequestSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    reason = serializers.CharField()


class ProcessRefundSerializer(serializers.Serializer):
    reference = serializers.CharField(
        max_length=Refund._meta.get_field("reference").max_length,
        help_text="Référence du remboursement chez l'opérateur",
    )


class RefundPageSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = BackofficeRefundSerializer(many=True)


class RefundProcessResultSerializer(serializers.Serializer):
    refund = BackofficeRefundSerializer()
    order_refunded = serializers.BooleanField(
        help_text="La commande est passée à « remboursée » avec ce marquage"
    )
