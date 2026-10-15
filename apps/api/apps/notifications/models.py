"""
Notifications dans l'application et préférences d'envoi par email (D7, C12 : pas de push).

Extraites de l'ancienne app `messaging` (S11, C15). La notification dans l'application est toujours créée ; l'email
dépend de la préférence de l'utilisateur pour la catégorie.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Category(models.TextChoices):
    """Catégories réglables par l'utilisateur (WD06, WPD08, WT08)."""

    LEARNING = "learning", "Apprentissage"
    REWARDS = "rewards", "Récompenses"
    COACHING = "coaching", "Encadrement"
    EVENTS = "events", "Steamy Events"
    PAYMENTS = "payments", "Paiements"
    CONSENTS = "consents", "Consentements et validations"
    PROGRESS = "progress", "Progression"
    REVIEWS = "reviews", "Tentatives à revoir"
    #: Compte, sécurité, commandes : toujours envoyé, non réglable.
    ACCOUNT = "account", "Compte"


#: Catégories proposées dans les préférences de chaque rôle.
CATEGORIES_BY_ROLE = {
    "learner": [
        Category.LEARNING,
        Category.REWARDS,
        Category.COACHING,
        Category.EVENTS,
        Category.PAYMENTS,
    ],
    "parent": [Category.CONSENTS, Category.PAYMENTS, Category.PROGRESS, Category.EVENTS],
    "teacher": [Category.PROGRESS, Category.REVIEWS, Category.EVENTS],
}


class Tone(models.TextChoices):
    INFO = "info", "Information"
    SUCCESS = "success", "Succès"
    WARNING = "warning", "Attention"
    DANGER = "danger", "Problème"
    PRIMARY = "primary", "Mise en avant"


class Channel(models.TextChoices):
    IN_APP = "in_app", "Dans l'application"
    EMAIL = "email", "Email"
    SMS = "sms", "SMS"


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    #: Identifiant stable de l'événement (ex. `consent_request`) : le front en déduit l'icône par défaut.
    type = models.CharField(max_length=64)
    category = models.CharField(max_length=16, choices=Category.choices)
    tone = models.CharField(max_length=16, choices=Tone.choices, default=Tone.INFO)
    icon = models.CharField(max_length=32, blank=True)
    title = models.CharField(_("titre"), max_length=200)
    message = models.TextField(_("message"), blank=True)
    #: Chemin du front (ex. `/parent/consentements/12`), jamais une URL externe.
    url = models.CharField(max_length=300, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("notification")
        verbose_name_plural = _("notifications")
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "read_at"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(url="") | models.Q(url__startswith="/"),
                name="notifications_url_is_a_front_path",
            ),
        ]

    def __str__(self):
        return f"{self.type} → {self.user}"


class NotificationPreference(models.Model):
    """Exception à la valeur par défaut (email activé) : une ligne n'existe que si l'utilisateur a réglé le canal."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences"
    )
    category = models.CharField(max_length=16, choices=Category.choices)
    channel = models.CharField(max_length=8, choices=Channel.choices)
    enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("préférence de notification")
        verbose_name_plural = _("préférences de notification")
        constraints = [
            models.UniqueConstraint(
                fields=["user", "category", "channel"], name="notifications_preference_unique"
            ),
        ]

    def __str__(self):
        state = "oui" if self.enabled else "non"
        return f"{self.user} · {self.category} · {self.channel} : {state}"

    def save(self, *args, **kwargs):
        # Un apprenant (mineur) n'a pas de téléphone ni de canal SMS (D30), et ne reçoit rien de marketing (D6) :
        # ses catégories sont celles de `CATEGORIES_BY_ROLE["learner"]`, toutes liées à son apprentissage.
        if self.user.is_learner and (
            self.channel == Channel.SMS or self.category not in CATEGORIES_BY_ROLE["learner"]
        ):
            raise ValueError("Préférence interdite pour un apprenant (D6, D30).")
        super().save(*args, **kwargs)


class SmsMessage(models.Model):
    """
    Trace d'un SMS envoyé (S10, ADR 0002) : coût, délivrabilité, accusés de réception. Aucun numéro ni texte en
    clair (données personnelles) : seulement le numéro masqué et l'objet de l'envoi.
    """

    provider = models.CharField(_("fournisseur"), max_length=16)
    message_id = models.CharField(_("identifiant chez le fournisseur"), max_length=64)
    recipient = models.CharField(_("destinataire (masqué)"), max_length=32)
    purpose = models.CharField(_("objet"), max_length=32, blank=True)
    status = models.CharField(_("statut"), max_length=16, default="sent")
    error_code = models.CharField(_("code d'erreur"), max_length=16, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("SMS envoyé")
        verbose_name_plural = _("SMS envoyés")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "message_id"], name="notifications_sms_message_unique"
            ),
        ]

    def __str__(self):
        return f"{self.provider} {self.message_id} : {self.status}"
