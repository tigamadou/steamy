"""
Réglages de la plateforme et journal d'audit (SPEC-TECHNIQUE §3.7).

`PlatformSettings` est un singleton (une seule ligne, `pk = 1`) édité dans l'admin Django (WAD14) ; ses valeurs
par défaut viennent des arbitrages (D24, D32, D66). Le barème de points et les paliers de rang (C8) restent vides
jusqu'à leur saisie, avant API-L3a.3.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class PlatformSettings(models.Model):
    SINGLETON_ID = 1

    # OTP (D24) : 6 chiffres, valable 5 min, 3 essais, renvoi après 60 s, plafonds quotidiens
    otp_length = models.PositiveSmallIntegerField(_("longueur du code OTP"), default=6)
    otp_validity_seconds = models.PositiveIntegerField(_("validité d'un code OTP (s)"), default=300)
    otp_max_attempts = models.PositiveSmallIntegerField(_("essais par code OTP"), default=3)
    otp_resend_delay_seconds = models.PositiveIntegerField(_("délai avant renvoi (s)"), default=60)
    otp_daily_limit_per_phone = models.PositiveSmallIntegerField(
        _("codes OTP par numéro et par jour"), default=5
    )
    otp_daily_limit_per_ip = models.PositiveSmallIntegerField(
        _("codes OTP par adresse IP et par jour"), default=20
    )
    # Pédagogie (D32) et encadrement (D66)
    summative_retry_cooldown_seconds = models.PositiveIntegerField(
        _("délai entre deux essais d'une sommative (s)"), default=600
    )
    dropout_threshold_days = models.PositiveSmallIntegerField(
        _("jours sans activité avant l'alerte de décrochage"), default=7
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
