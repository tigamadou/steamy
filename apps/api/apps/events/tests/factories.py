"""Fabriques des Steamy Events."""

import datetime

import factory
from django.utils import timezone

from apps.events.models import SteamyEvent


class SteamyEventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SteamyEvent

    slug = factory.Sequence(lambda n: f"evenement-{n}")
    title = factory.Sequence(lambda n: f"Atelier {n}")
    emoji = "⚡"
    color = "#0EA5E9"
    starts_at = factory.LazyFunction(lambda: timezone.now() + datetime.timedelta(days=10))
    ends_at = factory.LazyAttribute(lambda o: o.starts_at + datetime.timedelta(hours=2))
    application_deadline = factory.LazyAttribute(lambda o: o.starts_at - datetime.timedelta(days=2))
    place = "Maison des jeunes"
    city = "Porto-Novo"
    capacity = 20
    description = "Deux heures pour monter tes premiers circuits."
    status = SteamyEvent.Status.PUBLISHED

    class Params:
        draft = factory.Trait(status=SteamyEvent.Status.DRAFT)
        past = factory.Trait(
            starts_at=factory.LazyFunction(lambda: timezone.now() - datetime.timedelta(days=10))
        )
        full = factory.Trait(seats_reserved=factory.SelfAttribute("capacity"))
