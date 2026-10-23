"""
Taxes sur la commande (C25.2) : les tarifs sont HT, la TVA et l'AIB activées s'ajoutent au total à payer, figées à
la création de la commande ; c'est ce total qui est débité et attendu par le webhook.
"""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import ParentFactory
from apps.catalog.tests.factories import CourseFactory
from apps.core.models import PlatformSettings
from apps.payments.models import Order, Payment
from apps.payments.providers import PaymentEvent, PaymentStatus
from apps.payments.taxes import taxes_share
from apps.payments.utils import handle_payment_event
from apps.shop.models import CartItem
from apps.shop.tests.factories import DeliveryZoneFactory, KitFactory

from .factories import OrderFactory, link_child, load_referentials

pytestmark = pytest.mark.django_db

ORDERS = "/api/payments/orders/"
VAT = {"vat_enabled": True, "vat_rate": Decimal("18")}
AIB = {"aib_enabled": True, "aib_rate": Decimal("5")}


def configure(**fields):
    config = PlatformSettings.load()
    for name, value in fields.items():
        setattr(config, name, value)
    config.full_clean()
    config.save()


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def order_course(parent, price=10000):
    child = link_child(parent)
    course = CourseFactory(paid=True, price=price)
    resp = client_for(parent).post(
        ORDERS,
        {"kind": "course", "items": [{"courseSlug": course.slug}], "beneficiaryId": child.pk},
        format="json",
    )
    assert resp.status_code == 201, resp.json()
    return resp.json()


@pytest.mark.parametrize(
    ("fields", "taxes", "total"),
    [
        ({}, [], 10000),
        (VAT, [("vat", "18", 10000, 1800)], 11800),
        (AIB, [("aib", "5", 10000, 500)], 10500),
        ({**VAT, **AIB}, [("vat", "18", 10000, 1800), ("aib", "5", 10000, 500)], 12300),
    ],
    ids=["aucune", "TVA seule", "AIB seule", "les deux"],
)
def test_the_debited_amount_is_ht_plus_taxes(
    fields, taxes, total, django_capture_on_commit_callbacks
):
    load_referentials()
    configure(**fields)
    parent = ParentFactory()
    body = order_course(parent)
    assert (body["subtotal"], body["shippingFee"], body["total"]) == (10000, 0, total)
    assert [(t["code"], t["rate"], t["base"], t["amount"]) for t in body["taxes"]] == taxes
    order = Order.objects.get(reference=body["reference"])
    assert order.total == total and order.vat_amount + order.aib_amount == total - 10000

    with django_capture_on_commit_callbacks(execute=True):
        resp = client_for(parent).post(
            f"{ORDERS}{order.reference}/payments/",
            {"country": "BJ", "network": "mtn", "msisdn": "+2290197000001"},
            format="json",
        )
    assert resp.json()["amount"] == total
    order.refresh_from_db()
    assert order.status == Order.Status.PAID
    assert Payment.objects.get(order=order).amount == total


def test_taxes_are_frozen_at_creation_and_the_webhook_expects_the_frozen_total():
    load_referentials()
    configure(**VAT)
    parent = ParentFactory()
    order = Order.objects.get(reference=order_course(parent)["reference"])
    configure(vat_rate=Decimal("5"), aib_enabled=True, aib_rate=Decimal("5"))
    order.refresh_from_db()
    assert (order.total, order.vat_amount, order.aib_amount) == (11800, 1800, 0)
    assert order.taxes == {"vat": {"rate": "18", "base": 10000, "amount": 1800}, "aib": None}
    shown = client_for(parent).get(f"{ORDERS}{order.reference}/").json()
    assert shown["total"] == 11800 and [t["code"] for t in shown["taxes"]] == ["vat"]

    payment = Payment.objects.create(
        order=order,
        provider="fake",
        country="BJ",
        network="mtn",
        msisdn="+2290197000001",
        amount=11800,
        provider_transaction_id="tx-1",
    )
    ht_only = PaymentEvent(order.reference, "tx-ht", 10000, "XOF", PaymentStatus.SUCCEEDED)
    assert handle_payment_event("fake", ht_only) is False
    order.refresh_from_db()
    assert order.status == Order.Status.PENDING
    frozen = PaymentEvent(
        order.reference, payment.provider_transaction_id, 11800, "XOF", PaymentStatus.SUCCEEDED
    )
    handle_payment_event("fake", frozen)
    order.refresh_from_db()
    assert order.status == Order.Status.PAID


def test_shipping_is_taxed_according_to_the_switches():
    load_referentials()
    configure(**VAT, **AIB, aib_applies_to_shipping=False)
    parent = ParentFactory()
    kit = KitFactory(price=20000)
    zone = DeliveryZoneFactory(fee=2000)
    resp = client_for(parent).post(
        ORDERS,
        {
            "kind": "kit",
            "items": [{"kitSlug": kit.slug, "quantity": 1}],
            "deliveryAddress": {
                "zoneId": zone.pk,
                "recipientName": "Marie Houngbo",
                "city": "Cotonou",
                "district": "Akpakpa",
                "addressLine": "Rue 12",
            },
        },
        format="json",
    )
    body = resp.json()
    assert resp.status_code == 201, body
    # TVA sur 22 000 (livraison incluse) = 3 960 ; AIB sur 20 000 (livraison exclue) = 1 000
    assert [(t["code"], t["base"], t["amount"]) for t in body["taxes"]] == [
        ("vat", 22000, 3960),
        ("aib", 20000, 1000),
    ]
    assert body["total"] == 20000 + 2000 + 3960 + 1000


def test_cart_shows_the_taxes_without_shipping():
    configure(**AIB)
    parent = ParentFactory()
    kit = KitFactory(price=20000)
    client = client_for(parent)
    client.post("/api/shop/cart/items/", {"kitSlug": kit.slug, "quantity": 2}, format="json")
    body = client.get("/api/shop/cart/").json()
    assert (body["subtotal"], body["total"]) == (40000, 42000)
    assert body["taxes"] == [{"code": "aib", "rate": "5", "base": 40000, "amount": 2000}]
    assert CartItem.objects.count() == 1


def test_payment_request_shows_the_taxes_on_the_ht_amount():
    load_referentials()
    configure(**VAT)
    parent = ParentFactory(first_name="Marie")
    child = link_child(parent)
    course = CourseFactory(paid=True, price=10000)
    created = client_for(child).post(
        "/api/payments/payment-requests/",
        {"kind": "course", "courseSlug": course.slug},
        format="json",
    )
    body = created.json()
    assert created.status_code == 201, body
    assert (body["amount"], body["total"]) == (10000, 11800)
    assert body["taxes"] == [{"code": "vat", "rate": "18", "base": 10000, "amount": 1800}]


def test_a_refunded_share_includes_its_part_of_the_taxes():
    order = OrderFactory(subtotal=10000, vat_amount=1800, aib_amount=500, total=12300)
    assert taxes_share(order, 10000) == 2300
    assert taxes_share(order, 2500) == 575
    empty = OrderFactory(subtotal=0, total=0, items=[])
    assert taxes_share(empty, 0) == 0
