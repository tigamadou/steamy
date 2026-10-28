"""Panier côté serveur (D38) et adresse de livraison (WD19, WK05) : parent ou apprenant, chacun le sien."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.shop.models import Cart, CartItem, DeliveryAddress

from .factories import DeliveryZoneFactory, KitFactory

pytestmark = pytest.mark.django_db

CART = "/api/shop/cart/"
ITEMS = "/api/shop/cart/items/"
ADDRESS = "/api/accounts/me/delivery-address/"


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


@pytest.fixture(params=[ParentFactory, LearnerFactory], ids=["parent", "apprenant"])
def shopper(request):
    return request.param()


def test_empty_cart(shopper):
    assert client_for(shopper).get(CART).json() == {
        "items": [],
        "count": 0,
        "subtotal": 0,
        "taxes": [],
        "total": 0,
    }


def test_add_update_and_remove_kits(shopper):
    kit = KitFactory(price=35000)
    client = client_for(shopper)
    resp = client.post(ITEMS, {"kitSlug": kit.slug, "quantity": 2}, format="json")
    assert resp.status_code == 201
    body = resp.json()
    assert (body["count"], body["subtotal"]) == (2, 70000)
    item = body["items"][0]
    assert (item["kit"]["slug"], item["quantity"], item["total"]) == (kit.slug, 2, 70000)
    assert "stockQuantity" not in item["kit"]

    again = client.post(ITEMS, {"kitSlug": kit.slug, "quantity": 9}, format="json").json()
    assert again["items"][0]["quantity"] == 10  # plafonné

    updated = client.patch(f"{ITEMS}{item['id']}/", {"quantity": 1}, format="json").json()
    assert updated["subtotal"] == 35000
    removed = client.delete(f"{ITEMS}{item['id']}/")
    assert removed.status_code == 200  # le contrat annonce 200 avec le panier, pas 204
    assert removed.json()["items"] == []


@pytest.mark.parametrize(
    ("kit_kwargs", "status", "code"),
    [
        ({"withdrawn": True}, 404, "NOT_FOUND"),
        ({"out_of_stock": True}, 409, "OUT_OF_STOCK"),
    ],
)
def test_unavailable_kits_cannot_be_added(shopper, kit_kwargs, status, code):
    kit = KitFactory(**kit_kwargs)
    resp = client_for(shopper).post(ITEMS, {"kitSlug": kit.slug}, format="json")
    assert resp.status_code == status and resp.json()["code"] == code


def test_quantity_bounds(shopper):
    kit = KitFactory()
    client = client_for(shopper)
    assert (
        client.post(ITEMS, {"kitSlug": kit.slug, "quantity": 11}, format="json").status_code == 400
    )
    item = client.post(ITEMS, {"kitSlug": kit.slug}, format="json").json()["items"][0]
    assert client.patch(f"{ITEMS}{item['id']}/", {"quantity": 0}, format="json").status_code == 400


def test_cart_items_of_others_are_not_found(shopper):
    other_item = CartItem.objects.create(
        cart=Cart.objects.create(user=ParentFactory()), kit=KitFactory()
    )
    client = client_for(shopper)
    assert (
        client.patch(f"{ITEMS}{other_item.pk}/", {"quantity": 2}, format="json").status_code == 404
    )
    assert client.delete(f"{ITEMS}{other_item.pk}/").status_code == 404
    other_item.refresh_from_db()
    assert other_item.quantity == 1 and str(other_item.cart).startswith("Panier de")
    assert str(other_item) == f"{other_item.kit} × 1"


@pytest.mark.parametrize("url", [CART, ADDRESS])
def test_cart_and_address_are_for_parents_and_learners(url):
    assert client_for().get(url).status_code == 401
    assert client_for(TeacherFactory()).get(url).status_code == 403


def test_delivery_address_is_saved_and_reused(shopper):
    zone = DeliveryZoneFactory()
    client = client_for(shopper)
    assert client.get(ADDRESS).status_code == 404
    payload = {
        "zoneId": zone.pk,
        "recipientName": "Marie Houngbo",
        "phone": "01 97 00 00 07",
        "city": "Cotonou",
        "district": "",
        "addressLine": "Rue 12",
    }
    resp = client.put(ADDRESS, payload, format="json")
    assert resp.status_code == 200, resp.json()
    assert resp.json()["phone"] == "+2290197000007"
    assert resp.json()["zone"]["name"] == zone.name
    resp = client.put(ADDRESS, {**payload, "city": "Porto-Novo"}, format="json")
    assert client.get(ADDRESS).json()["city"] == "Porto-Novo"
    address = DeliveryAddress.objects.get()
    assert address.user == shopper and str(address) == "Marie Houngbo, Porto-Novo"


def test_delivery_address_needs_an_active_zone(shopper):
    zone = DeliveryZoneFactory(active=False)
    resp = client_for(shopper).put(
        ADDRESS,
        {"zoneId": zone.pk, "recipientName": "M", "city": "C", "addressLine": "R"},
        format="json",
    )
    assert resp.status_code == 400 and "zoneId" in resp.json()["fields"]
