"""
Formulaires du site public (SPEC-TECHNIQUE §3.7) : devis B2B (WL11, D13), newsletter (WL20, D14, adultes
seulement C12) et contact (WL24, D17). Suivis dans l'admin Django ; l'équipe est prévenue par email (Celery).
"""

from django.db import models
from django.utils.translation import gettext_lazy as _


class Submission(models.Model):
    created_at = models.DateTimeField(_("reçu le"), auto_now_add=True)
    #: Email envoyé à l'équipe : rend la tâche relançable sans doublon.
    notified_at = models.DateTimeField(_("équipe prévenue le"), null=True, blank=True)
    handled = models.BooleanField(_("traité"), default=False)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class QuoteRequest(Submission):
    """Demande de devis d'un établissement (WL11, D13)."""

    school_name = models.CharField(_("établissement"), max_length=160)
    contact_name = models.CharField(_("personne à contacter"), max_length=120)
    email = models.EmailField(_("email"))
    phone = models.CharField(_("téléphone (E.164)"), max_length=16)
    offer = models.SlugField(_("offre"), max_length=40, blank=True)
    message = models.TextField(_("message"), blank=True)

    class Meta(Submission.Meta):
        verbose_name = _("demande de devis")
        verbose_name_plural = _("demandes de devis")

    def __str__(self):
        return f"{self.school_name} · {self.contact_name}"


class Lead(models.Model):
    """Inscription à la newsletter (WL20, D14) : adulte (C12) et consentement explicite, une ligne par email."""

    email = models.EmailField(_("email"), unique=True)
    source = models.SlugField(_("origine"), max_length=40, blank=True, help_text="guides, footer…")
    consented_at = models.DateTimeField(_("consentement le"))
    created_at = models.DateTimeField(_("créé le"), auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("inscrit à la newsletter")
        verbose_name_plural = _("inscrits à la newsletter")

    def __str__(self):
        return self.email


class ContactMessage(Submission):
    """Message du formulaire de contact (WL24, D17)."""

    class Subject(models.TextChoices):
        QUESTION = "question", _("Question")
        PAYMENT = "paiement", _("Paiement")
        DELIVERY = "livraison", _("Livraison")
        PARENT_CHANGE = "changement-parent", _("Changement de parent")
        APPLICATION = "candidature", _("Candidature")
        OTHER = "autre", _("Autre")

    name = models.CharField(_("nom"), max_length=120)
    email = models.EmailField(_("email"), blank=True)
    phone = models.CharField(_("téléphone (E.164)"), max_length=16, blank=True)
    subject = models.CharField(_("sujet"), max_length=20, choices=Subject)
    message = models.TextField(_("message"))

    class Meta(Submission.Meta):
        verbose_name = _("message de contact")
        verbose_name_plural = _("messages de contact")
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(email="", phone=""),
                name="contactmessage_has_a_contact",
                violation_error_message="Un email ou un téléphone est requis.",
            )
        ]

    def __str__(self):
        return f"{self.get_subject_display()} · {self.name}"
