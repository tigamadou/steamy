"""
Enfants du parent connecté (WPD02-WPD04, WPD10, D26, D51).

Tout accès passe par le `ParentChildLink` du parent : l'enfant d'un autre parent n'existe pas pour lui (404).
Le parent qui crée un enfant (WPD04) est l'auteur de la demande : elle est créée **acceptée**, avec l'origine
`parent` (§4.2). L'enfant complète W11-W14 à sa première connexion (D51).
"""

from datetime import date

from django.db import IntegrityError, transaction
from django.db.models import Prefetch
from django.utils import timezone

from apps.core.audit import audit
from libs.errors import ApiError

from .models import ConsentRequest, DeletionRequest, LearnerProfile, ParentChildLink, User
from .views.profiles import age_on


def children_of(parent: User):
    """Enfants rattachés au parent ; les comptes anonymisés (J+30, D40) ne sont plus des enfants à suivre."""
    return (
        User.objects.filter(role=User.Role.LEARNER, parent_link__parent=parent)
        .exclude(status=User.Status.ANONYMIZED)
        .select_related(
            "parent_link__relationship",
            "learner_profile__avatar",
            "learner_profile__school_grade",
            "learner_profile__locality",
            "learner_profile__disability",
        )
        .prefetch_related(
            "learner_profile__goals",
            Prefetch(
                "deletion_requests",
                queryset=DeletionRequest.objects.filter(status__in=DeletionRequest.OPEN_STATUSES),
                to_attr="open_deletions",
            ),
        )
        .order_by("first_name", "id")
    )


def create_child(
    parent: User, *, first_name, last_name, birth_date, relationship, username, password
):
    """WPD04 : compte actif, profil daté, demande d'origine `parent` acceptée et lien parent ↔ enfant."""
    now = timezone.now()
    age = age_on(birth_date, date.today())
    try:
        with transaction.atomic():
            child = User.objects.create_learner(
                username, password, first_name=first_name, last_name=last_name
            )
            LearnerProfile.objects.create(user=child, birth_date=birth_date, declared_age=age)
            consent = ConsentRequest.objects.create(
                origin=ConsentRequest.Origin.PARENT,
                subject={
                    "first_name": first_name,
                    "last_name": last_name,
                    "username": username,
                    "age": age,
                    "relationship": relationship.code,
                },
                learner=child,
                requested_by=parent,
                parent_phone=parent.phone,
                parent=parent,
                relationship=relationship,
                status=ConsentRequest.Status.ACCEPTED,
                expires_at=now,
                resolved_at=now,
            )
            ParentChildLink.objects.create(
                parent=parent, learner=child, relationship=relationship, consent_request=consent
            )
    except IntegrityError as error:
        # Identifiant pris entre la vérification et l'écriture
        raise ApiError("USERNAME_TAKEN", fields={"username": "USERNAME_TAKEN"}) from error
    audit("child.created", actor=parent, target=child)
    return child


def reset_password(parent: User, child: User, password: str, request=None) -> None:
    """D26 : le parent choisit le nouveau mot de passe ; les sessions ouvertes de l'enfant sont fermées."""
    child.set_password(password)
    child.save(update_fields=["password", "updated_at"])
    audit("child.password_reset", actor=parent, target=child, request=request)
