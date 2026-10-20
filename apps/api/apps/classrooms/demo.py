"""
Jeu de démonstration de l'encadrement (D2), appelé par `seed_demo` après le catalogue : l'offre de l'école de
M. Adékambi, ses deux classes, leurs élèves et des invitations dans chaque état. Idempotent : relancer le seed remet les classes dans cet état.
"""

from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import (
    ConsentRequest,
    LearnerProfile,
    ParentChildLink,
    ParentProfile,
    User,
)
from apps.catalog.models import Course, Quiz
from apps.events.models import EventProposal, SteamyEvent
from apps.learning.models import Enrollment, QuizAttempt
from apps.referentials.models import Avatar, Relationship, SchoolGrade

from .joining import enroll
from .learner_invitations import Invitee, invite
from .models import Classroom, ClassroomMembership, School, TeacherComment

Status = ClassroomMembership.Status

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


#: Second parent de démonstration et ses deux enfants, élèves de Koffi.
KPADE_PHONE = "+2290190000002"
KPADE_CHILDREN = [("yao.kpade", "Yao"), ("sena.kpade", "Sèna")]
#: Invitations de la classe « 4e B » : prénom, nom, téléphone du parent, statut de la demande.
INVITATIONS = [
    ("Kémi", "Ahouandjinou", "+2290190000003", ConsentRequest.Status.PENDING),
    ("Ola", "Gbaguidi", "+2290190000004", ConsentRequest.Status.REFUSED),
    ("Tobi", "Zinsou", "+2290190000005", ConsentRequest.Status.EXPIRED),
]


def _kpade_family(password) -> list[User]:
    parent = User.objects.filter(phone=KPADE_PHONE).first() or User(phone=KPADE_PHONE)
    parent.role, parent.status = User.Role.PARENT, User.Status.ACTIVE
    parent.first_name, parent.last_name = "Bernard", "Kpadé"
    parent.set_password(password)
    parent.save()
    ParentProfile.objects.get_or_create(user=parent)
    children = []
    for username, first_name in KPADE_CHILDREN:
        child = User.objects.filter(username=username).first() or User(username=username)
        child.role, child.status = User.Role.LEARNER, User.Status.ACTIVE
        child.first_name, child.last_name = first_name, "Kpadé"
        child.set_password(password)
        child.save()
        LearnerProfile.objects.update_or_create(
            user=child, defaults={"avatar": Avatar.objects.get(code="panda")}
        )
        ParentChildLink.objects.update_or_create(
            learner=child,
            defaults={"parent": parent, "relationship": Relationship.objects.get(code="pere")},
        )
        children.append(child)
    return children


def seed_members(classrooms: list[Classroom], teacher, lea: User, password: str) -> None:
    """Élèves actifs (Léa, Yao, Sèna) et invitations en attente, refusée et expirée (WT04, D2)."""
    ClassroomMembership.objects.filter(classroom__in=classrooms).delete()
    ConsentRequest.objects.filter(
        origin=ConsentRequest.Origin.TEACHER, requested_by=teacher
    ).delete()
    yao, sena = _kpade_family(password)
    robotics, code = classrooms
    now = timezone.now()
    for classroom, learner in ((robotics, lea), (robotics, yao), (code, sena)):
        ClassroomMembership.objects.create(
            classroom=classroom, learner=learner, status=Status.ACTIVE, joined_at=now
        )
        enroll(learner, classroom.course)
    mother = Relationship.objects.get(code="mere")
    for first_name, last_name, phone, status in INVITATIONS:
        membership = invite(robotics, teacher, Invitee(first_name, last_name, phone, mother))
        if status != ConsentRequest.Status.PENDING:
            ConsentRequest.objects.filter(pk=membership.consent_request_id).update(
                status=status, resolved_at=now, token_hash=""
            )


#: Événement déjà proposé à la classe « 4e B » (WT09) : une seconde proposition répond `EVENT_ALREADY_PROPOSED`.
PROPOSED_EVENT = "defi-robots-cotonou"


def seed_proposals(classroom: Classroom, teacher) -> None:
    event = SteamyEvent.objects.get(slug=PROPOSED_EVENT)
    EventProposal.objects.get_or_create(event=event, classroom=classroom, teacher=teacher)


#: Commentaire de Koffi à Léa, sur sa tentative `warn` (visible côté apprenant WD01 et parent WPD03).
LEA_COMMENT = "Bon début, Léa ! Revois la mission sur les capteurs avant de repasser le quiz."
#: Sèna n'a rien fait depuis 10 jours : signalée en décrochage (seuil de 7 jours, D66).
DROPOUT_DAYS = 10


def seed_follow_up(classrooms: list[Classroom], teacher) -> None:
    """Une tentative `ko` de Yao à revoir, un commentaire à Léa, Sèna en décrochage (WT01, WT05, WT07)."""
    robotics, code = classrooms
    TeacherComment.objects.filter(teacher=teacher).delete()
    yao = User.objects.get(username="yao.kpade")
    enrollment = Enrollment.objects.get(learner=yao, course=robotics.course)
    enrollment.attempts.all().delete()
    quiz = Quiz.objects.filter(level__project__course=robotics.course).order_by(
        "level__project__order", "level__order"
    )[0]
    QuizAttempt.objects.create(
        learner=yao,
        enrollment=enrollment,
        quiz=quiz,
        score=0,
        total=2,
        percentage=0,
        threshold=quiz.pass_threshold,
        status=QuizAttempt.Status.KO,
        duration_sec=90,
    )
    Enrollment.objects.filter(pk=enrollment.pk).update(last_activity_at=timezone.now())
    lea_warn = QuizAttempt.objects.filter(
        learner__username="lea.adjovi",
        enrollment__course=robotics.course,
        status=QuizAttempt.Status.WARN,
    ).first()
    TeacherComment.objects.create(
        teacher=teacher,
        learner=lea_warn.learner,
        classroom=robotics,
        attempt=lea_warn,
        body=LEA_COMMENT,
    )
    sena = User.objects.get(username="sena.kpade")
    Enrollment.objects.filter(learner=sena, course=code.course).update(
        last_activity_at=timezone.now() - timedelta(days=DROPOUT_DAYS), progress_pct=10
    )
