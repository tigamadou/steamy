from django.urls import path

from . import views

urlpatterns = [
    path("kits/", views.KitListView.as_view(), name="shop-kits"),
    path("kits/<slug:slug>/", views.KitDetailView.as_view(), name="shop-kit"),
]
