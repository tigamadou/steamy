"""
Steamy Events (SPEC-TECHNIQUE §3.4, S8) : ateliers, défis et compétitions, distincts de la télémétrie
(`analytics.TrackingEvent`). Saisis dans l'admin Django (groupe Contenu) ; l'API publique ne lit que les publiés.

Candidatures (`EventApplication`, API-L3b.6) : accord parental systématique (S3, S8), sans sélection par Steamy
(C3) ; l'accord du parent, plus le paiement si l'événement est payant, confirme la place. `seats_left` décompte les
places réservées par l'accord (en attente de paiement) et les places confirmées.
"""

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.catalog.models import Course

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
        taken = self.applications.filter(status__in=EventApplication.HOLDING_A_SEAT).count()
        return max(self.capacity - self.seats_reserved - taken, 0)

    @property
    def is_past(self) -> bool:
        return self.ends_at <= timezone.now()

    @property
    def applications_open(self) -> bool:
        return self.seats_left > 0 and timezone.now() < self.application_deadline


class EventTicket(models.Model):
    """
    Ticket Steamy Events offert à la certification d'un parcours (D33) : un seul par inscription (contrainte
    d'unicité), il couvre le prix d'une candidature (utilisé en API-L3b).
    """

    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        related_name="event_tickets",
        verbose_name=_("apprenant"),
    )
    enrollment = models.OneToOneField(
        "learning.Enrollment",
        models.CASCADE,
        related_name="event_ticket",
        verbose_name=_("inscription d'origine"),
    )
    created_at = models.DateTimeField(_("offert le"), auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = _("ticket Steamy Events")
        verbose_name_plural = _("tickets Steamy Events")

    def __str__(self):
        return f"Ticket de {self.learner} ({self.enrollment.course})"


class EventApplication(models.Model):
    """
    Candidature d'un apprenant à un Steamy Event (WD11, WPD06, WPD12). Faite par l'apprenant (en attente de son
    parent) ou par le parent (accord immédiat). L'accord réserve la place ; payant : la place est confirmée au
    paiement, et rendue s'il n'aboutit pas (C3). Un ticket offert à la certification (D33) rend la candidature
    gratuite, l'accord du parent restant requis (C12).
    """

    class Status(models.TextChoices):
        PENDING_PARENT = "pending_parent", _("En attente du parent")
        PENDING_PAYMENT = "pending_payment", _("En attente du paiement")
        ACCEPTED = "accepted", _("Inscription confirmée")
        REFUSED = "refused", _("Refusée")
        CANCELLED = "cancelled", _("Annulée")

    #: Statuts qui occupent une place (C3) ; `pending_parent` n'en réserve pas encore
    HOLDING_A_SEAT = (Status.PENDING_PAYMENT, Status.ACCEPTED)
    #: Statuts d'une candidature en cours (une seule par apprenant et par événement)
    ACTIVE = (Status.PENDING_PARENT, Status.PENDING_PAYMENT, Status.ACCEPTED)

    event = models.ForeignKey(
        SteamyEvent, models.PROTECT, related_name="applications", verbose_name=_("événement")
    )
    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        related_name="event_applications",
        verbose_name=_("apprenant"),
    )
    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.SET_NULL,
        null=True,
        related_name="+",
        verbose_name=_("déposée par"),
    )
    motivation = models.TextField(_("motivation"), blank=True)
    self_level = models.CharField(
        _("niveau déclaré"), max_length=12, choices=Course.Difficulty.choices, blank=True
    )
    status = models.CharField(_("statut"), max_length=16, choices=Status)
    #: Ticket Steamy Events utilisé (D33, C12) : un ticket ne sert qu'une fois
    ticket = models.OneToOneField(
        EventTicket,
        models.SET_NULL,
        null=True,
        blank=True,
        related_name="used_by",
        verbose_name=_("ticket utilisé"),
    )
    parent_decided_at = models.DateTimeField(_("décision du parent"), null=True, blank=True)
    refusal_reason = models.CharField(_("motif de refus"), max_length=255, blank=True)
    created_at = models.DateTimeField(_("déposée le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("modifiée le"), auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = _("candidature")
        verbose_name_plural = _("candidatures")
        # Groupe Support (D71, matrice `apps.core.groups`) : refus exceptionnel d'une candidature en cours (C3)
        permissions = [("refuse_application", "Peut refuser exceptionnellement une candidature")]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "learner"],
                condition=Q(status__in=["pending_parent", "pending_payment", "accepted"]),
                name="event_application_one_active",
            )
        ]

    def __str__(self):
        return f"{self.learner} → {self.event}"


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
