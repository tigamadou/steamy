from django.urls import path

from apps.user.endpoints.public.forgot_password_step_1.views import PublicForgotPasswordStep1View
from apps.user.endpoints.public.forgot_password_step_2.views import PublicForgotPasswordStep2View
from apps.user.endpoints.session.views import CsrfView, SessionLoginView, SessionLogoutView
from apps.user.endpoints.user.change_email.views import UserChangeEmailView
from apps.user.endpoints.user.change_password.views import UserChangePasswordView
from apps.user.endpoints.user.my_profile.views import UserMyProfileView

urlpatterns = [
    # Session (front web)
    path("public/user/csrf", CsrfView.as_view(), name="public-user-csrf"),
    path("public/user/session-login", SessionLoginView.as_view(), name="public-user-session-login"),
    path("user/session-logout", SessionLogoutView.as_view(), name="user-session-logout"),
    path(
        "public/user/forgot-password-step-1",
        PublicForgotPasswordStep1View.as_view(),
        name="public-user-forgot-password-step-1",
    ),
    path(
        "public/user/forgot-password-step-2",
        PublicForgotPasswordStep2View.as_view(),
        name="public-user-forgot-password-step-2",
    ),
    path("user/change-password", UserChangePasswordView.as_view(), name="user-change-password"),
    path("user/change-email", UserChangeEmailView.as_view(), name="user-change-email"),
    path("user/my-profile", UserMyProfileView.as_view(), name="user-my-profile"),
]
