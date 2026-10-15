from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import ImpactReport, KpiDefinition
from .periods import KINDS
from .status import STATUS_CODES, TONES

_VALUE_SCHEMA = {
    "oneOf": [{"type": "number"}, {"type": "boolean"}, {"type": "string"}],
    "nullable": True,
    "description": "Nombre (unités count, fcfa, score), booléen (yes_no) ou texte ; null si absente",
}


@extend_schema_field(_VALUE_SCHEMA)
class KpiValueField(serializers.Field):
    def to_representation(self, value):
        return value


class TargetField(serializers.FloatField):
    """Cible : décimal en base, nombre (entier si possible) dans l'API."""

    def to_representation(self, value):
        number = float(value)
        return int(number) if number.is_integer() else number


class PeriodQuerySerializer(serializers.Serializer):
    period = serializers.ChoiceField(
        choices=KINDS,
        default="month",
        help_text="Période de WAD02 : mois, trimestre ou année en cours",
    )


class PeriodSerializer(serializers.Serializer):
    key = serializers.CharField(help_text="2026-01, 2026-t1 ou 2026")
    label = serializers.CharField()
    start = serializers.DateField(help_text="Premier jour (inclus)")
    end = serializers.DateField(help_text="Dernier jour (inclus)")


class KpiStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=STATUS_CODES)
    tone = serializers.ChoiceField(choices=TONES)
    label = serializers.CharField()


class SeriesPointSerializer(serializers.Serializer):
    period = serializers.CharField()
    label = serializers.CharField()
    value = KpiValueField()


class KpiSummarySerializer(serializers.Serializer):
    code = serializers.CharField()
    label = serializers.CharField()
    group = serializers.CharField()
    unit = serializers.ChoiceField(choices=KpiDefinition.Unit.choices)
    source = serializers.ChoiceField(choices=KpiDefinition.Source.choices)
    target = TargetField(allow_null=True)
    base_code = serializers.CharField(allow_null=True)
    value = KpiValueField()
    status = KpiStatusSerializer()
    series = SeriesPointSerializer(many=True)


class KpiGroupSerializer(serializers.Serializer):
    code = serializers.CharField()
    label = serializers.CharField()
    kpis = KpiSummarySerializer(many=True)


class KpiDashboardSerializer(serializers.Serializer):
    period = PeriodSerializer()
    groups = KpiGroupSerializer(many=True)


class HistoryPointSerializer(SeriesPointSerializer):
    start = serializers.DateField()
    end = serializers.DateField()
    status = KpiStatusSerializer()


class CompositionPartSerializer(serializers.Serializer):
    code = serializers.CharField()
    label = serializers.CharField()
    value = KpiValueField()


class KpiDetailSerializer(KpiSummarySerializer):
    period = PeriodSerializer()
    calculation = serializers.CharField(help_text="Définition : mode de calcul")
    periodicity = serializers.ChoiceField(choices=KpiDefinition.Periodicity.choices)
    baseline = TargetField(allow_null=True)
    attainment = serializers.IntegerField(
        allow_null=True, help_text="Taux d'atteinte de la cible, en %"
    )
    history = HistoryPointSerializer(many=True)
    composition = CompositionPartSerializer(many=True)


class TodoSerializer(serializers.Serializer):
    # Texte et non énumération : `kind` est déjà une énumération d'un autre composant (`KindEnum`)
    kind = serializers.CharField(
        help_text="consents_pending (d'autres types suivront avec API-L3b)"
    )
    label = serializers.CharField()
    count = serializers.IntegerField()
    admin_path = serializers.CharField(help_text="Chemin de la liste filtrée dans l'admin Django")


class HighlightSerializer(serializers.Serializer):
    code = serializers.CharField()
    label = serializers.CharField()
    value = KpiValueField()
    target = TargetField(allow_null=True)
    status = KpiStatusSerializer()


class OverviewStatsSerializer(serializers.Serializer):
    users = serializers.IntegerField(help_text="Comptes actifs (apprenants, parents, enseignants)")
    active_learners = serializers.IntegerField(help_text="Apprenants connectés dans les 30 jours")
    sales_month = KpiValueField()
    completion_rate = serializers.FloatField(allow_null=True)


class ReportDeadlineSerializer(serializers.Serializer):
    period = serializers.CharField()
    label = serializers.CharField()
    due_date = serializers.DateField()
    status = serializers.ChoiceField(choices=ImpactReport.Status.choices)
    entered = serializers.IntegerField(help_text="Indicateurs manuels renseignés")
    total = serializers.IntegerField(help_text="Indicateurs manuels")


class OverviewSerializer(serializers.Serializer):
    period = PeriodSerializer()
    highlight = HighlightSerializer()
    stats = OverviewStatsSerializer()
    report = ReportDeadlineSerializer()
    todo = TodoSerializer(many=True)


class ReportRowSerializer(serializers.Serializer):
    code = serializers.CharField()
    label = serializers.CharField()
    group = serializers.CharField()
    unit = serializers.ChoiceField(choices=KpiDefinition.Unit.choices)
    source = serializers.ChoiceField(choices=KpiDefinition.Source.choices)
    start = serializers.DateField(help_text="Du (plage calculée par le serveur)")
    end = serializers.DateField(help_text="Au")
    value = KpiValueField()
    status = KpiStatusSerializer()
    note = serializers.CharField(allow_blank=True)


class ImpactReportSerializer(serializers.Serializer):
    period = serializers.CharField(help_text="2026-t1")
    label = serializers.CharField(help_text="T1 2026")
    start = serializers.DateField()
    end = serializers.DateField()
    due_date = serializers.DateField()
    status = serializers.ChoiceField(choices=ImpactReport.Status.choices)
    submitted_at = serializers.DateTimeField(allow_null=True)
    submitted_by = serializers.CharField(allow_null=True)
    entered = serializers.IntegerField(help_text="Indicateurs manuels renseignés")
    total = serializers.IntegerField(help_text="Indicateurs manuels")
    rows = ReportRowSerializer(many=True)


#: Bornes des valeurs saisies selon l'unité (WAD05).
SCORE_RANGE = (1, 10)
MAX_TEXT = 500


class ValueEntrySerializer(serializers.Serializer):
    code = serializers.CharField()
    value = serializers.JSONField(
        allow_null=True,
        help_text="Nombre (count, fcfa, score), booléen (yes_no) ou texte ; null efface la saisie",
    )
    note = serializers.CharField(required=False, allow_blank=True, max_length=MAX_TEXT)

    def validate(self, attrs):
        kpi = KpiDefinition.objects.filter(code=attrs["code"]).first()
        if kpi is None or kpi.source != KpiDefinition.Source.MANUAL:
            raise serializers.ValidationError(
                {"code": "Indicateur inconnu ou calculé automatiquement."}
            )
        value = attrs["value"]
        if value is not None and not self._valid(kpi, value):
            raise serializers.ValidationError({"value": self._expected(kpi)})
        if isinstance(value, str):
            value = value.strip() or None
        return {**attrs, "kpi": kpi, "value": value}

    @staticmethod
    def _valid(kpi, value) -> bool:
        unit = kpi.unit
        if unit == "yes_no":
            return isinstance(value, bool)
        if unit == "text":
            return isinstance(value, str) and len(value) <= MAX_TEXT
        if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
            return False
        if unit == "count":
            return float(value).is_integer()
        if unit == "score":
            return SCORE_RANGE[0] <= value <= SCORE_RANGE[1]
        return True

    @staticmethod
    def _expected(kpi) -> str:
        return {
            "count": "Un nombre entier positif.",
            "fcfa": "Un montant positif.",
            "score": f"Une note de {SCORE_RANGE[0]} à {SCORE_RANGE[1]}.",
            "yes_no": "Oui ou non.",
            "text": f"Un texte de {MAX_TEXT} caractères au plus.",
        }[kpi.unit]


class ValuesInputSerializer(serializers.Serializer):
    values = ValueEntrySerializer(many=True, allow_empty=False)
