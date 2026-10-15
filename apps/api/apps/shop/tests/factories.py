"""Fabriques de la boutique."""

import factory

from apps.catalog.tests.factories import CategoryFactory
from apps.shop.models import Kit


class KitFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Kit

    slug = factory.Sequence(lambda n: f"kit-{n}")
    name = factory.Sequence(lambda n: f"Kit {n}")
    category = factory.SubFactory(CategoryFactory)
    price = 35000
    difficulty = "beginner"
    emoji = "🤖"
    description = "Un robot à monter soi-même."
    contents = factory.LazyFunction(lambda: ["2 moteurs", "1 carte"])
    stock_quantity = 12

    class Params:
        out_of_stock = factory.Trait(stock_quantity=0)
        withdrawn = factory.Trait(active=False)
