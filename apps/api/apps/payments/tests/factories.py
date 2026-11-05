"""Fabriques du commerce, réutilisées par les tests des autres apps et le jeu de démonstration."""

from datetime import timedelta

import factory
from django.utils import timezone

from apps.accounts.models import ParentChildLink
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, StaffFactory
from apps.catalog.tests.factories import CourseFactory
from apps.payments.models import Order, OrderItem, Payment, Refund
from apps.payments.providers import PaymentStatus
from apps.payments.providers.fake import FakePaymentProvider
from apps.referentials.models import Relationship


def link_child(parent, learner=None):
    """Rattache un apprenant (créé au besoin) au parent, comme après un consentement accepté."""
    learner = learner or LearnerFactory()
    ParentChildLink.objects.create(
        parent=parent, learner=learner, relationship=Relationship.objects.first()
    )
    return learner


class OrderFactory(factory.django.DjangoModelFactory):
    """Commande d'un parcours payant (15 000 FCFA) par un parent pour son enfant, en attente de paiement."""

    class Meta:
        model = Order

    kind = Order.Kind.COURSE
    payer = factory.SubFactory(ParentFactory)
    beneficiary = factory.LazyAttribute(lambda o: link_child(o.payer) if o.payer else None)
    subtotal = 15000
    shipping_fee = 0
    total = factory.LazyAttribute(lambda o: o.subtotal + o.shipping_fee)
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(minutes=30))

    class Params:
        paid = factory.Trait(status=Order.Status.PAID, paid_at=factory.LazyFunction(timezone.now))
        cancelled = factory.Trait(
            status=Order.Status.CANCELLED,
            expires_at=factory.LazyFunction(lambda: timezone.now() - timedelta(minutes=5)),
        )
        #: Commande de kit d'un invité (D12) : sans payeur ni bénéficiaire, sans ligne
        guest = factory.Trait(
            kind=Order.Kind.KIT,
            payer=None,
            beneficiary=None,
            guest_first_name=factory.Faker("first_name"),
            guest_last_name=factory.Faker("last_name"),
            guest_phone="+2290197000001",
        )

    @factory.post_generation
    def items(order, create, extracted, **kwargs):
        if create and extracted is None and order.kind == Order.Kind.COURSE:
            OrderItemFactory(order=order, unit_price=order.subtotal)


class OrderItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrderItem

    order = factory.SubFactory(OrderFactory, items=[])
    course = factory.SubFactory(CourseFactory, paid=True)
    title = factory.LazyAttribute(lambda o: o.course.title if o.course else "Article")
    unit_price = 15000
    quantity = 1
    total = factory.LazyAttribute(lambda o: o.unit_price * o.quantity)


class PaymentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Payment

    order = factory.SubFactory(OrderFactory)
    provider = "fake"
    provider_transaction_id = factory.Sequence(lambda n: f"fake-{n}")
    country = "BJ"
    network = "mtn"
    msisdn = "+2290197000001"
    amount = factory.LazyAttribute(lambda o: o.order.total)
    status = Payment.Status.PENDING

    class Params:
        succeeded = factory.Trait(
            status=Payment.Status.SUCCEEDED,
            provider_status="approved",
            confirmed_at=factory.LazyFunction(timezone.now),
            checked_at=factory.LazyFunction(timezone.now),
        )
        failed = factory.Trait(
            status=Payment.Status.FAILED,
            failure_code=Payment.FailureCode.DECLINED,
            failure_reason="Paiement refusé par l'opérateur.",
            provider_status="declined",
        )
        #: Initiation jamais aboutie : aucune transaction chez le prestataire
        unsent = factory.Trait(provider_transaction_id=None, status=Payment.Status.INITIATED)


class RefundFactory(factory.django.DjangoModelFactory):
    """Remboursement à traiter d'un paiement réussi, pour son montant entier."""

    class Meta:
        model = Refund

    payment = factory.SubFactory(PaymentFactory, succeeded=True)
    amount = factory.LazyAttribute(lambda o: o.payment.amount)
    reason = factory.Faker("sentence", locale="fr_FR")
    processed = False

    class Params:
        done = factory.Trait(
            processed=True,
            reference=factory.Sequence(lambda n: f"RMB-{n:06d}"),
            processed_at=factory.LazyFunction(timezone.now),
            processed_by=factory.SubFactory(StaffFactory),
        )


def load_referentials():
    """Référentiels posés par migration, à recharger dans les tests `transaction=True` (base vidée entre tests)."""
    from django.apps import apps

    from apps.referentials.data import load

    load(apps)


def fake_transaction(payment, status=PaymentStatus.PENDING, **changes) -> str:
    """Enregistre dans le faux prestataire la transaction du paiement (`changes` surcharge `create_transaction`) et
    renvoie son identifiant."""
    values = {
        "provider_tx_id": payment.provider_transaction_id,
        "reference": payment.order.reference,
        "merchant_reference": payment.merchant_reference,
        "amount": payment.amount,
        "currency": payment.currency,
        "status": status,
        **changes,
    }
    FakePaymentProvider().create_transaction(**values)
    return values["provider_tx_id"]
