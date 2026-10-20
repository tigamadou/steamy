"""
Commande qui règle la demande de paiement de l'enfant (WPD15, API-L4.2, D52) : type, lignes et bénéficiaire viennent
de la demande ; payée, la demande passe à `paid` ; seul le parent destinataire peut la régler.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import ParentFactory
from apps.catalog.tests.factories import CourseFactory
from apps.payments.models import Order, PaymentRequest
from apps.payments.providers import PaymentEvent, PaymentStatus
from apps.payments.utils import handle_payment_event
from apps.shop.tests.factories import DeliveryZoneFactory, KitFactory

from .factories import PaymentFactory, link_child

pytestmark = pytest.mark.django_db
ORDERS = "/api/payments/orders/"
REQUESTS = "/api/payments/payment-requests/"


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


@pytest.fixture
def parent():
    return ParentFactory()


@pytest.fixture
def child(parent):
    return link_child(parent)


def ask(child, payload):
    resp = client_for(child).post(REQUESTS, payload, format="json")
    assert resp.status_code == 201, resp.json()
    return PaymentRequest.objects.get(pk=resp.json()["id"])


def test_the_parent_pays_the_course_requested_by_the_child(parent, child):
    course = CourseFactory(paid=True, price=15000)
    request = ask(child, {"kind": "course", "courseSlug": course.slug})
    resp = client_for(parent).post(
        ORDERS, {"paymentRequestId": request.pk, "kind": "kit"}, format="json"
    )
    assert resp.status_code == 201, resp.json()
    order = Order.objects.get(reference=resp.json()["reference"])
    assert (order.kind, order.beneficiary, order.total) == (Order.Kind.COURSE, child, 15000)
    assert order.payment_request == request
    payment = PaymentFactory(order=order)
    handle_payment_event(
        "fake",
        PaymentEvent(
            order.reference,
            payment.provider_transaction_id,
            order.total,
            "XOF",
            PaymentStatus.SUCCEEDED,
        ),
    )
    request.refresh_from_db()
    assert request.status == PaymentRequest.Status.PAID


def test_kits_requested_by_the_child_need_the_delivery_address(parent, child):
    kit = KitFactory(price=20000, stock_quantity=5)
    request = ask(child, {"kind": "kit", "items": [{"kitSlug": kit.slug, "quantity": 2}]})
    client = client_for(parent)
    resp = client.post(ORDERS, {"paymentRequestId": request.pk}, format="json")
    assert resp.json()["fields"]["deliveryAddress"][0]["code"] == "REQUIRED"
    address = {
        "zoneId": DeliveryZoneFactory().pk,
        "recipientName": "Marie",
        "city": "Cotonou",
        "addressLine": "Rue 12",
    }
    resp = client.post(
        ORDERS, {"paymentRequestId": request.pk, "deliveryAddress": address}, format="json"
    )
    assert resp.status_code == 201, resp.json()
    order = Order.objects.get(reference=resp.json()["reference"])
    assert (order.kind, order.beneficiary, order.subtotal) == (Order.Kind.KIT, child, 40000)


def test_only_the_recipient_parent_pays_an_open_request(parent, child):
    request = ask(child, {"kind": "course", "courseSlug": CourseFactory(paid=True).slug})
    other = client_for(ParentFactory()).post(
        ORDERS, {"paymentRequestId": request.pk}, format="json"
    )
    assert other.json()["fields"]["paymentRequestId"][0]["code"] == "NOT_FOUND"
    anonymous = client_for().post(ORDERS, {"paymentRequestId": request.pk}, format="json")
    assert anonymous.status_code == 401
    PaymentRequest.objects.filter(pk=request.pk).update(status=PaymentRequest.Status.DECLINED)
    closed = client_for(parent).post(ORDERS, {"paymentRequestId": request.pk}, format="json")
    assert closed.json()["code"] == "PAYMENT_REQUEST_CLOSED"
    assert not Order.objects.exists()


def test_without_request_kind_and_items_are_required(parent):
    resp = client_for(parent).post(ORDERS, {}, format="json")
    assert resp.json()["fields"]["kind"][0]["code"] == "REQUIRED"
    resp = client_for(parent).post(ORDERS, {"kind": "kit"}, format="json")
    assert resp.json()["fields"]["items"][0]["code"] == "REQUIRED"


def test_the_parent_resumes_the_pending_order_of_a_request(parent, child):
    """WPD15 : la commande en attente de la demande est proposée au parent (reprise du paiement), jamais à l'enfant."""
    from datetime import timedelta

    from django.utils import timezone

    course = CourseFactory(paid=True, price=15000)
    request = ask(child, {"kind": "course", "courseSlug": course.slug})
    url = f"{REQUESTS}{request.pk}/"
    assert client_for(parent).get(url).json()["pendingOrderReference"] is None
    reference = (
        client_for(parent)
        .post(ORDERS, {"paymentRequestId": request.pk}, format="json")
        .json()["reference"]
    )
    assert client_for(parent).get(url).json()["pendingOrderReference"] == reference
    assert client_for(child).get(url).json()["pendingOrderReference"] is None
    Order.objects.filter(reference=reference).update(
        expires_at=timezone.now() - timedelta(minutes=1)
    )
    assert client_for(parent).get(url).json()["pendingOrderReference"] is None


def kit_request(child, stock=5):
    kit = KitFactory(price=20000, stock_quantity=stock)
    request = ask(child, {"kind": "kit", "items": [{"kitSlug": kit.slug, "quantity": 1}]})
    return kit, request


def address(zone, line="Rue 12"):
    return {
        "zoneId": zone.pk,
        "recipientName": "Marie Test",
        "city": "Cotonou",
        "addressLine": line,
    }


def test_two_posts_for_a_course_request_give_a_single_order(parent, child):
    """Double clic, deux onglets : la même commande en attente est reprise, jamais une seconde."""
    course = CourseFactory(paid=True, price=15000)
    request = ask(child, {"kind": "course", "courseSlug": course.slug})
    first = client_for(parent).post(ORDERS, {"paymentRequestId": request.pk}, format="json")
    second = client_for(parent).post(ORDERS, {"paymentRequestId": request.pk}, format="json")
    assert first.status_code == second.status_code == 201
    assert first.json()["reference"] == second.json()["reference"]
    assert Order.objects.filter(payment_request=request).count() == 1


def test_two_posts_for_a_kit_request_reserve_the_stock_once(parent, child):
    from apps.shop.models import StockReservation

    kit, request = kit_request(child)
    zone = DeliveryZoneFactory()
    body = {"paymentRequestId": request.pk, "deliveryAddress": address(zone)}
    refs = {
        client_for(parent).post(ORDERS, body, format="json").json()["reference"] for _ in range(2)
    }
    assert len(refs) == 1
    kit.refresh_from_db()
    assert kit.stock_quantity == 4
    assert StockReservation.objects.filter(kit=kit, released_at__isnull=True).count() == 1


def test_a_new_address_cancels_the_pending_order_and_gives_its_stock_back(parent, child):
    kit, request = kit_request(child, stock=1)
    zone = DeliveryZoneFactory()
    first = (
        client_for(parent)
        .post(
            ORDERS,
            {"paymentRequestId": request.pk, "deliveryAddress": address(zone)},
            format="json",
        )
        .json()["reference"]
    )
    # Le seul kit en stock est réservé : la nouvelle adresse le reprend après l'annulation de l'ancienne commande
    resp = client_for(parent).post(
        ORDERS,
        {"paymentRequestId": request.pk, "deliveryAddress": address(zone, "Rue 13")},
        format="json",
    )
    assert resp.status_code == 201, resp.json()
    assert resp.json()["reference"] != first
    assert Order.objects.get(reference=first).status == Order.Status.CANCELLED
    kit.refresh_from_db()
    assert kit.stock_quantity == 0


def test_an_expired_pending_order_is_replaced(parent, child):
    from datetime import timedelta

    from django.utils import timezone

    course = CourseFactory(paid=True, price=15000)
    request = ask(child, {"kind": "course", "courseSlug": course.slug})
    first = (
        client_for(parent)
        .post(ORDERS, {"paymentRequestId": request.pk}, format="json")
        .json()["reference"]
    )
    Order.objects.filter(reference=first).update(expires_at=timezone.now() - timedelta(minutes=1))
    second = (
        client_for(parent)
        .post(ORDERS, {"paymentRequestId": request.pk}, format="json")
        .json()["reference"]
    )
    assert second != first
    assert Order.objects.get(reference=first).status == Order.Status.CANCELLED


def test_declining_cancels_the_pending_order_and_gives_the_stock_back(parent, child):
    kit, request = kit_request(child)
    zone = DeliveryZoneFactory()
    reference = (
        client_for(parent)
        .post(
            ORDERS,
            {"paymentRequestId": request.pk, "deliveryAddress": address(zone)},
            format="json",
        )
        .json()["reference"]
    )
    resp = client_for(parent).post(f"{REQUESTS}{request.pk}/decline/", {}, format="json")
    assert resp.status_code == 200
    assert resp.json()["pendingOrderReference"] is None
    assert Order.objects.get(reference=reference).status == Order.Status.CANCELLED
    kit.refresh_from_db()
    assert kit.stock_quantity == 5
    # La demande close ne se règle plus
    resp = client_for(parent).post(
        ORDERS, {"paymentRequestId": request.pk, "deliveryAddress": address(zone)}, format="json"
    )
    assert resp.json()["code"] == "PAYMENT_REQUEST_CLOSED"


def test_a_late_payment_never_reopens_a_declined_request(parent, child):
    from apps.payments.requests import mark_paid

    course = CourseFactory(paid=True, price=15000)
    request = ask(child, {"kind": "course", "courseSlug": course.slug})
    order = Order.objects.get(
        reference=client_for(parent)
        .post(ORDERS, {"paymentRequestId": request.pk}, format="json")
        .json()["reference"]
    )
    PaymentRequest.objects.filter(pk=request.pk).update(status=PaymentRequest.Status.DECLINED)
    mark_paid(order)
    assert PaymentRequest.objects.get(pk=request.pk).status == PaymentRequest.Status.DECLINED
    PaymentRequest.objects.filter(pk=request.pk).update(status=PaymentRequest.Status.EXPIRED)
    mark_paid(order)
    assert PaymentRequest.objects.get(pk=request.pk).status == PaymentRequest.Status.PAID


def test_the_request_list_reads_orders_without_one_query_per_request(
    parent, child, django_assert_max_num_queries
):
    for _ in range(3):
        ask(child, {"kind": "course", "courseSlug": CourseFactory(paid=True, price=9000).slug})
    client = client_for(parent)
    with django_assert_max_num_queries(8):
        resp = client.get(REQUESTS)
    assert len(resp.json()["results"]) == 3
