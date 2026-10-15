from django.urls import path

from . import views

urlpatterns = [
    path("", views.EventListView.as_view(), name="events-list"),
    path("<slug:slug>/", views.EventDetailView.as_view(), name="events-detail"),
    path("<slug:slug>/proposals/", views.EventProposalView.as_view(), name="events-proposals"),
]
