# apps/payments/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OrderViewSet, PaymentViewSet, provider_webhook

router = DefaultRouter()
router.register(r"orders", OrderViewSet)
router.register(r"payments", PaymentViewSet)

urlpatterns = [
    path("", include(router.urls)),
    # webhook e.g. /api/payments/webhook/kkiapay/
    path("webhook/<str:provider_name>/", provider_webhook, name="payments-webhook"),
]
