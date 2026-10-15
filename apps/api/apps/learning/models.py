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


class QuizAttempt(models.Model):
    """
    Tentative corrigée par le serveur (§4.4). Statut (D31) : `ok` si le score atteint le seuil du quiz, `warn` de
    50 % au seuil, `ko` sous 50 %. Les réponses gardées servent au corrigé ; le corrigé lui-même ne sort jamais.
    """

    class Status(models.TextChoices):
        OK = "ok", _("Réussi")
        WARN = "warn", _("À refaire")
        KO = "ko", _("Échoué")

    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        related_name="quiz_attempts",
        verbose_name=_("apprenant"),
    )
    enrollment = models.ForeignKey(
        Enrollment, models.CASCADE, related_name="attempts", verbose_name=_("inscription")
    )
    quiz = models.ForeignKey(
        "catalog.Quiz", models.CASCADE, related_name="attempts", verbose_name=_("quiz")
    )
    #: `{questionId: choiceId}` tels qu'envoyés (choix d'une autre question exclus à la validation)
    answers = models.JSONField(_("réponses"), default=dict)
    #: `[{questionId, correct}]` dans l'ordre des questions au moment de la tentative
    results = models.JSONField(_("résultat par question"), default=list)
    score = models.PositiveIntegerField(_("points obtenus"))
    total = models.PositiveIntegerField(_("points possibles"))
    percentage = models.PositiveSmallIntegerField(_("score (%)"))
    threshold = models.PositiveSmallIntegerField(_("seuil appliqué (%)"))
    status = models.CharField(_("statut"), max_length=4, choices=Status)
    passed = models.BooleanField(_("réussi"), default=False)
    duration_sec = models.PositiveIntegerField(_("durée (s)"), null=True, blank=True)
    points_earned = models.PositiveIntegerField(_("points gagnés"), default=0)
    failed_concepts = models.JSONField(_("notions à revoir"), default=list)
    created_at = models.DateTimeField(_("passée le"), auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = _("tentative")
        verbose_name_plural = _("tentatives")
        indexes = [models.Index(fields=["learner", "quiz", "-created_at"])]

    def __str__(self):
        return f"{self.learner} · {self.quiz} · {self.percentage} %"
