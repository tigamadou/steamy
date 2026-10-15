"""
Valeurs des indicateurs : agrégats quotidiens, calcul nocturne des KPI `auto`, lecture par période (WAD01-WAD05).
"""

import datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.analytics.models import DailyAggregatedStat

from . import collectors
from .models import KpiDefinition, KpiValue
from .periods import MONTH, QUARTER, YEAR, Period
from .status import kpi_status

#: `DailyAggregatedStat.group_by` des agrégats de l'Impact Tracker (`key` = code de l'indicateur).
STAT_GROUP = "impact"
STAT_METRIC = "count"

Source = KpiDefinition.Source
Unit = KpiDefinition.Unit


def _yesterday() -> datetime.date:
    return timezone.localdate() - datetime.timedelta(days=1)


def aggregate_daily_stats(day: datetime.date | None = None) -> int:
    """
    Recompte chaque jour de l'année jusqu'à `day` (hier par défaut) pour les indicateurs additifs : une correction
    du profil (genre, localité, handicap) se reflète dès la nuit suivante. Idempotent. Renvoie le nombre de lignes.
    """
    day = day or _yesterday()
    start = day.replace(month=1, day=1)
    rows = []
    for code in collectors.additive():
        counts = collectors.daily_counts(code, start, day)
        rows += [
            DailyAggregatedStat(
                date=date, group_by=STAT_GROUP, key=code, metric=STAT_METRIC, value=count
            )
            for date, count in counts.items()
        ]
    with transaction.atomic():
        DailyAggregatedStat.objects.filter(
            group_by=STAT_GROUP, date__gte=start, date__lte=day
        ).delete()
        DailyAggregatedStat.objects.bulk_create(rows)
    return len(rows)


def periods_to_date(day: datetime.date) -> list[Period]:
    """Mois et trimestres de l'année jusqu'à celui qui contient `day`, puis l'année."""
    year = Period.containing(YEAR, day)
    months = [m for m in year.months() if m.start <= day]
    quarters = []
    for month in months:
        if month.quarter() not in quarters:
            quarters.append(month.quarter())
    return [*months, *quarters, year]


def compute_kpis(day: datetime.date | None = None) -> int:
    """
    KPI `auto` jusqu'à `day` (hier par défaut) : additifs = somme des agrégats de la période ; « connectés » =
    compte à la volée, pour les seules périodes en cours (le passé reste tel qu'il a été calculé).
    """
    day = day or _yesterday()
    periods = periods_to_date(day)
    additive = collectors.additive()
    written = 0
    for kpi in KpiDefinition.objects.filter(source=Source.AUTO):
        if kpi.code in additive:
            for period in periods:
                total = DailyAggregatedStat.objects.filter(
                    group_by=STAT_GROUP,
                    key=kpi.code,
                    date__gte=period.start,
                    date__lte=min(period.end, day),
                ).aggregate(total=Sum("value"))["total"]
                written += _store(kpi, period, total or 0)
        elif kpi.code in collectors.ACTIVE:
            for kind in (MONTH, QUARTER, YEAR):
                period = Period.containing(kind, day)
                written += _store(kpi, period, collectors.active_count(kpi.code, period))
    return written


def _store(kpi, period, number) -> int:
    KpiValue.objects.update_or_create(
        kpi=kpi, period=period.key, defaults={"number": number, "text": "", "entered_by": None}
    )
    return 1


# --- Lecture -----------------------------------------------------------------------------------------


def _plain(number: Decimal):
    return int(number) if number == number.to_integral_value() else float(number)


def present(kpi: KpiDefinition, stored: KpiValue | None):
    """Valeur pour l'API : nombre, booléen (oui / non), texte, ou `None` si absente."""
    if stored is None:
        return None
    if kpi.is_numeric:
        return None if stored.number is None else _plain(stored.number)
    if kpi.unit == Unit.YES_NO:
        return {"oui": True, "non": False}.get(stored.text)
    return stored.text or None


def lookup_keys(kpi: KpiDefinition, period: Period) -> list[str]:
    """
    Clés à consulter, dans l'ordre : un KPI `auto` a une valeur par période ; un KPI saisi par trimestre se lit au
    trimestre (celui du mois, ou le plus récent de l'année renseigné).
    """
    if kpi.source == Source.AUTO or period.kind == QUARTER:
        return [period.key]
    if period.kind == MONTH:
        return [period.quarter().key]
    return [quarter.key for quarter in Period.containing(QUARTER, period.end).history(4)[::-1]]


class ValueIndex:
    """Valeurs stockées de plusieurs indicateurs et périodes, chargées en une requête."""

    def __init__(self, kpis, periods):
        keys = {key for kpi in kpis for period in periods for key in lookup_keys(kpi, period)}
        self._values = {
            (value.kpi_id, value.period): value
            for value in KpiValue.objects.filter(kpi__in=kpis, period__in=keys)
        }

    def get(self, kpi, period):
        for key in lookup_keys(kpi, period):
            stored = self._values.get((kpi.pk, key))
            if stored is not None and present(kpi, stored) is not None:
                return stored
        return None

    def value(self, kpi, period):
        return present(kpi, self.get(kpi, period))

    def status(self, kpi, period) -> dict:
        return kpi_status(kpi.source, self.value(kpi, period), kpi.target)
