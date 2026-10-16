"""
API du back-office Next.js (§7.8, WAD01-WAD03) : session du personnel vérifiée par TOTP (D72) sur chaque route.
Valeurs et statuts calculés par le serveur ; le front affiche ce qu'il reçoit.
"""

from django.http import FileResponse, HttpResponseRedirect
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.groups import FINANCE
from libs.errors import ApiError
from libs.permissions import IsStaffVerified

from . import exports, overview, reports
from .models import KpiDefinition, ReportExport
from .periods import Period
from .serializers import (
    ExportRequestSerializer,
    ImpactReportSerializer,
    KpiDashboardSerializer,
    KpiDetailSerializer,
    OverviewSerializer,
    PeriodQuerySerializer,
    ReportExportSerializer,
    ValuesInputSerializer,
)
from .services import ValueIndex

#: Points des courbes de WAD02 et de l'historique de WAD03.
SERIES_LENGTH = 5
HISTORY_LENGTH = 8


def _period(request) -> Period:
    query = PeriodQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    return Period.current(query.validated_data["period"])


def _summary(kpi, period, index, series):
    return {
        "code": kpi.code,
        "label": kpi.label,
        "group": kpi.group,
        "unit": kpi.unit,
        "source": kpi.source,
        "target": kpi.target,
        "base_code": kpi.base.code if kpi.base_id else None,
        "value": index.value(kpi, period),
        "status": index.status(kpi, period),
        "series": [
            {"period": p.key, "label": p.label, "value": index.value(kpi, p)} for p in series
        ],
    }


class OverviewView(APIView):
    """WAD01 : tout membre du personnel ; « À traiter » limité aux groupes de l'utilisateur."""

    permission_classes = [IsStaffVerified]

    @extend_schema(responses=OverviewSerializer)
    def get(self, request):
        return Response(OverviewSerializer(overview.build(request.user)).data)


class KpiListView(APIView):
    """WAD02 : indicateurs par groupe pour la période en cours (Finance, Super-admin)."""

    permission_classes = [IsStaffVerified.of(FINANCE)]

    @extend_schema(
        operation_id="backoffice_kpis_list",
        parameters=[PeriodQuerySerializer],
        responses=KpiDashboardSerializer,
    )
    def get(self, request):
        period = _period(request)
        kpis = list(KpiDefinition.objects.select_related("base"))
        series = period.history(SERIES_LENGTH)
        index = ValueIndex(kpis, series)
        groups = [
            {
                "code": code,
                "label": label,
                "kpis": [_summary(k, period, index, series) for k in kpis if k.group == code],
            }
            for code, label in KpiDefinition.Group.choices
        ]
        return Response(KpiDashboardSerializer({"period": period, "groups": groups}).data)


class KpiDetailView(APIView):
    """WAD03 : statut, valeur, cible, historique, composition et définition d'un indicateur."""

    permission_classes = [IsStaffVerified.of(FINANCE)]

    @extend_schema(parameters=[PeriodQuerySerializer], responses=KpiDetailSerializer)
    def get(self, request, code):
        period = _period(request)
        kpi = KpiDefinition.objects.select_related("base").filter(code=code).first()
        if kpi is None:
            raise ApiError("NOT_FOUND", "Indicateur inconnu.")
        parts = list(kpi.parts.all())
        history = period.history(HISTORY_LENGTH)
        index = ValueIndex([kpi, *parts], history)
        value = index.value(kpi, period)
        numeric = isinstance(value, (int, float)) and not isinstance(value, bool)
        data = {
            **_summary(kpi, period, index, history[-SERIES_LENGTH:]),
            "period": period,
            "calculation": kpi.calculation,
            "periodicity": kpi.periodicity,
            "baseline": kpi.baseline,
            "attainment": round(100 * value / float(kpi.target))
            if numeric and kpi.target
            else None,
            "history": [
                {
                    "period": p.key,
                    "label": p.label,
                    "start": p.start,
                    "end": p.end,
                    "value": index.value(kpi, p),
                    "status": index.status(kpi, p),
                }
                for p in reversed(history)
            ],
            "composition": [
                {"code": part.code, "label": part.label, "value": index.value(part, period)}
                for part in parts
            ],
        }
        return Response(KpiDetailSerializer(data).data)


def _require(request, codename: str) -> None:
    """Permission personnalisée de la matrice D71 (Finance et Super-admin l'ont)."""
    if not request.user.has_perm(f"impact.{codename}"):
        raise ApiError("PERMISSION_DENIED")


class ImpactReportView(APIView):
    """WAD04 : lignes du rapport trimestriel (plages, réponses, statuts, sources), figées une fois soumis."""

    permission_classes = [IsStaffVerified.of(FINANCE)]

    @extend_schema(responses=ImpactReportSerializer)
    def get(self, request, period):
        quarter = reports.parse_quarter(period)
        return Response(ImpactReportSerializer(reports.build(quarter)).data)


class ImpactReportValuesView(APIView):
    """WAD05 : brouillon de la saisie manuelle (*enter_kpi_value*) ; `REPORT_LOCKED` après soumission (D74)."""

    permission_classes = [IsStaffVerified.of(FINANCE)]

    @extend_schema(request=ValuesInputSerializer, responses=ImpactReportSerializer)
    def patch(self, request, period):
        quarter = reports.parse_quarter(period)
        _require(request, "enter_kpi_value")
        data = ValuesInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        reports.save_values(quarter, data.validated_data["values"], request.user, request)
        return Response(ImpactReportSerializer(reports.build(quarter)).data)


class ImpactReportSubmitView(APIView):
    """WAD04 « Soumettre » (*submit_impact_report*) : verrouille et fige le rapport ; idempotent (D74)."""

    permission_classes = [IsStaffVerified.of(FINANCE)]

    @extend_schema(request=None, responses=ImpactReportSerializer)
    def post(self, request, period):
        quarter = reports.parse_quarter(period)
        _require(request, "submit_impact_report")
        reports.submit(quarter, request.user, request)
        return Response(ImpactReportSerializer(reports.build(quarter)).data)


class ImpactReportExportsView(APIView):
    """WAD04 « Exporter CSV / PDF » : export demandé, généré en asynchrone (D74), suivi par `exports/{id}/`."""

    permission_classes = [IsStaffVerified.of(FINANCE)]

    @extend_schema(request=ExportRequestSerializer, responses={202: ReportExportSerializer})
    def post(self, request, period):
        quarter = reports.parse_quarter(period)
        data = ExportRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        export = exports.request_export(
            quarter, data.validated_data["format"], request.user, request
        )
        return Response(ReportExportSerializer(export).data, status=status.HTTP_202_ACCEPTED)


def _own_export(request, pk) -> ReportExport:
    """Export demandé par ce membre ; celui d'un autre n'existe pas pour lui (404)."""
    export = (
        ReportExport.objects.select_related("report")
        .filter(pk=pk, requested_by=request.user)
        .first()
    )
    if export is None:
        raise ApiError("NOT_FOUND", "Export inconnu.")
    return export


class ExportDetailView(APIView):
    """État d'un export, interrogé jusqu'à `ready` (ou `failed`)."""

    permission_classes = [IsStaffVerified.of(FINANCE)]

    @extend_schema(responses=ReportExportSerializer)
    def get(self, request, pk):
        return Response(ReportExportSerializer(_own_export(request, pk)).data)


class ExportDownloadView(APIView):
    """
    Téléchargement (ADR 0005 §6) : redirection vers une URL présignée de 5 minutes ; sans stockage objet (CI), le
    fichier est servi directement. Export pas prêt : 409 `EXPORT_NOT_READY`.
    """

    permission_classes = [IsStaffVerified.of(FINANCE)]

    @extend_schema(
        responses={
            (302, "*/*"): OpenApiResponse(description="Redirection vers l'URL présignée"),
            (200, "*/*"): OpenApiResponse(description="Fichier CSV ou PDF"),
            409: OpenApiResponse(description="EXPORT_NOT_READY"),
        }
    )
    def get(self, request, pk):
        export = _own_export(request, pk)
        if export.status != ReportExport.Status.READY or not export.file:
            raise ApiError("EXPORT_NOT_READY")
        url = export.file.storage.signed_url(export.file.name, export.filename)
        if url:
            return HttpResponseRedirect(url)
        content_type = "text/csv" if export.format == ReportExport.Format.CSV else "application/pdf"
        return FileResponse(
            export.file.open("rb"),
            as_attachment=True,
            filename=export.filename,
            content_type=content_type,
        )
