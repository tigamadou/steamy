"""
Quotas d'une école (D61, C19), contrôlés par le serveur : l'interface les affiche, elle ne les garantit pas.

- Classes : classes non archivées de l'école.
- Élèves : élèves actifs (comptés une fois, même dans deux classes) **plus** invitations en attente ; une invitation
  refusée, expirée ou annulée libère sa place.

Toute création qui consomme un quota verrouille d'abord la ligne de l'école (`lock_school`) : deux requêtes
concurrentes ne peuvent pas dépasser le quota.
"""

from django.utils import timezone

from libs.errors import ApiError

from .models import ClassroomMembership, School

Status = ClassroomMembership.Status


def lock_school(school: School) -> School:
    """À appeler dans une transaction, avant de compter."""
    return School.objects.select_for_update().get(pk=school.pk)


def classrooms_used(school: School) -> int:
    return school.classrooms.filter(archived_at__isnull=True).count()


def learners_used(school: School) -> int:
    seats = ClassroomMembership.objects.filter(
        classroom__school=school, classroom__archived_at__isnull=True
    )
    active = seats.filter(status=Status.ACTIVE).values("learner").distinct().count()
    pending = seats.filter(
        status=Status.INVITED,
        consent_request__status="pending",
        consent_request__expires_at__gt=timezone.now(),
    ).count()
    return active + pending


def check_classroom_quota(school: School) -> None:
    if classrooms_used(school) >= school.classroom_quota:
        raise ApiError("CLASSROOM_QUOTA_EXCEEDED")
