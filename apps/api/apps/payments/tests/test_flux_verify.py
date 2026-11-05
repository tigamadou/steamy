"""Cœur de vérification (ADR 0008 §4) : une transaction relue chez le prestataire est appliquée sous verrous
(commande, puis paiement) ; rien n'est jamais créé à partir d'une notification."""

import threading
import time
from unittest import mock

import pytest

from apps.core.models import AuditLog
from apps.learning.models import Enrollment
from apps.notifications.models import Notification
from apps.payments.checkout import initiate_payment, verify_payment
from apps.payments.models import Order, Payment, Refund
from apps.payments.providers import (
    InitiateResult,
    PaymentProviderError,
    PaymentStatus,
)
from apps.payments.providers.fake import FakePaymentProvider
from apps.payments.utils import apply_transaction, handle_payment_event

from .factories import OrderFactory, PaymentFactory, fake_transaction, load_referentials
from .test_flux_support import deliver, provider_tx, run_concurrently, stub_fetch

pytestmark = pytest.mark.django_db

P = Payment.Status
F = Payment.FailureCode


def fresh(payment):
    payment.refresh_from_db()
    payment.order.refresh_from_db()
    return payment


def failed(code, **kwargs):
    return PaymentFactory(status=P.FAILED, failure_code=code, failure_reason="x", **kwargs)


# --- Table des statuts ----------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "status", "code", "order_status"),
    [
        ("pending", P.PENDING, "", Order.Status.PENDING),
        ("approved", P.SUCCEEDED, "", Order.Status.PAID),
        ("transferred", P.SUCCEEDED, "", Order.Status.PAID),
        ("declined", P.FAILED, F.DECLINED, Order.Status.PENDING),
        ("canceled", P.FAILED, F.DECLINED, Order.Status.PENDING),
        ("expired", P.FAILED, F.EXPIRED, Order.Status.PENDING),
        ("refunded", P.FAILED, F.DECLINED, Order.Status.PENDING),
        ("partially_refunded", P.FAILED, F.DECLINED, Order.Status.PENDING),
    ],
)
def test_status_table(raw, status, code, order_status):
    payment = PaymentFactory()
    deliver(payment, raw)
    payment = fresh(payment)
    assert (payment.status, payment.failure_code, payment.order.status) == (
        status,
        code,
        order_status,
    )
    assert payment.provider_status == raw and payment.checked_at
    assert (payment.confirmed_at is not None) == (status == P.SUCCEEDED)
    assert (payment.failure_reason != "") == (status == P.FAILED)


def test_initiated_payment_becomes_pending():
    payment = PaymentFactory(status=P.INITIATED)
    deliver(payment, "pending")
    assert fresh(payment).status == P.PENDING


def test_unknown_status_changes_nothing_but_observations():
    payment = PaymentFactory()
    deliver(payment, "bizarre")
    payment = fresh(payment)
    assert payment.status == P.PENDING and payment.provider_status == "bizarre"


def test_payload_keeps_only_status_amount_and_currency():
    payment = PaymentFactory()
    deliver(payment, "pending")
    assert fresh(payment).payload == {"status": "pending", "amount": 15000, "currency": "XOF"}


# --- Idempotence et observations ------------------------------------------------------------


def test_approved_then_replayed_settles_once():
    payment = PaymentFactory()
    deliver(payment)
    deliver(payment)
    payment = fresh(payment)
    assert payment.order.status == Order.Status.PAID
    assert Enrollment.objects.filter(learner=payment.order.beneficiary).count() == 1
    assert Notification.objects.filter(user=payment.order.payer, type="order").count() == 1
    assert not Refund.objects.exists()


def test_observations_are_written_on_an_already_succeeded_payment():
    payment = PaymentFactory(succeeded=True, provider_fees=0)
    old = payment.checked_at
    deliver(payment, "approved", fees=150)
    payment = fresh(payment)
    assert payment.provider_fees == 150 and payment.checked_at > old
    assert payment.status == P.SUCCEEDED


def test_unknown_fees_keep_the_previous_value():
    payment = PaymentFactory(provider_fees=75)
    deliver(payment, "pending", fees=None)
    assert fresh(payment).provider_fees == 75


def test_provider_refund_of_a_succeeded_payment_is_audited_once():
    payment = PaymentFactory(succeeded=True)
    deliver(payment, "refunded")
    deliver(payment, "refunded")
    payment = fresh(payment)
    assert payment.status == P.SUCCEEDED and payment.provider_status == "refunded"
    assert payment.order.status == Order.Status.PENDING
    assert AuditLog.objects.filter(action="payment.provider_refunded").count() == 1
    assert not Refund.objects.exists()


# --- Rattrapage des échecs non définitifs ---------------------------------------------------


@pytest.mark.parametrize("code", [F.DECLINED, F.EXPIRED, F.INITIATION_LOST])
def test_non_final_failure_can_still_succeed(code):
    payment = failed(code)
    deliver(payment, "approved")
    payment = fresh(payment)
    assert payment.status == P.SUCCEEDED and payment.failure_code == ""
    assert payment.order.status == Order.Status.PAID


@pytest.mark.parametrize("code", [F.DECLINED, F.EXPIRED, F.INITIATION_LOST])
@pytest.mark.parametrize("raw", ["declined", "expired", "pending", "canceled"])
def test_non_final_failure_never_moves_to_anything_but_succeeded(code, raw):
    payment = failed(code)
    deliver(payment, raw)
    payment = fresh(payment)
    assert (payment.status, payment.failure_code, payment.failure_reason) == (P.FAILED, code, "x")


@pytest.mark.parametrize("code", [F.AMOUNT_MISMATCH, F.PROVIDER_REFUSED, F.PROVIDER_UNAVAILABLE])
def test_final_failure_never_moves(code):
    payment = failed(code)
    deliver(payment, "approved")
    payment = fresh(payment)
    assert (payment.status, payment.failure_code) == (P.FAILED, code)
    assert payment.order.status == Order.Status.PENDING and payment.provider_status == "approved"


def test_lost_initiation_without_id_is_attached_by_merchant_reference():
    payment = PaymentFactory(
        unsent=True, status=P.FAILED, failure_code=F.INITIATION_LOST, failure_reason="x"
    )
    tx = provider_tx(payment, raw_status="approved")
    tx = type(tx)(**{**tx.__dict__, "provider_tx_id": "fake-retrouve"})
    assert apply_transaction("fake", tx) == payment
    payment = fresh(payment)
    assert payment.provider_transaction_id == "fake-retrouve"
    assert payment.status == P.SUCCEEDED and payment.order.status == Order.Status.PAID


def test_payment_with_another_transaction_id_is_not_taken_over():
    payment = PaymentFactory(provider_transaction_id="fake-autre")
    tx = provider_tx(payment)
    tx = type(tx)(**{**tx.__dict__, "provider_tx_id": "fake-intrus"})
    assert apply_transaction("fake", tx) is None
    payment = fresh(payment)
    assert payment.provider_transaction_id == "fake-autre" and payment.status == P.PENDING
    assert AuditLog.objects.filter(action="payment.webhook_ignored").count() == 1


# --- Transactions sans correspondance -------------------------------------------------------


def test_unknown_transaction_creates_nothing():
    order = OrderFactory()
    tx = provider_tx(PaymentFactory(order=order))
    tx = type(tx)(
        **{**tx.__dict__, "provider_tx_id": "fake-inconnue", "merchant_reference": "HORS-1"}
    )
    before = Payment.objects.count()
    assert apply_transaction("fake", tx) is None
    assert Payment.objects.count() == before
    audit = AuditLog.objects.get(action="payment.webhook_ignored")
    assert audit.data["transaction"] == "fake-inconnue"
    assert fresh(Payment.objects.get()).status == P.PENDING


def test_transaction_naming_an_order_but_no_payment_creates_nothing():
    order = OrderFactory()
    other = PaymentFactory()
    tx = provider_tx(other, merchant_reference=f"{order.reference}-7")
    tx = type(tx)(**{**tx.__dict__, "provider_tx_id": "fake-sans-paiement"})
    assert apply_transaction("fake", tx) is None
    assert Payment.objects.count() == 1
    assert AuditLog.objects.filter(action="payment.webhook_ignored").exists()
    assert fresh(other).status == P.PENDING


def test_transaction_without_merchant_reference_nor_known_id_creates_nothing():
    tx = provider_tx(PaymentFactory(), merchant_reference="")
    tx = type(tx)(**{**tx.__dict__, "provider_tx_id": "fake-sans-reference"})
    assert apply_transaction("fake", tx) is None
    assert AuditLog.objects.filter(action="payment.webhook_ignored").count() == 1


# --- Montant et devise ----------------------------------------------------------------------


@pytest.mark.parametrize("overrides", [{"amount": 14999}, {"currency": "EUR"}, {"currency": ""}])
def test_mismatch_on_a_pending_transaction_fails_without_refund(overrides):
    payment = PaymentFactory()
    deliver(payment, "pending", **overrides)
    payment = fresh(payment)
    assert (payment.status, payment.failure_code) == (P.FAILED, F.AMOUNT_MISMATCH)
    assert payment.order.status == Order.Status.PENDING
    assert not Refund.objects.exists()
    assert AuditLog.objects.filter(action="payment.amount_mismatch").count() == 1


def test_amount_received_different_from_the_order_is_refunded_for_what_was_received():
    payment = PaymentFactory()
    deliver(payment, "approved", amount=14000)
    payment = fresh(payment)
    assert (payment.status, payment.failure_code) == (P.FAILED, F.AMOUNT_MISMATCH)
    assert payment.order.status == Order.Status.PENDING
    refund = Refund.objects.get()
    assert (refund.payment, refund.amount) == (payment, 14000) and refund.amount != payment.amount


def test_order_total_changed_since_the_payment_is_a_mismatch():
    payment = PaymentFactory(amount=15000)
    Order.objects.filter(pk=payment.order_id).update(total=16000, subtotal=16000)
    deliver(payment, "approved")
    payment = fresh(payment)
    assert payment.failure_code == F.AMOUNT_MISMATCH and Refund.objects.get().amount == 15000


# --- Commande déjà réglée, paiement tardif --------------------------------------------------


def test_approved_duplicate_on_a_paid_order_is_refunded():
    order = OrderFactory(paid=True)
    payment = PaymentFactory(order=order)
    deliver(payment)
    assert fresh(payment).status == P.SUCCEEDED
    assert Refund.objects.get().payment == payment
    assert order.status == Order.Status.PAID


def test_late_approved_payment_on_a_cancelled_order_is_honoured():
    order = OrderFactory(cancelled=True)
    payment = PaymentFactory(order=order)
    deliver(payment)
    assert fresh(payment).order.status == Order.Status.PAID
    assert AuditLog.objects.filter(action="payment.late_honored").exists()


# --- verify_payment -------------------------------------------------------------------------


def test_verify_payment_reads_the_provider_and_returns_the_updated_payment():
    payment = PaymentFactory()
    fake_transaction(payment, PaymentStatus.SUCCEEDED)
    result = verify_payment(payment)
    assert result.status == P.SUCCEEDED and result.checked_at and result.order.status == "paid"
    assert result is not payment


def test_verify_payment_without_a_transaction_id_does_not_call_the_provider():
    payment = PaymentFactory(unsent=True)
    with mock.patch.object(FakePaymentProvider, "fetch_transaction") as fetch:
        assert verify_payment(payment) is payment
    fetch.assert_not_called()


def test_verify_payment_propagates_provider_errors(monkeypatch):
    payment = PaymentFactory()
    stub_fetch(monkeypatch, PaymentProviderError("hors service"))
    with pytest.raises(PaymentProviderError):
        verify_payment(payment)
    assert fresh(payment).status == P.PENDING


def test_handle_payment_event_propagates_a_failed_reading(monkeypatch):
    payment = PaymentFactory()
    stub_fetch(monkeypatch, PaymentProviderError("hors service"))
    with pytest.raises(PaymentProviderError):
        handle_payment_event("fake", payment.provider_transaction_id)


# --- Concurrence ----------------------------------------------------------------------------


@pytest.mark.django_db(transaction=True)
def test_simultaneous_events_and_verification_settle_once():
    load_referentials()
    order = OrderFactory()
    payment = PaymentFactory(order=order)
    fake_transaction(payment, PaymentStatus.SUCCEEDED)
    tx_id = payment.provider_transaction_id
    results = run_concurrently(
        lambda: handle_payment_event("fake", tx_id),
        lambda: handle_payment_event("fake", tx_id),
        lambda: verify_payment(payment),
    )
    assert not [r for r in results if isinstance(r, BaseException)], results
    order.refresh_from_db()
    assert order.status == Order.Status.PAID
    assert Enrollment.objects.filter(learner=order.beneficiary).count() == 1
    assert Notification.objects.filter(user=order.payer, type="order").count() == 1
    assert not Refund.objects.exists()


@pytest.mark.django_db(transaction=True)
def test_event_arriving_during_initiation_waits_for_it_and_finds_the_payment():
    load_referentials()
    order = OrderFactory()
    created, release = threading.Event(), threading.Event()
    tx_id = "fake-pendant-initiation"

    def slow_initiate(self, charge):
        self.create_transaction(
            provider_tx_id=tx_id,
            reference=charge.reference,
            merchant_reference=charge.merchant_reference,
            amount=charge.amount,
            currency=charge.currency,
            status=PaymentStatus.SUCCEEDED,
        )
        created.set()
        release.wait(10)
        return InitiateResult(provider_tx_id=tx_id, status=PaymentStatus.PENDING)

    def initiate():
        return initiate_payment(order, country="BJ", network="mtn", msisdn="+2290197000003")

    def event():
        created.wait(10)
        return handle_payment_event("fake", tx_id)

    def let_go():
        created.wait(10)
        time.sleep(0.5)
        release.set()

    with mock.patch.object(FakePaymentProvider, "initiate", slow_initiate):
        results = run_concurrently(initiate, event, let_go)
    assert not [r for r in results if isinstance(r, BaseException)], results
    payment = Payment.objects.get()
    assert payment.provider_transaction_id == tx_id and payment.status == P.SUCCEEDED
    order.refresh_from_db()
    assert order.status == Order.Status.PAID
