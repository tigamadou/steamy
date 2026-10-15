"""Groupes du personnel et matrice des permissions (D71) : figée par test, appliquée à chaque `migrate`."""

import io

import pytest
from django.contrib.auth.models import Group, Permission
from django.core.management import call_command

from apps.core.groups import (
    CONTENT,
    FINANCE,
    PERMISSIONS,
    STAFF_GROUPS,
    SUPER_ADMIN,
    SUPPORT,
    codenames,
    expected_permissions,
    setup_staff_groups,
)

pytestmark = pytest.mark.django_db

SA, CO, SU, FI = SUPER_ADMIN, CONTENT, SUPPORT, FINANCE
USER_SUPPORT = ("vc", "invite_teacher", "deactivate_user", "reset_password")

#: Matrice du plan LOT-6-ADMIN (« Groupes et permissions »). Toute évolution passe par ce test.
FROZEN = {
    "accounts.consentrequest": {
        SA: ("v", "resend", "flag_dispute"),
        SU: ("v", "resend", "flag_dispute"),
    },
    "accounts.learnerprofile": {
        SA: ("vac", "view_sensitive_profile"),
        SU: ("vc", "view_sensitive_profile"),
        FI: ("v",),
    },
    "accounts.parentchildlink": {SA: ("v", "change_parent"), SU: ("v", "change_parent")},
    "accounts.parentprofile": {SA: ("vac",), SU: ("vc",), FI: ("v",)},
    "accounts.publicprofilereview": {SA: ("vc",), SU: ("vc",)},
    "accounts.staffmember": {SA: ("vacd",)},
    "accounts.teacherprofile": {SA: ("vac",), SU: ("vc",), FI: ("v",)},
    "accounts.user": {SA: ("vac",), SU: USER_SUPPORT, FI: ("v",)},
    "admin_interface.theme": {SA: ("v",)},
    "analytics.dailyaggregatedstat": {SA: ("v",)},
    "analytics.trackingevent": {SA: ("v",)},
    "auth.group": {SA: ("vacd",)},
    "catalog.badge": {SA: ("vacd",), CO: ("vacd",), SU: ("v",)},
    "catalog.category": {SA: ("vacd",), CO: ("vacd",), SU: ("v",)},
    "catalog.choice": {SA: ("vacd",), CO: ("vacd",), SU: ("v",)},
    "catalog.course": {
        SA: ("vacd", "publish_course"),
        CO: ("vacd", "publish_course"),
        SU: ("v",),
        FI: ("v",),
    },
    "catalog.level": {SA: ("vacd",), CO: ("vacd",), SU: ("v",)},
    "catalog.mission": {SA: ("vacd",), CO: ("vacd",), SU: ("v",)},
    "catalog.project": {SA: ("vacd",), CO: ("vacd",), SU: ("v",)},
    "catalog.question": {SA: ("vacd",), CO: ("vacd",), SU: ("v",)},
    "catalog.quiz": {SA: ("vacd",), CO: ("vacd",), SU: ("v",)},
    "classrooms.classroom": {SA: ("vacd",), SU: ("vac",)},
    "classrooms.school": {SA: ("vacd",), SU: ("vac",), FI: ("v",)},
    "classrooms.teacherinvitation": {SA: ("vacd",), SU: ("vac",)},
    "core.announcement": {SA: ("vac",), SU: ("v",)},
    "core.auditlog": {SA: ("v",)},
    "core.platformsettings": {SA: ("vac",), SU: ("v",)},
    "django_celery_beat.clockedschedule": {SA: ("vacd",)},
    "django_celery_beat.crontabschedule": {SA: ("vacd",)},
    "django_celery_beat.intervalschedule": {SA: ("vacd",)},
    "django_celery_beat.periodictask": {SA: ("vacd",)},
    "django_celery_beat.solarschedule": {SA: ("vacd",)},
    "django_celery_results.groupresult": {SA: ("v",)},
    "django_celery_results.taskresult": {SA: ("v",)},
    "events.eventapplication": {
        SA: ("v",),
        CO: ("v",),
        SU: ("v", "refuse_application"),
        FI: ("v",),
    },
    "events.steamyevent": {SA: ("vacd",), CO: ("vacd",), SU: ("v",), FI: ("v",)},
    "file.file": {SA: ("v",)},
    "impact.impactreport": {
        SA: ("v", "enter_kpi_value", "submit_impact_report"),
        FI: ("v", "enter_kpi_value", "submit_impact_report"),
    },
    "impact.kpidefinition": {SA: ("v",), FI: ("v",)},
    "mail.layout": {SA: ("vac",), SU: ("v",)},
    "mail.mail": {SA: ("vac",), SU: ("v",)},
    "mail.template": {SA: ("vac",), SU: ("v",)},
    "notifications.notification": {SA: ("v",)},
    "otp_totp.totpdevice": {SA: ("vd",)},
    "payments.invoice": {SA: ("v",), SU: ("v",), FI: ("v",)},
    "payments.kitcode": {SA: ("v",), SU: ("v", "revoke_kitcode"), FI: ("v",)},
    "payments.order": {SA: ("v",), SU: ("v", "set_shipping_status"), FI: ("v",)},
    "payments.orderitem": {SA: ("v",), SU: ("v",), FI: ("v",)},
    "payments.payment": {SA: ("v",), SU: ("v",), FI: ("v",)},
    "payments.refund": {SA: ("v",), FI: ("vac", "process_refund")},
    "referentials.avatar": {SA: ("vac",), SU: ("v",)},
    "referentials.country": {SA: ("vac",), SU: ("v",)},
    "referentials.disability": {SA: ("vac",), SU: ("v",)},
    "referentials.goal": {SA: ("vac",), SU: ("v",)},
    "referentials.locality": {SA: ("vac",), SU: ("v",)},
    "referentials.paymentnetwork": {SA: ("vac",), SU: ("v",), FI: ("v",)},
    "referentials.refusalreason": {SA: ("vac",), SU: ("v",)},
    "referentials.relationship": {SA: ("vac",), SU: ("v",)},
    "referentials.schoolgrade": {SA: ("vac",), SU: ("v",)},
    "shop.deliveryzone": {SA: ("vacd",), CO: ("vacd",), SU: ("v",), FI: ("v",)},
    "shop.kit": {SA: ("vacd",), CO: ("vacd",), SU: ("v",), FI: ("v",)},
    "shop.restockalert": {SA: ("v",), SU: ("v",), FI: ("v",)},
}


def granted(group: str) -> set[tuple[str, str, str]]:
    return set(
        Group.objects.get(name=group).permissions.values_list(
            "content_type__app_label", "content_type__model", "codename"
        )
    )


def existing(triples) -> set[tuple[str, str, str]]:
    all_permissions = set(
        Permission.objects.values_list("content_type__app_label", "content_type__model", "codename")
    )
    return triples & all_permissions


def test_the_matrix_is_frozen():
    assert PERMISSIONS == FROZEN


def test_codenames_expand_the_letters_then_the_custom_permissions():
    assert codenames("accounts.user", ("vc", "resend")) == ["view_user", "change_user", "resend"]


@pytest.mark.parametrize("group", STAFF_GROUPS)
def test_migrate_gives_each_group_exactly_the_existing_permissions_of_the_matrix(group):
    expected = existing(expected_permissions()[group])
    assert granted(group) == expected


def test_the_matrix_already_covers_models_of_this_step():
    assert ("core", "auditlog", "view_auditlog") in granted(SUPER_ADMIN)
    assert ("otp_totp", "totpdevice", "delete_totpdevice") in granted(SUPER_ADMIN)
    assert ("accounts", "user", "change_user") in granted(SUPPORT)
    assert ("payments", "refund", "add_refund") in granted(FINANCE)
    assert not {p for p in granted(CONTENT) if p[0] in {"payments", "accounts", "core"}}
    assert not {p for p in granted(FINANCE) if p[0] == "accounts" and p[2] != f"view_{p[1]}"}
    # Personne n'écrit dans le journal ni dans la télémétrie, Super-admin compris
    for group in STAFF_GROUPS:
        assert not {
            p
            for p in granted(group)
            if p[1] in {"auditlog", "trackingevent"} and p[2][:4] != "view"
        }


def test_setup_is_idempotent_and_removes_permissions_added_by_hand():
    support = Group.objects.get(name=SUPPORT)
    support.permissions.add(Permission.objects.get(codename="view_auditlog"))
    before = {group: granted(group) for group in STAFF_GROUPS}
    setup_staff_groups()
    setup_staff_groups()
    assert ("core", "auditlog", "view_auditlog") not in granted(SUPPORT)
    assert granted(SUPER_ADMIN) == before[SUPER_ADMIN]


def test_setup_recreates_a_deleted_group():
    Group.objects.filter(name=FINANCE).delete()
    setup_staff_groups()
    assert granted(FINANCE) == existing(expected_permissions()[FINANCE])


def test_the_management_command_reports_the_permissions_per_group():
    out = io.StringIO()
    call_command("setup_staff_groups", stdout=out)
    lines = out.getvalue().splitlines()
    assert [line.split(" : ")[0] for line in lines] == list(STAFF_GROUPS)
    assert lines[0] == f"{SUPER_ADMIN} : {len(granted(SUPER_ADMIN))} permissions"
