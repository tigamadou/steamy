"""Routes `/api/backoffice/` (§7.8), toutes protégées par `IsStaffVerified` (D72)."""

from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view(), name="backoffice-overview"),
    path("kpis/", views.KpiListView.as_view(), name="backoffice-kpis"),
    path("kpis/<slug:code>/", views.KpiDetailView.as_view(), name="backoffice-kpi"),
    path(
        "impact-reports/<str:period>/",
        views.ImpactReportView.as_view(),
        name="backoffice-impact-report",
    ),
    path(
        "impact-reports/<str:period>/values/",
        views.ImpactReportValuesView.as_view(),
        name="backoffice-impact-report-values",
    ),
    path(
        "impact-reports/<str:period>/submit/",
        views.ImpactReportSubmitView.as_view(),
        name="backoffice-impact-report-submit",
    ),
    path(
        "impact-reports/<str:period>/exports/",
        views.ImpactReportExportsView.as_view(),
        name="backoffice-impact-report-exports",
    ),
    path("exports/<int:pk>/", views.ExportDetailView.as_view(), name="backoffice-export"),
    path(
        "exports/<int:pk>/download/",
        views.ExportDownloadView.as_view(),
        name="backoffice-export-download",
    ),
]
