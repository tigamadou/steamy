from django.contrib import admin

from . import models


@admin.register(models.Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "dial_code", "active", "order")
    list_editable = ("active", "order")


@admin.register(models.PaymentNetwork)
class PaymentNetworkAdmin(admin.ModelAdmin):
    """
    Réseaux Mobile Money par pays, Celtiis compris (WAD14, D76). Un réseau désactivé disparaît aussitôt de
    `referentials/payment-networks/` (lu à chaque requête ; cache HTTP public d'une heure au plus).
    """

    list_display = ("label", "country", "code", "enabled", "active", "order")
    list_editable = ("enabled", "active", "order")
    list_filter = ("country", "enabled")
    search_fields = ("label", "code")


@admin.register(models.Locality)
class LocalityAdmin(admin.ModelAdmin):
    list_display = ("city", "district", "country", "area_type", "active")
    list_filter = ("country", "area_type", "active")
    search_fields = ("city", "district")


for model in (
    models.SchoolGrade,
    models.Goal,
    models.Avatar,
    models.Disability,
    models.Relationship,
    models.RefusalReason,
):
    admin.site.register(
        model,
        list_display=("label", "code", "active", "order"),
        list_editable=("active", "order"),
    )
