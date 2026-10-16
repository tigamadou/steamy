"""
Jeu de démonstration de l'encadrement (D2), appelé par `seed_demo` après le catalogue : l'offre de l'école de
M. Adékambi et ses deux classes. Idempotent : relancer le seed remet les classes dans cet état.
"""

from apps.catalog.models import Course
from apps.referentials.models import SchoolGrade

from .models import Classroom, School

OFFER = "Offre Classe Robotique 2026"
#: Parcours de l'offre de l'école.
OFFER_COURSES = ["decouverte-robotique", "initiation-scratch", "capteurs-electroniques"]
#: Classes de Koffi : nom, parcours, niveau scolaire, couleur.
CLASSROOMS = [
    ("4e B · Robotique", "decouverte-robotique", "4e", "#C2185B"),
    ("3e A · Code", "initiation-scratch", "3e", "#1E88E5"),
]


def seed_classes(school: School, teacher) -> list[Classroom]:
    school.offer = OFFER
    school.save(update_fields=["offer", "updated_at"])
    school.courses.set(Course.objects.filter(slug__in=OFFER_COURSES))
    classrooms = []
    for name, course, grade, color in CLASSROOMS:
        classroom, _ = Classroom.objects.update_or_create(
            teacher=teacher,
            name=name,
            defaults={
                "school": school,
                "course": Course.objects.get(slug=course),
                "school_grade": SchoolGrade.objects.get(code=grade),
                "color": color,
                "archived_at": None,
            },
        )
        classrooms.append(classroom)
    return classrooms
