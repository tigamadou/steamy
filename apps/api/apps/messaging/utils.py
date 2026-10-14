# apps/messaging/utils.py
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

User = get_user_model()

@shared_task
def send_email_notification_for_message(user_id, message_id):
    from .models import Message
    try:
        user = User.objects.get(pk=user_id)
        msg = Message.objects.get(pk=message_id)
    except Exception:
        return False
    subject = f"Nouveau message de {msg.sender}"
    body = f"{msg.body[:400]}\n\nVoir la conversation: {settings.FRONTEND_URL}/conversations/{msg.conversation.id}"
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
    return True

@shared_task
def create_push_notification_for_message(user_id, message_id):
    # placeholder: integrate FCM/APNs here
    return True
