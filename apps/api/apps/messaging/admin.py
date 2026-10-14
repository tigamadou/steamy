from django.contrib import admin
from .models import Conversation, Message, MessageAttachment, MessageReceipt, Notification

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id","title","created_at")
    filter_horizontal = ("participants",)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id","conversation","sender","created_at")
    search_fields = ("body",)

@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ("filename","message","uploaded_at")

@admin.register(MessageReceipt)
class MessageReceiptAdmin(admin.ModelAdmin):
    list_display = ("message","user","delivered_at","read_at")

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user","title","created_at","read")
