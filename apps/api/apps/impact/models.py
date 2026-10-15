"""
Impact Tracker (SPEC-TECHNIQUE §3.7, WAD02-WAD05) : 30 indicateurs en 8 groupes, valeurs par période, rapport
trimestriel. Les définitions sont chargées par migration de données (`0002_kpi_definitions`), jamais saisies à la
main ; les KPI `auto` sont calculés chaque nuit (`apps.impact.tasks`), les KPI `manual` saisis dans WAD05.
"""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _


class KpiDefinition(models.Model):
    class Group(models.TextChoices):
        SALES = "sales", "Ventes & finance"
        USERS = "users", "Utilisateurs (NU)"
        LEARNERS = "learners", "Apprenants (NA)"
        ECOSYSTEM = "ecosystem", "Écosystème"
        LEARNING = "learning", "Impact pédagogique"
        PRODUCT = "product", "Produit & innovation"
        SATISFACTION = "satisfaction", "Satisfaction"
        EMPLOYMENT = "employment", "Emploi"

    class Unit(models.TextChoices):
        COUNT = "count", "Nombre"
        FCFA = "fcfa", "Montant (FCFA)"
        SCORE = "score", "Note"
        YES_NO = "yes_no", "Oui / non"
        TEXT = "text", "Texte"

    class Source(models.TextChoices):
        AUTO = "auto", "Auto"
        MANUAL = "manual", "Manuel"
        UNAVAILABLE = "unavailable", "Indisponible"

    class Periodicity(models.TextChoices):
        MONTH = "month", "Mensuelle"
        QUARTER = "quarter", "Trimestrielle"

    code = models.SlugField(_("code"), max_length=32, unique=True)
    group = models.CharField(_("groupe"), max_length=16, choices=Group.choices)
    label = models.CharField(_("libellé"), max_length=120)
    unit = models.CharField(_("unité"), max_length=8, choices=Unit.choices)
    source = models.CharField(_("source"), max_length=12, choices=Source.choices)
    target = models.DecimalField(_("cible"), max_digits=14, decimal_places=2, null=True, blank=True)
    baseline = models.DecimalField(
        _("valeur de référence"), max_digits=14, decimal_places=2, null=True, blank=True
    )
    periodicity = models.CharField(_("fréquence"), max_length=8, choices=Periodicity.choices)
    #: Indicateur dont celui-ci est une part (ex. « Femmes » parmi les nouveaux utilisateurs) : composition (WAD03).
    base = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="parts",
        verbose_name=_("indicateur de base"),
    )
    calculation = models.TextField(_("mode de calcul"))
    order = models.PositiveSmallIntegerField(_("ordre"))

    class Meta:
        verbose_name = _("indicateur")
        verbose_name_plural = _("indicateurs")
        ordering = ["order"]

    def __str__(self):
        return f"{self.label} ({self.code})"

    @property
    def is_numeric(self) -> bool:
        return self.unit in (self.Unit.COUNT, self.Unit.FCFA, self.Unit.SCORE)


class KpiValue(models.Model):
    """
    Valeur d'un indicateur pour une période (clé `2026-01`, `2026-t1` ou `2026`). Nombre pour les unités numériques,
    `oui` / `non` ou texte libre sinon. `entered_by` vide : valeur calculée.
    """

    kpi = models.ForeignKey(KpiDefinition, on_delete=models.CASCADE, related_name="values")
    period = models.CharField(_("période"), max_length=8)
    number = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    text = models.CharField(max_length=500, blank=True)
    note = models.TextField(_("note"), blank=True)
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("valeur d'indicateur")
        verbose_name_plural = _("valeurs d'indicateurs")
        constraints = [
            models.UniqueConstraint(fields=["kpi", "period"], name="impact_value_unique_period"),
            models.CheckConstraint(
                condition=Q(number__isnull=True) | Q(text=""),
                name="impact_value_number_or_text",
            ),
        ]

    def __str__(self):
        return f"{self.kpi.code} · {self.period}"


class ImpactReport(models.Model):
    """Rapport trimestriel (WAD04) : « Soumettre » le verrouille (D74)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        SUBMITTED = "submitted", "Soumis"

    period = models.CharField(_("trimestre"), max_length=8, unique=True)
    status = models.CharField(
        _("statut"), max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    submitted_at = models.DateTimeField(_("soumis le"), null=True, blank=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("soumis par"),
    )
    #: Lignes du rapport figées à la soumission : un recalcul ultérieur ne le modifie plus.
    snapshot = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("rapport d'impact")
        verbose_name_plural = _("rapports d'impact")
        ordering = ["-period"]
        permissions = [
            ("enter_kpi_value", "Peut saisir les indicateurs manuels"),
            ("submit_impact_report", "Peut soumettre un rapport d'impact"),
        ]

    def __str__(self):
        return f"Rapport {self.period}"
