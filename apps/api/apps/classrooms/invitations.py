"""Envoi et acceptation des invitations enseignants (S5, C6)."""

import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import TeacherProfile, User
from libs.errors import ApiError

from .models import TeacherInvitation

LIFETIME = timedelta(days=7)
SUBJECT = "Activez votre compte enseignant Steamy"
BODY = (
    "Bonjour{name},\n\n"
    "{school}vous invite à rejoindre Steamy en tant qu'enseignant.\n"
    "Pour activer votre compte et choisir votre mot de passe, ouvrez ce lien avant le {expires} :\n\n"
    "{url}\n\n"
    "Si vous n'attendiez pas cette invitation, ignorez cet email."
)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def activation_url(token: str) -> str:
    """Jeton dans le fragment : jamais envoyé au serveur, absent des journaux d'accès et de l'en-tête Referer."""
    return f"{settings.WEB_URL}/activation#jeton={token}"


def send_invitation(invitation: TeacherInvitation, invited_by=None) -> str:
    """(Re)génère le lien (l'ancien ne vaut plus) et l'envoie par email. Renvoie le jeton en clair."""
    token = secrets.token_urlsafe(32)
    now = timezone.now()
    invitation.token_hash = hash_token(token)
    invitation.sent_at = now
    invitation.expires_at = now + LIFETIME
    invitation.invited_by = invited_by or invitation.invited_by
    invitation.save()
    school = f"L'école {invitation.school.name} " if invitation.school else "L'équipe Steamy "
    body = BODY.format(
        name=f" {invitation.first_name}" if invitation.first_name else "",
        school=school,
        expires=timezone.localtime(invitation.expires_at).strftime("%d/%m/%Y"),
        url=activation_url(token),
    )
    send_mail(SUBJECT, body, settings.DEFAULT_FROM_EMAIL, [invitation.email])
    return token


def open_invitation(token: str) -> TeacherInvitation:
    """Invitation valable : jeton connu, non expiré, pas encore acceptée. Sinon `INVITATION_INVALID`."""
    invitation = (
        TeacherInvitation.objects.select_related("school")
        .filter(
            token_hash=hash_token(token or ""),
            accepted_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        .first()
    )
    if not token or invitation is None:
        raise ApiError("INVITATION_INVALID")
    return invitation


def accept_invitation(token: str, password: str) -> User:
    with transaction.atomic():
        invitation = open_invitation(token)
        invitation = TeacherInvitation.objects.select_for_update().get(pk=invitation.pk)
        if User.objects.filter(email__iexact=invitation.email).exists():
            raise ApiError("EMAIL_TAKEN")
        teacher = User.objects.create_teacher(
            invitation.email,
            password,
            first_name=invitation.first_name,
            last_name=invitation.last_name,
        )
        TeacherProfile.objects.create(user=teacher, school=invitation.school)
        invitation.accepted_at = timezone.now()
        invitation.token_hash = ""
        invitation.save(update_fields=["accepted_at", "token_hash"])
    return teacher
