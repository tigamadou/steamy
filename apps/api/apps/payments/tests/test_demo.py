"""Jeu de démonstration du commerce (critères de fin d'API-L3b) : idempotent, couvre commande, demande, candidature."""

import pytest
from django.core.management import call_command

from apps.events.models import EventApplication
from apps.payments.models import Invoice, KitCode, Order, PaymentRequest
from apps.shop.models import DeliveryAddress, DeliveryZone

pytestmark = pytest.mark.django_db


def snapshot():
    return (
        DeliveryZone.objects.count(),
        Order.objects.count(),
        KitCode.objects.count(),
        PaymentRequest.objects.count(),
        EventApplication.objects.count(),
    )


def test_seed_covers_the_commerce_and_is_idempotent():
    call_command("seed_demo")
    first = snapshot()
    call_command("seed_demo")
    assert snapshot() == first == (3, 1, 1, 1, 1)
    order = Order.objects.get()
    assert (order.payer.first_name, order.beneficiary.first_name) == ("Marie", "Léa")
    assert (
        order.status == Order.Status.PAID and order.shipping_status == Order.ShippingStatus.SHIPPED
    )
    assert Invoice.objects.filter(order=order).exists()
    assert DeliveryAddress.objects.get().user == order.payer
    assert PaymentRequest.objects.get().status == PaymentRequest.Status.PENDING
    application = EventApplication.objects.get()
    assert application.status == EventApplication.Status.PENDING_PARENT
