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
