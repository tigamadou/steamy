from celery import shared_task


@shared_task
def notify_restock_alerts(kit_id: int) -> int:
    """Kit de nouveau en stock : prévient ses demandeurs (une seule fois chacun, D38)."""
    from .restock import notify_restock

    return notify_restock(kit_id)
