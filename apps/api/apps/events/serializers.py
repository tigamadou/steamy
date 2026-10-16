"""Steamy Events publics (§7.6) : aucune donnée de participant, en particulier d'aucun mineur (§4.6)."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.catalog.models import Course

from .models import EventApplication, EventTicket, SteamyEvent

LIST_FIELDS = (
    "slug",
    "title",
    "emoji",
    "color",
    "starts_at",
    "ends_at",
    "online",
    "place",
    "city",
    "audience",
    "price",
    "is_free",
    "capacity",
    "seats_left",
    "application_deadline",
    "applications_open",
    "is_past",
)


class SteamyEventSerializer(serializers.ModelSerializer):
    is_free = serializers.SerializerMethodField()
    seats_left = serializers.IntegerField(read_only=True)
    applications_open = serializers.BooleanField(
        read_only=True, help_text="Places restantes et date limite non dépassée"
    )
    is_past = serializers.BooleanField(read_only=True)

    class Meta:
        model = SteamyEvent
        fields = LIST_FIELDS

    def get_is_free(self, event) -> bool:
        return event.price == 0


class SteamyEventDetailSerializer(SteamyEventSerializer):
    class Meta(SteamyEventSerializer.Meta):
        fields = (*LIST_FIELDS, "description")


# --- Candidatures et tickets (API-L3b.6) ---------------------------------------------------------


class ApplicationCreateSerializer(serializers.Serializer):
    """Apprenant : `{motivation, selfLevel}`. Parent : `{childId, motivation?}` (WPD12, accord immédiat)."""

    child_id = serializers.IntegerField(required=False, help_text="Parent : l'enfant inscrit")
    motivation = serializers.CharField(
        max_length=2000, required=False, allow_blank=True, default=""
    )
    self_level = serializers.ChoiceField(
        choices=Course.Difficulty.choices, required=False, allow_blank=True, default=""
    )


class EventSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = SteamyEvent
        fields = ("slug", "title", "emoji", "color", "starts_at", "city", "online", "price")
        read_only_fields = fields


class LearnerSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    first_name = serializers.CharField()


class ApplicationSerializer(serializers.ModelSerializer):
    """Candidature (WD10, WPD06) ; `orderReference` : commande à payer ou payée (événement payant)."""

    event = EventSummarySerializer(read_only=True)
    learner = serializers.SerializerMethodField()
    ticket_used = serializers.SerializerMethodField()
    order_reference = serializers.SerializerMethodField()

    class Meta:
        model = EventApplication
        fields = (
            "id",
            "event",
            "learner",
            "status",
            "motivation",
            "self_level",
            "ticket_used",
            "parent_decided_at",
            "refusal_reason",
            "order_reference",
            "created_at",
        )
        read_only_fields = fields

    @extend_schema_field(LearnerSummarySerializer)
    def get_learner(self, application):
        return {"id": application.learner_id, "first_name": application.learner.first_name}

    def get_ticket_used(self, application) -> bool:
        return application.ticket_id is not None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_order_reference(self, application):
        item = application.order_items.select_related("order").order_by("-id").first()
        return item.order.reference if item else None


class TicketSerializer(serializers.ModelSerializer):
    """Ticket Steamy Events offert à la certification (D33), utilisable une fois (C12)."""

    course_slug = serializers.CharField(source="enrollment.course.slug", read_only=True)
    course_title = serializers.CharField(source="enrollment.course.title", read_only=True)
    used = serializers.SerializerMethodField()
    used_for = serializers.SerializerMethodField()

    class Meta:
        model = EventTicket
        fields = ("id", "course_slug", "course_title", "created_at", "used", "used_for")
        read_only_fields = fields

    def get_used(self, ticket) -> bool:
        return hasattr(ticket, "used_by")

    @extend_schema_field(EventSummarySerializer(allow_null=True))
    def get_used_for(self, ticket):
        application = getattr(ticket, "used_by", None)
        return EventSummarySerializer(application.event).data if application else None
