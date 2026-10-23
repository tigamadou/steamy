from django.urls import include, path
from rest_framework.routers import SimpleRouter

from apps.accounts.views.children import ChildViewSet, MyParentView
from apps.accounts.views.consent import ConsentRequestViewSet
from apps.accounts.views.deletion import DeletionRequestViewSet, MyDeletionRequestView
from apps.accounts.views.me import EmailChangeView, MeView, PasswordChangeView
from apps.accounts.views.pending_actions import PendingActionsView
from apps.accounts.views.phone_change import PhoneChangeVerifyView, PhoneChangeView
from apps.accounts.views.profiles import LearnerProfileView, ParentProfileView, TeacherProfileView

router = SimpleRouter()
router.register(r"consent-requests", ConsentRequestViewSet, basename="consent-request")
router.register(r"children", ChildViewSet, basename="child")
router.register(r"deletion-requests", DeletionRequestViewSet, basename="deletion-request")

urlpatterns = [
    path("me/", MeView.as_view(), name="accounts-me"),
    path("me/password/", PasswordChangeView.as_view(), name="accounts-me-password"),
    path("me/email/", EmailChangeView.as_view(), name="accounts-me-email"),
    path("me/phone-change/", PhoneChangeView.as_view(), name="accounts-me-phone-change"),
    path(
        "me/phone-change/verify/",
        PhoneChangeVerifyView.as_view(),
        name="accounts-me-phone-change-verify",
    ),
    path("me/learner-profile/", LearnerProfileView.as_view(), name="accounts-me-learner-profile"),
    path("me/parent-profile/", ParentProfileView.as_view(), name="accounts-me-parent-profile"),
    path("me/teacher-profile/", TeacherProfileView.as_view(), name="accounts-me-teacher-profile"),
    path("me/parent/", MyParentView.as_view(), name="accounts-me-parent"),
    path(
        "me/deletion-request/",
        MyDeletionRequestView.as_view(),
        name="accounts-me-deletion-request",
    ),
    path("pending-actions/", PendingActionsView.as_view(), name="accounts-pending-actions"),
    path("", include(router.urls)),
]
