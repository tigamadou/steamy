"""Réconciliation (ADR 0008 §6) : relecture des paiements sans issue (10 min), expiration à 24 h, rattrapage sur 48 h
des échecs non définitifs, erreur isolée par paiement."""

from datetime import timedelta
from io import StringIO
from unittest import mock

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.utils import timezone

from apps.payments import checkout
from apps.payments.checkout import reconcile_pending_payments
from apps.payments.models import Order, Payment
from apps.payments.providers import PaymentStatus, PaymentTemporaryError
from apps.payments.providers.fake import FakePaymentProvider
from apps.payments.tasks import reconcile_pending_payments as reconcile_task
from apps.payments.utils import handle_payment_event

from .factories import OrderFactory, PaymentFactory, fake_transaction, load_referentials
from .test_flux_support import run_concurrently

pytestmark = pytest.mark.django_db

P = Payment.Status
F = Payment.FailureCode


def aged(hours=0, minutes=0, remote=PaymentStatus.PENDING, remote_kwargs=None, **kwargs):
    """Paiement créé il y a ce temps, avec sa transaction chez le faux prestataire (s'il a un identifiant)."""
    payment = PaymentFactory(**kwargs)
    Payment.objects.filter(pk=payment.pk).update(
        created_at=timezone.now() - timedelta(hours=hours, minutes=minutes)
    )
    if payment.provider_transaction_id:
        fake_transaction(payment, remote, **(remote_kwargs or {}))
    return payment


def failed(code, **kwargs):
    return aged(status=P.FAILED, failure_code=code, failure_reason="x", **kwargs)


def fresh(payment):
    payment.refresh_from_db()
    payment.order.refresh_from_db()
    return payment


# --- Paiements sans issue -------------------------------------------------------------------


def test_the_amount_comes_from_the_reading():
    payment = aged(minutes=11, remote=PaymentStatus.SUCCEEDED, remote_kwargs={"amount": 14000})
    assert reconcile_pending_payments() == 1
    payment = fresh(payment)
    assert (payment.status, payment.failure_code) == (P.FAILED, F.AMOUNT_MISMATCH)
    assert payment.order.status != Order.Status.PAID


def test_too_recent_payment_is_left_alone():
    payment = aged(minutes=9, remote=PaymentStatus.SUCCEEDED)
    assert reconcile_pending_payments() == 0
    assert fresh(payment).status == P.PENDING


def test_succeeded_payment_is_settled():
    payment = aged(minutes=11, remote=PaymentStatus.SUCCEEDED)
    assert reconcile_pending_payments() == 1
    assert fresh(payment).order.status == Order.Status.PAID


def test_lost_initiation_without_id_fails():
    payment = aged(minutes=11, unsent=True)
    assert reconcile_pending_payments() == 1
    payment = fresh(payment)
    assert (payment.status, payment.failure_code) == (P.FAILED, F.INITIATION_LOST)


def test_observations_are_written_at_each_pass():
    payment = aged(minutes=11, remote_kwargs={"fees": 90, "provider_status": "pending"})
    assert reconcile_pending_payments() == 0
    payment = fresh(payment)
    assert payment.checked_at and payment.provider_fees == 90
    assert payment.provider_status == "pending" and payment.status == P.PENDING


# --- Expiration à 24 h ----------------------------------------------------------------------


def test_payment_still_pending_after_24_hours_expires():
    young = aged(hours=23, minutes=59)
    old = aged(hours=24, minutes=1)
    assert reconcile_pending_payments() == 1
    assert fresh(young).status == P.PENDING
    old = fresh(old)
    assert (old.status, old.failure_code) == (P.FAILED, F.EXPIRED) and old.failure_reason


def test_old_payment_approved_at_the_provider_is_not_expired():
    payment = aged(hours=25, remote=PaymentStatus.SUCCEEDED)
    assert reconcile_pending_payments() == 1
    assert fresh(payment).status == P.SUCCEEDED


# --- Rattrapage des échecs non définitifs ---------------------------------------------------


def test_declined_payment_approved_later_is_caught_up_within_48_hours():
    payment = failed(F.DECLINED, hours=47, remote=PaymentStatus.SUCCEEDED)
    assert reconcile_pending_payments() == 1
    payment = fresh(payment)
    assert payment.status == P.SUCCEEDED and payment.order.status == Order.Status.PAID


def test_expired_payment_is_caught_up():
    payment = failed(F.EXPIRED, hours=30, remote=PaymentStatus.SUCCEEDED)
    assert reconcile_pending_payments() == 1
    assert fresh(payment).status == P.SUCCEEDED


def test_failed_payment_older_than_48_hours_is_not_read_again():
    payment = failed(F.DECLINED, hours=49, remote=PaymentStatus.SUCCEEDED)
    with mock.patch.object(FakePaymentProvider, "fetch_transaction") as fetch:
        assert reconcile_pending_payments() == 0
    fetch.assert_not_called()
    assert fresh(payment).status == P.FAILED


@pytest.mark.parametrize("code", [F.AMOUNT_MISMATCH, F.PROVIDER_REFUSED, F.PROVIDER_UNAVAILABLE])
def test_final_failures_are_never_read_again(code):
    failed(code, hours=1, remote=PaymentStatus.SUCCEEDED)
    with mock.patch.object(FakePaymentProvider, "fetch_transaction") as fetch:
        assert reconcile_pending_payments() == 0
    fetch.assert_not_called()


def test_failed_payment_without_id_is_not_read():
    payment = failed(F.INITIATION_LOST, hours=1, unsent=True)
    with mock.patch.object(FakePaymentProvider, "fetch_transaction") as fetch:
        assert reconcile_pending_payments() == 0
    fetch.assert_not_called()
    assert fresh(payment).failure_code == F.INITIATION_LOST


def test_failed_payment_is_read_at_most_every_30_minutes():
    recent = failed(F.DECLINED, hours=2, remote=PaymentStatus.SUCCEEDED)
    Payment.objects.filter(pk=recent.pk).update(checked_at=timezone.now() - timedelta(minutes=10))
    assert reconcile_pending_payments() == 0
    Payment.objects.filter(pk=recent.pk).update(checked_at=timezone.now() - timedelta(minutes=31))
    assert reconcile_pending_payments() == 1
    assert fresh(recent).status == P.SUCCEEDED


def test_failed_payment_still_declined_only_gets_its_observations_updated():
    payment = failed(F.DECLINED, hours=2, remote=PaymentStatus.FAILED)
    assert reconcile_pending_payments() == 0
    payment = fresh(payment)
    assert payment.checked_at and (payment.status, payment.failure_code) == (P.FAILED, F.DECLINED)


# --- Erreurs isolées ------------------------------------------------------------------------


def test_one_failing_payment_does_not_stop_the_pass():
    first = aged(minutes=11, remote=PaymentStatus.SUCCEEDED)
    second = aged(minutes=11, remote=PaymentStatus.SUCCEEDED)
    third = aged(minutes=11, remote=PaymentStatus.SUCCEEDED)
    real = FakePaymentProvider.fetch_transaction

    def fetch(self, tx_id):
        if tx_id == first.provider_transaction_id:
            raise PaymentTemporaryError("réseau")
        if tx_id == second.provider_transaction_id:
            raise RuntimeError("bogue")
        return real(self, tx_id)

    with mock.patch.object(FakePaymentProvider, "fetch_transaction", fetch):
        assert reconcile_pending_payments() == 1
    assert (fresh(first).status, fresh(second).status) == (P.PENDING, P.PENDING)
    assert fresh(third).status == P.SUCCEEDED


def test_unconfigured_provider_is_a_warning_and_the_pass_goes_on():
    configured = aged(minutes=11)
    lost = aged(minutes=11, unsent=True)
    with mock.patch(
        "apps.payments.checkout.get_provider", side_effect=ImproperlyConfigured("clés absentes")
    ):
        assert reconcile_pending_payments() == 1
    assert fresh(configured).status == P.PENDING
    assert fresh(lost).status == P.FAILED


def test_payment_settled_meanwhile_is_not_touched():
    payment = aged(minutes=11, remote=PaymentStatus.SUCCEEDED)
    Payment.objects.filter(pk=payment.pk).update(status=P.SUCCEEDED)
    assert checkout.reconcile_payment(payment.pk) is False


def test_expiry_and_lost_initiation_leave_a_payment_settled_meanwhile_alone():
    payment = aged(hours=25, remote=PaymentStatus.SUCCEEDED, status=P.SUCCEEDED)
    assert checkout.expire_payment(payment.pk) is False
    assert checkout.lose_initiation(payment.pk) is False
    assert fresh(payment).status == P.SUCCEEDED


# --- Concurrence avec le webhook ------------------------------------------------------------


def lost_with_a_transaction():
    payment = aged(minutes=11, unsent=True, order=OrderFactory(reference="CM-0009", subtotal=5000))
    FakePaymentProvider().create_transaction(
        provider_tx_id="fake-retrouvee",
        reference="CM-0009",
        merchant_reference=payment.merchant_reference,
        amount=5000,
        currency="XOF",
        status=PaymentStatus.SUCCEEDED,
    )
    return payment


@pytest.mark.parametrize("reconcile_first", [True, False])
def test_lost_initiation_and_webhook_in_any_order_end_succeeded(reconcile_first):
    payment = lost_with_a_transaction()
    steps = [reconcile_pending_payments, lambda: handle_payment_event("fake", "fake-retrouvee")]
    for step in steps if reconcile_first else reversed(steps):
        step()
    payment = fresh(payment)
    assert payment.status == P.SUCCEEDED and payment.order.status == Order.Status.PAID
    assert payment.provider_transaction_id == "fake-retrouvee"


@pytest.mark.django_db(transaction=True)
def test_lost_initiation_and_webhook_at_the_same_time():
    load_referentials()
    payment = lost_with_a_transaction()
    results = run_concurrently(
        reconcile_pending_payments, lambda: handle_payment_event("fake", "fake-retrouvee")
    )
    assert not [r for r in results if isinstance(r, BaseException)], results
    payment = fresh(payment)
    assert payment.status == P.SUCCEEDED and payment.order.status == Order.Status.PAID
    assert not payment.refunds.exists()


# --- Tâche et commande ----------------------------------------------------------------------


def test_task_and_management_command_return_the_same_count():
    aged(minutes=11, remote=PaymentStatus.SUCCEEDED)
    aged(minutes=11, remote=PaymentStatus.SUCCEEDED)
    assert reconcile_task() == 2
    aged(minutes=11, remote=PaymentStatus.SUCCEEDED)
    out = StringIO()
    call_command("reconcile_pending_payments", stdout=out)
    assert out.getvalue().strip().endswith(": 1")
