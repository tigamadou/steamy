from django.contrib import admin

from .models import ContactMessage, Lead, QuoteRequest


class SubmissionAdmin(admin.ModelAdmin):
    list_filter = ("handled",)
    list_editable = ("handled",)
    readonly_fields = ("created_at", "notified_at")


@admin.register(QuoteRequest)
class QuoteRequestAdmin(SubmissionAdmin):
    list_display = (
        "school_name",
        "contact_name",
        "email",
        "phone",
        "offer",
        "created_at",
        "handled",
    )
    search_fields = ("school_name", "contact_name", "email")


@admin.register(ContactMessage)
class ContactMessageAdmin(SubmissionAdmin):
    list_display = ("name", "subject", "email", "phone", "created_at", "handled")
    list_filter = ("handled", "subject")
    search_fields = ("name", "email", "phone", "message")


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("email", "source", "consented_at")
    search_fields = ("email",)
    readonly_fields = ("consented_at", "created_at")
