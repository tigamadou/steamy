"""Site de l'admin du back-office (LOT-6 6.1) : registre audité, nettoyage, index par groupe, thème, journal."""

import json
import re
from pathlib import Path

import pytest
from django.conf import settings
from django.contrib import admin
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import RequestFactory

from apps.accounts.tests.factories import StaffFactory
from apps.analytics.models import TrackingEvent
from apps.core.admin import FROZEN_MODELS, unregister_frozen
from apps.core.admin_audit import AuditedAdminMixin
from apps.core.admin_site import SteamyAdminSite
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import verified_client

pytestmark = pytest.mark.django_db


def test_admin_site_is_the_backoffice_site_with_totp():
    assert isinstance(admin.site, SteamyAdminSite)
    assert (admin.site.name, admin.site.site_header) == ("admin", "Steamy · Back-office")


def test_every_model_admin_is_audited():
    """Introspection du registre : y compris les admins des apps tierces (Celery, OTP, thème, groupes)."""
    not_audited = [
        model._meta.label
        for model, model_admin in admin.site._registry.items()
        if not isinstance(model_admin, AuditedAdminMixin)
    ]
    assert admin.site._registry and not_audited == []


def test_register_adds_the_audit_mixin_only_when_missing():
    site = SteamyAdminSite(name="essai")
    site.register(Group)
    assert isinstance(site._registry[Group], AuditedAdminMixin)
    assert type(site._registry[Group]).__name__ == "ModelAdmin"

    class AlreadyAudited(AuditedAdminMixin, admin.ModelAdmin):
        pass

    site.register(TrackingEvent, AlreadyAudited)
    assert type(site._registry[TrackingEvent]) is AlreadyAudited


def test_frozen_models_are_not_in_the_admin():
    from django.apps import apps

    for label in FROZEN_MODELS:
        try:
            model = apps.get_model(label)
        except LookupError:  # app supprimée (courses, API-L1.1)
            continue
        assert not admin.site.is_registered(model)


def test_unregister_frozen_ignores_deleted_or_unregistered_models():
    site = SteamyAdminSite(name="essai")
    unregister_frozen(site, ["courses.Path", "messaging.Message"])
    assert site._registry == {}


def test_telemetry_is_read_only_and_totp_devices_cannot_be_created_or_edited():
    request = RequestFactory().get("/")
    request.user = StaffFactory(is_superuser=True)
    tracking = admin.site._registry[TrackingEvent]
    assert not (
        tracking.has_add_permission(request)
        or tracking.has_change_permission(request)
        or tracking.has_delete_permission(request)
    )
    from django_otp.plugins.otp_totp.models import TOTPDevice

    devices = admin.site._registry[TOTPDevice]
    assert not (devices.has_add_permission(request) or devices.has_change_permission(request))
    assert devices.has_delete_permission(request)  # supprimer = réinitialiser le TOTP


def models_on_index(client) -> set[str]:
    response = client.get("/admin/")
    assert response.status_code == 200
    return {
        f"{app['app_label']}.{model['object_name'].lower()}"
        for app in response.context["app_list"]
        for model in app["models"]
    }


@pytest.mark.parametrize(
    ("group", "visible", "hidden"),
    [
        (
            SUPER_ADMIN,
            {
                "core.auditlog",
                "auth.group",
                "otp_totp.totpdevice",
                "django_celery_beat.periodictask",
            },
            {"courses.course", "learning.enrollment"},
        ),
        (
            SUPPORT,
            {"accounts.user", "core.platformsettings", "referentials.country", "mail.template"},
            {"core.auditlog", "auth.group", "payments.refund", "django_celery_beat.periodictask"},
        ),
        (
            FINANCE,
            {"accounts.user", "payments.payment", "payments.refund", "referentials.paymentnetwork"},
            {"core.platformsettings", "core.auditlog", "referentials.country"},
        ),
    ],
)
def test_each_group_only_sees_its_models(client, group, visible, hidden):
    verified_client(client, group)
    models = models_on_index(client)
    assert visible <= models and not (hidden & models)


def test_content_sees_the_catalog_and_the_events(client):
    verified_client(client, CONTENT)
    assert {"catalog.course", "catalog.mission", "events.steamyevent"} <= models_on_index(client)


def test_the_index_is_in_french_with_the_pilotage_link_and_the_environment_banner(client):
    verified_client(client, SUPER_ADMIN)
    html = client.get("/admin/").content.decode()
    assert f'href="{settings.WEB_URL}/backoffice">Pilotage</a>' in html
    assert f'href="{settings.WEB_URL}"' in html  # « Voir le site » mène au front
    assert "core/steamy-admin.css" in html
    assert 'content: "Test"' in html  # bandeau d'environnement (DJANGO_ENV=test)
    assert "Administration" in html and "Déconnexion" in html


def test_the_audit_log_is_read_only_and_reserved_to_super_admin(client):
    AuditLog.objects.create(action="essai")
    verified_client(client, SUPPORT)
    assert client.get("/admin/core/auditlog/").status_code == 403
    client.logout()
    verified_client(client, SUPER_ADMIN)
    assert client.get("/admin/core/auditlog/").status_code == 200
    entry = AuditLog.objects.get(action="essai")
    page = client.get(f"/admin/core/auditlog/{entry.pk}/change/").content.decode()
    assert 'name="_save"' not in page


# --- Thème « Steamy monochrome » -------------------------------------------------------------------------------------

THEME = Path(settings.BASE_DIR) / "fixtures" / "admin.json"
INK = {
    "#161325",
    "#2A2640",
    "#3F3A5C",
    "#5B5479",
    "#7A7396",
    "#E1DEEC",
    "#EFEDF5",
    "#F7F6FB",
    "#FFFFFF",
}
#: Couleur réservée aux statuts : le bouton « Supprimer » (--error-600 et sa nuance au survol)
STATUS = {"#DC2626", "#B91C1C"}


def test_the_theme_fixture_is_monochrome_without_magenta():
    (theme,) = json.loads(THEME.read_text(encoding="utf-8"))
    colors = {
        value.upper()
        for value in theme["fields"].values()
        if isinstance(value, str) and value.startswith("#")
    }
    assert colors <= {c.upper() for c in INK | STATUS}
    assert (
        theme["fields"]["name"] == "Steamy monochrome"
        and theme["fields"]["title"] == "Steamy · Back-office"
    )


def test_the_theme_fixture_loads_and_is_active(client):
    from admin_interface.models import Theme

    call_command("loaddata", str(THEME), verbosity=0)
    assert Theme.objects.get(active=True).name == "Steamy monochrome"
    verified_client(client, SUPER_ADMIN)
    html = client.get("/admin/").content.decode()
    assert "Steamy · Back-office" in html
    assert not re.search(r"#9E1B9A", html, re.IGNORECASE)  # --primary-500


# --- Journal d'audit de l'admin ---------------------------------------------------------------------------------------


def logged():
    return list(AuditLog.objects.filter(action__startswith="admin.").order_by("id"))


def test_additions_changes_and_deletions_are_logged(client):
    staff = verified_client(client, SUPER_ADMIN)
    client.post("/admin/auth/group/add/", {"name": "Partenaires"})
    group = Group.objects.get(name="Partenaires")
    client.post(f"/admin/auth/group/{group.pk}/change/", {"name": "Partenaires ONG"})
    client.post(f"/admin/auth/group/{group.pk}/delete/", {"post": "yes"})
    add, change, delete = logged()
    assert (add.action, add.actor, add.target_type, add.target_id) == (
        "admin.add",
        staff,
        "auth.group",
        str(group.pk),
    )
    assert change.action == "admin.change" and change.data["object"] == "Partenaires ONG"
    # Champs nommés comme dans le `LogEntry` de Django (libellé source, non traduit)
    assert change.data["changes"] == [{"changed": {"fields": ["Name"]}}]
    assert (delete.action, delete.ip) == ("admin.delete", "127.0.0.1")


def test_bulk_deletions_are_logged_object_by_object(client):
    verified_client(client, SUPER_ADMIN)
    groups = [Group.objects.create(name=f"Temporaire {n}") for n in range(2)]
    client.post(
        "/admin/auth/group/",
        {"action": "delete_selected", "_selected_action": [g.pk for g in groups], "post": "yes"},
    )
    assert [(e.action, e.target_id) for e in logged()] == [
        ("admin.delete", str(g.pk)) for g in groups
    ]


def test_custom_actions_are_logged_before_running():
    class GroupAdmin(AuditedAdminMixin, admin.ModelAdmin):
        actions = ["touch"]

        @admin.action(description="Toucher")
        def touch(self, request, queryset):
            return queryset.count()

    model_admin = GroupAdmin(Group, admin.site)
    request = RequestFactory().post("/")
    request.user = StaffFactory(is_superuser=True)
    func, name, description = model_admin.get_actions(request)["touch"]
    assert (name, description) == ("touch", "Toucher")
    assert func(model_admin, request, Group.objects.filter(name=SUPPORT)) == 1
    (entry,) = logged()
    assert entry.action == "admin.action" and entry.actor == request.user
    assert entry.data == {
        "action": "touch",
        "model": "auth.group",
        "ids": [str(Group.objects.get(name=SUPPORT).pk)],
        "count": 1,
    }
