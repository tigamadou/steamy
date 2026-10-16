"""
Suppression de compte (D40, D54, §4.1) : désactivation immédiate, anonymisation à J+30, annulable d'ici là.

- L'apprenant **demande** (WD15) : la demande attend son parent (`pending_parent`), qui l'approuve ou la refuse
  (WPD01, WPD09) ; l'apprenant peut la retirer tant qu'elle attend.
- Le parent supprime un enfant de lui-même (WPD09) et annule depuis WPD02 tant que l'anonymisation n'a pas eu lieu.
- Le parent supprime son propre compte seulement sans enfant rattaché (`CHILDREN_STILL_LINKED`) ; désactivé
  aussitôt, il ne peut plus se connecter : l'annulation passe par le support (`cancel_by_support`, admin Django).
- L'anonymisation efface les données personnelles et libère les identifiants ; la ligne `User` reste, et avec elle
  les commandes et factures (D40). Les autres apps effacent leurs propres données sur `account_anonymized`.
"""

from datetime import timedelta

from django.db import transaction
from django.dispatch import Signal
from django.utils import timezone

from apps.core.audit import audit
from apps.notifications.models import Category, Notification, Tone
from apps.notifications.services import notify
from libs.errors import ApiError

from .children import children_of
from .models import (
    ConsentRequest,
    DeletionRequest,
    OtpChallenge,
    PasswordResetToken,
    PublicProfileReview,
    SignupSession,
    User,
)

#: Délai avant l'anonymisation (D40, D54).
GRACE_PERIOD = timedelta(days=30)

#: Envoyé après l'anonymisation d'un compte, dans la même transaction (`user`).
account_anonymized = Signal()

Status = DeletionRequest.Status


def open_request(user: User) -> DeletionRequest | None:
    return (
        DeletionRequest.objects.select_for_update()
        .filter(user=user, status__in=DeletionRequest.OPEN_STATUSES)
        .first()
    )


def _schedule(deletion: DeletionRequest, actor: User, request=None) -> DeletionRequest:
    """Le compte est désactivé aussitôt (connexion refusée : `ACCOUNT_DEACTIVATED`), anonymisé à J+30."""
    deletion.status = Status.SCHEDULED
    deletion.scheduled_for = timezone.now() + GRACE_PERIOD
    deletion.save()
    deletion.user.status = User.Status.DEACTIVATED
    deletion.user.save(update_fields=["status", "updated_at"])
    audit("deletion.scheduled", actor=actor, target=deletion.user, request=request)
    return deletion


# --- Compte connecté (WD15, WPD08) --------------------------------------------------------------


def request_own(user: User, reason=None, note: str = "", request=None) -> DeletionRequest:
    """`POST accounts/me/deletion-request/`. Idempotent : une demande ouverte est renvoyée telle quelle."""
    if not (user.is_learner or user.is_parent):
        raise ApiError("PERMISSION_DENIED")
    with transaction.atomic():
        User.objects.select_for_update().get(pk=user.pk)
        existing = open_request(user)
        if existing is not None:
            return existing
        if user.is_parent and children_of(user).exists():
            raise ApiError("CHILDREN_STILL_LINKED")
        deletion = DeletionRequest.objects.create(
            user=user, requested_by=user, reason=reason, note=note, status=Status.PENDING_PARENT
        )
        if user.is_parent:
            return _schedule(deletion, user, request)
        audit("deletion.requested", actor=user, target=user, request=request)
        parent = user.parent_link.parent
        notify(
            parent,
            Category.CONSENTS,
            "deletion_request",
            f"{user.first_name} demande la suppression de son compte",
            "Examinez sa demande : le compte sera désactivé puis anonymisé 30 jours après votre accord.",
            url=f"/parent/enfants/{user.pk}/supprimer?demande={deletion.pk}",
            tone=Tone.WARNING,
        )
    return deletion


def cancel_own(user: User, request=None) -> None:
    """L'apprenant retire sa demande tant que son parent ne l'a pas validée."""
    with transaction.atomic():
        deletion = open_request(user)
        if deletion is None or deletion.status != Status.PENDING_PARENT:
            raise ApiError("NOT_FOUND")
        deletion.status = Status.CANCELLED
        deletion.resolved_at = timezone.now()
        deletion.save()
        audit("deletion.cancelled", actor=user, target=user, request=request)


# --- Enfants du parent (WPD01, WPD02, WPD09) ----------------------------------------------------


def delete_child(parent: User, child: User, reason, note: str = "", request=None):
    """WPD09 : suppression à l'initiative du parent, ou validation de la demande de l'enfant (motif prérempli)."""
    with transaction.atomic():
        deletion = open_request(child)
        if deletion is not None and deletion.status == Status.SCHEDULED:
            return deletion
        if deletion is None:
            deletion = DeletionRequest(user=child, status=Status.PENDING_PARENT)
        deletion.requested_by = deletion.requested_by or parent
        deletion.reason = reason
        deletion.note = note
        return _schedule(deletion, parent, request)


def cancel_child(parent: User, child: User, request=None) -> None:
    """WPD02 « Annuler la suppression » : l'enfant peut de nouveau se connecter."""
    with transaction.atomic():
        deletion = open_request(child)
        if deletion is None:
            raise ApiError("NOT_FOUND")
        deletion.status = Status.CANCELLED
        deletion.resolved_at = timezone.now()
        deletion.save()
        if child.status == User.Status.DEACTIVATED:
            child.status = User.Status.ACTIVE
            child.save(update_fields=["status", "updated_at"])
        audit("deletion.cancelled", actor=parent, target=child, request=request)


def cancel_by_support(deletion: DeletionRequest, reason: str, request=None) -> bool:
    """
    Admin Django (support) : annule une suppression encore ouverte et réactive le compte désactivé par elle. Faux si
    la demande est déjà close.
    """
    with transaction.atomic():
        deletion = (
            DeletionRequest.objects.select_for_update()
            .select_related("user")
            .filter(pk=deletion.pk, status__in=DeletionRequest.OPEN_STATUSES)
            .first()
        )
        if deletion is None:
            return False
        deletion.status = Status.CANCELLED
        deletion.resolved_at = timezone.now()
        deletion.save()
        user = deletion.user
        if user.status == User.Status.DEACTIVATED:
            user.status = User.Status.ACTIVE
            user.save(update_fields=["status", "updated_at"])
        audit(
            "deletion.cancelled_by_support",
            target=user,
            data={"reason": reason},
            request=request,
        )
    return True


def requests_for_parent(parent: User):
    """Demandes de suppression des enfants du parent."""
    return DeletionRequest.objects.filter(user__in=children_of(parent)).select_related(
        "user", "reason"
    )


def _pending_for_parent(parent: User, deletion_id) -> DeletionRequest:
    deletion = requests_for_parent(parent).select_for_update(of=("self",)).filter(pk=deletion_id)
    deletion = deletion.first()
    if deletion is None:
        raise ApiError("NOT_FOUND")
    if deletion.status != Status.PENDING_PARENT:
        raise ApiError("DELETION_ALREADY_RESOLVED")
    return deletion


def approve(parent: User, deletion_id, request=None) -> DeletionRequest:
    with transaction.atomic():
        return _schedule(_pending_for_parent(parent, deletion_id), parent, request)


def refuse(parent: User, deletion_id, request=None) -> DeletionRequest:
    with transaction.atomic():
        deletion = _pending_for_parent(parent, deletion_id)
        deletion.status = Status.REFUSED
        deletion.resolved_at = timezone.now()
        deletion.save()
        audit("deletion.refused", actor=parent, target=deletion.user, request=request)
        notify(
            deletion.user,
            Category.ACCOUNT,
            "deletion_refused",
            "Ton parent a refusé la suppression de ton compte",
            "Parle-lui en si tu souhaites toujours partir.",
            url="/apprenant/profil/suppression",
        )
    return deletion


# --- Anonymisation à J+30 -----------------------------------------------------------------------


def anonymize(user: User) -> None:
    """Plus aucune donnée personnelle ; identifiants libérés ; commandes et factures intactes (D40)."""
    phone = user.phone
    ConsentRequest.objects.filter(learner=user).update(subject={}, refusal_note="")
    if phone:
        ConsentRequest.objects.filter(parent_phone=phone).update(parent_phone="")
        OtpChallenge.objects.filter(phone=phone).delete()
    OtpChallenge.objects.filter(user=user).delete()
    PasswordResetToken.objects.filter(user=user).delete()
    SignupSession.objects.filter(learner=user).delete()
    PublicProfileReview.objects.filter(learner=user).delete()
    from apps.shop.models import DeliveryAddress, RestockAlert

    DeliveryAddress.objects.filter(user=user).delete()
    RestockAlert.objects.filter(user=user).delete()
    if phone:
        RestockAlert.objects.filter(phone=phone).delete()
    Notification.objects.filter(user=user).delete()
    DeletionRequest.objects.filter(user=user).update(note="")

    profile = getattr(user, "learner_profile", None)
    if profile is not None:
        for name in ("birth_date", "declared_age", "gender", "disability", "locality", "email"):
            setattr(profile, name, None)
        profile.avatar = None
        profile.public_pseudonym = None
        profile.public_display_allowed = False
        profile.save()
    profile = getattr(user, "parent_profile", None)
    if profile is not None:
        for name in ("email", "locality", "gender", "disability"):
            setattr(profile, name, None)
        profile.profession = ""
        profile.save()

    user.username = user.phone = user.email = None
    user.first_name = user.last_name = ""
    user.set_unusable_password()
    user.status = User.Status.ANONYMIZED
    user.save()
    account_anonymized.send(sender=User, user=user)


def anonymize_due() -> int:
    """Demandes programmées arrivées à échéance : comptes anonymisés, demandes closes. Relançable."""
    with transaction.atomic():
        due = list(
            DeletionRequest.objects.select_for_update(skip_locked=True)
            .select_related("user")
            .filter(status=Status.SCHEDULED, scheduled_for__lte=timezone.now())
        )
        done = 0
        for deletion in due:
            deletion.resolved_at = timezone.now()
            if deletion.user.status != User.Status.DEACTIVATED:
                # Compte réactivé à la main entre-temps (admin) : la suppression n'a plus lieu d'être
                deletion.status = Status.CANCELLED
                deletion.save()
                continue
            anonymize(deletion.user)
            deletion.status = Status.DONE
            deletion.save()
            audit("deletion.done", target=deletion.user)
            done += 1
    return done
