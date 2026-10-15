from django.urls import path

from apps.accounts.views.otp import OtpResendView
from apps.accounts.views.session import CsrfView, LoginView, LogoutView

# Domaine d'URL `auth`, servi par l'app `accounts` (pas d'app nommée `auth` : collision avec django.contrib.auth)
urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("otp/resend/", OtpResendView.as_view(), name="auth-otp-resend"),
]
