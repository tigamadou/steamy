"""Diffusion des annonces de la plateforme (WAD14) en notifications dans l'application (D7)."""

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.notifications.models import Category
from apps.notifications.services import notify

from .models import Announcement

Audience = Announcement.Audience
Role = User.Role

ROLES = {
    Audience.ALL: (Role.LEARNER, Role.PARENT, Role.TEACHER),
    Audience.LEARNERS: (Role.LEARNER,),
    Audience.PARENTS: (Role.PARENT,),
    Audience.TEACHERS: (Role.TEACHER,),
}


def recipients(announcement: Announcement):
    """Comptes actifs du public visé ; ni le personnel, ni les comptes en attente, suspendus ou fermés."""
    return User.objects.filter(role__in=ROLES[announcement.audience], status=User.Status.ACTIVE)


def broadcast(announcement_id: int) -> int:
    """Une annonce n'est diffusée qu'une fois ; renvoie le nombre de destinataires (0 si déjà diffusée)."""
    with transaction.atomic():
        announcement = Announcement.objects.select_for_update().get(pk=announcement_id)
        if announcement.broadcast_at is not None:
            return 0
        count = 0
        for user in recipients(announcement).iterator():
            notify(
                user,
                Category.ACCOUNT,
                "announcement",
                announcement.title,
                message=announcement.body,
                url=announcement.url,
                icon="megaphone",
            )
            count += 1
        announcement.broadcast_at = timezone.now()
        announcement.recipients = count
        announcement.save(update_fields=["broadcast_at", "recipients"])
    return count
