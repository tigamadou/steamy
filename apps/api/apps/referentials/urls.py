from django.urls import path

from . import views

urlpatterns = [
    path("countries/", views.CountryListView.as_view(), name="referentials-countries"),
    path(
        "payment-networks/",
        views.PaymentNetworkListView.as_view(),
        name="referentials-payment-networks",
    ),
    path("school-grades/", views.SchoolGradeListView.as_view(), name="referentials-school-grades"),
    path("goals/", views.GoalListView.as_view(), name="referentials-goals"),
    path("avatars/", views.AvatarListView.as_view(), name="referentials-avatars"),
    path("disabilities/", views.DisabilityListView.as_view(), name="referentials-disabilities"),
    path("relationships/", views.RelationshipListView.as_view(), name="referentials-relationships"),
    path(
        "refusal-reasons/",
        views.RefusalReasonListView.as_view(),
        name="referentials-refusal-reasons",
    ),
    path(
        "deletion-reasons/",
        views.DeletionReasonListView.as_view(),
        name="referentials-deletion-reasons",
    ),
    path("localities/", views.LocalityListView.as_view(), name="referentials-localities"),
]
