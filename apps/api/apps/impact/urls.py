"""Routes `/api/backoffice/` (§7.8), toutes protégées par `IsStaffVerified` (D72)."""

from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view(), name="backoffice-overview"),
    path("kpis/", views.KpiListView.as_view(), name="backoffice-kpis"),
    path("kpis/<slug:code>/", views.KpiDetailView.as_view(), name="backoffice-kpi"),
]
