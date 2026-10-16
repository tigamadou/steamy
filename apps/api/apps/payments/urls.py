# apps/payments/urls.py
from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import OrderViewSet, PaymentViewSet, provider_webhook

router = SimpleRouter()
router.register(r"orders", OrderViewSet)
router.register(r"payments", PaymentViewSet)

urlpatterns = [
    path("", include(router.urls)),
    # Notifications des prestataires : /api/payments/webhook/fedapay/ (et fake hors déploiement)
    path("webhook/<str:provider_name>/", provider_webhook, name="payments-webhook"),
]
