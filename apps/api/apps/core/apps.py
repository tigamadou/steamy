from django.apps import AppConfig
from django.contrib.admin import apps as admin_apps
from django.db.models.signals import post_migrate


class SteamyAdminConfig(admin_apps.AdminConfig):
    """Remplace `django.contrib.admin` : `admin.site` est le site du back-office, avec TOTP (D72)."""

    default = False  # `CoreConfig` reste la configuration par défaut de `apps.core`
    default_site = "apps.core.admin_site.SteamyAdminSite"


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"

    def ready(self):
        from django.contrib.auth.signals import user_logged_in

        from . import staff_auth

        # `core` est la dernière app : à son `post_migrate`, les permissions de toutes les apps existent.
        post_migrate.connect(apply_staff_groups, sender=self)
        user_logged_in.connect(staff_auth.limit_staff_session)


def apply_staff_groups(sender, **kwargs):
    from .groups import setup_staff_groups

    setup_staff_groups()
