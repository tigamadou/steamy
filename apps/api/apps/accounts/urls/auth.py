from django.urls import path

from apps.accounts.views.otp import OtpResendView
from apps.accounts.views.parent_signup import (
    ParentSignupPasswordView,
    ParentSignupVerifyView,
    ParentSignupView,
)
from apps.accounts.views.session import CsrfView, LoginView, LogoutView

# Domaine d'URL `auth`, servi par l'app `accounts` (pas d'app nommée `auth` : collision avec django.contrib.auth)
urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("otp/resend/", OtpResendView.as_view(), name="auth-otp-resend"),
    path("parent-signup/", ParentSignupView.as_view(), name="auth-parent-signup"),
    path(
        "parent-signup/verify/", ParentSignupVerifyView.as_view(), name="auth-parent-signup-verify"
    ),
    path(
        "parent-signup/password/",
        ParentSignupPasswordView.as_view(),
        name="auth-parent-signup-password",
    ),
]
