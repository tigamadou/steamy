"""Résolution « Identifiant ou numéro » (C7) et refus selon le statut (ADR 0001)."""

import pytest
from django.contrib.auth import authenticate

from apps.accounts.tests.factories import (
    PASSWORD,
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)
from libs.errors import ApiError

pytestmark = pytest.mark.django_db


@pytest.fixture
def personas():
    return {
        "learner": LearnerFactory(username="LeaAdjovi"),
        "parent": ParentFactory(phone="+2290197000010"),
        "teacher": TeacherFactory(email="prof@ecole.bj"),
    }


@pytest.mark.parametrize(
    "identifier,persona",
    [
        ("LeaAdjovi", "learner"),
        ("leaadjovi", "learner"),  # insensible à la casse
        (" LEAADJOVI ", "learner"),
        ("+2290197000010", "parent"),
        ("0197000010", "parent"),  # sans indicatif : Bénin par défaut
        ("01 97 00 00 10", "parent"),
        ("00229 01 97 00 00 10", "parent"),
        ("prof@ecole.bj", "teacher"),
        ("PROF@Ecole.BJ", "teacher"),
    ],
)
def test_identifier_resolves_each_persona(personas, identifier, persona):
    assert authenticate(identifier=identifier, password=PASSWORD) == personas[persona]


def test_wrong_password_or_unknown_identifier_is_refused(personas):
    assert authenticate(identifier="LeaAdjovi", password="mauvais") is None
    assert authenticate(identifier="inconnu", password=PASSWORD) is None
    assert authenticate(identifier="+2290100000000", password=PASSWORD) is None
    assert authenticate(identifier="12", password=PASSWORD) is None  # numéro invalide


def test_staff_is_refused_on_the_persona_login():
    staff = StaffFactory(email="admin@steamy.test")
    assert authenticate(identifier="admin@steamy.test", password=PASSWORD) is None
    # …mais se connecte à l'admin Django (WAD15)
    assert authenticate(username="admin@steamy.test", password=PASSWORD) == staff


def test_personas_cannot_log_into_the_django_admin(personas):
    assert authenticate(username="prof@ecole.bj", password=PASSWORD) is None


@pytest.mark.parametrize(
    "status,code",
    [
        ("pending", "ACCOUNT_PENDING_CONSENT"),
        ("suspended", "ACCOUNT_SUSPENDED"),
        ("deactivated", "ACCOUNT_DEACTIVATED"),
    ],
)
def test_status_is_revealed_only_with_the_right_password(status, code):
    LearnerFactory(username="bloque", status=status)
    assert authenticate(identifier="bloque", password="mauvais") is None
    with pytest.raises(ApiError) as error:
        authenticate(identifier="bloque", password=PASSWORD)
    assert error.value.default_code == code


def test_anonymized_account_is_like_an_unknown_identifier():
    LearnerFactory(username="efface", status="anonymized")
    assert authenticate(identifier="efface", password=PASSWORD) is None


def test_unknown_identifier_still_hashes_a_password(mocker):
    # Temps constant : un hachage a lieu même quand l'identifiant n'existe pas.
    spy = mocker.patch("apps.accounts.backends.User.set_password")
    authenticate(identifier="personne", password="x")
    spy.assert_called_once_with("x")


def test_empty_identifier_is_refused():
    assert authenticate(identifier="   ", password=PASSWORD) is None


def test_staff_backend_refuses_a_wrong_password_and_missing_credentials():
    from apps.accounts.backends import StaffBackend

    StaffFactory(email="admin@steamy.test")
    assert authenticate(username="admin@steamy.test", password="mauvais") is None
    assert StaffBackend().authenticate(None, username=None, password=PASSWORD) is None


def test_each_backend_restores_only_its_own_users():
    from apps.accounts.backends import IdentifierBackend, StaffBackend

    staff, learner = StaffFactory(), LearnerFactory()
    assert StaffBackend().get_user(staff.pk) == staff
    assert StaffBackend().get_user(learner.pk) is None
    assert IdentifierBackend().get_user(learner.pk) == learner
    assert IdentifierBackend().get_user(staff.pk) is None
