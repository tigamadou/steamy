"""
Encadrement (SPEC-TECHNIQUE §3.5) : l'école minimale et son offre B2B, l'invitation des enseignants (S5, C6), les
classes et leurs membres (API-L5). Une classe = un parcours de l'offre (D62) ; les quotas de l'école sont tenus par
le serveur (D61, C19 : `apps.classrooms.quotas`).
"""

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils.translation import gettext_lazy as _

#: Couleur d'une classe (pastille des cartes WT01, WT03).
validate_color = RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Saisissez une couleur au format #RRGGBB.")


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
    offer = models.CharField(_("offre"), max_length=120, blank=True, help_text="Nom de l'offre B2B")
    #: Parcours de l'offre : les seuls qu'un enseignant de l'école peut choisir pour une classe (D62).
    courses = models.ManyToManyField(
        "catalog.Course", blank=True, related_name="+", verbose_name=_("parcours de l'offre")
    )
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


class Classroom(models.Model):
    """Classe d'un enseignant : **un seul parcours**, couvert par l'offre de l'école (D62)."""

    school = models.ForeignKey(
        School, on_delete=models.PROTECT, related_name="classrooms", verbose_name=_("école")
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="classrooms",
        verbose_name=_("enseignant"),
    )
    course = models.ForeignKey(
        "catalog.Course",
        on_delete=models.PROTECT,
        related_name="classrooms",
        verbose_name=_("parcours"),
    )
    name = models.CharField(_("nom"), max_length=80)
    color = models.CharField(_("couleur"), max_length=7, validators=[validate_color])
    school_grade = models.ForeignKey(
        "referentials.SchoolGrade",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("niveau scolaire"),
    )
    archived_at = models.DateTimeField(_("archivée le"), null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("classe")
        verbose_name_plural = _("classes")
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(
                "teacher",
                Lower("name"),
                condition=Q(archived_at__isnull=True),
                name="classroom_name_unique_per_teacher",
                violation_error_message="Une de vos classes porte déjà ce nom.",
            ),
        ]

    def __str__(self):
        return self.name


class ClassroomMembership(models.Model):
    """
    Place d'un élève dans une classe. `invited` : demande de consentement d'origine enseignant en attente (D60),
    sans compte apprenant tant que le parent n'a pas accepté ; `active` : l'élève a rejoint la classe ; `left` :
    retiré par l'enseignant (WT04). Les invitations en attente comptent dans le quota de l'école (C19).
    """

    class Status(models.TextChoices):
        INVITED = "invited", _("Invité")
        ACTIVE = "active", _("Actif")
        LEFT = "left", _("Retiré")

    classroom = models.ForeignKey(
        Classroom, on_delete=models.CASCADE, related_name="memberships", verbose_name=_("classe")
    )
    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="classroom_memberships",
        verbose_name=_("élève"),
    )
    consent_request = models.OneToOneField(
        "accounts.ConsentRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="classroom_membership",
        verbose_name=_("demande de consentement"),
    )
    status = models.CharField(
        _("statut"), max_length=8, choices=Status.choices, default=Status.INVITED
    )
    joined_at = models.DateTimeField(_("a rejoint le"), null=True, blank=True)
    left_at = models.DateTimeField(_("retiré le"), null=True, blank=True)
    #: Dernière alerte de décrochage envoyée à l'enseignant (D66) : une seule par période d'inactivité.
    dropout_notified_at = models.DateTimeField(_("décrochage signalé le"), null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("membre d'une classe")
        verbose_name_plural = _("membres des classes")
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["classroom", "learner"],
                condition=Q(status__in=["invited", "active"], learner__isnull=False),
                name="classroom_membership_unique_learner",
            ),
        ]

    def __str__(self):
        return f"{self.learner or 'Invitation'} · {self.classroom} ({self.status})"


class TeacherComment(models.Model):
    """
    Commentaire de l'enseignant sur le travail d'un élève (WT05, D63) : à sens unique, sans réponse possible (S11),
    notifié et toujours visible de l'élève **et** de son parent. Rattachable à une tentative du parcours de la classe.
    """

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="+",
        verbose_name=_("enseignant"),
    )
    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="teacher_comments",
        verbose_name=_("élève"),
    )
    classroom = models.ForeignKey(
        Classroom, on_delete=models.CASCADE, related_name="comments", verbose_name=_("classe")
    )
    attempt = models.ForeignKey(
        "learning.QuizAttempt",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teacher_comments",
        verbose_name=_("tentative"),
    )
    body = models.TextField(_("commentaire"), max_length=1000)
    created_at = models.DateTimeField(_("envoyé le"), auto_now_add=True)

    class Meta:
        verbose_name = _("commentaire d'enseignant")
        verbose_name_plural = _("commentaires d'enseignants")
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Commentaire à {self.learner} ({self.created_at:%Y-%m-%d})"
