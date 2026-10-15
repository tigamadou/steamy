"""Fabriques de la pédagogie, réutilisées par les tests des autres apps."""

import factory

from apps.accounts.tests.factories import LearnerFactory
from apps.catalog.tests.factories import CourseFactory, LevelFactory, MissionFactory, ProjectFactory
from apps.learning.models import Enrollment


class EnrollmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Enrollment

    learner = factory.SubFactory(LearnerFactory)
    course = factory.SubFactory(CourseFactory)
    source = Enrollment.Source.FREE


def build_course(projects: int = 2, levels: int = 2, missions: int = 2, **course_fields):
    """Parcours complet : `projects` projets de `levels` niveaux de `missions` missions, dans l'ordre."""
    course = CourseFactory(**course_fields)
    for p in range(projects):
        project = ProjectFactory(course=course, order=p, title=f"Projet {p + 1}")
        for lv in range(levels):
            level = LevelFactory(project=project, order=lv, title=f"Niveau {p + 1}.{lv + 1}")
            for m in range(missions):
                MissionFactory(level=level, order=m, title=f"Mission {p + 1}.{lv + 1}.{m + 1}")
    return course


def missions_of(course) -> list:
    """Missions du parcours, dans l'ordre de la séquence."""
    from apps.catalog.models import Mission

    return list(
        Mission.objects.filter(level__project__course=course).order_by(
            "level__project__order", "level__order", "order"
        )
    )
