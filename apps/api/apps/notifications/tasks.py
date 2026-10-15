from celery import shared_task

from .models import Notification
from .services import deliver_email


@shared_task(autoretry_for=(OSError,), retry_backoff=True, max_retries=5)
def send_notification_email(notification_id: int) -> bool:
    notification = Notification.objects.select_related("user").filter(pk=notification_id).first()
    return deliver_email(notification) if notification else False
