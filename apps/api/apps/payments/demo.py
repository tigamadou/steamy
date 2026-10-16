"""
Jeu de démonstration du commerce (D2, critères de fin d'API-L3b), appelé par `seed_demo` : zones de livraison,
adresse de Marie, une commande de kit payée par Marie pour Léa (avec Kit Code et reçu), une demande de paiement de
Léa en attente et une candidature de Léa à un événement payant. Idempotent : relancé, il ne crée rien de plus.
"""

from apps.catalog.models import Course
from apps.events.applications import apply
from apps.events.models import EventApplication, SteamyEvent
from apps.shop.models import DeliveryAddress, DeliveryZone, Kit

from . import pricing
from .fulfillment import fulfill
from .models import Order, Payment, PaymentRequest
from .orders import create_order
from .requests import create_request

#: Zones de livraison (D38) : pays, nom, frais (FCFA), délai annoncé
DELIVERY_ZONES = [
    ("BJ", "Cotonou et Abomey-Calavi", 1000, "24 à 48 h"),
    ("BJ", "Porto-Novo", 1500, "2 à 3 jours"),
    ("BJ", "Reste du Bénin", 2500, "3 à 5 jours"),
]


def seed_delivery_zones() -> DeliveryZone:
    zones = [
        DeliveryZone.objects.update_or_create(
            country_id=country,
            name=name,
            defaults={"fee": fee, "delay_label": delay, "order": order, "active": True},
        )[0]
        for order, (country, name, fee, delay) in enumerate(DELIVERY_ZONES)
    ]
    return zones[0]


def seed_commerce(accounts: dict) -> None:
    lea, marie = accounts["lea"], accounts["marie"]
    zone = seed_delivery_zones()
    DeliveryAddress.objects.update_or_create(
        user=marie,
        defaults={
            "zone": zone,
            "recipient_name": f"{marie.first_name} {marie.last_name}",
            "phone": marie.phone,
            "city": "Cotonou",
            "district": "Fidjrossè",
            "address_line": "Rue 12.045, maison aux volets bleus",
        },
    )

    # Commande de kit payée par Marie pour Léa : Kit Code et reçu (WPD07, WD14)
    kit = Kit.objects.filter(active=True, stock_quantity__gt=0).order_by("slug").first()
    if kit and not Order.objects.filter(payer=marie, kind=Order.Kind.KIT).exists():
        address = {
            "recipient_name": f"{marie.first_name} {marie.last_name}",
            "phone": marie.phone,
            "country": zone.country_id,
            "zone": zone.name,
            "city": "Cotonou",
            "district": "Fidjrossè",
            "address_line": "Rue 12.045, maison aux volets bleus",
        }
        order, _ = create_order(
            kind=Order.Kind.KIT,
            quote=pricing.quote([pricing.kit_line(kit, 1)], zone),
            payer=marie,
            beneficiary=lea,
            delivery_zone=zone,
            delivery_address=address,
        )
        payment = Payment.objects.create(
            order=order,
            provider="fake",
            provider_transaction_id=f"fake-demo-{order.reference}",
            country="BJ",
            network="mtn",
            msisdn="+2290197000001",
            amount=order.total,
            status=Payment.Status.SUCCEEDED,
        )
        fulfill(order, payment)
        Order.objects.filter(pk=order.pk).update(shipping_status=Order.ShippingStatus.SHIPPED)

    # Demande de Léa à Marie pour un parcours payant (WA02, WPD15)
    course = (
        Course.objects.filter(
            status=Course.Status.PUBLISHED, is_free=False, required_kit__isnull=True
        )
        .exclude(enrollments__learner=lea)
        .order_by("slug")
        .first()
    )
    if course and not PaymentRequest.objects.filter(requested_by=lea, course=course).exists():
        create_request(lea, kind=PaymentRequest.Kind.COURSE, amount=course.price, course=course)

    # Candidature de Léa à un événement payant, en attente de Marie (WD10, WPD06)
    events = SteamyEvent.objects.filter(status=SteamyEvent.Status.PUBLISHED, price__gt=0)
    event = next((e for e in events.order_by("starts_at") if e.applications_open), None)
    if event and not EventApplication.objects.filter(event=event, learner=lea).exists():
        apply(event, lea, applied_by=lea, motivation="Je veux tester mon robot en vrai !")
