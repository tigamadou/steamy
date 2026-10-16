"""Alertes de réassort (WK11, D38, D30) : un seul SMS pour un invité ou un parent, in-app pour un apprenant."""

import pytest
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.notifications.models import Notification
from apps.shop.models import RestockAlert
from apps.shop.restock import notify_restock, request_alert
from apps.shop.tasks import notify_restock_alerts

from .factories import KitFactory

pytestmark = pytest.mark.django_db


def url(kit):
    return f"/api/shop/kits/{kit.slug}/restock-alerts/"


def client_for(user=None, **kwargs):
    client = APIClient(**kwargs)
    if user is not None:
        client.force_authenticate(user)
    return client


@pytest.fixture
def kit():
    return KitFactory(out_of_stock=True, name="Steamy Bot")


def restock(kit, quantity=5):
    kit.stock_quantity = quantity
    kit.save()


def test_guest_gets_a_single_sms_when_the_kit_is_back(sms, kit):
    for _ in range(2):
        resp = client_for().post(url(kit), {"phone": "01 97 00 00 21"}, format="json")
        assert resp.status_code == 201 and resp.json() == {"ok": True}
    assert RestockAlert.objects.count() == 1
    restock(kit)
    assert "Steamy Bot est de retour" in sms.last("+2290197000021")
    assert f"/boutique/{kit.slug}" in sms.last("+2290197000021")
    restock(kit, 6)
    assert len(sms.messages("+2290197000021")) == 1


def test_parent_is_warned_by_sms_on_the_account_phone(sms, kit):
    parent = ParentFactory()
    assert (
        client_for(parent).post(url(kit), {"phone": "01 97 00 00 99"}, format="json").status_code
        == 201
    )
    restock(kit)
    assert sms.messages(parent.phone) and not sms.messages("+2290197000099")


def test_learner_is_warned_in_app_without_phone(sms, kit):
    learner = LearnerFactory()
    assert client_for(learner).post(url(kit)).status_code == 201
    alert = RestockAlert.objects.get()
    assert (alert.user, alert.phone) == (learner, "")
    restock(kit)
    notification = Notification.objects.get(user=learner)
    assert notification.url == f"/apprenant/boutique/{kit.slug}"
    assert str(alert).startswith("Steamy Bot")


def test_guest_must_give_a_valid_phone(kit):
    assert (
        client_for().post(url(kit), {}, format="json").json()["fields"]["phone"][0]["code"]
        == "REQUIRED"
    )
    resp = client_for().post(url(kit), {"phone": "12"}, format="json")
    assert resp.json()["fields"]["phone"][0]["code"] == "PHONE_INVALID"


def test_guest_alert_requires_csrf(kit):
    resp = client_for(enforce_csrf_checks=True).post(
        url(kit), {"phone": "0197000021"}, format="json"
    )
    assert resp.status_code == 403


def test_teachers_and_unknown_kits_are_refused(kit):
    assert client_for(TeacherFactory()).post(url(kit)).status_code == 403
    assert (
        client_for().post(url(KitFactory(withdrawn=True)), {"phone": "0197000021"}).status_code
        == 404
    )


def test_restock_alerts_are_throttled(monkeypatch, kit):
    rates = {**SimpleRateThrottle.THROTTLE_RATES, "restock-alert": "1/hour"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)
    assert client_for().post(url(kit), {"phone": "0197000021"}, format="json").status_code == 201
    assert client_for().post(url(kit), {"phone": "0197000022"}, format="json").status_code == 429


def test_nothing_is_sent_while_the_kit_is_out_of_stock(sms, kit):
    request_alert(kit, phone="+2290197000021")
    kit.save()
    assert notify_restock(kit.pk) == 0 and notify_restock_alerts(kit.pk) == 0
    assert RestockAlert.objects.get().notified_at is None


def test_saving_a_kit_without_pending_alerts_sends_nothing(sms, kit):
    restock(kit)
    assert sms.messages("+2290197000021") == []


def test_concurrent_request_reuses_the_pending_alert(kit, monkeypatch):
    first = request_alert(kit, phone="+2290197000021")
    calls = []
    original = RestockAlert.objects.filter

    def stale_filter(*args, **kwargs):
        calls.append(1)
        return original(pk=None) if len(calls) == 1 else original(*args, **kwargs)

    monkeypatch.setattr(RestockAlert.objects, "filter", stale_filter)
    assert request_alert(kit, phone="+2290197000021") == first
