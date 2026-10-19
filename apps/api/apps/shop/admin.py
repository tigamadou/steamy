"""
Boutique dans l'admin Django (WAD10, LOT-6 6.4) : kits et stock (groupe Contenu), zones de livraison (D38), alertes de
réassort et réservations en lecture seule.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import DeliveryZone, Kit, RestockAlert, StockReservation

#: Sous ce stock, un kit est signalé « stock bas » (badge à 3 seuils : rupture / < 10 / en stock)
LOW_STOCK = 10

#: Libellé de chaque niveau ; couleurs dans `admin/shop/stock.css` (variables CSS, thèmes clair et sombre)
STOCK_LABELS = {"out": "Rupture", "low": "Stock bas", "ok": "En stock"}


def stock_level(quantity: int) -> str:
    if quantity <= 0:
        return "out"
    return "low" if quantity < LOW_STOCK else "ok"


@admin.register(Kit)
class KitAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "price",
        "difficulty",
        "stock_quantity",
        "stock_badge",
        "active",
    )
    list_filter = ("active", "category", "difficulty")
    list_editable = ("stock_quantity", "active")
    search_fields = ("name", "slug", "description")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("compatible_courses",)
    readonly_fields = ("created_at", "updated_at")

    class Media:
        css = {"all": ("admin/shop/stock.css",)}

    @admin.display(description="Stock", ordering="stock_quantity")
    def stock_badge(self, obj):
        level = stock_level(obj.stock_quantity)
        return format_html(
            '<span class="stock-badge stock-badge--{}">{}</span>', level, STOCK_LABELS[level]
        )


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "country", "fee", "delay_label", "active")
    list_filter = ("country", "active")
    list_editable = ("fee", "active")


@admin.register(StockReservation)
class StockReservationAdmin(admin.ModelAdmin):
    """Suivi seulement : les réservations naissent de la commande et se libèrent seules."""

    list_display = ("kit", "quantity", "order_item", "expires_at", "confirmed_at", "released_at")
    list_filter = ("kit",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(RestockAlert)
class RestockAlertAdmin(admin.ModelAdmin):
    list_display = ("kit", "user", "created_at", "notified_at")
    list_filter = ("kit", "notified_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
