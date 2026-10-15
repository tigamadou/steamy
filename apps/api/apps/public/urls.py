from django.urls import path

from . import views

urlpatterns = [
    path("quote-requests/", views.QuoteRequestView.as_view(), name="public-quote-requests"),
    path("leads/", views.LeadView.as_view(), name="public-leads"),
    path("contact-messages/", views.ContactMessageView.as_view(), name="public-contact-messages"),
]
