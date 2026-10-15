"""
`notify()` : point d'entrée unique pour notifier un utilisateur (D7, C12).

- La notification dans l'application est toujours créée.
- L'email part si l'utilisateur a une adresse de contact et n'a pas désactivé l'email pour la catégorie ; il est
  envoyé après la validation de la transaction (Celery), jamais si elle est annulée.
- Pas de SMS ni de push par ce service : les SMS servent aux flux (OTP, liens de consentement et de paiement).
"""

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

from .models import CATEGORIES_BY_ROLE, Category, Channel, Notification, NotificationPreference


def contact_email(user) -> str | None:
    """Adresse où envoyer les notifications : email de connexion (enseignant) ou de contact (profil)."""
    if user.is_teacher:
        return user.email
    profile = getattr(user, "learner_profile", None) if user.is_learner else None
    if user.is_parent:
        profile = getattr(user, "parent_profile", None)
    return getattr(profile, "email", None) or None


def categories_for(user) -> list[str]:
    return list(CATEGORIES_BY_ROLE.get(user.role, []))


def email_enabled(user, category: str) -> bool:
    if category == Category.ACCOUNT:
        return True
    preference = NotificationPreference.objects.filter(
        user=user, category=category, channel=Channel.EMAIL
    ).first()
    return preference.enabled if preference else True


def notify(
    user,
    category: str,
    type: str,
    title: str,
    message: str = "",
    url: str = "",
    tone: str = "info",
    icon: str = "",
) -> Notification:
    if category != Category.ACCOUNT and category not in categories_for(user):
        raise ValueError(f"Catégorie « {category} » non prévue pour le rôle {user.role!r}")
    notification = Notification.objects.create(
        user=user,
        category=category,
        type=type,
        title=title,
        message=message,
        url=url,
        tone=tone,
        icon=icon,
    )
    email = contact_email(user)
    if email and email_enabled(user, category):
        from .tasks import send_notification_email

        transaction.on_commit(lambda: send_notification_email.delay(notification.id))
    return notification


def deliver_email(notification: Notification) -> bool:
    email = contact_email(notification.user)
    if not email:
        return False
    link = f"{settings.WEB_URL}{notification.url}" if notification.url else settings.WEB_URL
    body = f"{notification.message}\n\n{link}".strip()
    send_mail(notification.title, body, settings.DEFAULT_FROM_EMAIL, [email])
    return True
