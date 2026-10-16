from django.urls import path

from . import views

urlpatterns = [
    path("", views.WishlistView.as_view(), name="wishlist"),
    path("<slug:course_slug>/", views.WishlistItemView.as_view(), name="wishlist-item"),
]
