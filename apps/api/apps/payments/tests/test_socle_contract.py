"""Contrat du socle (ADR 0008) : `Charge` construit par `initiate_payment`, prise de test `fake_transaction`."""

from unittest import mock

import pytest

from apps.payments.checkout import initiate_payment
from apps.payments.models import Payment
from apps.payments.providers import PaymentStatus
from apps.payments.providers.fake import FakePaymentProvider
from apps.payments.tests.factories import OrderFactory, PaymentFactory, fake_transaction

pytestmark = pytest.mark.django_db


def test_initiate_payment_sends_the_attempt_reference_and_metadata():
    order = OrderFactory()
    with mock.patch.object(
        FakePaymentProvider, "initiate", autospec=True, wraps=FakePaymentProvider.initiate
    ) as spy:
        first = initiate_payment(order, country="BJ", network="mtn", msisdn="+2290197000003")
    charge = spy.call_args.args[1]
    assert first.merchant_reference == f"{order.reference}-1"
    assert charge.merchant_reference == first.merchant_reference
    assert charge.reference == order.reference
    assert charge.metadata == {"order": order.reference, "payment": first.pk}

    Payment.objects.filter(pk=first.pk).update(status=Payment.Status.FAILED)
    with mock.patch.object(
        FakePaymentProvider, "initiate", autospec=True, wraps=FakePaymentProvider.initiate
    ) as spy:
        second = initiate_payment(order, country="BJ", network="mtn", msisdn="+2290197000003")
    assert spy.call_args.args[1].merchant_reference == f"{order.reference}-2"
    assert second.merchant_reference == f"{order.reference}-2"


def test_fake_transaction_registers_a_readable_transaction():
    payment = PaymentFactory()
    tx_id = fake_transaction(payment)
    assert tx_id == payment.provider_transaction_id
    fetched = FakePaymentProvider().fetch_transaction(tx_id)
    assert fetched.status == PaymentStatus.PENDING
    assert fetched.merchant_reference == payment.merchant_reference
    assert (fetched.amount, fetched.currency) == (payment.amount, payment.currency)


def test_fake_transaction_changes_override_the_defaults():
    payment = PaymentFactory()
    tx_id = fake_transaction(
        payment, PaymentStatus.FAILED, provider_status="expired", amount=1, fees=9
    )
    fetched = FakePaymentProvider().fetch_transaction(tx_id)
    assert fetched.status == PaymentStatus.FAILED
    assert (fetched.provider_status, fetched.amount, fetched.fees) == ("expired", 1, 9)
