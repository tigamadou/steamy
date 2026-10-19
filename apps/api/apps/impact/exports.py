"""
Exports du rapport trimestriel (WAD04, D74) : CSV ou PDF générés en asynchrone dans le stockage privé (ADR 0005).

La demande fige le rapport tel que WAD04 l'affiche (`snapshot`, mêmes lignes que `reports.build`) : le fichier
reprend exactement l'écran, même si une valeur change pendant la génération. Le CSV est au format attendu par un
tableur français (séparateur `;`, BOM UTF-8, virgule décimale) ; le PDF passe par `core.pdf.render_pdf`.
"""

import csv
import datetime
import io
from decimal import Decimal

from django.core.files.base import ContentFile
from django.db import transaction

from apps.core.audit import audit
from apps.core.pdf import render_pdf

from . import reports
from .models import ImpactReport, KpiDefinition, ReportExport
from .periods import Period

HEADERS = ["Indicateur", "Du", "Au", "Réponse", "Statut", "Source"]
SOURCES = dict(KpiDefinition.Source.choices)
STATUSES = dict(ImpactReport.Status.choices)


def snapshot(quarter: Period) -> dict:
    """Rapport tel que `GET impact-reports/{period}/` le renvoie, en valeurs JSON (dates ISO)."""
    from .serializers import ImpactReportSerializer

    return dict(ImpactReportSerializer(reports.build(quarter)).data)


def request_export(quarter: Period, fmt: str, user, request=None) -> ReportExport:
    """Crée l'export (rapport créé en brouillon au besoin) et lance sa génération après la transaction."""
    from .tasks import generate_report_export

    with transaction.atomic():
        # L'export se rattache à un `ImpactReport` : un trimestre encore vide reçoit son rapport en brouillon (comme à
        # la première saisie ou à la soumission), sans effet sur ce que WAD04 affiche
        report, _ = ImpactReport.objects.get_or_create(period=quarter.key)
        export = ReportExport.objects.create(
            report=report, format=fmt, snapshot=snapshot(quarter), requested_by=user
        )
        audit(
            "impact.export_requested",
            request=request,
            actor=user,
            target=report,
            data={"format": fmt, "export": export.pk},
        )
        transaction.on_commit(lambda: generate_report_export.delay(export.pk))
    return export


def answer(value, unit: str) -> str:
    """Réponse d'une ligne : nombre à virgule décimale, Oui / Non, texte ; vide si absente."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    if isinstance(value, (int, float, Decimal)):
        text = f"{Decimal(str(value)).normalize():f}".replace(".", ",")
        return f"{text} FCFA" if unit == KpiDefinition.Unit.FCFA else text
    return str(value)


def day(iso: str) -> str:
    """`2026-10-01` → `01/10/2026`."""
    return datetime.date.fromisoformat(iso).strftime("%d/%m/%Y")


def lines(data: dict) -> list[list[str]]:
    return [
        [
            row["label"],
            day(row["start"]),
            day(row["end"]),
            answer(row["value"], row["unit"]),
            row["status"]["label"],
            SOURCES[row["source"]],
        ]
        for row in data["rows"]
    ]


#: Débuts de cellule qu'un tableur interprète comme une formule (injection CSV, OWASP)
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def neutralize(text: str) -> str:
    """Texte libre rendu inerte dans un tableur : préfixé d'une apostrophe s'il commence comme une formule."""
    return f"'{text}" if text.startswith(FORMULA_PREFIXES) else text


def render_csv(data: dict) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    writer.writerow(HEADERS)
    for row, line in zip(data["rows"], lines(data), strict=True):
        # Seule la réponse d'un KPI texte est saisie librement ; les nombres (montants négatifs compris) restent tels quels
        if isinstance(row["value"], str):
            line[3] = neutralize(line[3])
        writer.writerow(line)
    return buffer.getvalue().encode("utf-8-sig")


def render_report_pdf(data: dict) -> bytes:
    return render_pdf(
        "pdf/impact_report.html",
        {
            "label": data["label"],
            "start": day(data["start"]),
            "end": day(data["end"]),
            "status": STATUSES[data["status"]],
            "entered": data["entered"],
            "total": data["total"],
            "submitted_by": data["submitted_by"],
            "headers": HEADERS,
            "lines": lines(data),
        },
    )


RENDERERS = {ReportExport.Format.CSV: render_csv, ReportExport.Format.PDF: render_report_pdf}


def build_export(export_id: int) -> bool:
    """
    Génère le fichier depuis le contenu figé, sous une clé déterministe (même UUID) : relancer ne crée pas de second
    fichier. Ne fait rien si l'export est prêt et présent. Renvoie si un fichier a été écrit.
    """
    export = ReportExport.objects.get(pk=export_id)
    if _ready(export):
        return False
    # Rendu (WeasyPrint peut être long) hors de la transaction : le verrou de ligne ne couvre que l'écriture
    content = RENDERERS[export.format](export.snapshot)
    with transaction.atomic():
        export = ReportExport.objects.select_for_update().get(pk=export_id)
        if _ready(export):
            return False
        export.file.save(export.filename, ContentFile(content), save=False)
        export.status = ReportExport.Status.READY
        export.save(update_fields=["file", "status"])
    return True


def _ready(export: ReportExport) -> bool:
    return (
        export.status == ReportExport.Status.READY
        and bool(export.file)
        and export.file.storage.exists(export.file.name)
    )
