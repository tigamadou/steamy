"""
Encadrement (SPEC-TECHNIQUE §3.5), amorcé en API-L2.7 : l'école minimale et l'invitation des enseignants (S5, C6).
Les classes, les offres et les quotas contrôlés arrivent avec API-L5.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class School(models.Model):
    """École partenaire. Tout enseignant y est rattaché (C6)."""

    name = models.CharField(_("nom"), max_length=200)
    country = models.ForeignKey(
        "referentials.Country", on_delete=models.PROTECT, related_name="+", verbose_name=_("pays")
    )
    city = models.CharField(_("ville"), max_length=120)
    learner_quota = models.PositiveIntegerField(_("quota d'élèves"), default=0)
    classroom_quota = models.PositiveIntegerField(_("quota de classes"), default=0)
    valid_until = models.DateField(_("offre valable jusqu'au"), null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("école")
        verbose_name_plural = _("écoles")
        ordering = ["name"]

    def __str__(self):
        return self.name


class TeacherInvitation(models.Model):
    """
    Seule voie de création d'un compte enseignant (S5). Créée dans l'admin, envoyée par l'action « Envoyer » :
    lien `/activation/<jeton>` par email, jeton stocké haché, valable 7 jours, usage unique.
    """

    email = models.EmailField(_("email"))
    first_name = models.CharField(_("prénom"), max_length=150, blank=True)
    last_name = models.CharField(_("nom"), max_length=150, blank=True)
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="invitations",
        verbose_name=_("école"),
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        editable=False,
    )
    token_hash = models.CharField(max_length=64, blank=True, db_index=True, editable=False)
    sent_at = models.DateTimeField(_("envoyée le"), null=True, blank=True, editable=False)
    expires_at = models.DateTimeField(_("expire le"), null=True, blank=True, editable=False)
    accepted_at = models.DateTimeField(_("acceptée le"), null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("invitation enseignant")
        verbose_name_plural = _("invitations enseignants")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Invitation de {self.email}"

    def save(self, *args, **kwargs):
        self.email = (self.email or "").strip().lower()
        super().save(*args, **kwargs)
