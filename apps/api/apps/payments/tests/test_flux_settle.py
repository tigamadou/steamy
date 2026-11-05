"""Exécution post-paiement (ADR 0008 §8) : un paiement tardif non honorable est à rembourser (commande laissée
annulée, message « sera remboursé »), sauf remboursement réellement fait par l'API du prestataire."""

from unittest import mock

import pytest
from django.core import mail
from django.utils import timezone

from apps.core.models import AuditLog
from apps.notifications.models import Notification
from apps.payments.fulfillment import refund, settle
from apps.payments.models import Order, Refund
from apps.payments.providers import PaymentProviderError, RefundOutcome
from apps.payments.providers.fake import FakePaymentProvider
from apps.shop.models import StockReservation
from apps.shop.tests.factories import KitFactory

from .factories import OrderFactory, OrderItemFactory, PaymentFactory

pytestmark = pytest.mark.django_db


def cancelled_kit_order(**kwargs):
    """Commande de kit annulée à l'expiration, dont le dernier kit est parti ailleurs."""
    kit = KitFactory(stock_quantity=0)
    order = OrderFactory(
        cancelled=True, kind=Order.Kind.KIT, items=[], subtotal=kit.price, **kwargs
    )
    item = OrderItemFactory(
        order=order, course=None, kit=kit, unit_price=kit.price, title=kit.name
    )
    now = timezone.now()
    StockReservation.objects.create(
        kit=kit, order_item=item, quantity=1, expires_at=now, released_at=now
    )
    return order


def manual_refund():
    return mock.patch.object(
        FakePaymentProvider, "refund", return_value=RefundOutcome.PENDING_MANUAL
    )


def test_late_payment_not_honourable_is_left_to_finance_and_order_stays_cancelled():
    order = cancelled_kit_order()
    payment = PaymentFactory(order=order, succeeded=True)
    with manual_refund():
        settle(order, payment)
    order.refresh_from_db()
    assert order.status == Order.Status.CANCELLED
    refund_ = Refund.objects.get()
    assert (refund_.payment, refund_.amount, refund_.processed) == (payment, payment.amount, False)
    notification = Notification.objects.get(user=order.payer, type="order")
    assert notification.title == "Remboursement en cours"
    assert "sera remboursé" in notification.message and str(payment.amount) in notification.message
    assert not Notification.objects.filter(message__contains="est remboursé").exists()


def test_guest_is_told_by_sms_that_the_payment_will_be_refunded(
    django_capture_on_commit_callbacks,
):
    order = cancelled_kit_order()
    order.payer = None
    order.beneficiary = None
    order.guest_phone = "+2290197000055"
    order.guest_first_name, order.guest_last_name = "Awa", "Dossou"
    order.save()
    payment = PaymentFactory(order=order, succeeded=True)
    with manual_refund(), django_capture_on_commit_callbacks(execute=True):
        settle(order, payment)
    texts = [m.body for m in mail.outbox if m.to == ["+2290197000055@sms.test"]]
    assert texts and "sera remboursé" in texts[-1]


def test_refund_really_done_by_the_provider_marks_the_order_refunded():
    order = cancelled_kit_order()
    payment = PaymentFactory(order=order, succeeded=True)
    FakePaymentProvider().create_transaction(
        provider_tx_id=payment.provider_transaction_id,
        reference=order.reference,
        merchant_reference=payment.merchant_reference,
        amount=payment.amount,
        currency=payment.currency,
    )
    settle(order, payment)
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED
    assert Refund.objects.get().processed is True
    notification = Notification.objects.get(user=order.payer, type="order")
    assert notification.title == "Paiement remboursé" and "est remboursé" in notification.message


def test_duplicate_payment_on_a_paid_order_is_refunded_without_a_message():
    order = OrderFactory(paid=True)
    payment = PaymentFactory(order=order, succeeded=True)
    with manual_refund():
        settle(order, payment)
    order.refresh_from_db()
    assert order.status == Order.Status.PAID
    assert Refund.objects.get().payment == payment
    assert not Notification.objects.exists()


def test_refund_accepts_a_partial_amount():
    payment = PaymentFactory(succeeded=True)
    with mock.patch.object(
        FakePaymentProvider, "refund", return_value=RefundOutcome.PENDING_MANUAL
    ) as provider_refund:
        refund_ = refund(payment, "écart", amount=4000)
    assert refund_.amount == 4000
    provider_refund.assert_called_once_with(payment.provider_transaction_id, 4000)


def test_provider_refund_failure_leaves_the_refund_to_finance():
    payment = PaymentFactory(succeeded=True)
    with mock.patch.object(FakePaymentProvider, "refund", side_effect=PaymentProviderError("x")):
        refund_ = refund(payment, "test")
    assert refund_.processed is False
    audit = AuditLog.objects.get(action="payment.refunded")
    assert audit.data["outcome"] == "pending_manual"


def test_late_payment_still_honourable_is_fulfilled():
    order = OrderFactory(cancelled=True)
    payment = PaymentFactory(order=order, succeeded=True)
    settle(order, payment)
    order.refresh_from_db()
    assert order.status == Order.Status.PAID
    assert AuditLog.objects.filter(action="payment.late_honored").exists()
    assert not Refund.objects.exists()
