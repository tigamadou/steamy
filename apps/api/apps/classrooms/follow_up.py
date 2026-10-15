"""
Suivi des élèves par l'enseignant (WT01, WT04, WT05, WT07, WT10, D63-D66). Toujours limité aux élèves **actifs** des
classes **actives** de l'enseignant, et au parcours de la classe : rien d'un autre parcours, aucune donnée sensible.

- « À revoir » (D65) : tentatives `ko` sans commentaire de l'enseignant ; pas de correction manuelle.
- Décrochage (D66) : élève actif sans activité sur le parcours de la classe depuis le seuil de `PlatformSettings`
  (7 jours par défaut) ; avant toute activité, la date d'adhésion fait foi.
- Commentaires (D63, S11) : à sens unique, notifiés, visibles de l'élève et de son parent, journalisés.
"""

from datetime import timedelta

from django.db.models import Exists, OuterRef, Subquery
from django.utils import timezone

from apps.core.audit import audit
from apps.core.models import PlatformSettings
from apps.learning.models import Enrollment, QuizAttempt
from apps.notifications.models import Category
from apps.notifications.services import notify
from libs.errors import ApiError

from .models import ClassroomMembership, TeacherComment

Status = ClassroomMembership.Status
TO_REVIEW = "to_review"


def active_seats(teacher):
    return ClassroomMembership.objects.filter(
        status=Status.ACTIVE, classroom__teacher=teacher, classroom__archived_at__isnull=True
    )


def learner_seat(teacher, learner_id, classroom_id=None) -> ClassroomMembership:
    """Place active de l'élève dans une classe de l'enseignant ; sinon l'élève n'existe pas pour lui (404)."""
    seats = active_seats(teacher).filter(learner_id=learner_id)
    if classroom_id is not None:
        seats = seats.filter(classroom_id=classroom_id)
    seat = (
        seats.select_related("classroom__course", "learner__learner_profile__avatar")
        .order_by("-joined_at", "-id")
        .first()
    )
    if seat is None:
        raise ApiError("NOT_FOUND")
    return seat


def enrollments_for(seats) -> dict:
    """Inscription au parcours de la classe de chaque place : `{(learner_id, course_id): Enrollment}`."""
    seats = list(seats)
    enrollments = Enrollment.objects.filter(
        learner_id__in={seat.learner_id for seat in seats},
        course_id__in={seat.classroom.course_id for seat in seats},
    )
    return {(e.learner_id, e.course_id): e for e in enrollments}


def last_activity(seat, enrollment) -> timezone.datetime:
    return (enrollment and enrollment.last_activity_at) or seat.joined_at or seat.created_at


def dropout_limit():
    return timezone.now() - timedelta(days=PlatformSettings.load().dropout_threshold_days)


def is_dropout(seat, enrollment, limit) -> bool:
    if enrollment is not None and enrollment.status == Enrollment.Status.COMPLETED:
        return False
    return last_activity(seat, enrollment) < limit


def dropouts(seats) -> list[tuple]:
    """Élèves décrocheurs : `[(place, inscription, dernière activité)]`, les plus anciens d'abord."""
    seats = list(seats.select_related("classroom__course", "learner__learner_profile__avatar"))
    enrollments = enrollments_for(seats)
    limit = dropout_limit()
    rows = []
    for seat in seats:
        enrollment = enrollments.get((seat.learner_id, seat.classroom.course_id))
        if is_dropout(seat, enrollment, limit):
            rows.append((seat, enrollment, last_activity(seat, enrollment)))
    return sorted(rows, key=lambda row: row[2])


def attempts_of(teacher):
    """
    Tentatives des élèves actifs de l'enseignant sur le parcours de leur classe, avec la classe (la plus récente si
    l'élève suit ce parcours dans deux classes) et `commented` (D65).
    """
    seats = (
        active_seats(teacher)
        .filter(learner=OuterRef("learner"), classroom__course=OuterRef("enrollment__course"))
        .order_by("-joined_at", "-id")
    )
    return (
        QuizAttempt.objects.filter(Exists(seats))
        .annotate(
            classroom_id=Subquery(seats.values("classroom_id")[:1]),
            classroom_name=Subquery(seats.values("classroom__name")[:1]),
            commented=Exists(TeacherComment.objects.filter(attempt=OuterRef("pk"))),
        )
        .select_related(
            "learner__learner_profile__avatar",
            "quiz__level__project",
            "quiz__project",
            "enrollment__course",
        )
        .order_by("-created_at", "-id")
    )


def filter_attempts(queryset, *, status=None, kind=None, classroom_id=None):
    if status == TO_REVIEW:
        queryset = queryset.filter(status=QuizAttempt.Status.KO, commented=False)
    elif status:
        queryset = queryset.filter(status=status)
    if kind:
        queryset = queryset.filter(quiz__kind=kind)
    if classroom_id is not None:
        queryset = queryset.filter(classroom_id=classroom_id)
    return queryset


def to_review(teacher):
    return filter_attempts(attempts_of(teacher), status=TO_REVIEW)


def comment(teacher, seat, body: str, attempt_id=None, request=None) -> TeacherComment:
    attempt = None
    if attempt_id is not None:
        attempt = QuizAttempt.objects.filter(
            pk=attempt_id, learner=seat.learner, enrollment__course=seat.classroom.course
        ).first()
        if attempt is None:
            raise ApiError("NOT_FOUND", fields={"attemptId": "NOT_FOUND"})
    note = TeacherComment.objects.create(
        teacher=teacher, learner=seat.learner, classroom=seat.classroom, attempt=attempt, body=body
    )
    learner = seat.learner
    teacher_name = f"{teacher.first_name} {teacher.last_name}".strip()
    notify(
        learner,
        Category.COACHING,
        "classroom.comment",
        f"{teacher_name} t'a laissé un commentaire",
        body[:200],
        url="/apprenant",
        icon="message",
    )
    link = getattr(learner, "parent_link", None)
    if link is not None:
        notify(
            link.parent,
            Category.PROGRESS,
            "classroom.comment",
            f"{teacher_name} a commenté le travail de {learner.first_name}",
            body[:200],
            url=f"/parent/enfants/{learner.pk}",
            icon="message",
        )
    audit(
        "classroom.comment",
        actor=teacher,
        target=note,
        data={"learner": learner.pk, "attempt": attempt.pk if attempt else None},
        request=request,
    )
    return note


def visible_comments(user, learner_id=None):
    """Apprenant : les siens ; parent : ceux de ses enfants (`learnerId` d'un autre enfant → 404)."""
    queryset = TeacherComment.objects.select_related(
        "teacher", "classroom", "attempt__quiz__level", "attempt__quiz__project"
    )
    if user.is_learner:
        return queryset.filter(learner=user)
    children = user.children_links.values("learner")
    if learner_id is not None:
        if not user.children_links.filter(learner_id=learner_id).exists():
            raise ApiError("NOT_FOUND")
        return queryset.filter(learner_id=learner_id)
    return queryset.filter(learner__in=children)
