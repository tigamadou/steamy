"""
Réglages (API-L6.3, WAD14) : `PlatformSettings` singleton aux bornes validées, annonces diffusées une fois en
notification (D7), réseaux Mobile Money activables par pays (D76). Chaque accès testé, autorisé et refusé.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.core.announcements import broadcast
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.core.models import Announcement, PlatformSettings
from apps.core.tests.staff import verified_client
from apps.notifications.models import Notification
from apps.referentials.models import PaymentNetwork

pytestmark = pytest.mark.django_db

SETTINGS = "/admin/core/platformsettings/"
ANNOUNCEMENTS = "/admin/core/announcement/"
NETWORKS = "/admin/referentials/paymentnetwork/"


def settings_form(**overrides):
    data = {
        "otp_length": 6,
        "otp_validity_seconds": 300,
        "otp_max_attempts": 3,
        "otp_resend_delay_seconds": 60,
        "otp_daily_limit_per_phone": 5,
        "otp_daily_limit_per_ip": 20,
        "summative_retry_cooldown_seconds": 600,
        "dropout_threshold_days": 7,
        "vat_rate": "0",
        "aib_rate": "0",
        "points_scale": '{"mission": 10}',
        "rank_thresholds": '[{"rank": "Explorateur", "points": 0}]',
    }
    return {**data, **overrides}


# --- PlatformSettings ------------------------------------------------------------------------------------


def test_the_list_opens_the_single_settings_page(client):
    verified_client(client, SUPER_ADMIN)
    response = client.get(SETTINGS)
    assert response.status_code == 302
    assert response.url == f"{SETTINGS}1/change/"
    page = client.get(response.url).content.decode()
    assert "Fournisseur SMS actif" in page and "fake" in page


def test_super_admin_edits_and_cannot_duplicate_or_delete(client):
    verified_client(client, SUPER_ADMIN)
    PlatformSettings.load()
    response = client.post(f"{SETTINGS}1/change/", settings_form(dropout_threshold_days=10))
    assert response.status_code == 302
    assert PlatformSettings.load().dropout_threshold_days == 10
    assert client.get(f"{SETTINGS}add/").status_code == 403
    assert client.get(f"{SETTINGS}1/delete/").status_code == 403


def test_out_of_bounds_values_are_refused(client):
    verified_client(client, SUPER_ADMIN)
    PlatformSettings.load()
    response = client.post(f"{SETTINGS}1/change/", settings_form(dropout_threshold_days=0))
    assert response.status_code == 200
    assert "dropout_threshold_days" in response.context["adminform"].form.errors
    assert PlatformSettings.load().dropout_threshold_days == 7


def test_support_reads_the_settings_without_editing(client):
    verified_client(client, SUPPORT)
    PlatformSettings.load()
    assert client.get(SETTINGS).status_code == 302
    client.post(f"{SETTINGS}1/change/", settings_form(dropout_threshold_days=30))
    assert PlatformSettings.load().dropout_threshold_days == 7


@pytest.mark.parametrize("group", [CONTENT, FINANCE])
def test_content_and_finance_have_no_access_to_the_settings(client, group):
    verified_client(client, group)
    assert client.get(SETTINGS).status_code == 403


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("points_scale", []),
        ("points_scale", {"mission": -1}),
        ("points_scale", {"mission": True}),
        ("rank_thresholds", {}),
        ("rank_thresholds", [{"rank": "", "points": 0}]),
        ("rank_thresholds", [{"rank": "A", "points": "0"}]),
        ("rank_thresholds", [{"rank": "A", "points": False}]),
        ("rank_thresholds", [{"rank": "A", "points": 50}, {"rank": "B", "points": 10}]),
        ("rank_thresholds", [{"rank": "A", "points": 0}, {"rank": "B", "points": 0}]),
        ("rank_thresholds", ["Explorateur"]),
    ],
)
def test_points_scale_and_rank_thresholds_are_validated(field, value):
    config = PlatformSettings.load()
    setattr(config, field, value)
    with pytest.raises(ValidationError) as error:
        config.full_clean()
    assert set(error.value.message_dict) == {field}


def test_valid_points_scale_and_rank_thresholds_pass():
    config = PlatformSettings.load()
    config.points_scale = {"mission": 10, "summative": 50}
    config.rank_thresholds = [
        {"rank": "Explorateur", "points": 0},
        {"rank": "Inventeur", "points": 500},
    ]
    config.full_clean()


def test_tax_switches_and_rates_default_to_off_and_are_edited_by_the_super_admin(client):
    config = PlatformSettings.load()
    assert (config.vat_enabled, config.vat_rate, config.aib_enabled, config.aib_rate) == (
        False,
        0,
        False,
        0,
    )
    verified_client(client, SUPER_ADMIN)
    page = client.get(f"{SETTINGS}1/change/").content.decode()
    assert "Factures : TVA et AIB (C25)" in page
    response = client.post(
        f"{SETTINGS}1/change/",
        settings_form(aib_enabled="on", aib_rate="1.50", vat_rate="18"),
    )
    assert response.status_code == 302
    config.refresh_from_db()
    assert (config.vat_enabled, config.aib_enabled) == (False, True)
    assert (config.vat_rate, config.aib_rate) == (18, Decimal("1.5"))


@pytest.mark.parametrize(
    ("fields", "invalid"),
    [
        ({"vat_enabled": True}, "vat_rate"),
        ({"aib_enabled": True}, "aib_rate"),
        ({"vat_rate": Decimal("100.01")}, "vat_rate"),
        ({"aib_rate": Decimal("-1")}, "aib_rate"),
    ],
)
def test_taxes_are_validated(fields, invalid):
    config = PlatformSettings.load()
    for name, value in fields.items():
        setattr(config, name, value)
    with pytest.raises(ValidationError) as error:
        config.full_clean()
    assert set(error.value.message_dict) == {invalid}


# --- Annonces (D7) ----------------------------------------------------------------------------------------


def announcement(**fields):
    return Announcement.objects.create(
        title="Maintenance samedi",
        body="La plateforme sera indisponible de 8 h à 10 h.",
        audience=fields.pop("audience", Announcement.Audience.ALL),
        starts_at=fields.pop("starts_at", timezone.now()),
        **fields,
    )


def test_broadcast_notifies_active_personas_of_the_audience_once():
    learner, parent, teacher = LearnerFactory(), ParentFactory(), TeacherFactory()
    LearnerFactory(status=User.Status.SUSPENDED)
    item = announcement(audience=Announcement.Audience.PARENTS, url="/parent")
    assert broadcast(item.pk) == 1
    notification = Notification.objects.get()
    assert (notification.user, notification.type, notification.url) == (
        parent,
        "announcement",
        "/parent",
    )
    assert broadcast(item.pk) == 0
    item.refresh_from_db()
    assert item.broadcast_at and item.recipients == 1
    everyone = announcement()
    assert broadcast(everyone.pk) == 3
    assert {n.user for n in Notification.objects.filter(title=everyone.title)} >= {
        learner,
        teacher,
    }


def test_the_super_admin_creates_then_broadcasts(client, django_capture_on_commit_callbacks):
    staff = verified_client(client, SUPER_ADMIN)
    ParentFactory()
    now = timezone.now()
    response = client.post(
        f"{ANNOUNCEMENTS}add/",
        {
            "title": "Nouveaux ateliers",
            "body": "Inscriptions ouvertes.",
            "audience": "all",
            "url": "/evenements",
            "starts_at_0": now.strftime("%Y-%m-%d"),
            "starts_at_1": now.strftime("%H:%M:%S"),
        },
    )
    assert response.status_code == 302
    item = Announcement.objects.get()
    assert item.created_by == staff
    assert client.get(f"{ANNOUNCEMENTS}{item.pk}/change/").status_code == 200
    with django_capture_on_commit_callbacks(execute=True):
        client.post(ANNOUNCEMENTS, {"action": "broadcast", "_selected_action": [item.pk]})
    item.refresh_from_db()
    assert item.recipients == 1
    # Diffusée : figée et ignorée par une nouvelle diffusion
    client.post(f"{ANNOUNCEMENTS}{item.pk}/change/", {"title": "Modifiée"})
    item.refresh_from_db()
    assert item.title == "Nouveaux ateliers"
    response = client.post(ANNOUNCEMENTS, {"action": "broadcast", "_selected_action": [item.pk]})
    assert any("ignorée" in str(m) for m in response.wsgi_request._messages)


def test_an_ended_announcement_is_not_broadcast(client, django_capture_on_commit_callbacks):
    verified_client(client, SUPER_ADMIN)
    ParentFactory()
    past = timezone.now() - timedelta(days=2)
    item = announcement(starts_at=past, ends_at=past + timedelta(days=1))
    with django_capture_on_commit_callbacks(execute=True):
        client.post(ANNOUNCEMENTS, {"action": "broadcast", "_selected_action": [item.pk]})
    item.refresh_from_db()
    assert item.broadcast_at is None and str(item) == "Maintenance samedi"


def test_support_reads_announcements_without_broadcasting(client):
    verified_client(client, SUPPORT)
    item = announcement()
    assert client.get(ANNOUNCEMENTS).status_code == 200
    assert client.get(f"{ANNOUNCEMENTS}add/").status_code == 403
    client.post(ANNOUNCEMENTS, {"action": "broadcast", "_selected_action": [item.pk]})
    item.refresh_from_db()
    assert item.broadcast_at is None


@pytest.mark.parametrize(
    "fields",
    [
        {"ends_at": timezone.now() - timedelta(days=1)},
        {"url": "https://ailleurs.example"},
    ],
)
def test_announcement_constraints(fields):
    with pytest.raises(IntegrityError):
        announcement(**fields)


# --- Réseaux Mobile Money (D76) -------------------------------------------------------------------------


def test_a_disabled_network_leaves_the_public_endpoint(client):
    verified_client(client, SUPER_ADMIN)
    network = PaymentNetwork.objects.get(country_id="BJ", code="celtiis")

    def codes():
        response = APIClient().get("/api/referentials/payment-networks/?country=BJ")
        return {n["code"] for n in response.json()}

    assert "celtiis" in codes()
    response = client.post(
        f"{NETWORKS}?q=celtiis",
        {
            "form-TOTAL_FORMS": 1,
            "form-INITIAL_FORMS": 1,
            "form-0-id": network.pk,
            "form-0-order": network.order,
            "form-0-active": "on",
            "_save": "Enregistrer",
        },
    )
    assert response.status_code == 302
    network.refresh_from_db()
    assert not network.enabled
    assert "celtiis" not in codes()


def test_finance_reads_networks_without_editing(client):
    verified_client(client, FINANCE)
    assert client.get(NETWORKS).status_code == 200
    assert client.get(f"{NETWORKS}add/").status_code == 403
