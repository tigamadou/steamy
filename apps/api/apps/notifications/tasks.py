from celery import shared_task

from libs.phone import mask_phone

from .models import Notification, SmsMessage
from .services import deliver_email
from .sms import SmsTemporaryError, get_provider


@shared_task(autoretry_for=(OSError,), retry_backoff=True, max_retries=5)
def send_notification_email(notification_id: int) -> bool:
    notification = Notification.objects.select_related("user").filter(pk=notification_id).first()
    return deliver_email(notification) if notification else False


@shared_task(
    autoretry_for=(SmsTemporaryError,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5,
)
def send_sms(phone: str, text: str, purpose: str = "") -> str:
    """Envoie un SMS par le fournisseur configuré ; réessais exponentiels sur les échecs passagers (S10)."""
    provider = get_provider()
    message_id = provider.send(phone, text)
    SmsMessage.objects.create(
        provider=provider.name, message_id=message_id, recipient=mask_phone(phone), purpose=purpose
    )
    return message_id
