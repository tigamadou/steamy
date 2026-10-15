"""
Pédagogie de l'apprenant (SPEC-TECHNIQUE §3.2, §4.4) : inscriptions et progression séquentielle.

Le contenu (parcours, projets, niveaux, missions) vit dans `catalog` ; `learning` ne garde que ce que fait
l'apprenant. Une inscription n'est créée que par le serveur, selon sa source (§4.3) : gratuite ici (D27), par
commande, Kit Code ou classe dans les étapes suivantes.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Enrollment(models.Model):
    class Source(models.TextChoices):
        FREE = "free", _("Parcours gratuit")
        ORDER = "order", _("Commande")
        KIT_CODE = "kit_code", _("Kit Code")
        CLASSROOM = "classroom", _("Classe")

    class Status(models.TextChoices):
        ACTIVE = "active", _("En cours")
        COMPLETED = "completed", _("Terminé")

    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        related_name="enrollments",
        verbose_name=_("apprenant"),
    )
    course = models.ForeignKey(
        "catalog.Course", models.PROTECT, related_name="enrollments", verbose_name=_("parcours")
    )
    source = models.CharField(_("source"), max_length=12, choices=Source)
    status = models.CharField(_("statut"), max_length=10, choices=Status, default=Status.ACTIVE)
    #: Part des missions terminées (0-100), recalculée à chaque mission terminée
    progress_pct = models.PositiveSmallIntegerField(_("progression (%)"), default=0)
    last_activity_at = models.DateTimeField(_("dernière activité"), null=True, blank=True)
    completed_at = models.DateTimeField(_("terminé le"), null=True, blank=True)
    created_at = models.DateTimeField(_("inscrit le"), auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = _("inscription")
        verbose_name_plural = _("inscriptions")
        constraints = [
            models.UniqueConstraint(fields=["learner", "course"], name="enrollment_unique"),
        ]

    def __str__(self):
        return f"{self.learner} → {self.course}"


class MissionProgress(models.Model):
    """Mission terminée par l'apprenant (ex-`Progress`) : une ligne par mission, jamais de retour en arrière."""

    enrollment = models.ForeignKey(
        Enrollment, models.CASCADE, related_name="mission_progress", verbose_name=_("inscription")
    )
    mission = models.ForeignKey(
        "catalog.Mission", models.CASCADE, related_name="+", verbose_name=_("mission")
    )
    completed_at = models.DateTimeField(_("terminée le"), auto_now_add=True)

    class Meta:
        ordering = ["completed_at", "id"]
        verbose_name = _("mission terminée")
        verbose_name_plural = _("missions terminées")
        constraints = [
            models.UniqueConstraint(
                fields=["enrollment", "mission"], name="mission_progress_unique"
            ),
        ]

    def __str__(self):
        return f"{self.enrollment} · {self.mission}"
