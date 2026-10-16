"""
Alertes de réassort (WK11, D38, D30) : un kit en rupture repasse en stock → chaque demandeur est prévenu **une
seule fois** : SMS pour un invité ou un parent, notification dans l'application pour un apprenant (sans téléphone).
"""

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Kit, RestockAlert


def request_alert(kit: Kit, *, user=None, phone: str = "") -> RestockAlert:
    """Enregistre la demande ; une demande déjà en attente pour le même destinataire est réutilisée."""
    lookup = {"user": user} if user is not None else {"phone": phone, "user": None}
    existing = RestockAlert.objects.filter(kit=kit, notified_at__isnull=True, **lookup).first()
    if existing:
        return existing
    try:
        with transaction.atomic():
            return RestockAlert.objects.create(kit=kit, **lookup)
    except IntegrityError:  # double clic : l'autre requête a créé la demande
        return RestockAlert.objects.get(kit=kit, notified_at__isnull=True, **lookup)


def kit_url(kit: Kit) -> str:
    return f"/boutique/{kit.slug}"


def notify_restock(kit_id: int) -> int:
    """Prévient les demandeurs d'un kit de nouveau disponible. Idempotent : chaque alerte part une fois."""
    from apps.notifications.models import Category
    from apps.notifications.services import notify
    from apps.notifications.sms import queue_sms

    kit = Kit.objects.filter(pk=kit_id, active=True, stock_quantity__gt=0).first()
    if kit is None:
        return 0
    sent = 0
    with transaction.atomic():
        alerts = (
            RestockAlert.objects.select_for_update(skip_locked=True, of=("self",))
            .select_related("user")
            .filter(kit=kit, notified_at__isnull=True)
        )
        for alert in alerts:
            alert.notified_at = timezone.now()
            alert.save(update_fields=["notified_at"])
            user = alert.user
            if user is not None and user.is_learner:
                notify(
                    user,
                    Category.PAYMENTS,
                    "restock",
                    f"{kit.name} est de retour en stock",
                    "Tu peux le demander à ton parent depuis la boutique.",
                    url=f"/apprenant{kit_url(kit)}",
                    tone="success",
                    icon="🛒",
                )
            else:
                phone = user.phone if user is not None else alert.phone
                text = (
                    f"Steamy : {kit.name} est de retour en stock. {settings.WEB_URL}{kit_url(kit)}"
                )
                queue_sms(phone, text, purpose="restock")
            sent += 1
    return sent
