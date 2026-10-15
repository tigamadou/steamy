"""Fabriques du catalogue, réutilisées par les tests des autres apps."""

import factory

from apps.catalog.models import Category, Course, Level, Mission, Project


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    slug = factory.Sequence(lambda n: f"categorie-{n}")
    label = factory.Sequence(lambda n: f"Catégorie {n}")
    color = "#5B3FE0"
    icon = "🤖"
    order = factory.Sequence(int)


class CourseFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Course

    slug = factory.Sequence(lambda n: f"parcours-{n}")
    title = factory.Sequence(lambda n: f"Parcours {n}")
    category = factory.SubFactory(CategoryFactory)
    difficulty = Course.Difficulty.BEGINNER
    is_free = True
    price = 0
    description = "Un parcours pour apprendre en construisant."
    status = Course.Status.PUBLISHED

    class Params:
        paid = factory.Trait(is_free=False, price=15000)
        draft = factory.Trait(status=Course.Status.DRAFT)


class ProjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Project

    course = factory.SubFactory(CourseFactory)
    order = factory.Sequence(int)
    title = factory.Sequence(lambda n: f"Projet {n}")
    duration_hours = 2


class LevelFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Level

    project = factory.SubFactory(ProjectFactory)
    order = factory.Sequence(int)
    title = factory.Sequence(lambda n: f"Niveau {n}")
    duration_min = 30


class MissionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Mission

    level = factory.SubFactory(LevelFactory)
    order = factory.Sequence(int)
    title = factory.Sequence(lambda n: f"Mission {n}")
    duration_min = 10
    vimeo_id = "76979871"
    vimeo_hash = "8272103f6e"
    blocks = factory.LazyFunction(lambda: [{"type": "text", "text": "Contenu de la mission."}])
