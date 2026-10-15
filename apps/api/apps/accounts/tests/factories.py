"""Fabriques des comptes, réutilisées par les tests de toutes les apps et par `seed_demo`."""

import factory

from apps.accounts.models import LearnerProfile, ParentProfile, TeacherProfile, User

PASSWORD = "Steamy2026"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    first_name = factory.Faker("first_name", locale="fr_FR")
    last_name = factory.Faker("last_name", locale="fr_FR")
    status = User.Status.ACTIVE
    password = factory.PostGenerationMethodCall("set_password", PASSWORD)

    @classmethod
    def _after_postgeneration(cls, instance, create, results=None):
        if create:
            instance.save()


class LearnerFactory(UserFactory):
    role = User.Role.LEARNER
    username = factory.Sequence(lambda n: f"apprenant{n}")
    learner_profile = factory.RelatedFactory(
        "apps.accounts.tests.factories.LearnerProfileFactory", factory_related_name="user"
    )


class ParentFactory(UserFactory):
    role = User.Role.PARENT
    phone = factory.Sequence(lambda n: f"+2290197{n:06d}")
    parent_profile = factory.RelatedFactory(
        "apps.accounts.tests.factories.ParentProfileFactory", factory_related_name="user"
    )


class TeacherFactory(UserFactory):
    role = User.Role.TEACHER
    email = factory.Sequence(lambda n: f"enseignant{n}@steamy.test")
    teacher_profile = factory.RelatedFactory(
        "apps.accounts.tests.factories.TeacherProfileFactory", factory_related_name="user"
    )


class StaffFactory(UserFactory):
    role = None
    is_staff = True
    email = factory.Sequence(lambda n: f"personnel{n}@steamy.test")


class LearnerProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = LearnerProfile

    user = factory.SubFactory(LearnerFactory, learner_profile=None)


class ParentProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ParentProfile

    user = factory.SubFactory(ParentFactory, parent_profile=None)


class TeacherProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TeacherProfile

    user = factory.SubFactory(TeacherFactory, teacher_profile=None)
