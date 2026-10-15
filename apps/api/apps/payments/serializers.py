# apps/payments/serializers.py
from rest_framework import serializers

from .models import Order, OrderItem, Payment, Refund


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "title", "content_type", "object_id", "unit_price", "quantity", "total"]
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "reference", "user", "total", "currency", "paid", "created_at", "items"]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "provider",
            "provider_transaction_id",
            "amount",
            "currency",
            "success",
            "created_at",
        ]
        # La charge brute du prestataire reste côté serveur.
        read_only_fields = fields


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = [
            "id",
            "payment",
            "amount",
            "reason",
            "created_at",
            "processed",
            "provider_refund_id",
        ]
