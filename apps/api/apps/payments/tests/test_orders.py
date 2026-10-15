"""Commandes (API-L3b.1, D37, D38, D12, C10) : prix serveur, payeur ≠ bénéficiaire, stock réservé, jeton invité."""

from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.catalog.tests.factories import CourseFactory
from apps.payments.models import Order
from apps.payments.orders import hash_token, order_for_guest, release_expired_orders
from apps.payments.tasks import release_expired_reservations
from apps.payments.tests.factories import OrderFactory, link_child
from apps.shop.models import StockReservation
from apps.shop.tests.factories import DeliveryZoneFactory, KitFactory

URL = "/api/payments/orders/"
pytestmark = pytest.mark.django_db


def client_for(user=None, **kwargs):
    client = APIClient(**kwargs)
    if user is not None:
        client.force_authenticate(user)
    return client


@pytest.fixture
def parent():
    return ParentFactory()


@pytest.fixture
def child(parent):
    return link_child(parent)


@pytest.fixture
def course():
    return CourseFactory(paid=True, price=15000)


@pytest.fixture
def zone():
    return DeliveryZoneFactory(fee=1500)


@pytest.fixture
def kit():
    return KitFactory(price=35000, stock_quantity=3)


def course_order(child, course, **extra):
    return {
        "kind": "course",
        "items": [{"courseSlug": course.slug}],
        "beneficiaryId": child.pk,
        **extra,
    }


def address(zone, **extra):
    return {
        "zoneId": zone.pk,
        "recipientName": "Marie Houngbo",
        "city": "Cotonou",
        "district": "Akpakpa",
        "addressLine": "Rue 12, près du marché",
        **extra,
    }


def kit_order(kit, zone, quantity=1, **extra):
    return {
        "kind": "kit",
        "items": [{"kitSlug": kit.slug, "quantity": quantity}],
        "deliveryAddress": address(zone),
        **extra,
    }


GUEST = {"firstName": "Awa", "lastName": "Dossou", "phone": "01 97 00 00 55"}


# --- Parcours --------------------------------------------------------------------------------


def test_parent_orders_a_course_for_a_child_at_the_server_price(parent, child, course):
    payload = course_order(
        child, course, total=1, items=[{"courseSlug": course.slug, "unitPrice": 1}]
    )
    resp = client_for(parent).post(URL, payload, format="json")
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert (body["kind"], body["status"], body["subtotal"], body["total"]) == (
        "course",
        "pending",
        15000,
        15000,
    )
    assert body["items"] == [
        {
            "id": body["items"][0]["id"],
            "title": course.title,
            "courseSlug": course.slug,
            "kitSlug": None,
            "eventSlug": None,
            "unitPrice": 15000,
            "quantity": 1,
            "total": 15000,
        }
    ]
    assert body["beneficiary"] == {"id": child.pk, "firstName": child.first_name}
    assert body["reference"].startswith("CMD-") and body["guestToken"] is None
    order = Order.objects.get(reference=body["reference"])
    assert (order.payer, order.beneficiary, order.shipping_status) == (parent, child, "")
    assert order.expires_at > timezone.now() + timedelta(minutes=29)


@pytest.mark.parametrize(
    ("change", "field", "code"),
    [
        (
            lambda c, o: o.update(beneficiaryId=None) or o.pop("beneficiaryId"),
            "beneficiaryId",
            "REQUIRED",
        ),
        (lambda c, o: o.update(beneficiaryId=LearnerFactory().pk), "beneficiaryId", "NOT_FOUND"),
        (lambda c, o: o.update(items=[{"courseSlug": "inconnu"}]), "items", "NOT_FOUND"),
        (
            lambda c, o: o.update(items=[{"courseSlug": c.slug}, {"courseSlug": c.slug}]),
            "items",
            "INVALID",
        ),
        (lambda c, o: o.update(items=[{"courseSlug": c.slug, "quantity": 2}]), "items", "INVALID"),
        (lambda c, o: o.update(items=[{"kitSlug": "kit"}]), "items", "INVALID"),
    ],
)
def test_course_order_validation(parent, child, course, change, field, code):
    payload = course_order(child, course)
    change(course, payload)
    resp = client_for(parent).post(URL, payload, format="json")
    assert resp.status_code == 400
    assert resp.json()["fields"][field][0]["code"] == code, resp.json()


def test_order_needs_items(parent, child, course):
    resp = client_for(parent).post(URL, course_order(child, course, items=[]), format="json")
    assert resp.json()["fields"]["items"]["nonFieldErrors"][0]["code"] == "EMPTY"


@pytest.mark.parametrize(
    ("course_kwargs", "code"),
    [
        ({"draft": True, "paid": True}, "NOT_FOUND"),
        ({}, "COURSE_FREE"),
        ({"paid": True, "required_kit": "kit"}, "KIT_CODE_REQUIRED"),
    ],
)
def test_course_that_cannot_be_bought(parent, child, course_kwargs, code):
    if course_kwargs.get("required_kit"):
        course_kwargs["required_kit"] = KitFactory()
    course = CourseFactory(**course_kwargs)
    resp = client_for(parent).post(URL, course_order(child, course), format="json")
    assert resp.status_code == 400
    assert resp.json()["fields"]["items"][0]["code"] == code


def test_course_already_bought_for_the_child(parent, child, course):
    OrderFactory(payer=parent, beneficiary=child, paid=True, items=[])
    Order.objects.get().items.create(course=course, title="x", unit_price=15000, total=15000)
    resp = client_for(parent).post(URL, course_order(child, course), format="json")
    assert resp.json()["fields"]["items"][0]["code"] == "ALREADY_PURCHASED"


def test_learner_cannot_order(course):
    learner = LearnerFactory()
    resp = client_for(learner).post(
        URL, {"kind": "course", "items": [{"courseSlug": course.slug}]}, format="json"
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == "PARENT_APPROVAL_REQUIRED"
    assert not Order.objects.exists()


def test_teacher_cannot_order(course):
    resp = client_for(TeacherFactory()).post(URL, {"kind": "course", "items": []}, format="json")
    assert resp.status_code == 403 and resp.json()["code"] == "PERMISSION_DENIED"


def test_anonymous_cannot_order_a_course(course):
    resp = client_for().post(
        URL, {"kind": "course", "items": [{"courseSlug": course.slug}]}, format="json"
    )
    assert resp.status_code == 401


# --- Kits ------------------------------------------------------------------------------------


def test_parent_orders_kits_with_delivery_and_stock_reserved(parent, child, kit, zone):
    payload = kit_order(kit, zone, quantity=2, beneficiaryId=child.pk)
    resp = client_for(parent).post(URL, payload, format="json")
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert (body["subtotal"], body["shippingFee"], body["total"]) == (70000, 1500, 71500)
    assert body["shippingStatus"] == "preparing"
    assert body["deliveryZone"] == {
        "id": zone.pk,
        "name": zone.name,
        "delayLabel": zone.delay_label,
    }
    assert body["deliveryAddress"] == {
        "recipientName": "Marie Houngbo",
        "phone": parent.phone,
        "country": "BJ",
        "zone": zone.name,
        "city": "Cotonou",
        "district": "Akpakpa",
        "addressLine": "Rue 12, près du marché",
    }
    kit.refresh_from_db()
    assert kit.stock_quantity == 1
    reservation = StockReservation.objects.get()
    assert (reservation.kit, reservation.quantity) == (kit, 2)
    assert reservation.expires_at == Order.objects.get().expires_at


def test_kit_order_needs_an_active_delivery_zone(parent, kit, zone):
    payload = kit_order(kit, zone)
    del payload["deliveryAddress"]
    resp = client_for(parent).post(URL, payload, format="json")
    assert resp.json()["fields"]["deliveryAddress"][0]["code"] == "REQUIRED"
    zone.active = False
    zone.save()
    resp = client_for(parent).post(URL, kit_order(kit, zone), format="json")
    assert resp.json()["fields"]["deliveryAddress"][0]["code"] == "DELIVERY_ZONE_UNAVAILABLE"


@pytest.mark.parametrize(
    "items",
    [
        [{"kitSlug": "k"}, {"kitSlug": "k"}],
        [{"courseSlug": "p"}],
        [{"kitSlug": "absent"}],
        [{"kitSlug": "k", "quantity": 11}],
    ],
)
def test_kit_order_items_validation(parent, zone, items):
    KitFactory(slug="k")
    payload = {"kind": "kit", "items": items, "deliveryAddress": address(zone)}
    resp = client_for(parent).post(URL, payload, format="json")
    assert resp.status_code == 400 and "items" in resp.json()["fields"]


def test_withdrawn_kit_cannot_be_ordered(parent, zone):
    kit = KitFactory(withdrawn=True)
    resp = client_for(parent).post(URL, kit_order(kit, zone), format="json")
    assert resp.json()["fields"]["items"][0]["code"] == "NOT_FOUND"


def test_out_of_stock_reserves_nothing(parent, zone, kit):
    other = KitFactory(stock_quantity=5)
    payload = kit_order(kit, zone, quantity=4)
    payload["items"].append({"kitSlug": other.slug, "quantity": 1})
    resp = client_for(parent).post(URL, payload, format="json")
    assert resp.status_code == 409 and resp.json()["code"] == "OUT_OF_STOCK"
    other.refresh_from_db()
    kit.refresh_from_db()
    assert (kit.stock_quantity, other.stock_quantity) == (3, 5)
    assert not Order.objects.exists()


def test_last_kit_ordered_twice_only_one_succeeds(parent, zone):
    kit = KitFactory(stock_quantity=1)
    first = client_for(parent).post(URL, kit_order(kit, zone), format="json")
    second = client_for(ParentFactory()).post(URL, kit_order(kit, zone), format="json")
    assert (first.status_code, second.status_code) == (201, 409)
    kit.refresh_from_db()
    assert kit.stock_quantity == 0


# --- Invité (D12, C10) -----------------------------------------------------------------------


def test_guest_orders_kits_and_follows_the_order_with_its_token(kit, zone):
    resp = client_for().post(URL, kit_order(kit, zone, guest=GUEST), format="json")
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    token = body["guestToken"]
    assert token and len(token) >= 40
    order = Order.objects.get()
    assert (order.payer, order.guest_phone, order.guest_first_name) == (
        None,
        "+2290197000055",
        "Awa",
    )
    assert order.guest_access_token_hash == hash_token(token) and token not in str(order.__dict__)
    assert body["deliveryAddress"]["phone"] == "+2290197000055"

    url = f"{URL}{order.reference}/"
    followed = client_for().get(url, headers={"X-Guest-Token": token})
    assert followed.status_code == 200 and followed.json()["reference"] == order.reference
    assert client_for().get(url).status_code == 404
    assert client_for().get(url, headers={"X-Guest-Token": "faux"}).status_code == 404


def test_guest_token_of_another_order_is_refused(kit, zone):
    first = client_for().post(URL, kit_order(kit, zone, guest=GUEST), format="json").json()
    second = client_for().post(URL, kit_order(kit, zone, guest=GUEST), format="json").json()
    url = f"{URL}{second['reference']}/"
    assert client_for().get(url, headers={"X-Guest-Token": first["guestToken"]}).status_code == 404
    assert order_for_guest(OrderFactory().reference, first["guestToken"]) is None


def test_guest_must_say_who_they_are(kit, zone):
    resp = client_for().post(URL, kit_order(kit, zone), format="json")
    assert resp.json()["fields"]["guest"][0]["code"] == "REQUIRED"
    bad_phone = {**GUEST, "phone": "12"}
    resp = client_for().post(URL, kit_order(kit, zone, guest=bad_phone), format="json")
    assert resp.json()["fields"]["guest"]["phone"][0]["code"] == "PHONE_INVALID"


def test_guest_cannot_choose_a_beneficiary(kit, zone):
    payload = kit_order(kit, zone, guest=GUEST, beneficiaryId=LearnerFactory().pk)
    assert (
        client_for().post(URL, payload, format="json").json()["fields"]["beneficiaryId"][0]["code"]
        == "NOT_FOUND"
    )


def test_parent_guest_details_are_ignored(parent, kit, zone):
    resp = client_for(parent).post(URL, kit_order(kit, zone, guest=GUEST), format="json")
    assert resp.status_code == 201 and resp.json()["guestToken"] is None
    assert Order.objects.get().guest_phone == ""


def test_guest_order_requires_csrf(kit, zone):
    resp = client_for(enforce_csrf_checks=True).post(
        URL, kit_order(kit, zone, guest=GUEST), format="json"
    )
    assert resp.status_code == 403


def test_order_creation_is_throttled(monkeypatch, kit, zone):
    rates = {**SimpleRateThrottle.THROTTLE_RATES, "orders": "1/hour"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)
    assert (
        client_for().post(URL, kit_order(kit, zone, guest=GUEST), format="json").status_code == 201
    )
    resp = client_for().post(URL, kit_order(kit, zone, guest=GUEST), format="json")
    assert resp.status_code == 429 and resp.json()["code"] == "THROTTLED"


# --- Lecture ---------------------------------------------------------------------------------


def test_parent_lists_the_orders_they_paid(parent):
    mine = OrderFactory(payer=parent)
    OrderFactory(payer=parent, paid=True)
    OrderFactory()
    resp = client_for(parent).get(URL)
    assert resp.json()["count"] == 2
    resp = client_for(parent).get(URL, {"status": "pending"})
    assert [o["reference"] for o in resp.json()["results"]] == [mine.reference]
    assert client_for(parent).get(URL, {"status": "inconnu"}).status_code == 400


def test_beneficiary_reads_their_orders_without_the_delivery_address(parent, child, kit, zone):
    client_for(parent).post(URL, kit_order(kit, zone, beneficiaryId=child.pk), format="json")
    order = Order.objects.get()
    listed = client_for(child).get(URL).json()["results"]
    assert [o["reference"] for o in listed] == [order.reference]
    assert "deliveryAddress" not in listed[0]
    detail = client_for(child).get(f"{URL}{order.reference}/").json()
    assert "deliveryAddress" not in detail
    assert "deliveryAddress" in client_for(parent).get(f"{URL}{order.reference}/").json()


def test_orders_of_others_are_not_found(parent):
    other = OrderFactory()
    assert client_for(parent).get(f"{URL}{other.reference}/").status_code == 404
    assert client_for(other.beneficiary).get(f"{URL}{OrderFactory().reference}/").status_code == 404
    assert client_for(TeacherFactory()).get(f"{URL}{other.reference}/").status_code == 404


def test_order_list_is_reserved_to_parents_and_learners():
    assert client_for().get(URL).status_code == 401
    assert client_for(TeacherFactory()).get(URL).status_code == 403


# --- Expiration (D38) ------------------------------------------------------------------------


def test_expired_orders_are_cancelled_and_their_stock_released(parent, kit, zone):
    client_for(parent).post(URL, kit_order(kit, zone, quantity=2), format="json")
    order = Order.objects.get()
    paid = OrderFactory(paid=True, expires_at=timezone.now() - timedelta(hours=1))
    assert release_expired_orders() == 0
    Order.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    assert release_expired_reservations() == 1
    order.refresh_from_db()
    kit.refresh_from_db()
    assert order.status == Order.Status.CANCELLED and kit.stock_quantity == 3
    assert StockReservation.objects.get().released_at is not None
    paid.refresh_from_db()
    assert paid.status == Order.Status.PAID
    call_command("release_expired_reservations")
    kit.refresh_from_db()
    assert kit.stock_quantity == 3  # rendu une seule fois


def test_order_paid_while_expiring_is_left_alone(parent, kit, zone, monkeypatch):
    client_for(parent).post(URL, kit_order(kit, zone), format="json")
    order = Order.objects.get()
    Order.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    original = Order.objects.select_for_update

    def paid_meanwhile():
        Order.objects.filter(pk=order.pk).update(status=Order.Status.PAID)
        return original()

    monkeypatch.setattr(Order.objects, "select_for_update", paid_meanwhile)
    assert release_expired_orders() == 0


def test_order_properties():
    order = OrderFactory(expires_at=timezone.now() - timedelta(seconds=1))
    assert order.is_expired and not order.is_guest and str(order) == order.reference
    item = order.items.get()
    assert str(item) == f"{item.title} × 1"


@pytest.mark.django_db(transaction=True)
def test_last_kit_ordered_concurrently_only_one_succeeds():
    """Deux commandes simultanées du dernier kit : le verrou du kit n'en laisse passer qu'une."""
    import threading

    from django.db import connection

    from apps.payments import pricing
    from apps.payments.orders import create_order
    from libs.errors import ApiError

    kit = KitFactory(stock_quantity=1)
    zone = DeliveryZoneFactory()
    payers = [ParentFactory(), ParentFactory()]
    barrier = threading.Barrier(2)
    outcomes = []

    def order(payer):
        try:
            barrier.wait()
            create_order(
                kind="kit",
                quote=pricing.quote([pricing.kit_line(kit, 1)], zone),
                payer=payer,
                delivery_zone=zone,
            )
            outcomes.append("ok")
        except ApiError as error:
            outcomes.append(error.default_code)
        finally:
            connection.close()

    threads = [threading.Thread(target=order, args=(payer,)) for payer in payers]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sorted(outcomes) == ["OUT_OF_STOCK", "ok"]
    kit.refresh_from_db()
    assert kit.stock_quantity == 0 and Order.objects.count() == 1
