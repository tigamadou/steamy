"""Plateforme et personnel (API-1.6) : réglages singleton, journal d'audit, groupes D71."""

import pytest
from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from rest_framework.test import APIRequestFactory

from apps.accounts.tests.factories import ParentFactory, StaffFactory
from apps.core.audit import audit
from apps.core.groups import STAFF_GROUPS
from apps.core.models import AuditLog, PlatformSettings

pytestmark = pytest.mark.django_db


def test_platform_settings_exist_with_the_decided_defaults():
    settings = PlatformSettings.load()
    assert settings.pk == 1
    # D24
    assert (settings.otp_length, settings.otp_validity_seconds, settings.otp_max_attempts) == (
        6,
        300,
        3,
    )
    assert settings.otp_resend_delay_seconds == 60
    assert settings.otp_daily_limit_per_phone > 0 and settings.otp_daily_limit_per_ip > 0
    # D32, D66
    assert settings.summative_retry_cooldown_seconds == 600
    assert settings.dropout_threshold_days == 7
    # C8 : barème vide jusqu'à sa saisie
    assert settings.points_scale == {} and settings.rank_thresholds == []


def test_platform_settings_is_a_singleton():
    PlatformSettings.load()
    duplicate = PlatformSettings(dropout_threshold_days=3)
    duplicate.save()  # `save` ramène toujours sur la ligne unique
    assert PlatformSettings.objects.count() == 1
    assert PlatformSettings.load().dropout_threshold_days == 3
    with pytest.raises(IntegrityError), transaction.atomic():
        PlatformSettings.objects.bulk_create([PlatformSettings(id=2)])


def test_the_four_staff_groups_exist():
    assert set(Group.objects.values_list("name", flat=True)) >= set(STAFF_GROUPS)
    assert STAFF_GROUPS == ("Super-admin", "Contenu", "Support", "Finance")


def test_audit_records_actor_target_data_and_ip():
    staff = StaffFactory()
    target = ParentFactory()
    request = APIRequestFactory().post("/", HTTP_X_FORWARDED_FOR="196.168.1.5, 10.0.0.1")
    request.user = staff
    entry = audit("account.suspended", target=target, data={"raison": "test"}, request=request)
    assert (entry.actor, entry.action) == (staff, "account.suspended")
    assert (entry.target_type, entry.target_id) == ("accounts.user", str(target.pk))
    assert entry.data == {"raison": "test"} and entry.ip == "196.168.1.5"


def test_system_actions_have_no_actor():
    entry = audit("payments.reconciled")
    assert entry.actor is None and entry.ip is None
    assert AuditLog.objects.get() == entry


def test_audit_log_is_read_only_in_the_admin():
    from django.contrib.admin.sites import site

    model_admin = site._registry[AuditLog]
    request = APIRequestFactory().get("/")
    request.user = StaffFactory(is_superuser=True)
    assert not model_admin.has_add_permission(request)
    assert not model_admin.has_change_permission(request)
    assert not model_admin.has_delete_permission(request)
