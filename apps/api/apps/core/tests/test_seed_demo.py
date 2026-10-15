"""Jeu de démonstration (D2, API-1.7) : idempotent, refusé en production, comptes utilisables."""

import pytest
from django.contrib.auth import authenticate
from django.core.management import CommandError, call_command
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.models import LearnerProfile, User
from apps.accounts.profile import profile_step
from apps.core.demo import DEMO_PASSWORD, DEMO_TOTP_KEY
from apps.core.groups import STAFF_GROUPS
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


def counts():
    return (
        User.objects.count(),
        LearnerProfile.objects.count(),
        TOTPDevice.objects.count(),
        Notification.objects.count(),
    )


def test_seed_demo_twice_creates_no_duplicate():
    call_command("seed_demo")
    first = counts()
    call_command("seed_demo")
    assert counts() == first
    assert first[0] == 7  # Léa, Marie, Koffi et un membre du personnel par groupe


def test_seed_demo_is_refused_in_production(settings):
    settings.ENV = settings.PRODUCTION
    with pytest.raises(CommandError):
        call_command("seed_demo")
    assert not User.objects.exists()


def test_personas_log_in_with_the_documented_password():
    call_command("seed_demo")
    lea = authenticate(identifier="lea.adjovi", password=DEMO_PASSWORD)
    assert lea.get_full_name() == "Léa Adjovi"
    assert lea.learner_profile.school_grade.label == "4ᵉ"
    assert lea.learner_profile.locality.city == "Cotonou"
    assert profile_step(lea) is None  # profil complet
    assert authenticate(identifier="0190000001", password=DEMO_PASSWORD).first_name == "Marie"
    assert authenticate(identifier="koffi.adekambi@steamy.test", password=DEMO_PASSWORD).is_teacher


def test_one_staff_member_per_group_with_a_fixed_totp_secret():
    call_command("seed_demo")
    staff = User.objects.filter(is_staff=True)
    assert sorted(staff.values_list("groups__name", flat=True)) == sorted(STAFF_GROUPS)
    assert staff.get(groups__name="Super-admin").is_superuser
    for member in staff:
        device = TOTPDevice.objects.get(user=member)
        assert device.confirmed and device.key == DEMO_TOTP_KEY
        assert authenticate(username=member.email, password=DEMO_PASSWORD) == member


def test_seed_demo_keeps_data_edited_by_hand_consistent():
    call_command("seed_demo")
    User.objects.filter(username="lea.adjovi").update(first_name="Autre")
    call_command("seed_demo")
    assert User.objects.get(username="lea.adjovi").first_name == "Léa"


def test_catalog_has_published_courses_a_featured_one_a_draft_and_an_empty_category():
    from apps.catalog.models import Category, Course, Mission

    call_command("seed_demo")
    call_command("seed_demo")
    published = Course.objects.filter(status=Course.Status.PUBLISHED)
    assert published.count() == 4
    assert published.filter(featured=True).count() == 1
    assert published.filter(is_free=False).exists() and published.filter(is_free=True).exists()
    assert Course.objects.filter(status=Course.Status.DRAFT).exists()
    assert all(
        course.projects.filter(levels__missions__isnull=False).exists() for course in published
    )
    assert Category.objects.filter(courses__isnull=True).exists()
    for mission in Mission.objects.all():
        mission.full_clean()  # blocs valides
