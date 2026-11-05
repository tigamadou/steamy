"""
Traitement des remboursements par la Finance (ADR 0008 § 8) : référence obligatoire, `processed_at`/`processed_by`,
commande annulée soldée quand tous ses remboursements sont faits, message au payeur à chaque marquage.
"""

import pytest
from django.test import TestCase
from django.utils import timezone

from apps.accounts.tests.factories import StaffFactory
from apps.core.models import AuditLog
from apps.notifications.models import Notification
from apps.payments import backoffice
from apps.payments.models import KitCode, Order

from .factories import OrderFactory, OrderItemFactory, PaymentFactory, RefundFactory

pytestmark = pytest.mark.django_db


def process(refund, reference="RMB-001", user=None):
    # Le message au payeur part après la transaction (`on_commit`) : exécuté ici comme en production
    with TestCase.captureOnCommitCallbacks(execute=True):
        return backoffice.process_refund(refund, reference, user or StaffFactory())


@pytest.mark.parametrize("reference", ["", "   "])
def test_an_empty_reference_is_refused_and_nothing_is_written(reference):
    refund = RefundFactory()
    with pytest.raises(backoffice.BackofficeError, match="référence"):
        process(refund, reference)
    refund.refresh_from_db()
    assert not refund.processed and refund.reference == "" and refund.processed_at is None
    assert not AuditLog.objects.filter(action="refund.processed").exists()


def test_marking_a_refund_done_stores_who_when_and_the_reference():
    staff = StaffFactory()
    refund = RefundFactory(payment__order=OrderFactory(paid=True))
    before = timezone.now()
    assert process(refund, "  RMB-42  ", staff) is True
    refund.refresh_from_db()
    assert refund.processed and refund.reference == "RMB-42" and refund.processed_by == staff
    assert before <= refund.processed_at <= timezone.now()
    log = AuditLog.objects.get(action="refund.processed")
    assert log.actor == staff and log.data["reference"] == "RMB-42"


def test_a_second_marking_is_refused_and_keeps_the_first_reference():
    refund = RefundFactory(payment__order=OrderFactory(paid=True))
    process(refund, "RMB-1")
    refund.refresh_from_db()
    first_at = refund.processed_at
    with pytest.raises(backoffice.AlreadyProcessedError, match="déjà traité"):
        process(refund, "RMB-2")
    refund.refresh_from_db()
    assert refund.reference == "RMB-1" and refund.processed_at == first_at
    assert issubclass(backoffice.AlreadyProcessedError, backoffice.BackofficeError)


def test_a_total_refund_of_a_paid_order_makes_it_refunded_and_tells_the_payer():
    refund = RefundFactory(payment__order=OrderFactory(paid=True))
    assert process(refund) is True
    order = refund.payment.order
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED
    assert Notification.objects.filter(user=order.payer, title="Remboursement effectué").exists()


def test_a_guest_payer_is_told_by_sms():
    from django.core import mail

    order = OrderFactory(guest=True, paid=True, items=[])
    refund = RefundFactory(payment__order=order)
    process(refund)
    assert any(m.to == ["+2290197000001@sms.test"] and "remboursé" in m.body for m in mail.outbox)


def kit_order(**fields):
    from apps.shop.tests.factories import KitFactory

    order = OrderFactory(kind=Order.Kind.KIT, items=[], shipping_status="preparing", **fields)
    OrderItemFactory(order=order, course=None, kit=KitFactory(), title="Kit robot")
    return order


def test_a_duplicate_payment_refund_keeps_the_order_paid():
    order = OrderFactory(paid=True)
    PaymentFactory(order=order, succeeded=True)
    duplicate = PaymentFactory(order=order, succeeded=True)
    assert process(RefundFactory(payment=duplicate)) is False
    order.refresh_from_db()
    assert order.status == Order.Status.PAID


def test_a_partial_refund_keeps_the_order_paid_until_the_total_is_covered():
    order = kit_order(paid=True)
    item = order.items.get()
    unused = KitCode.objects.create(kit=item.kit, order_item=item, code="STEAMY-AAAA-BBBB")
    used = KitCode.objects.create(
        kit=item.kit, order_item=item, code="STEAMY-CCCC-DDDD", redeemed_at=timezone.now()
    )
    payment = PaymentFactory(order=order, succeeded=True, amount=order.total)
    assert process(RefundFactory(payment=payment, amount=order.total - 5000)) is False
    order.refresh_from_db()
    unused.refresh_from_db()
    assert order.status == Order.Status.PAID and unused.revoked_at is None

    assert process(RefundFactory(payment=payment, amount=5000)) is True
    order.refresh_from_db()
    unused.refresh_from_db()
    used.refresh_from_db()
    assert order.status == Order.Status.REFUNDED
    assert unused.revoked_at is not None and used.revoked_at is None


def cancelled_order_with_late_payments(count):
    order = OrderFactory(cancelled=True)
    return order, [
        RefundFactory(payment=PaymentFactory(order=order, succeeded=True)) for _ in range(count)
    ]


def test_a_cancelled_order_is_settled_when_its_last_refund_is_done():
    order, (first, last) = cancelled_order_with_late_payments(2)
    assert process(first) is False
    order.refresh_from_db()
    assert order.status == Order.Status.CANCELLED
    assert Notification.objects.filter(user=order.payer, title="Remboursement effectué").exists()
    assert process(last) is True
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED


def test_a_cancelled_order_with_a_single_refund_is_settled_at_once():
    order, (only,) = cancelled_order_with_late_payments(1)
    assert process(only) is True
    order.refresh_from_db()
    assert order.status == Order.Status.REFUNDED


def test_a_cancelled_order_revokes_its_unused_codes_when_settled():
    order = kit_order(cancelled=True)
    item = order.items.get()
    code = KitCode.objects.create(kit=item.kit, order_item=item, code="STEAMY-AAAA-BBBB")
    assert process(RefundFactory(payment=PaymentFactory(order=order, succeeded=True))) is True
    code.refresh_from_db()
    assert code.revoked_at is not None
