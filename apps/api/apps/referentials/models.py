"""
Référentiels servis par l'API, jamais codés en dur dans le front (D3, SPEC-TECHNIQUE §3.7).

Les valeurs initiales sont posées par migration de données (`0002_initial_data`) : la production en a besoin. Elles
s'éditent ensuite dans l'admin Django.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _


class Referential(models.Model):
    code = models.SlugField(_("code"), max_length=40, unique=True)
    label = models.CharField(_("libellé"), max_length=120)
    order = models.PositiveSmallIntegerField(_("ordre"), default=0)
    active = models.BooleanField(_("actif"), default=True)

    class Meta:
        abstract = True
        ordering = ["order", "label"]

    def __str__(self):
        return self.label


class Country(Referential):
    """Pays : `code` ISO 3166-1 alpha-2 en majuscules (`BJ`)."""

    code = models.CharField(_("code ISO"), max_length=2, unique=True)
    flag = models.CharField(_("drapeau"), max_length=8, blank=True)
    dial_code = models.CharField(_("indicatif"), max_length=4, help_text="Sans « + » : 229")
    phone_format = models.CharField(
        _("format"), max_length=32, blank=True, help_text="Gabarit d'affichage : « XX XX XX XX XX »"
    )
    phone_regex = models.CharField(
        _("expression du numéro national"),
        max_length=120,
        help_text="Numéro sans indicatif, ex. ^01[0-9]{8}$",
    )

    class Meta(Referential.Meta):
        verbose_name = _("pays")
        verbose_name_plural = _("pays")


class PaymentNetwork(Referential):
    """Réseau Mobile Money d'un pays (D76, Celtiis inclus). `enabled` est le réglage par réseau et par pays."""

    code = models.SlugField(_("code"), max_length=40)
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, to_field="code", related_name="payment_networks"
    )
    enabled = models.BooleanField(_("activé"), default=True)

    class Meta(Referential.Meta):
        verbose_name = _("réseau Mobile Money")
        verbose_name_plural = _("réseaux Mobile Money")
        constraints = [
            models.UniqueConstraint(fields=["country", "code"], name="referentials_network_unique")
        ]

    def __str__(self):
        return f"{self.label} ({self.country_id})"


class SchoolGrade(Referential):
    class Meta(Referential.Meta):
        verbose_name = _("classe scolaire")
        verbose_name_plural = _("classes scolaires")


class Goal(Referential):
    emoji = models.CharField(max_length=8, blank=True)

    class Meta(Referential.Meta):
        verbose_name = _("objectif")
        verbose_name_plural = _("objectifs")


class Avatar(Referential):
    emoji = models.CharField(max_length=8)
    color = models.CharField(
        _("couleur"), max_length=32, help_text="Jeton du design system, ex. « primary-500 »"
    )

    class Meta(Referential.Meta):
        verbose_name = _("avatar")
        verbose_name_plural = _("avatars")


class Disability(Referential):
    class Meta(Referential.Meta):
        verbose_name = _("situation de handicap")
        verbose_name_plural = _("situations de handicap")


class Relationship(Referential):
    """Lien de parenté. `parent_label` s'affiche au parent : « Vous êtes sa mère » (WP05)."""

    parent_label = models.CharField(_("libellé côté parent"), max_length=120, blank=True)

    class Meta(Referential.Meta):
        verbose_name = _("lien de parenté")
        verbose_name_plural = _("liens de parenté")


class DeletionReason(Referential):
    """Motif d'une suppression de compte (WD15, WPD09)."""

    class Meta(Referential.Meta):
        verbose_name = _("motif de suppression")
        verbose_name_plural = _("motifs de suppression")


class RefusalReason(Referential):
    class Meta(Referential.Meta):
        verbose_name = _("motif de refus")
        verbose_name_plural = _("motifs de refus")


class Locality(models.Model):
    """Localité qualifiée urbain / rural, pour le KPI « zone rurale » (D75)."""

    class AreaType(models.TextChoices):
        URBAN = "urban", "Urbaine"
        RURAL = "rural", "Rurale"

    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, to_field="code", related_name="localities"
    )
    city = models.CharField(_("ville ou commune"), max_length=120)
    district = models.CharField(_("quartier ou arrondissement"), max_length=120, blank=True)
    area_type = models.CharField(_("zone"), max_length=8, choices=AreaType.choices)
    active = models.BooleanField(_("actif"), default=True)

    class Meta:
        verbose_name = _("localité")
        verbose_name_plural = _("localités")
        ordering = ["country", "city", "district"]
        constraints = [
            models.UniqueConstraint(
                fields=["country", "city", "district"], name="referentials_locality_unique"
            )
        ]

    def __str__(self):
        return f"{self.city}, {self.district}" if self.district else self.city
