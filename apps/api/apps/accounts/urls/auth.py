from django.urls import path

from apps.accounts.views.learner_signup import (
    LearnerSignupPasswordView,
    LearnerSignupResumeView,
    LearnerSignupView,
    UsernameAvailabilityView,
)
from apps.accounts.views.otp import OtpResendView
from apps.accounts.views.parent_signup import (
    ParentSignupPasswordView,
    ParentSignupVerifyView,
    ParentSignupView,
)
from apps.accounts.views.password_reset import (
    PasswordResetConfirmView,
    PasswordResetVerifyView,
    PasswordResetView,
)
from apps.accounts.views.session import CsrfView, LoginView, LogoutView
from apps.accounts.views.teacher_activation import (
    TeacherInvitationAcceptView,
    TeacherInvitationView,
)

# Domaine d'URL `auth`, servi par l'app `accounts` (pas d'app nommée `auth` : collision avec django.contrib.auth)
urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("otp/resend/", OtpResendView.as_view(), name="auth-otp-resend"),
    path(
        "username-availability/",
        UsernameAvailabilityView.as_view(),
        name="auth-username-availability",
    ),
    path("learner-signup/", LearnerSignupView.as_view(), name="auth-learner-signup"),
    path(
        "learner-signup/resume/",
        LearnerSignupResumeView.as_view(),
        name="auth-learner-signup-resume",
    ),
    path(
        "learner-signup/password/",
        LearnerSignupPasswordView.as_view(),
        name="auth-learner-signup-password",
    ),
    path("password-reset/", PasswordResetView.as_view(), name="auth-password-reset"),
    path(
        "password-reset/verify/",
        PasswordResetVerifyView.as_view(),
        name="auth-password-reset-verify",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
    path("parent-signup/", ParentSignupView.as_view(), name="auth-parent-signup"),
    path(
        "parent-signup/verify/", ParentSignupVerifyView.as_view(), name="auth-parent-signup-verify"
    ),
    path(
        "parent-signup/password/",
        ParentSignupPasswordView.as_view(),
        name="auth-parent-signup-password",
    ),
    path(
        "teacher-invitations/<str:token>/",
        TeacherInvitationView.as_view(),
        name="auth-teacher-invitation",
    ),
    path(
        "teacher-invitations/<str:token>/accept/",
        TeacherInvitationAcceptView.as_view(),
        name="auth-teacher-invitation-accept",
    ),
]
