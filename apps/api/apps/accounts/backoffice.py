"""
Actions du personnel sur les comptes (API-L6.2, WAD06-WAD08, WAD13), appelées par l'admin Django.

Aucune ne contourne une règle métier : le personnel suit les consentements (relance, litige) mais ne les tranche
jamais (D70) ; un changement de parent passe par une demande que seul le nouveau parent accepte (D22) ; la
modération des affichages publics précède toute publication (D15). Chaque action est journalisée (`AuditLog`).
"""

from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.core.audit import audit
from apps.core.groups import SUPER_ADMIN
from apps.notifications.sms import queue_sms
from libs.errors import ApiError

from .models import ConsentRequest, ParentChildLink, PublicProfileReview, User
from .otp import client_ip
from .signup import SIGNUP_LIFETIME, check_cooldown, send_consent_sms

Status = User.Status

#: Transitions de statut ouvertes au support : statut visé → statuts de départ admis. Un compte en attente de
#: consentement ou anonymisé n'est jamais touché : seul le parent (ou la purge) en décide.
STATUS_TRANSITIONS = {
    Status.SUSPENDED: (Status.ACTIVE,),
    Status.DEACTIVATED: (Status.ACTIVE, Status.SUSPENDED),
    Status.ACTIVE: (Status.SUSPENDED, Status.DEACTIVATED),
}

PARENT_CHANGE_SMS = (
    "Steamy : une demande vous désigne comme parent d'un enfant inscrit sur Steamy. "
    "Pour voir la demande et répondre : {url}"
)
FORMER_PARENT_SMS = (
    "Steamy : à la suite d'une demande traitée par notre support, vous n'êtes plus le parent rattaché "
    "au compte de votre enfant. Pour toute question : aide sur steamy."
)


def set_status(user: User, status: str, reason: str, request) -> bool:
    """Suspendre, désactiver ou réactiver un compte (motif obligatoire). Faux si la transition n'est pas admise."""
    if user.is_staff or user.status not in STATUS_TRANSITIONS[status]:
        return False
    previous = user.status
    user.status = status
    user.save(update_fields=["status", "updated_at"])
    audit(
        "account.status_changed",
        request=request,
        target=user,
        data={"from": previous, "to": status, "reason": reason},
    )
    return True


def flag_dispute(consent: ConsentRequest, note: str, request) -> None:
    """Litige (D70) : la demande garde son statut ; seul le parent la tranche."""
    consent.disputed_at = timezone.now()
    consent.dispute_note = note
    consent.save(update_fields=["disputed_at", "dispute_note", "updated_at"])
    audit("consent.disputed", request=request, target=consent, data={"note": note})


def request_parent_change(link: ParentChildLink, phone: str, relationship, request):
    """
    Changement de parent (D22) : une demande d'origine `support` est envoyée au nouveau parent ; le lien n'est
    remplacé qu'à son acceptation (`consent.accept`). Le support n'accepte rien.
    """
    if phone == link.parent.phone:
        raise ApiError("VALIDATION_ERROR", "Ce numéro est déjà celui du parent rattaché.")
    check_cooldown(phone)
    learner = link.learner
    profile = getattr(learner, "learner_profile", None)
    try:
        with transaction.atomic():
            consent = ConsentRequest.objects.create(
                origin=ConsentRequest.Origin.SUPPORT,
                subject={
                    "first_name": learner.first_name,
                    "last_name": learner.last_name,
                    "username": learner.username,
                    "age": _age(profile),
                    "relationship": relationship.code,
                },
                learner=learner,
                requested_by=request.user,
                parent_phone=phone,
                relationship=relationship,
                replaces_link=link,
                expires_at=timezone.now() + SIGNUP_LIFETIME,
            )
            send_consent_sms(consent, client_ip(request), PARENT_CHANGE_SMS)
    except IntegrityError:  # une demande est déjà en attente pour cet enfant
        raise ApiError(
            "VALIDATION_ERROR", "Une demande est déjà en attente pour cet enfant."
        ) from None
    audit(
        "consent.parent_change_requested",
        request=request,
        target=consent,
        data={"link": link.pk},
    )
    return consent


def replace_link(consent: ConsentRequest, parent: User) -> None:
    """À l'acceptation d'une demande de changement : le lien change de parent, l'ancien parent est prévenu."""
    link = consent.replaces_link
    former = link.parent
    link.parent = parent
    link.relationship = consent.relationship
    link.consent_request = consent
    link.save(update_fields=["parent", "relationship", "consent_request", "updated_at"])
    if former.phone:
        queue_sms(former.phone, FORMER_PARENT_SMS, purpose="parent_change")


def review_public_profile(review: PublicProfileReview, approve: bool, request) -> bool:
    """Modération a priori (D15) : seul un pseudonyme approuvé est recopié sur le profil. Faux si déjà modéré."""
    if review.status != PublicProfileReview.Status.PENDING:
        return False
    review.status = (
        PublicProfileReview.Status.APPROVED if approve else PublicProfileReview.Status.REJECTED
    )
    review.reviewed_by = request.user
    review.reviewed_at = timezone.now()
    review.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
    if approve:
        profile = review.learner.learner_profile
        profile.public_pseudonym = review.pseudonym
        if review.avatar_id:
            profile.avatar_id = review.avatar_id
        profile.save(update_fields=["public_pseudonym", "avatar", "updated_at"])
    audit(f"public_profile.{review.status}", request=request, target=review)
    return True


def is_last_super_admin(user: User) -> bool:
    """Vrai si `user` est le seul membre actif du groupe Super-admin (garde-fou de WAD13)."""
    members = Group.objects.get(name=SUPER_ADMIN).user_set.filter(is_staff=True, is_active=True)
    return members.filter(pk=user.pk).exists() and members.count() == 1


def reset_totp(staff: User, request) -> None:
    """Supprime les appareils TOTP : les sessions du membre tombent (empreinte de session) et il se réenrôle."""
    TOTPDevice.objects.filter(user=staff).delete()
    audit("staff.totp_reset", request=request, target=staff)


def _age(profile) -> int | None:
    if profile is None or profile.birth_date is None:
        return None
    today = timezone.localdate()
    born = profile.birth_date
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


#: Message envoyé par le Support (WAD07) : lien vers « Mot de passe oublié », où le titulaire reçoit son code (D26)
RESET_LINK_TEXT = (
    "Steamy : pour choisir un nouveau mot de passe, ouvrez {url} et saisissez {identifier}. "
    "Vous recevrez un code de vérification."
)


def send_password_reset_link(user: User, request) -> str:
    """
    WAD07 « Réinitialiser le mot de passe » : le parent (SMS) ou l'enseignant (email) reçoit le lien du parcours
    « Mot de passe oublié » (WL02), où le code lui est envoyé ; le personnel ne voit jamais de code. Un apprenant
    passe par son parent (D26). Renvoie le canal utilisé ; `ValueError` si le compte n'y a pas droit.
    """
    from django.conf import settings
    from django.core.mail import send_mail

    if user.status != User.Status.ACTIVE:
        raise ValueError(f"{user} : compte non actif.")
    url = f"{settings.WEB_URL.rstrip('/')}/mot-de-passe-oublie"
    if user.role == User.Role.PARENT and user.phone:
        queue_sms(
            user.phone,
            RESET_LINK_TEXT.format(url=url, identifier="votre numéro"),
            purpose="password_reset",
        )
        channel = "sms"
    elif user.role == User.Role.TEACHER and user.email:
        send_mail(
            "Steamy · nouveau mot de passe",
            RESET_LINK_TEXT.format(url=url, identifier="votre adresse email"),
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
        )
        channel = "email"
    else:
        raise ValueError(f"{user} : un apprenant change de mot de passe par son parent (D26).")
    audit("user.password_reset_link", request=request, target=user, data={"channel": channel})
    return channel
