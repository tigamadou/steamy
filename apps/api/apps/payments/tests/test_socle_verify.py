"""`checkout.verify_payment` (ADR 0008) et caractérisation de `reconcile_pending_payments` (inchangée par l'extraction)."""

from datetime import timedelta
from unittest import mock

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone

from apps.payments import checkout
from apps.payments.models import Order, Payment
from apps.payments.providers import PaymentProviderError, PaymentStatus
from apps.payments.providers.fake import FakePaymentProvider

from .factories import PaymentFactory, fake_transaction

pytestmark = pytest.mark.django_db


def stale(**kwargs):
    """Paiement sans issue depuis plus de 10 minutes, avec sa transaction chez le faux prestataire."""
    status = kwargs.pop("remote", PaymentStatus.PENDING)
    payment = PaymentFactory(**kwargs)
    Payment.objects.filter(pk=payment.pk).update(
        created_at=timezone.now() - checkout.RECONCILE_AFTER - timedelta(minutes=1)
    )
    if payment.provider_transaction_id:
        fake_transaction(payment, status)
    return payment


def refreshed(payment):
    payment.refresh_from_db()
    payment.order.refresh_from_db()
    return payment


# --- Caractérisation de la boucle ----------------------------------------------------------------


def test_reconcile_settles_a_succeeded_payment():
    payment = stale(remote=PaymentStatus.SUCCEEDED)
    assert checkout.reconcile_pending_payments() == 1
    payment = refreshed(payment)
    assert payment.status == Payment.Status.SUCCEEDED
    assert payment.order.status == Order.Status.PAID


def test_reconcile_fails_a_payment_whose_amount_differs_from_the_order():
    payment = stale(amount=1000, remote=PaymentStatus.SUCCEEDED)
    assert checkout.reconcile_pending_payments() == 1
    payment = refreshed(payment)
    assert payment.status == Payment.Status.FAILED
    assert payment.failure_code == Payment.FailureCode.AMOUNT_MISMATCH
    assert payment.order.status != Order.Status.PAID


def test_reconcile_fails_a_declined_payment():
    payment = stale(remote=PaymentStatus.FAILED)
    assert checkout.reconcile_pending_payments() == 1
    payment = refreshed(payment)
    assert payment.status == Payment.Status.FAILED
    assert payment.failure_code == Payment.FailureCode.DECLINED


def test_reconcile_leaves_a_pending_payment_alone():
    payment = stale()
    assert checkout.reconcile_pending_payments() == 0
    assert refreshed(payment).status == Payment.Status.PENDING


def test_reconcile_skips_an_unknown_transaction_and_goes_on():
    unknown = PaymentFactory(provider_transaction_id="fake-inconnue")
    Payment.objects.filter(pk=unknown.pk).update(created_at=timezone.now() - timedelta(hours=1))
    ok = stale(remote=PaymentStatus.SUCCEEDED)
    assert checkout.reconcile_pending_payments() == 1
    assert refreshed(unknown).status == Payment.Status.PENDING
    assert refreshed(ok).status == Payment.Status.SUCCEEDED


def test_reconcile_abandons_a_payment_without_transaction():
    payment = stale(unsent=True)
    assert checkout.reconcile_pending_payments() == 1
    payment = refreshed(payment)
    assert payment.status == Payment.Status.FAILED
    assert payment.failure_code == Payment.FailureCode.INITIATION_LOST


def test_reconcile_skips_an_unconfigured_provider(settings):
    payment = stale(provider="fedapay")
    assert checkout.reconcile_pending_payments() == 0
    assert refreshed(payment).status == Payment.Status.PENDING


# --- verify_payment ------------------------------------------------------------------------------


def test_verify_succeeded_returns_a_new_up_to_date_instance():
    payment = PaymentFactory()
    fake_transaction(payment, PaymentStatus.SUCCEEDED)
    result = checkout.verify_payment(payment)
    assert result is not payment
    assert result.status == Payment.Status.SUCCEEDED
    assert result.confirmed_at is not None
    assert result.order.status == Order.Status.PAID


def test_verify_failed_marks_the_payment_declined_and_keeps_the_order():
    payment = PaymentFactory()
    fake_transaction(payment, PaymentStatus.FAILED)
    result = checkout.verify_payment(payment)
    assert result.status == Payment.Status.FAILED
    assert result.failure_code == Payment.FailureCode.DECLINED
    assert result.order.status == Order.Status.PENDING


def test_verify_pending_changes_nothing():
    payment = PaymentFactory()
    fake_transaction(payment, PaymentStatus.PENDING)
    result = checkout.verify_payment(payment)
    assert result.status == Payment.Status.PENDING
    assert result.payload is None and result.confirmed_at is None
    assert result.order.status == Order.Status.PENDING


def test_verify_without_transaction_id_does_not_call_the_provider():
    payment = PaymentFactory(unsent=True)
    with mock.patch.object(FakePaymentProvider, "fetch_transaction", autospec=True) as fetch:
        result = checkout.verify_payment(payment)
    fetch.assert_not_called()
    assert result is payment


def test_verify_propagates_provider_errors():
    payment = PaymentFactory(provider_transaction_id="fake-inconnue")
    with pytest.raises(PaymentProviderError, match="inconnue"):
        checkout.verify_payment(payment)


def test_verify_propagates_a_missing_configuration():
    payment = PaymentFactory(provider="fedapay")
    with pytest.raises(ImproperlyConfigured):
        checkout.verify_payment(payment)


def test_verify_twice_settles_only_once():
    payment = PaymentFactory()
    fake_transaction(payment, PaymentStatus.SUCCEEDED)
    first = checkout.verify_payment(payment)
    with mock.patch("apps.payments.utils.settle") as settle:
        second = checkout.verify_payment(first)
    settle.assert_not_called()
    assert second.status == Payment.Status.SUCCEEDED
