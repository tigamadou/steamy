from django.contrib import admin

from .models import Kit


@admin.register(Kit)
class KitAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "difficulty", "stock_quantity", "active")
    list_filter = ("active", "category", "difficulty")
    list_editable = ("stock_quantity", "active")
    search_fields = ("name", "slug", "description")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("compatible_courses",)
    readonly_fields = ("created_at", "updated_at")
