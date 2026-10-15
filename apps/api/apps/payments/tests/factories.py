"""Fabriques du commerce, réutilisées par les tests des autres apps et le jeu de démonstration."""

from datetime import timedelta

import factory
from django.utils import timezone

from apps.accounts.models import ParentChildLink
from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.catalog.tests.factories import CourseFactory
from apps.payments.models import Order, OrderItem, Payment
from apps.referentials.models import Relationship


def link_child(parent, learner=None):
    """Rattache un apprenant (créé au besoin) au parent, comme après un consentement accepté."""
    learner = learner or LearnerFactory()
    # Référentiel posé par migration, absent des tests `transaction=True` (base vidée) : recréé au besoin
    relationship = Relationship.objects.first() or Relationship.objects.create(
        code="parent", label="Parent"
    )
    ParentChildLink.objects.create(parent=parent, learner=learner, relationship=relationship)
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
