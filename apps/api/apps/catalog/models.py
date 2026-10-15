"""
Catalogue pédagogique (SPEC-TECHNIQUE §3.2, S2) : Parcours (`Course`) → Projet → Niveau → Mission.

Le contenu est saisi dans l'admin Django par le groupe Contenu (S5, D71) ; l'API publique ne fait que le lire, et
seulement les parcours publiés (S6). Le contenu d'une mission (`blocks`, `vimeoId`, `vimeoHash`) n'est jamais exposé
par le catalogue (D11) : il est réservé à un inscrit sur une mission déverrouillée (ADR 0004, API-L3a).
"""

from django.core.validators import RegexValidator
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
