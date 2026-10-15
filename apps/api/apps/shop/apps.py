from django.apps import AppConfig


class ShopConfig(AppConfig):
    name = "apps.shop"
    label = "shop"
    verbose_name = "Boutique"

    def ready(self):
        from . import signals  # noqa: F401
