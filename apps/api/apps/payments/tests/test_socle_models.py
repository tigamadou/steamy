"""Socle du paiement FedaPay (ADR 0008) : champs de `Payment` et `Refund`, `merchant_reference`, migration de données."""

import importlib

import pytest
from django.apps import apps as django_apps
from django.db import IntegrityError, transaction

from apps.accounts.tests.factories import StaffFactory
from apps.payments.models import Order, Payment, Refund
from apps.payments.tests.factories import OrderFactory


def new_payment(order, **values):
    return Payment.objects.create(
        order=order, provider="fake", amount=order.total, status=Payment.Status.PENDING, **values
    )


@pytest.mark.django_db
def test_merchant_reference_counts_the_attempts_of_each_order():
    first, second = OrderFactory(), OrderFactory()
    refs = [new_payment(first).merchant_reference for _ in range(3)]
    assert refs == [f"{first.reference}-1", f"{first.reference}-2", f"{first.reference}-3"]
    assert new_payment(second).merchant_reference == f"{second.reference}-1"


@pytest.mark.django_db
def test_an_explicit_merchant_reference_is_kept():
    payment = new_payment(OrderFactory(), merchant_reference="MANUELLE-1")
    payment.refresh_from_db()
    assert payment.merchant_reference == "MANUELLE-1"


@pytest.mark.django_db
def test_merchant_reference_is_unique():
    order = OrderFactory()
    new_payment(order, merchant_reference="DOUBLON")
    with pytest.raises(IntegrityError), transaction.atomic():
        new_payment(order, merchant_reference="DOUBLON")


@pytest.mark.django_db
def test_new_payment_fields_have_neutral_defaults():
    payment = new_payment(OrderFactory())
    assert payment.provider_status == ""
    assert payment.provider_fees is None
    assert payment.checked_at is None
    assert Payment.FailureCode.EXPIRED == "EXPIRED"


@pytest.mark.django_db
def test_refund_new_fields():
    payment = new_payment(OrderFactory())
    refund = Refund.objects.create(payment=payment, amount=100)
    assert refund.reference == ""
    assert refund.processed_at is None
    assert refund.processed_by is None
    staff = StaffFactory()
    refund.processed_by = staff
    refund.save()
    refund.refresh_from_db()
    assert refund.processed_by == staff


@pytest.mark.django_db
def test_data_migration_fills_existing_payments_by_creation_order():
    migration = importlib.import_module("apps.payments.migrations.0014_paiement_fedapay")
    many, single = OrderFactory(), OrderFactory()
    ids = [new_payment(many).pk for _ in range(3)]
    other = new_payment(single).pk
    # Dates posées dans le désordre des identifiants : le rang suit created_at, puis id
    for pk, day in zip(ids, (3, 1, 2), strict=True):
        Payment.objects.filter(pk=pk).update(created_at=f"2026-01-0{day}T10:00:00Z")
    for order in (many, single):
        Order.objects.filter(pk=order.pk).update(reference=f"tmp-{order.pk}")
    for pk in (*ids, other):
        Payment.objects.filter(pk=pk).update(merchant_reference=f"ancienne-{pk}")

    migration.fill_merchant_references(django_apps, None)

    got = dict(Payment.objects.values_list("pk", "merchant_reference"))
    assert got[ids[1]] == f"tmp-{many.pk}-1"
    assert got[ids[2]] == f"tmp-{many.pk}-2"
    assert got[ids[0]] == f"tmp-{many.pk}-3"
    assert got[other] == f"tmp-{single.pk}-1"

    migration.fill_merchant_references(django_apps, None)
    assert dict(Payment.objects.values_list("pk", "merchant_reference")) == got
