"""
Steamy Events (SPEC-TECHNIQUE §3.4, S8) : ateliers, défis et compétitions, distincts de la télémétrie
(`analytics.TrackingEvent`). Saisis dans l'admin Django (groupe Contenu) ; l'API publique ne lit que les publiés.

Les candidatures (`EventApplication`, accord parental systématique) arrivent en API-L3b.6 : `seats_left` décomptera
alors aussi les candidatures acceptées.
"""

from django.core.validators import RegexValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

validate_color = RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Couleur au format #RRVVBB.")


class SteamyEvent(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", _("Brouillon")
        PUBLISHED = "published", _("Publié")

    slug = models.SlugField(_("slug"), max_length=120, unique=True)
    title = models.CharField(_("titre"), max_length=160)
    emoji = models.CharField(_("emoji"), max_length=16, blank=True)
    color = models.CharField(_("couleur"), max_length=7, validators=[validate_color])
    starts_at = models.DateTimeField(_("début"))
    ends_at = models.DateTimeField(_("fin"))
    online = models.BooleanField(_("en ligne"), default=False)
    place = models.CharField(_("lieu"), max_length=160, blank=True)
    city = models.CharField(_("ville"), max_length=80, blank=True)
    audience = models.CharField(
        _("public visé"), max_length=80, blank=True, help_text="« 12 – 15 ans »"
    )
    price = models.PositiveIntegerField(_("prix (FCFA)"), default=0, help_text="0 = gratuit")
    capacity = models.PositiveIntegerField(_("places"))
    seats_reserved = models.PositiveIntegerField(
        _("places déjà attribuées"),
        default=0,
        help_text="Places attribuées hors candidature (partenaires, invités)",
    )
    application_deadline = models.DateTimeField(_("fin des candidatures"))
    description = models.TextField(_("description"))
    status = models.CharField(_("statut"), max_length=10, choices=Status, default=Status.DRAFT)
    created_at = models.DateTimeField(_("créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("modifié le"), auto_now=True)

    class Meta:
        ordering = ["starts_at"]
        verbose_name = _("Steamy Event")
        verbose_name_plural = _("Steamy Events")
        constraints = [
            models.CheckConstraint(
                condition=Q(ends_at__gt=F("starts_at")),
                name="steamyevent_ends_after_start",
                violation_error_message="La fin doit suivre le début.",
            ),
            models.CheckConstraint(
                condition=Q(application_deadline__lte=F("starts_at")),
                name="steamyevent_deadline_before_start",
                violation_error_message="Les candidatures ferment au plus tard au début de l'événement.",
            ),
            models.CheckConstraint(
                condition=Q(seats_reserved__lte=F("capacity")),
                name="steamyevent_reserved_within_capacity",
                violation_error_message="Plus de places attribuées que de places.",
            ),
        ]

    def __str__(self):
        return self.title

    @property
    def seats_left(self) -> int:
        return self.capacity - self.seats_reserved

    @property
    def is_past(self) -> bool:
        return self.ends_at <= timezone.now()

    @property
    def applications_open(self) -> bool:
        return self.seats_left > 0 and timezone.now() < self.application_deadline


class EventProposal(models.Model):
    """
    Proposition d'un événement à une classe par son enseignant (WT09) : **notification seulement** des élèves actifs et
    de leurs parents. Chaque élève candidate ensuite seul, avec l'accord de son parent (S8, C3). Unique par couple.
    """

    event = models.ForeignKey(
        SteamyEvent, on_delete=models.CASCADE, related_name="proposals", verbose_name=_("événement")
    )
    classroom = models.ForeignKey(
        "classrooms.Classroom",
        on_delete=models.CASCADE,
        related_name="event_proposals",
        verbose_name=_("classe"),
    )
    teacher = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="+",
        verbose_name=_("enseignant"),
    )
    created_at = models.DateTimeField(_("proposé le"), auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("proposition à une classe")
        verbose_name_plural = _("propositions aux classes")
        constraints = [
            models.UniqueConstraint(fields=["event", "classroom"], name="event_proposal_unique"),
        ]

    def __str__(self):
        return f"{self.event} → {self.classroom}"
