"""
Catalogue pédagogique (SPEC-TECHNIQUE §3.2, S2) : Parcours (`Course`) → Projet → Niveau → Mission.

Le contenu est saisi dans l'admin Django par le groupe Contenu (S5, D71) ; l'API publique ne fait que le lire, et
seulement les parcours publiés (S6). Le contenu d'une mission (`blocks`, `vimeoId`, `vimeoHash`) n'est jamais exposé
par le catalogue (D11) : il est réservé à un inscrit sur une mission déverrouillée (ADR 0004, API-L3a).
"""

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from .validators import (
    validate_mission_blocks,
    validate_string_list,
    validate_vimeo_hash,
    validate_vimeo_id,
)

validate_color = RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Couleur au format #RRVVBB.")


class Category(models.Model):
    """Catégorie unique pour WL06, WL16 et le catalogue connecté (D3)."""

    slug = models.SlugField(_("slug"), max_length=60, unique=True)
    label = models.CharField(_("libellé"), max_length=80)
    color = models.CharField(_("couleur"), max_length=7, validators=[validate_color])
    icon = models.CharField(_("icône"), max_length=16, help_text="Emoji affiché sur les cartes")
    order = models.PositiveSmallIntegerField(_("ordre"), default=0, db_index=True)

    class Meta:
        ordering = ["order"]
        verbose_name = _("catégorie")
        verbose_name_plural = _("catégories")

    def __str__(self):
        return self.label


class Course(models.Model):
    """Parcours : unité vendue et inscriptible (S2)."""

    class Difficulty(models.TextChoices):
        BEGINNER = "beginner", _("Débutant")
        INTERMEDIATE = "intermediate", _("Intermédiaire")
        ADVANCED = "advanced", _("Avancé")

    class Status(models.TextChoices):
        DRAFT = "draft", _("Brouillon")
        PUBLISHED = "published", _("Publié")

    slug = models.SlugField(_("slug"), max_length=120, unique=True)
    title = models.CharField(_("titre"), max_length=160)
    category = models.ForeignKey(
        Category, models.PROTECT, related_name="courses", verbose_name=_("catégorie")
    )
    difficulty = models.CharField(_("difficulté"), max_length=12, choices=Difficulty.choices)
    is_free = models.BooleanField(_("gratuit"), default=False)
    price = models.PositiveIntegerField(_("prix (FCFA)"), default=0)
    emoji = models.CharField(_("emoji"), max_length=16, blank=True, help_text="Visuel des cartes")
    required_kit = models.ForeignKey(
        "shop.Kit",
        models.PROTECT,
        null=True,
        blank=True,
        related_name="required_by",
        verbose_name=_("kit requis"),
        help_text="Accès uniquement par le Kit Code livré avec ce kit (D36)",
    )
    cover_image = models.ImageField(
        _("image de couverture"), upload_to="catalog/covers/", blank=True
    )
    trailer_vimeo_id = models.CharField(
        _("bande-annonce : identifiant Vimeo"),
        max_length=20,
        blank=True,
        validators=[validate_vimeo_id],
    )
    trailer_vimeo_hash = models.CharField(
        _("bande-annonce : hachage Vimeo"),
        max_length=40,
        blank=True,
        validators=[validate_vimeo_hash],
    )
    duration_hours = models.PositiveSmallIntegerField(_("durée (heures)"), default=0)
    description = models.TextField(_("description"))
    outcomes = models.JSONField(
        _("ce que tu vas apprendre"), default=list, blank=True, validators=[validate_string_list]
    )
    audience = models.CharField(_("public"), max_length=200, blank=True)
    prerequisites = models.JSONField(
        _("prérequis"), default=list, blank=True, validators=[validate_string_list]
    )
    status = models.CharField(_("statut"), max_length=10, choices=Status, default=Status.DRAFT)
    featured = models.BooleanField(_("mis en avant"), default=False)
    certificate_enabled = models.BooleanField(_("certificat"), default=True)
    created_at = models.DateTimeField(_("créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("modifié le"), auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("parcours")
        verbose_name_plural = _("parcours")
        # Accordée au groupe Contenu par la matrice des groupes (lot 6.1, `apps.core.groups`)
        permissions = [("publish_course", "Peut publier un parcours")]
        constraints = [
            # Gratuit ⇔ prix nul : le prix d'un parcours payant est toujours fixé par le serveur (D37).
            models.CheckConstraint(
                condition=Q(is_free=True, price=0) | Q(is_free=False, price__gt=0),
                name="course_free_iff_no_price",
                violation_error_message="Un parcours gratuit n'a pas de prix ; un parcours payant en a un.",
            ),
        ]

    def __str__(self):
        return self.title

    @property
    def is_published(self) -> bool:
        return self.status == self.Status.PUBLISHED


class Project(models.Model):
    """Projet (ex-`Module`) : porte l'évaluation sommative (API-L3a)."""

    course = models.ForeignKey(
        Course, models.CASCADE, related_name="projects", verbose_name=_("parcours")
    )
    order = models.PositiveSmallIntegerField(_("ordre"), default=0, db_index=True)
    title = models.CharField(_("titre"), max_length=160)
    duration_hours = models.PositiveSmallIntegerField(_("durée (heures)"), default=0)
    objectives = models.JSONField(
        _("objectifs"), default=list, blank=True, validators=[validate_string_list]
    )
    prerequisites = models.JSONField(
        _("prérequis"), default=list, blank=True, validators=[validate_string_list]
    )
    materials = models.JSONField(
        _("matériel"), default=list, blank=True, validators=[validate_string_list]
    )

    class Meta:
        ordering = ["order"]
        verbose_name = _("projet")
        verbose_name_plural = _("projets")

    def __str__(self):
        return f"{self.course} · {self.title}"


class Level(models.Model):
    """Niveau : porte l'évaluation formative (API-L3a)."""

    project = models.ForeignKey(
        Project, models.CASCADE, related_name="levels", verbose_name=_("projet")
    )
    order = models.PositiveSmallIntegerField(_("ordre"), default=0, db_index=True)
    title = models.CharField(_("titre"), max_length=160)
    duration_min = models.PositiveSmallIntegerField(_("durée (minutes)"), default=0)
    intro_vimeo_id = models.CharField(
        _("introduction : identifiant Vimeo"),
        max_length=20,
        blank=True,
        validators=[validate_vimeo_id],
    )
    intro_vimeo_hash = models.CharField(
        _("introduction : hachage Vimeo"),
        max_length=40,
        blank=True,
        validators=[validate_vimeo_hash],
    )
    intro_summary = models.TextField(_("résumé de l'introduction"), blank=True)

    class Meta:
        ordering = ["order"]
        verbose_name = _("niveau")
        verbose_name_plural = _("niveaux")

    def __str__(self):
        return f"{self.project} · {self.title}"


class Mission(models.Model):
    """Mission (ex-`Lesson`) : vidéo Vimeo non listée et/ou blocs de contenu."""

    level = models.ForeignKey(
        Level, models.CASCADE, related_name="missions", verbose_name=_("niveau")
    )
    order = models.PositiveSmallIntegerField(_("ordre"), default=0, db_index=True)
    title = models.CharField(_("titre"), max_length=160)
    duration_min = models.PositiveSmallIntegerField(_("durée (minutes)"), default=0)
    icon = models.CharField(_("icône"), max_length=16, blank=True)
    vimeo_id = models.CharField(
        _("identifiant Vimeo"), max_length=20, blank=True, validators=[validate_vimeo_id]
    )
    vimeo_hash = models.CharField(
        _("hachage Vimeo"), max_length=40, blank=True, validators=[validate_vimeo_hash]
    )
    blocks = models.JSONField(
        _("blocs"),
        default=list,
        blank=True,
        validators=[validate_mission_blocks],
        help_text='Liste de blocs : {"type": "text"|"tip", "text": …} ou '
        '{"type": "media", "src": …, "alt": …, "caption": …}',
    )

    class Meta:
        ordering = ["order"]
        verbose_name = _("mission")
        verbose_name_plural = _("missions")

    def __str__(self):
        return f"{self.level} · {self.title}"


class Quiz(models.Model):
    """
    Évaluation : formative à la fin d'un niveau (seuil 70 %), sommative à la fin d'un projet (seuil 80 %) (S2).
    Rattachée à exactement un niveau ou un projet, selon son type. Le délai entre deux essais d'une sommative ratée
    est réglé dans `PlatformSettings` (D32) ; une formative se repasse immédiatement (C8).
    """

    class Kind(models.TextChoices):
        FORMATIVE = "formative", _("Formative (niveau)")
        SUMMATIVE = "summative", _("Sommative (projet)")

    DEFAULT_THRESHOLDS = {Kind.FORMATIVE: 70, Kind.SUMMATIVE: 80}

    kind = models.CharField(_("type"), max_length=10, choices=Kind)
    level = models.OneToOneField(
        Level, models.CASCADE, null=True, blank=True, related_name="quiz", verbose_name=_("niveau")
    )
    project = models.OneToOneField(
        Project,
        models.CASCADE,
        null=True,
        blank=True,
        related_name="quiz",
        verbose_name=_("projet"),
    )
    title = models.CharField(
        _("titre"), max_length=160, blank=True, help_text="Par défaut : « Quiz · <niveau> »"
    )
    threshold = models.PositiveSmallIntegerField(
        _("seuil de réussite (%)"),
        null=True,
        blank=True,
        help_text="Vide : 70 % pour une formative, 80 % pour une sommative",
    )
    time_limit_sec = models.PositiveIntegerField(_("durée limite (s)"), null=True, blank=True)

    class Meta:
        verbose_name = _("quiz")
        verbose_name_plural = _("quiz")
        constraints = [
            models.CheckConstraint(
                condition=Q(kind="formative", level__isnull=False, project__isnull=True)
                | Q(kind="summative", project__isnull=False, level__isnull=True),
                name="quiz_kind_matches_target",
                violation_error_message="Une formative se rattache à un niveau, une sommative à un projet.",
            ),
            models.CheckConstraint(
                condition=Q(threshold__isnull=True) | Q(threshold__gte=1, threshold__lte=100),
                name="quiz_threshold_percentage",
                violation_error_message="Le seuil est un pourcentage entre 1 et 100.",
            ),
        ]

    def __str__(self):
        return self.display_title

    @property
    def display_title(self) -> str:
        if self.title:
            return self.title
        if self.kind == self.Kind.FORMATIVE:
            return f"Quiz · {self.level.title}"
        return f"Évaluation · {self.project.title}"

    @property
    def pass_threshold(self) -> int:
        return self.threshold or self.DEFAULT_THRESHOLDS[self.kind]

    @property
    def course_id(self) -> int:
        return self.level.project.course_id if self.level_id else self.project.course_id


class Question(models.Model):
    """Question à choix unique. `concept` et `remediationMission` alimentent l'écran d'échec (D32)."""

    quiz = models.ForeignKey(Quiz, models.CASCADE, related_name="questions", verbose_name=_("quiz"))
    order = models.PositiveSmallIntegerField(_("ordre"), default=0, db_index=True)
    text = models.TextField(_("question"))
    concept = models.CharField(
        _("notion"), max_length=120, help_text="Notion à revoir en cas d'erreur"
    )
    remediation_mission = models.ForeignKey(
        Mission,
        models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("mission à revoir"),
    )
    weight = models.PositiveSmallIntegerField(
        _("poids"), default=1, validators=[MinValueValidator(1)]
    )

    class Meta:
        ordering = ["order", "id"]
        verbose_name = _("question")
        verbose_name_plural = _("questions")

    def __str__(self):
        return self.text[:60]

    def clean(self):
        mission = self.remediation_mission
        if mission and self.quiz_id and mission.level.project.course_id != self.quiz.course_id:
            raise ValidationError(
                {"remediation_mission": "La mission à revoir doit appartenir au même parcours."}
            )


class Choice(models.Model):
    """Réponse proposée. `isCorrect` ne sort jamais du serveur (§4.4, D31)."""

    question = models.ForeignKey(
        Question, models.CASCADE, related_name="choices", verbose_name=_("question")
    )
    order = models.PositiveSmallIntegerField(_("ordre"), default=0, db_index=True)
    text = models.CharField(_("réponse"), max_length=300)
    is_correct = models.BooleanField(_("bonne réponse"), default=False)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = _("réponse")
        verbose_name_plural = _("réponses")

    def __str__(self):
        return self.text[:60]


class Badge(models.Model):
    """Badge attribué par le serveur à la réussite d'un niveau, d'un projet ou d'un parcours (§3.2, D34)."""

    class Kind(models.TextChoices):
        LEVEL = "level", _("Niveau")
        PROJECT = "project", _("Projet")
        COURSE = "course", _("Parcours")

    kind = models.CharField(_("type"), max_length=8, choices=Kind)
    level = models.OneToOneField(
        Level, models.CASCADE, null=True, blank=True, related_name="badge", verbose_name=_("niveau")
    )
    project = models.OneToOneField(
        Project,
        models.CASCADE,
        null=True,
        blank=True,
        related_name="badge",
        verbose_name=_("projet"),
    )
    course = models.OneToOneField(
        Course,
        models.CASCADE,
        null=True,
        blank=True,
        related_name="badge",
        verbose_name=_("parcours"),
    )
    label = models.CharField(_("nom"), max_length=80)
    icon = models.CharField(_("icône"), max_length=16, help_text="Emoji de la médaille")
    description = models.CharField(_("description"), max_length=200, blank=True)

    class Meta:
        verbose_name = _("badge")
        verbose_name_plural = _("badges")
        constraints = [
            models.CheckConstraint(
                condition=Q(
                    kind="level", level__isnull=False, project__isnull=True, course__isnull=True
                )
                | Q(kind="project", project__isnull=False, level__isnull=True, course__isnull=True)
                | Q(kind="course", course__isnull=False, level__isnull=True, project__isnull=True),
                name="badge_kind_matches_target",
                violation_error_message="Le badge se rattache à la cible de son type, et à elle seule.",
            ),
        ]

    def __str__(self):
        return self.label
