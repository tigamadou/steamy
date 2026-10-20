"""
Classes d'un enseignant (WT03, WT04, WT13) : création et modification sous contrôle de l'offre et des quotas de
l'école (D61, D62), retrait d'un élève. L'enseignant ne voit et ne touche que ses propres classes (S4, D64).
"""

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.models import ConsentRequest
from libs.errors import ApiError

from . import quotas
from .models import Classroom, ClassroomMembership, School

#: Couleurs proposées par défaut, dans l'ordre de création des classes.
PALETTE = ("#C2185B", "#1E88E5", "#43A047", "#FB8C00", "#8E24AA", "#00897B")

Status = ClassroomMembership.Status


def teacher_school(teacher) -> School:
    """École de l'enseignant (C6) ; un compte sans école n'a accès à aucune classe."""
    profile = getattr(teacher, "teacher_profile", None)
    school = getattr(profile, "school", None)
    if school is None:
        raise ApiError("PERMISSION_DENIED", "Votre compte n'est rattaché à aucune école.")
    return school


def teacher_classrooms(teacher):
    return Classroom.objects.filter(teacher=teacher, archived_at__isnull=True)


def _check_course(school: School, course):
    if not school.courses.filter(pk=course.pk).exists():
        raise ApiError("COURSE_NOT_IN_OFFER", fields={"courseSlug": "COURSE_NOT_IN_OFFER"})


def _check_name(teacher, name: str, exclude=None):
    taken = teacher_classrooms(teacher).filter(name__iexact=name)
    if exclude is not None:
        taken = taken.exclude(pk=exclude.pk)
    if taken.exists():
        raise ApiError("CLASSROOM_NAME_TAKEN", fields={"name": "CLASSROOM_NAME_TAKEN"})


def _save(classroom: Classroom) -> Classroom:
    """Deux créations simultanées du même nom : la contrainte de la base tranche."""
    try:
        with transaction.atomic():
            classroom.save()
    except IntegrityError:
        raise ApiError("CLASSROOM_NAME_TAKEN", fields={"name": "CLASSROOM_NAME_TAKEN"}) from None
    return classroom


def create_classroom(teacher, *, name, course, school_grade=None, color=None) -> Classroom:
    school = teacher_school(teacher)
    with transaction.atomic():
        school = quotas.lock_school(school)
        quotas.check_offer(school)
        _check_course(school, course)
        _check_name(teacher, name)
        quotas.check_classroom_quota(school)
        count = Classroom.objects.filter(teacher=teacher).count()
        return _save(
            Classroom(
                school=school,
                teacher=teacher,
                course=course,
                name=name,
                school_grade=school_grade,
                color=color or PALETTE[count % len(PALETTE)],
            )
        )


def update_classroom(classroom: Classroom, data: dict) -> Classroom:
    """Renommer, recolorer, changer le niveau ; le parcours est figé dès que la classe a eu un membre."""
    course = data.get("course")
    if course is not None and course != classroom.course:
        if classroom.memberships.exists():
            raise ApiError(
                "VALIDATION_ERROR",
                "Le parcours d'une classe qui a des élèves ne peut plus être changé.",
                fields={"courseSlug": "VALIDATION_ERROR"},
            )
        _check_course(classroom.school, course)
        classroom.course = course
    if "name" in data:
        _check_name(classroom.teacher, data["name"], exclude=classroom)
        classroom.name = data["name"]
    for field in ("color", "school_grade"):
        if field in data:
            setattr(classroom, field, data[field])
    return _save(classroom)


def remove_member(membership: ClassroomMembership) -> ClassroomMembership:
    """
    Retrait (WT04) : l'élève quitte la classe et libère sa place dans le quota. Une invitation encore en attente est
    annulée : le lien SMS du parent ne vaut plus.
    """
    with transaction.atomic():
        membership = ClassroomMembership.objects.select_for_update().get(pk=membership.pk)
        if membership.status == Status.LEFT:
            return membership
        consent = membership.consent_request
        if consent is not None and consent.status == ConsentRequest.Status.PENDING:
            consent.status = ConsentRequest.Status.CANCELLED
            consent.token_hash = ""
            consent.resolved_at = timezone.now()
            consent.save(update_fields=["status", "token_hash", "resolved_at", "updated_at"])
        membership.status = Status.LEFT
        membership.left_at = timezone.now()
        membership.save(update_fields=["status", "left_at", "updated_at"])
    return membership
