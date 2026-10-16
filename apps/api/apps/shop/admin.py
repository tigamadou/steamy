from django.contrib import admin

from .models import DeliveryZone, Kit, RestockAlert, StockReservation


@admin.register(Kit)
class KitAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "difficulty", "stock_quantity", "active")
    list_filter = ("active", "category", "difficulty")
    list_editable = ("stock_quantity", "active")
    search_fields = ("name", "slug", "description")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("compatible_courses",)
    readonly_fields = ("created_at", "updated_at")


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
