from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Kit, RestockAlert


@receiver(post_save, sender=Kit, dispatch_uid="shop_kit_restocked")
def kit_restocked(sender, instance: Kit, **kwargs):
    """Stock saisi dans l'admin : s'il y a des demandes en attente, elles partent après la validation."""
    if not (instance.active and instance.available):
        return
    if RestockAlert.objects.filter(kit=instance, notified_at__isnull=True).exists():
        from .tasks import notify_restock_alerts

        transaction.on_commit(lambda: notify_restock_alerts.delay(instance.pk))
