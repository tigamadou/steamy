"""Fabriques du socle (ADR 0008) : traits de paiement, remboursement et commande."""

import pytest
from django.utils import timezone

from apps.payments.models import Order, Payment
from apps.payments.tests.factories import OrderFactory, PaymentFactory, RefundFactory


@pytest.mark.django_db
def test_payments_of_an_order_get_distinct_merchant_references():
    order = OrderFactory()
    refs = [PaymentFactory(order=order).merchant_reference for _ in range(3)]
    assert refs == [f"{order.reference}-{n}" for n in (1, 2, 3)]


@pytest.mark.django_db
def test_succeeded_trait():
    payment = PaymentFactory(succeeded=True)
    assert payment.status == Payment.Status.SUCCEEDED
    assert payment.provider_status == "approved"
    assert payment.confirmed_at and payment.checked_at
    assert payment.confirmed_at <= timezone.now()


@pytest.mark.django_db
def test_failed_trait():
    payment = PaymentFactory(failed=True)
    assert payment.status == Payment.Status.FAILED
    assert payment.failure_code == Payment.FailureCode.DECLINED
    assert payment.failure_reason
    assert payment.provider_status == "declined"


@pytest.mark.django_db
def test_unsent_trait():
    payment = PaymentFactory(unsent=True)
    assert payment.provider_transaction_id is None
    assert payment.status == Payment.Status.INITIATED


@pytest.mark.django_db
def test_refund_factory_builds_a_coherent_pending_refund():
    refund = RefundFactory()
    assert refund.payment.status == Payment.Status.SUCCEEDED
    assert refund.amount == refund.payment.amount
    assert refund.reason
    assert refund.processed is False
    assert refund.reference == "" and refund.processed_at is None and refund.processed_by is None


@pytest.mark.django_db
def test_refund_factory_done_trait():
    refund = RefundFactory(done=True)
    assert refund.processed is True
    assert refund.reference and refund.processed_at and refund.processed_by
    assert RefundFactory(done=True).reference != refund.reference


@pytest.mark.django_db
def test_cancelled_order_trait():
    order = OrderFactory(cancelled=True)
    assert order.status == Order.Status.CANCELLED
    assert order.expires_at < timezone.now()


@pytest.mark.django_db
def test_guest_order_trait_respects_database_constraints():
    order = OrderFactory(guest=True)
    order.refresh_from_db()
    assert order.payer is None and order.beneficiary is None
    assert order.kind == Order.Kind.KIT
    assert order.is_guest and order.guest_first_name and order.guest_last_name
    assert not order.items.exists()
