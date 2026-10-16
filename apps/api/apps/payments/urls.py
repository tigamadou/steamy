# apps/payments/urls.py
from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    KitCodeRedeemView,
    OrderViewSet,
    PaymentRequestViewSet,
    PaymentViewSet,
    provider_webhook,
)

router = SimpleRouter()
router.register(r"orders", OrderViewSet)
router.register(r"payments", PaymentViewSet)
router.register(r"payment-requests", PaymentRequestViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("kit-codes/redeem/", KitCodeRedeemView.as_view(), name="payments-kit-code-redeem"),
    # Notifications des prestataires : /api/payments/webhook/fedapay/ (et fake hors déploiement)
    path("webhook/<str:provider_name>/", provider_webhook, name="payments-webhook"),
]
