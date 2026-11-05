"""Routes `/api/backoffice/` des paiements et des remboursements (§7.8), réservées à la Finance."""

from django.urls import path

from . import backoffice_api as api

urlpatterns = [
    path("payments/", api.PaymentListView.as_view(), name="backoffice-payments"),
]
