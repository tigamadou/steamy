from django.urls import include, path
from rest_framework.routers import SimpleRouter

from apps.accounts.views.consent import ConsentRequestViewSet
from apps.accounts.views.me import EmailChangeView, MeView, PasswordChangeView

router = SimpleRouter()
router.register(r"consent-requests", ConsentRequestViewSet, basename="consent-request")

urlpatterns = [
    path("me/", MeView.as_view(), name="accounts-me"),
    path("me/password/", PasswordChangeView.as_view(), name="accounts-me-password"),
    path("me/email/", EmailChangeView.as_view(), name="accounts-me-email"),
    path("", include(router.urls)),
]
