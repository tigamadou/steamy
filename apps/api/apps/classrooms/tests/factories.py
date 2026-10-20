"""Fabriques de l'encadrement, réutilisées par les tests des autres apps et par `seed_demo`."""

from datetime import timedelta

import factory
from django.utils import timezone

from apps.accounts.models import ConsentRequest
from apps.accounts.tests.factories import TeacherFactory
from apps.catalog.tests.factories import CourseFactory
from apps.classrooms.models import Classroom, ClassroomMembership, School
from apps.referentials.models import Country, Relationship


class SchoolFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = School
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"Collège {n}")
    country = factory.LazyFunction(lambda: Country.objects.get(code="BJ"))
    city = "Cotonou"
    offer = "Offre Découverte"
    learner_quota = 30
    classroom_quota = 3

    @factory.post_generation
    def courses(self, create, extracted, **kwargs):
        if create and extracted:
            self.courses.set(extracted)


def teacher_of(school, **fields):
    teacher = TeacherFactory(**fields)
    teacher.teacher_profile.school = school
    teacher.teacher_profile.save()
    return teacher


class ClassroomFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Classroom

    school = factory.SubFactory(SchoolFactory)
    teacher = factory.LazyAttribute(lambda o: teacher_of(o.school))
    course = factory.SubFactory(CourseFactory)
    name = factory.Sequence(lambda n: f"4e {n}")
    color = "#C2185B"


class TeacherConsentFactory(factory.django.DjangoModelFactory):
    """Demande d'origine enseignant (D60) : pas encore de compte apprenant."""

    class Meta:
        model = ConsentRequest

    origin = ConsentRequest.Origin.TEACHER
    subject = factory.LazyFunction(
        lambda: {"first_name": "Awa", "last_name": "Dossou", "relationship": "mere"}
    )
    parent_phone = factory.Sequence(lambda n: f"+2290196{n:06d}")
    relationship = factory.LazyFunction(lambda: Relationship.objects.get(code="mere"))
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(days=7))


class MembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ClassroomMembership

    classroom = factory.SubFactory(ClassroomFactory)
    status = ClassroomMembership.Status.ACTIVE
    learner = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status != ClassroomMembership.Status.INVITED),
        yes_declaration=factory.SubFactory("apps.accounts.tests.factories.LearnerFactory"),
        no_declaration=None,
    )
    consent_request = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status == ClassroomMembership.Status.INVITED),
        yes_declaration=factory.SubFactory(TeacherConsentFactory),
        no_declaration=None,
    )
    joined_at = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status == ClassroomMembership.Status.ACTIVE),
        yes_declaration=factory.LazyFunction(timezone.now),
        no_declaration=None,
    )
