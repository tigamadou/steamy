from django.urls import include, path
from rest_framework.routers import SimpleRouter

from apps.accounts.views.children import ChildViewSet, MyParentView
from apps.accounts.views.consent import ConsentRequestViewSet
from apps.accounts.views.deletion import DeletionRequestViewSet, MyDeletionRequestView
from apps.accounts.views.me import EmailChangeView, MeView, PasswordChangeView
from apps.accounts.views.profiles import LearnerProfileView, ParentProfileView

router = SimpleRouter()
router.register(r"consent-requests", ConsentRequestViewSet, basename="consent-request")
router.register(r"children", ChildViewSet, basename="child")
router.register(r"deletion-requests", DeletionRequestViewSet, basename="deletion-request")

urlpatterns = [
    path("me/", MeView.as_view(), name="accounts-me"),
    path("me/password/", PasswordChangeView.as_view(), name="accounts-me-password"),
    path("me/email/", EmailChangeView.as_view(), name="accounts-me-email"),
    path("me/learner-profile/", LearnerProfileView.as_view(), name="accounts-me-learner-profile"),
    path("me/parent-profile/", ParentProfileView.as_view(), name="accounts-me-parent-profile"),
    path("me/parent/", MyParentView.as_view(), name="accounts-me-parent"),
    path(
        "me/deletion-request/",
        MyDeletionRequestView.as_view(),
        name="accounts-me-deletion-request",
    ),
    path("", include(router.urls)),
]
