from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL

class Conversation(models.Model):
    """
    Conversation entre plusieurs utilisateurs (groupe) ou 2 personnes.
    """
    title = models.CharField(max_length=255, blank=True)
    participants = models.ManyToManyField(User, related_name="conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.title:
            return self.title
        return "Conversation %d" % self.id

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="sent_messages")
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    edited = models.BooleanField(default=False)
    deleted = models.BooleanField(default=False)
    # Option: store delivered/read status per recipient in MessageReceipt

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Msg {self.pk} by {self.sender}"

class MessageAttachment(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="message_attachments/%Y/%m/%d/")
    filename = models.CharField(max_length=255, blank=True)
    size = models.BigIntegerField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename or f"Attach {self.pk}"

class MessageReceipt(models.Model):
    """
    Read / delivered / seen status per recipient.
    """
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="receipts")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="message_receipts")
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("message", "user")

class Notification(models.Model):
    """
    Internal notification for user (for dashboard / bell icon)
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    url = models.CharField(max_length=512, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    def __str__(self):
        return f"Notif {self.pk} -> {self.user}"
