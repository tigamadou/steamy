from django.urls import path

from . import views

urlpatterns = [
    path("", views.EventListView.as_view(), name="events-list"),
    # Avant `<slug>/` : ces chemins ne sont pas des événements
    path("applications/", views.ApplicationListView.as_view(), name="events-applications"),
    path("tickets/", views.TicketListView.as_view(), name="events-tickets"),
    path("<slug:slug>/", views.EventDetailView.as_view(), name="events-detail"),
    path(
        "<slug:slug>/applications/",
        views.ApplicationCreateView.as_view(),
        name="events-application-create",
    ),
]
