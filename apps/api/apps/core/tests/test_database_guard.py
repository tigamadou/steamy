"""Garde-fou de la base de test (conftest.py) : aucun test ne tourne sur une base qui n'est pas celle du contexte."""

import importlib.util
import os
from pathlib import Path

import pytest
from django.db import connection

# `import conftest` résout vers le conftest.py voisin (apps/core/tests) : on charge celui de la racine par son chemin
_spec = importlib.util.spec_from_file_location(
    "conftest_racine", Path(__file__).parents[3] / "conftest.py"
)
conftest_racine = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(conftest_racine)
check_test_database_name = conftest_racine.check_test_database_name
pytest_configure = conftest_racine.pytest_configure
default_xdist_workers = conftest_racine.default_xdist_workers
pytest_xdist_auto_num_workers = conftest_racine.pytest_xdist_auto_num_workers


def use_database(settings, monkeypatch, **overrides):
    """Remplace la base par défaut le temps du test (`monkeypatch` restaure l'entrée du dictionnaire)."""
    default = {k: v for k, v in settings.DATABASES["default"].items() if k != "TEST"}
    monkeypatch.setitem(settings.DATABASES, "default", {**default, **overrides})


@pytest.mark.parametrize(
    ("name", "agent_lot", "worker"),
    [
        ("test_steamy", None, None),
        ("test_steamy_gw0", None, "gw0"),
        ("test_steamy_lot2", "lot2", None),
        ("test_steamy_lot2_gw3", "lot2", "gw3"),
    ],
)
def test_expected_names_are_accepted(name, agent_lot, worker):
    assert check_test_database_name(name, agent_lot, worker) is None


@pytest.mark.parametrize(
    ("name", "agent_lot", "worker"),
    [
        ("steamy", None, None),
        ("test_steamy_lot2", None, None),
        ("test_steamy", "lot2", None),
        ("test_steamy_lot3_gw0", "lot2", "gw0"),
        ("test_steamy_lot2_gw1", "lot2", "gw0"),
        ("test_steamy_lot2", "", None),
        ("test_steamy", "", None),
        ("test_steamy_lot2x", "lot2", None),
        ("test_steamy_gw0", None, None),
        ("test_django", None, None),
        ("django", None, None),
    ],
)
def test_unexpected_names_are_refused(name, agent_lot, worker):
    message = check_test_database_name(name, agent_lot, worker)

    assert message is not None
    assert message.startswith("Tests refusés")


def test_message_names_received_expected_and_agent_lot():
    message = check_test_database_name("steamy_dev_autre", "lot2", "gw1")

    assert "steamy_dev_autre" in message
    assert "test_steamy_lot2_gw1" in message
    assert "AGENT_LOT" in message


def test_empty_agent_lot_is_refused_even_for_the_unsuffixed_name():
    assert "AGENT_LOT" in check_test_database_name("test_steamy", "", None)


def test_hook_refuses_a_database_that_is_not_the_agent_one(settings, monkeypatch):
    monkeypatch.setenv("AGENT_LOT", "lot2")
    use_database(settings, monkeypatch, NAME="steamy_dev_autre")

    with pytest.raises(pytest.UsageError, match="steamy_dev_autre"):
        pytest_configure(config=None)


def test_hook_accepts_the_agent_database(settings, monkeypatch):
    monkeypatch.setenv("AGENT_LOT", "lot2")
    use_database(settings, monkeypatch, NAME="steamy_lot2")

    pytest_configure(config=None)


def test_hook_accepts_the_main_stack_database(settings, monkeypatch):
    monkeypatch.delenv("AGENT_LOT", raising=False)
    use_database(settings, monkeypatch, NAME="steamy")

    pytest_configure(config=None)


def test_hook_uses_the_explicit_test_name_when_there_is_one(settings, monkeypatch):
    monkeypatch.delenv("AGENT_LOT", raising=False)
    use_database(settings, monkeypatch, NAME="steamy", TEST={"NAME": "test_autre"})

    with pytest.raises(pytest.UsageError, match="test_autre"):
        pytest_configure(config=None)


@pytest.mark.django_db
def test_the_running_test_database_is_the_expected_one():
    error = check_test_database_name(
        connection.settings_dict["NAME"],
        os.environ.get("AGENT_LOT"),
        os.environ.get("PYTEST_XDIST_WORKER"),
    )

    assert error is None


@pytest.mark.parametrize(
    ("agent_lot", "cpu_count", "expected"),
    [("lot2", 10, 2), (None, 10, 4), (None, 2, 2), (None, None, 4), ("", 10, 4)],
)
def test_default_xdist_workers(agent_lot, cpu_count, expected):
    assert default_xdist_workers(agent_lot, cpu_count) == expected


def test_auto_num_workers_hook_reads_the_environment(monkeypatch):
    monkeypatch.setenv("AGENT_LOT", "lot2")
    assert pytest_xdist_auto_num_workers(config=None) == 2

    monkeypatch.delenv("AGENT_LOT")
    assert 1 <= pytest_xdist_auto_num_workers(config=None) <= 4
