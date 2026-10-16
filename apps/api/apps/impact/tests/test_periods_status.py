"""Périodes (bornes, clés, libellés) et table de vérité de `kpiStatus` (D73, §4.5)."""

import datetime

import pytest

from apps.impact.periods import MONTH, QUARTER, YEAR, Period
from apps.impact.status import (
    ACHIEVED,
    BELOW,
    FILLED,
    OFF_TARGET,
    PENDING,
    UNAVAILABLE,
    kpi_status,
)

D = datetime.date


@pytest.mark.parametrize(
    ("kind", "day", "start", "end", "key", "label"),
    [
        (MONTH, D(2026, 2, 14), D(2026, 2, 1), D(2026, 2, 28), "2026-02", "Février 2026"),
        (MONTH, D(2026, 12, 31), D(2026, 12, 1), D(2026, 12, 31), "2026-12", "Décembre 2026"),
        (QUARTER, D(2026, 5, 3), D(2026, 4, 1), D(2026, 6, 30), "2026-t2", "T2 2026"),
        (QUARTER, D(2026, 11, 3), D(2026, 10, 1), D(2026, 12, 31), "2026-t4", "T4 2026"),
        (YEAR, D(2026, 7, 1), D(2026, 1, 1), D(2026, 12, 31), "2026", "2026"),
    ],
)
def test_period_bounds_keys_and_labels(kind, day, start, end, key, label):
    period = Period.containing(kind, day)
    assert (period.start, period.end, period.key, period.label) == (start, end, key, label)
    assert Period.parse(key) == period


@pytest.mark.parametrize("key", ["2026-13", "2026-00", "2026-t5", "t1-2026", "", None, "abc"])
def test_unknown_period_keys_are_refused(key):
    with pytest.raises(ValueError):
        Period.parse(key)


def test_previous_history_months_and_quarter():
    january = Period.parse("2026-01")
    assert january.previous().key == "2025-12"
    assert [p.key for p in january.history(3)] == ["2025-11", "2025-12", "2026-01"]
    assert [p.key for p in Period.parse("2026-t1").months()] == ["2026-01", "2026-02", "2026-03"]
    assert january.quarter().key == "2026-t1"
    assert Period.parse("2026-t1").previous().key == "2025-t4"


def test_bounds_follow_the_platform_timezone():
    start, end = Period.parse("2026-03").bounds()
    assert (start.date(), end.date()) == (D(2026, 3, 1), D(2026, 4, 1))
    assert start.utcoffset() == datetime.timedelta(hours=1)  # Africa/Porto-Novo (C16)


def test_current_uses_the_local_date():
    assert Period.current(YEAR).start.month == 1


@pytest.mark.parametrize(
    ("source", "value", "target", "expected"),
    [
        ("unavailable", 12, 10, UNAVAILABLE),
        ("manual", None, 10, PENDING),
        ("auto", None, None, PENDING),
        ("manual", "", None, PENDING),
        ("auto", 12, None, FILLED),
        ("manual", "OIF", 10, FILLED),
        ("manual", True, None, FILLED),
        ("auto", 69, 100, OFF_TARGET),
        ("auto", 70, 100, BELOW),
        ("auto", 99.9, 100, BELOW),
        ("auto", 100, 100, ACHIEVED),
        ("manual", 10, 8, ACHIEVED),
        ("auto", 0, 0, ACHIEVED),
        ("auto", -1, 0, OFF_TARGET),
    ],
)
def test_kpi_status_truth_table(source, value, target, expected):
    assert kpi_status(source, value, target) == expected
