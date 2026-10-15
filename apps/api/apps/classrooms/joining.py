"""
Décision du parent sur une invitation d'enseignant (WPD05, D60, C11), appelée par `apps.accounts.consent` dans sa
transaction, une fois la demande vérifiée (numéro du parent, demande ouverte) :

- **acceptation avec création du compte** : le parent choisit l'identifiant et le mot de passe de l'enfant ; le compte
  est actif, l'enfant complète son profil à sa première connexion (W11-W14, comme D51) ;
- **rattachement d'un enfant existant** (C11) : un enfant déjà lié à ce parent rejoint la classe, sans nouveau compte ;
- **refus ou expiration** : la place est libérée (C19) et l'enseignant est prévenu (WT04, WT12).

L'élève rejoint la classe dès l'acceptation et il est inscrit au parcours de la classe (`source=classroom`), couvert
par l'offre de l'école, sans paiement (D62). Une inscription antérieure au même parcours est gardée telle quelle.
"""

from django.db.models.functions import Lower
from django.utils import timezone

from apps.accounts.models import ConsentRequest, LearnerProfile, ParentChildLink, User
from apps.learning.models import Enrollment
from apps.notifications.models import Category
from apps.notifications.services import notify
from libs.errors import ApiError

from .models import ClassroomMembership

Status = ClassroomMembership.Status


def enroll(learner, course) -> Enrollment:
    enrollment, _ = Enrollment.objects.get_or_create(
        learner=learner, course=course, defaults={"source": Enrollment.Source.CLASSROOM}
    )
    return enrollment


def classroom_url(membership: ClassroomMembership) -> str:
    return f"/enseignant/classes/{membership.classroom_id}"


def _child_name(consent: ConsentRequest) -> str:
    return f"{consent.subject.get('first_name', '')} {consent.subject.get('last_name', '')}".strip()


def _new_learner(consent, parent, username, password) -> User:
    if not username or not password:
        raise ApiError(
            "VALIDATION_ERROR",
            "Choisissez l'identifiant et le mot de passe de votre enfant, ou rattachez un compte existant.",
            fields={
                name: "VALIDATION_ERROR"
                for name, value in (("username", username), ("password", password))
                if not value
            },
        )
    if User.objects.annotate(lower=Lower("username")).filter(lower=username.lower()).exists():
        raise ApiError("USERNAME_TAKEN", fields={"username": "USERNAME_TAKEN"})
    learner = User.objects.create_learner(
        username,
        password,
        first_name=consent.subject.get("first_name", ""),
        last_name=consent.subject.get("last_name", ""),
        status=User.Status.ACTIVE,
    )
    LearnerProfile.objects.create(user=learner)
    ParentChildLink.objects.create(
        parent=parent, learner=learner, relationship=consent.relationship, consent_request=consent
    )
    return learner


def _existing_child(parent, learner_id) -> User:
    link = (
        ParentChildLink.objects.select_related("learner")
        .filter(parent=parent, learner_id=learner_id)
        .first()
    )
    if link is None:
        raise ApiError(
            "NOT_FOUND",
            "Cet enfant n'est pas rattaché à votre compte.",
            fields={"learnerId": "NOT_FOUND"},
        )
    return link.learner


def join_classroom(consent: ConsentRequest, parent, data: dict) -> ClassroomMembership:
    membership = ClassroomMembership.objects.select_for_update().get(consent_request=consent)
    learner_id = data.get("learner_id")
    if learner_id is not None:
        learner = _existing_child(parent, learner_id)
        if membership.classroom.memberships.filter(learner=learner, status=Status.ACTIVE).exists():
            raise ApiError("ALREADY_IN_CLASSROOM")
    else:
        learner = _new_learner(consent, parent, data.get("username"), data.get("password"))
    consent.learner = learner
    membership.learner = learner
    membership.status = Status.ACTIVE
    membership.joined_at = timezone.now()
    membership.save(update_fields=["learner", "status", "joined_at", "updated_at"])
    classroom = membership.classroom
    enroll(learner, classroom.course)
    notify(
        classroom.teacher,
        Category.PROGRESS,
        "classroom.joined",
        f"{learner.first_name} {learner.last_name} a rejoint la classe {classroom.name}",
        "Son parent a accepté votre invitation.",
        url=classroom_url(membership),
        tone="success",
        icon="users",
    )
    return membership


def invitation_closed(consent: ConsentRequest) -> None:
    """Demande refusée ou expirée : l'enseignant est prévenu ; la place est déjà libérée par le statut de la demande."""
    membership = (
        ClassroomMembership.objects.select_related("classroom__teacher")
        .filter(consent_request=consent, status=Status.INVITED)
        .first()
    )
    if membership is None:
        return
    classroom = membership.classroom
    refused = consent.status == ConsentRequest.Status.REFUSED
    notify(
        classroom.teacher,
        Category.PROGRESS,
        "classroom.invitation_refused" if refused else "classroom.invitation_expired",
        f"Invitation {'refusée' if refused else 'expirée'} : {_child_name(consent)}",
        (
            f"Le parent n'a pas accepté l'invitation dans la classe {classroom.name}."
            if refused
            else f"Le parent n'a pas répondu à temps pour la classe {classroom.name}."
        ),
        url=classroom_url(membership),
        tone="warning",
        icon="user-x",
    )
