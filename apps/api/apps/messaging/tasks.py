from celery import shared_task

from apps.messaging.utils import (
    create_push_notification_for_message,
    send_email_notification_for_message,
)

from .models import Message


@shared_task
def send_message_notifications_async(message_id):
    try:
        msg = Message.objects.select_related("conversation","sender").get(pk=message_id)
    except Message.DoesNotExist:
        return False
    conv = msg.conversation
    recipients = conv.participants.exclude(pk=msg.sender.pk)
    for u in recipients:
        # create internal notification
        from .models import Notification
        Notification.objects.create(user=u, title=f"Nouveau message de {msg.sender}", body=msg.body[:200], url=f"/app/conversations/{conv.pk}/")
        # send email async if user opted in
        send_email_notification_for_message.delay(u.pk, msg.pk)
        # optional: push notification (FCM/APNs) create job
        create_push_notification_for_message.delay(u.pk, msg.pk)
    return True
