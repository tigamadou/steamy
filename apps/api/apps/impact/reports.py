"""
Rapport trimestriel (WAD04-WAD05, D74) : lignes calculées par le serveur, saisie des KPI manuels, soumission qui
verrouille le rapport et fige ses lignes.

Plages (format du rapport des bailleurs) : les KPI `auto` d'acquisition (ventes, utilisateurs, apprenants,
écosystème) portent sur le dernier mois du trimestre ; tous les autres, sur le trimestre.
"""

import datetime
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.core.audit import audit
from libs.errors import ApiError

from .models import ImpactReport, KpiDefinition, KpiValue
from .overview import REPORT_DUE_DAYS
from .periods import QUARTER, Period
from .services import ValueIndex, present

Group = KpiDefinition.Group
Source = KpiDefinition.Source
Unit = KpiDefinition.Unit

MONTHLY_GROUPS = (Group.SALES, Group.USERS, Group.LEARNERS, Group.ECOSYSTEM)


def parse_quarter(key: str) -> Period:
    try:
        period = Period.parse(key)
    except ValueError:
        period = None
    if period is None or period.kind != QUARTER:
        raise ApiError("NOT_FOUND", "Trimestre inconnu (format attendu : 2026-t1).")
    return period


def row_period(kpi: KpiDefinition, quarter: Period) -> Period:
    if kpi.source == Source.AUTO and kpi.group in MONTHLY_GROUPS:
        return quarter.months()[-1]
    return quarter


def rows(quarter: Period) -> list[dict]:
    kpis = list(KpiDefinition.objects.all())
    index = ValueIndex(kpis, [quarter, quarter.months()[-1]])
    result = []
    for kpi in kpis:
        period = row_period(kpi, quarter)
        stored = index.get(kpi, period)
        result.append(
            {
                "code": kpi.code,
                "label": kpi.label,
                "group": kpi.group,
                "unit": kpi.unit,
                "source": kpi.source,
                "start": period.start.isoformat(),
                "end": period.end.isoformat(),
                "value": present(kpi, stored),
                "status": index.status(kpi, period),
                "note": stored.note if stored else "",
            }
        )
    return result


def build(quarter: Period) -> dict:
    report = ImpactReport.objects.select_related("submitted_by").filter(period=quarter.key).first()
    submitted = report is not None and report.status == ImpactReport.Status.SUBMITTED
    lines = report.snapshot if submitted else rows(quarter)
    manual = [line for line in lines if line["source"] == Source.MANUAL]
    return {
        "period": quarter.key,
        "label": quarter.label,
        "start": quarter.start,
        "end": quarter.end,
        "due_date": quarter.end + datetime.timedelta(days=REPORT_DUE_DAYS),
        "status": ImpactReport.Status.SUBMITTED if submitted else ImpactReport.Status.DRAFT,
        "submitted_at": report.submitted_at if submitted else None,
        "submitted_by": report.submitted_by.get_full_name()
        if submitted and report.submitted_by
        else None,
        "entered": sum(line["value"] is not None for line in manual),
        "total": len(manual),
        "rows": lines,
    }


def _locked_report(quarter: Period) -> ImpactReport:
    """Rapport du trimestre verrouillé en écriture (créé en brouillon au besoin)."""
    ImpactReport.objects.get_or_create(period=quarter.key)
    return ImpactReport.objects.select_for_update().get(period=quarter.key)


def save_values(quarter: Period, entries: list[dict], user, request=None) -> None:
    """Brouillon de WAD05 : une valeur `None` efface la saisie. Refusé après soumission (D74)."""
    with transaction.atomic():
        report = _locked_report(quarter)
        if report.status == ImpactReport.Status.SUBMITTED:
            raise ApiError("REPORT_LOCKED")
        for entry in entries:
            kpi, value = entry["kpi"], entry["value"]
            if value is None:
                KpiValue.objects.filter(kpi=kpi, period=quarter.key).delete()
                continue
            number, text = _stored(kpi, value)
            KpiValue.objects.update_or_create(
                kpi=kpi,
                period=quarter.key,
                defaults={
                    "number": number,
                    "text": text,
                    "note": entry.get("note", ""),
                    "entered_by": user,
                },
            )
        audit(
            "impact.values_saved",
            request=request,
            actor=user,
            target=report,
            data={"codes": [entry["kpi"].code for entry in entries]},
        )


def _stored(kpi: KpiDefinition, value):
    if kpi.is_numeric:
        return Decimal(str(value)), ""
    if kpi.unit == Unit.YES_NO:
        return None, "oui" if value else "non"
    return None, value


def submit(quarter: Period, user, request=None) -> None:
    """Verrouille le rapport et fige ses lignes ; une seconde soumission ne change rien (idempotente)."""
    with transaction.atomic():
        report = _locked_report(quarter)
        if report.status == ImpactReport.Status.SUBMITTED:
            return
        report.snapshot = rows(quarter)
        report.status = ImpactReport.Status.SUBMITTED
        report.submitted_at = timezone.now()
        report.submitted_by = user
        report.save()
        audit("impact.report_submitted", request=request, actor=user, target=report)
