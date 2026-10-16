from django.urls import path

from . import views

urlpatterns = [
    path("kits/", views.KitListView.as_view(), name="shop-kits"),
    path("kits/<slug:slug>/", views.KitDetailView.as_view(), name="shop-kit"),
    path("delivery-zones/", views.DeliveryZoneListView.as_view(), name="shop-delivery-zones"),
    path(
        "kits/<slug:slug>/restock-alerts/",
        views.RestockAlertView.as_view(),
        name="shop-restock-alerts",
    ),
    path("cart/", views.CartView.as_view(), name="shop-cart"),
    path("cart/items/", views.CartItemsView.as_view(), name="shop-cart-items"),
    path("cart/items/<int:pk>/", views.CartItemView.as_view(), name="shop-cart-item"),
]
