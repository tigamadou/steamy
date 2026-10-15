"""Invariants du modèle `User` tenus par la base (ADR 0001, SPEC-TECHNIQUE §3.1)."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.accounts.models import User
from apps.accounts.tests.factories import (
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)
from apps.accounts.validators import validate_username

pytestmark = pytest.mark.django_db


def refused(**fields):
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.create(**fields)


# --- Format de l'identifiant (C7) -------------------------------------------------------------


@pytest.mark.parametrize(
    "username", ["12345678", "97.00.00", "01-97-00", "lea@steamy", "+229lea", "ab"]
)
def test_username_that_would_be_read_as_phone_or_email_is_refused(username):
    with pytest.raises(ValidationError):
        validate_username(username)
    refused(role="learner", username=username)


@pytest.mark.parametrize("username", ["lea", "Lea.Adjovi", "lea_2014", "zeti-bot"])
def test_valid_usernames_are_accepted(username):
    validate_username(username)
    assert LearnerFactory(username=username).pk


# --- Unicités conditionnelles, insensibles à la casse ---------------------------------------


def test_username_is_unique_case_insensitively():
    LearnerFactory(username="LeaAdjovi")
    refused(role="learner", username="leaadjovi")


def test_email_is_unique_case_insensitively_and_stored_lowercase():
    teacher = TeacherFactory(email="Prof.Kossi@Ecole.BJ")
    assert teacher.email == "prof.kossi@ecole.bj"
    refused(role="teacher", email="PROF.KOSSI@ecole.bj")


def test_phone_is_unique_and_normalized_to_e164():
    parent = ParentFactory(phone="01 97 00 00 01")
    assert parent.phone == "+2290197000001"
    refused(role="parent", phone="+2290197000001")


def test_missing_identifiers_do_not_collide():
    # Identifiants nuls : plusieurs apprenants sans email ni téléphone coexistent.
    LearnerFactory.create_batch(3)
    assert User.objects.filter(email__isnull=True, phone__isnull=True).count() == 3


# --- Identifiant propre au rôle, rôle nul ⇔ personnel (S4, D71) ------------------------------


def test_each_role_requires_its_identifier():
    refused(role="learner", email="sans-identifiant@example.com")
    refused(role="parent", username="parent-sans-tel")
    refused(role="teacher", phone="+2290197000002")


def test_role_is_null_for_staff_only():
    refused(role=None, email="anonyme@example.com")  # ni rôle ni personnel
    refused(role="teacher", email="prof@example.com", is_staff=True)  # personnel avec un rôle
    refused(role=None, is_staff=True)  # personnel sans email
    staff = StaffFactory()
    assert staff.role is None and staff.is_staff


def test_admin_role_no_longer_exists():
    assert "admin" not in User.Role.values
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.create(role="admin", email="admin@example.com", is_staff=False)


def test_invalid_phone_is_refused():
    refused(role="parent", phone="12")


# --- Statut et is_active dérivé -------------------------------------------------------------


@pytest.mark.parametrize(
    "status,active",
    [
        ("pending", True),
        ("active", True),
        ("suspended", False),
        ("deactivated", False),
        ("anonymized", False),
    ],
)
def test_is_active_is_derived_from_status(status, active):
    user = LearnerFactory(status=status)
    assert user.is_active is active

    other = LearnerFactory()
    other.status = status
    other.save(update_fields=["status"])
    other.refresh_from_db()
    assert other.is_active is active


def test_is_active_cannot_contradict_status_in_database():
    user = LearnerFactory()
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.filter(pk=user.pk).update(status="suspended")


# --- Gestionnaire ---------------------------------------------------------------------------


def test_createsuperuser_creates_staff_without_role():
    admin = User.objects.create_superuser(email="Admin@Steamy.test", password="Motdepasse1")
    assert (admin.role, admin.is_staff, admin.is_superuser) == (None, True, True)
    assert admin.email == "admin@steamy.test"
    assert User.objects.get_by_natural_key("ADMIN@steamy.test") == admin


def test_persona_creation_helpers_set_the_role():
    assert User.objects.create_learner("lea2014").role == "learner"
    assert User.objects.create_parent("+2290197000003").role == "parent"
    assert User.objects.create_teacher("t@ecole.bj").role == "teacher"
    assert not User.objects.get(username="lea2014").has_usable_password()


def test_profiles_are_created_by_factories():
    assert LearnerFactory().learner_profile.points == 0
    assert ParentFactory().parent_profile.pk
    assert TeacherFactory().teacher_profile.pk
