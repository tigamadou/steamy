"""
Commerce dans l'admin Django (groupe Finance, D71). Commandes et paiements se lisent ici sans se réécrire : les
montants viennent du serveur (`pricing`) et des webhooks. Les actions de la Finance (rembourser…) arrivent avec le
RBAC du back-office (API-L6.2).
"""

from django.contrib import admin

from .models import Invoice, KitCode, Order, OrderItem, Payment, PaymentRequest, Refund


class ReadOnlyInline(admin.TabularInline):
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class OrderItemInline(ReadOnlyInline):
    model = OrderItem
    fields = ("title", "course", "kit", "event", "unit_price", "quantity", "total")


class PaymentInline(ReadOnlyInline):
    model = Payment
    fields = ("provider", "provider_transaction_id", "network", "amount", "status", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("reference", "kind", "payer", "beneficiary", "total", "status", "created_at")
    list_filter = ("kind", "status", "shipping_status")
    search_fields = ("reference", "payer__phone", "guest_phone", "beneficiary__username")
    inlines = [OrderItemInline, PaymentInline]
    # Seul le suivi de livraison se modifie à la main
    readonly_fields = (
        "reference",
        "kind",
        "payer",
        "guest_first_name",
        "guest_last_name",
        "guest_phone",
        "beneficiary",
        "status",
        "subtotal",
        "shipping_fee",
        "total",
        "currency",
        "delivery_zone",
        "delivery_address",
        "expires_at",
        "paid_at",
        "created_at",
    )
    exclude = ("guest_access_token_hash",)

    def has_add_permission(self, request):
        return False


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "provider", "network", "amount", "status", "created_at")
    list_filter = ("provider", "status", "network")
    search_fields = ("order__reference", "provider_transaction_id")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("number", "order", "issued_at")


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ("payment", "amount", "processed", "created_at")
    list_filter = ("processed",)


@admin.register(KitCode)
class KitCodeAdmin(admin.ModelAdmin):
    """Suivi des Kit Codes (Support, Finance) ; la révocation arrive avec les actions du back-office (L6.2)."""

    list_display = ("code", "kit", "redeemed_by", "redeemed_course", "redeemed_at", "revoked_at")
    list_filter = ("kit",)
    search_fields = ("code", "order_item__order__reference")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
    """Suivi des demandes de l'enfant au parent (Support) ; la relance par le personnel arrive en L6.2."""

    list_display = ("id", "requested_by", "parent", "kind", "amount", "status", "expires_at")
    list_filter = ("kind", "status")
    search_fields = ("requested_by__username", "parent__phone")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
