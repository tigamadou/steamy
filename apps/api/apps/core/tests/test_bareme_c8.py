"""Barème de points et paliers de rang standard (C8, arbitré le 2026-10-19)."""

from importlib import import_module

import pytest
from django.apps import apps as registry

from apps.accounts.tests.factories import LearnerFactory
from apps.core.models import (
    DEFAULT_POINTS_SCALE,
    DEFAULT_RANK_THRESHOLDS,
    PlatformSettings,
    default_points_scale,
    default_rank_thresholds,
)
from apps.learning import gamification

pytestmark = pytest.mark.django_db

migration = import_module("apps.core.migrations.0005_bareme_c8")


def test_migration_freezes_the_standard_scale():
    assert migration.POINTS_SCALE == DEFAULT_POINTS_SCALE
    assert migration.RANK_THRESHOLDS == DEFAULT_RANK_THRESHOLDS


def test_defaults_are_fresh_copies():
    default_points_scale()["mission"] = 0
    default_rank_thresholds()[0]["points"] = 5
    assert DEFAULT_POINTS_SCALE["mission"] == 10
    assert DEFAULT_RANK_THRESHOLDS[0]["points"] == 0


def test_migration_fills_an_empty_scale_and_is_idempotent():
    settings_ = PlatformSettings.load()
    settings_.points_scale, settings_.rank_thresholds = {}, []
    settings_.save()
    for _ in range(2):
        migration.fill_if_empty(registry, None)
        settings_.refresh_from_db()
        assert settings_.points_scale == DEFAULT_POINTS_SCALE
        assert settings_.rank_thresholds == DEFAULT_RANK_THRESHOLDS


def test_migration_keeps_a_scale_set_by_staff():
    settings_ = PlatformSettings.load()
    settings_.points_scale = {"mission": 1}
    settings_.rank_thresholds = [{"rank": "Novice", "points": 0}]
    settings_.save()
    migration.fill_if_empty(registry, None)
    settings_.refresh_from_db()
    assert settings_.points_scale == {"mission": 1}
    assert settings_.rank_thresholds == [{"rank": "Novice", "points": 0}]


def test_migration_fills_only_the_empty_field():
    settings_ = PlatformSettings.load()
    settings_.points_scale, settings_.rank_thresholds = {"mission": 1}, []
    settings_.save()
    migration.fill_if_empty(registry, None)
    settings_.refresh_from_db()
    assert settings_.points_scale == {"mission": 1}
    assert settings_.rank_thresholds == DEFAULT_RANK_THRESHOLDS


@pytest.mark.parametrize(
    "points, expected",
    [
        (0, ("Explorateur", 0, "Apprenti", 100)),
        (99, ("Explorateur", 0, "Apprenti", 100)),
        (100, ("Apprenti", 100, "Bâtisseur", 300)),
        (1500, ("Ingénieur", 1500, None, None)),
    ],
)
def test_standard_rank_at_the_bounds(points, expected):
    rank = gamification.rank_for(points)
    assert (rank["label"], rank["min_points"], rank["next_label"], rank["next_at"]) == expected


@pytest.mark.parametrize(
    "source, amount",
    [("mission", 10), ("formative", 20), ("summative", 50), ("course", 100)],
)
def test_standard_points_per_event(source, amount):
    learner = LearnerFactory()
    assert gamification.points_enabled()
    assert gamification.award_points(learner, source, f"{source}:1", "test") == amount
    # Un événement ne rapporte qu'une fois
    assert gamification.award_points(learner, source, f"{source}:1", "test") == 0
    assert gamification.points_of(learner) == amount
