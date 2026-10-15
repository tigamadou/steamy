"""
Réglages de la plateforme et journal d'audit (SPEC-TECHNIQUE §3.7).

`PlatformSettings` est un singleton (une seule ligne, `pk = 1`) édité dans l'admin Django (WAD14) ; ses valeurs
par défaut viennent des arbitrages (D24, D32, D66). Le barème de points et les paliers de rang (C8) restent vides
jusqu'à leur saisie, avant API-L3a.3.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.utils.translation import gettext_lazy as _


def bounds(low: int, high: int) -> list:
    """Bornes d'un réglage numérique (WAD14) : une valeur hors bornes est refusée à l'enregistrement."""
    return [MinValueValidator(low), MaxValueValidator(high)]


class PlatformSettings(models.Model):
    SINGLETON_ID = 1

    # OTP (D24) : 6 chiffres, valable 5 min, 3 essais, renvoi après 60 s, plafonds quotidiens
    otp_length = models.PositiveSmallIntegerField(
        _("longueur du code OTP"), default=6, validators=bounds(4, 8)
    )
    otp_validity_seconds = models.PositiveIntegerField(
        _("validité d'un code OTP (s)"), default=300, validators=bounds(60, 1800)
    )
    otp_max_attempts = models.PositiveSmallIntegerField(
        _("essais par code OTP"), default=3, validators=bounds(1, 10)
    )
    otp_resend_delay_seconds = models.PositiveIntegerField(
        _("délai avant renvoi (s)"), default=60, validators=bounds(30, 600)
    )
    otp_daily_limit_per_phone = models.PositiveSmallIntegerField(
        _("codes OTP par numéro et par jour"), default=5, validators=bounds(1, 20)
    )
    otp_daily_limit_per_ip = models.PositiveSmallIntegerField(
        _("codes OTP par adresse IP et par jour"), default=20, validators=bounds(1, 200)
    )
    # Pédagogie (D32) et encadrement (D66)
    summative_retry_cooldown_seconds = models.PositiveIntegerField(
        _("délai entre deux essais d'une sommative (s)"), default=600, validators=bounds(0, 86400)
    )
    dropout_threshold_days = models.PositiveSmallIntegerField(
        _("jours sans activité avant l'alerte de décrochage"), default=7, validators=bounds(1, 60)
    )
    # Gamification (C8) : à saisir avant API-L3a.3
    points_scale = models.JSONField(
        _("barème de points"),
        default=dict,
        blank=True,
        help_text='Points par événement, ex. {"mission": 10, "formative": 20, "summative": 50}',
    )
    rank_thresholds = models.JSONField(
        _("paliers de rang"),
        default=list,
        blank=True,
        help_text='Liste ordonnée, ex. [{"rank": "Explorateur", "points": 0}, …]',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("réglages de la plateforme")
        verbose_name_plural = _("réglages de la plateforme")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(id=1), name="core_platform_settings_singleton"
            )
        ]

    def __str__(self):
        return "Réglages de la plateforme"

    def save(self, *args, **kwargs):
        self.pk = self.SINGLETON_ID
        super().save(*args, **kwargs)

    def clean(self):
        """Barème : `{événement: points ≥ 0}` ; paliers : `[{rank, points}]` aux points strictement croissants."""
        errors = {}
        scale = self.points_scale
        if not isinstance(scale, dict) or not all(
            isinstance(v, int) and not isinstance(v, bool) and v >= 0 for v in scale.values()
        ):
            errors["points_scale"] = (
                "Un objet {événement: points}, points entiers positifs ou nuls."
            )
        thresholds = self.rank_thresholds
        valid = isinstance(thresholds, list) and all(
            isinstance(t, dict)
            and isinstance(t.get("rank"), str)
            and t["rank"].strip()
            and isinstance(t.get("points"), int)
            and not isinstance(t.get("points"), bool)
            for t in thresholds
        )
        points = [t["points"] for t in thresholds] if valid else []
        if not valid or points != sorted(set(points)):
            errors["rank_thresholds"] = (
                'Une liste [{"rank": …, "points": …}] aux points strictement croissants.'
            )
        if errors:
            raise ValidationError(errors)

    @classmethod
    def load(cls) -> "PlatformSettings":
        return cls.objects.get_or_create(pk=cls.SINGLETON_ID)[0]


class AuditLog(models.Model):
    """
    Journal des actions sensibles : actions du personnel, décisions de consentement, paiements, suppressions.
    En écriture seule par le code (`apps.core.audit.audit`) ; lisible dans l'admin, jamais modifiable.
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="Vide pour une action du système (tâche planifiée, webhook)",
    )
    action = models.CharField(max_length=64, help_text="Ex. consent.accepted, payment.refunded")
    target_type = models.CharField(max_length=64, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    data = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("entrée du journal d'audit")
        verbose_name_plural = _("journal d'audit")
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["target_type", "target_id"])]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} · {self.action}"


class DocumentSequence(models.Model):
    """
    Compteur des numéros de documents, par type et par année (ADR 0005 §9) : incrémenté sous verrou dans la
    transaction d'émission, donc sans trou ni doublon (pas de séquence PostgreSQL, qu'un `ROLLBACK` troue).
    """

    kind = models.CharField(_("type"), max_length=16)
    year = models.PositiveSmallIntegerField(_("année"))
    last = models.PositiveIntegerField(_("dernier numéro"), default=0)

    class Meta:
        verbose_name = _("compteur de documents")
        verbose_name_plural = _("compteurs de documents")
        constraints = [
            models.UniqueConstraint(fields=["kind", "year"], name="document_sequence_unique")
        ]

    def __str__(self):
        return f"{self.kind} {self.year} : {self.last}"

    @classmethod
    def next(cls, kind: str, year: int) -> int:
        """Numéro suivant ; dans une transaction (verrou jusqu'à la validation, refusé hors transaction)."""
        cls.objects.get_or_create(kind=kind, year=year)
        sequence = cls.objects.select_for_update().get(kind=kind, year=year)
        sequence.last += 1
        sequence.save(update_fields=["last"])
        return sequence.last


class Announcement(models.Model):
    """
    Annonce de la plateforme (WAD14), diffusée en notification dans l'application (D7) par une tâche Celery. Jamais
    de contenu marketing vers les mineurs (D6) : une annonce aux apprenants reste informative.
    """

    class Audience(models.TextChoices):
        ALL = "all", "Tous les utilisateurs"
        LEARNERS = "learners", "Apprenants"
        PARENTS = "parents", "Parents"
        TEACHERS = "teachers", "Enseignants"

    title = models.CharField(_("titre"), max_length=200)
    body = models.TextField(_("message"))
    audience = models.CharField(_("public"), max_length=10, choices=Audience.choices)
    url = models.CharField(
        _("lien"),
        max_length=300,
        blank=True,
        help_text="Chemin du site, ex. /evenements (facultatif)",
    )
    starts_at = models.DateTimeField(_("début"))
    ends_at = models.DateTimeField(_("fin"), null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        editable=False,
    )
    broadcast_at = models.DateTimeField(_("diffusée le"), null=True, blank=True, editable=False)
    recipients = models.PositiveIntegerField(_("destinataires"), default=0, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("annonce")
        verbose_name_plural = _("annonces")
        ordering = ["-starts_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(ends_at__isnull=True) | Q(ends_at__gt=F("starts_at")),
                name="core_announcement_ends_after_start",
                violation_error_message="La fin doit suivre le début.",
            ),
            models.CheckConstraint(
                condition=Q(url="") | Q(url__startswith="/"),
                name="core_announcement_url_is_a_front_path",
                violation_error_message="Le lien est un chemin du site, commençant par « / ».",
            ),
        ]

    def __str__(self):
        return self.title
