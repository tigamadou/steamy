# apps/payments/admin.py
from django.contrib import admin
from .models import Order, OrderItem, Payment, Invoice, Refund

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "total", "paid", "created_at")
    inlines = [OrderItemInline]
    search_fields = ("reference", "user__email")

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("provider", "order", "amount", "success", "created_at")
    readonly_fields = ("provider_payload", "raw_response")

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("number", "order", "issued_at")

@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ("payment", "amount", "processed", "created_at")
