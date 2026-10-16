"""Admin du commerce (Finance, D71) : pages servies ; commandes et paiements en lecture seule."""

import pytest
from django.urls import reverse

from apps.core.tests.staff import verified_client
from apps.payments.models import Invoice, Refund
from apps.shop.models import StockReservation
from apps.shop.tests.factories import DeliveryZoneFactory, KitFactory

from .factories import OrderItemFactory, PaymentFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_client(client):
    verified_client(client, is_superuser=True)  # session vérifiée par TOTP (WAD15)
    return client


@pytest.fixture
def objects():
    payment = PaymentFactory()
    order = payment.order
    item = OrderItemFactory(order=order, course=None, kit=KitFactory())
    reservation = StockReservation.objects.create(
        kit=item.kit, order_item=item, quantity=1, expires_at=order.expires_at
    )
    invoice = Invoice.objects.create(order=order, number="FAC-2026-000001")
    refund = Refund.objects.create(payment=payment, amount=1000)
    return {
        "payments_order": order,
        "payments_payment": payment,
        "payments_invoice": invoice,
        "payments_refund": refund,
        "shop_deliveryzone": DeliveryZoneFactory(),
        "shop_stockreservation": reservation,
    }


@pytest.mark.parametrize(
    "model",
    [
        "payments_order",
        "payments_payment",
        "payments_invoice",
        "payments_refund",
        "shop_deliveryzone",
        "shop_stockreservation",
    ],
)
def test_admin_pages_are_served(admin_client, objects, model):
    obj = objects[model]
    assert admin_client.get(reverse(f"admin:{model}_changelist")).status_code == 200
    assert admin_client.get(reverse(f"admin:{model}_change", args=[obj.pk])).status_code == 200
    assert str(obj)


@pytest.mark.parametrize("model", ["payments_order", "payments_payment", "shop_stockreservation"])
def test_orders_and_payments_are_never_created_by_hand(admin_client, model):
    assert admin_client.get(reverse(f"admin:{model}_add")).status_code == 403
