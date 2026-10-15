"""
Boutique de kits (SPEC-TECHNIQUE §3.3). Le stock exact reste interne : l'API publique n'expose qu'une disponibilité
booléenne. Panier, réservations de stock, zones de livraison et alertes de réassort arrivent en API-L3b.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.catalog.models import Course
from apps.catalog.validators import validate_string_list


class Kit(models.Model):
    slug = models.SlugField(_("slug"), max_length=120, unique=True)
    name = models.CharField(_("nom"), max_length=160)
    category = models.ForeignKey(
        "catalog.Category", models.PROTECT, related_name="kits", verbose_name=_("catégorie")
    )
    price = models.PositiveIntegerField(_("prix (FCFA)"))
    difficulty = models.CharField(_("difficulté"), max_length=12, choices=Course.Difficulty.choices)
    emoji = models.CharField(_("emoji"), max_length=16, blank=True, help_text="Visuel des cartes")
    description = models.TextField(_("description"))
    contents = models.JSONField(
        _("contenu de la boîte"), default=list, blank=True, validators=[validate_string_list]
    )
    images = models.JSONField(
        _("images"),
        default=list,
        blank=True,
        validators=[validate_string_list],
        help_text="URL https ou chemins du stockage, la première sert de couverture",
    )
    compatible_courses = models.ManyToManyField(
        "catalog.Course",
        blank=True,
        related_name="compatible_kits",
        verbose_name=_("parcours compatibles"),
    )
    stock_quantity = models.PositiveIntegerField(_("stock"), default=0)
    active = models.BooleanField(_("en vente"), default=True)
    created_at = models.DateTimeField(_("créé le"), auto_now_add=True)
    updated_at = models.DateTimeField(_("modifié le"), auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = _("kit")
        verbose_name_plural = _("kits")

    def __str__(self):
        return self.name

    @property
    def available(self) -> bool:
        return self.stock_quantity > 0
