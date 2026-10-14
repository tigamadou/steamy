# apps/payments/serializers.py
from rest_framework import serializers

from .models import Order, OrderItem, Payment, Refund


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "title", "content_type", "object_id", "unit_price", "quantity", "total"]

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ["id", "reference", "user", "total", "currency", "paid", "created_at", "items"]
        read_only_fields = ["paid", "created_at"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        # generate a reference if not provided
        import uuid
        if not validated_data.get("reference"):
            validated_data["reference"] = f"ORD-{uuid.uuid4().hex[:10].upper()}"
        order = Order.objects.create(**validated_data)
        total = 0
        for it in items_data:
            subtotal = it.get("unit_price") * it.get("quantity", 1)
            it["total"] = subtotal
            OrderItem.objects.create(order=order, **it)
            total += subtotal
        order.total = total
        order.save()
        return order

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id","order","provider","provider_transaction_id","amount","currency","success","created_at","provider_payload"]

class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = ["id","payment","amount","reason","created_at","processed","provider_refund_id"]
