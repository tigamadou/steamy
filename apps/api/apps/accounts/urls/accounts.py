from django.urls import path

from apps.accounts.views.learner_signup import (
    LearnerConsentRequestView,
    LearnerConsentResendView,
)
from apps.accounts.views.me import EmailChangeView, MeView, PasswordChangeView

urlpatterns = [
    path("me/", MeView.as_view(), name="accounts-me"),
    path("me/password/", PasswordChangeView.as_view(), name="accounts-me-password"),
    path("me/email/", EmailChangeView.as_view(), name="accounts-me-email"),
    path("consent-requests/", LearnerConsentRequestView.as_view(), name="consent-request-create"),
    path(
        "consent-requests/<int:pk>/resend/",
        LearnerConsentResendView.as_view(),
        name="consent-request-resend",
    ),
]
