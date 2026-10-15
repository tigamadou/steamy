"""
`/api/backoffice/` (§7.8, WAD01-WAD03) : session du personnel vérifiée par TOTP sur chaque route (D72), KPI réservés
à Finance et Super-admin, « À traiter » filtré par groupe, valeurs et statuts calculés par le serveur.
"""

import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import ConsentRequest
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, StaffFactory
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.core.tests.staff import staff_member, verified_client
from apps.impact.models import ImpactReport, KpiDefinition, KpiValue
from apps.impact.periods import MONTH, QUARTER, YEAR, Period
from apps.referentials.models import Relationship

pytestmark = pytest.mark.django_db

OVERVIEW = "/api/backoffice/overview/"
KPIS = "/api/backoffice/kpis/"


def store(code, period, number=None, text=""):
    return KpiValue.objects.update_or_create(
        kpi=KpiDefinition.objects.get(code=code),
        period=period.key,
        defaults={"number": number, "text": text},
    )[0]


def pending_consent():
    return ConsentRequest.objects.create(
        origin="learner",
        subject={"first_name": "Kofi"},
        learner=LearnerFactory(status="pending"),
        parent_phone="+2290197000222",
        relationship=Relationship.objects.first(),
        expires_at=timezone.now() + datetime.timedelta(days=7),
    )


# --- Accès (D72) -------------------------------------------------------------------------------------------


@pytest.mark.parametrize("url", [OVERVIEW, KPIS, f"{KPIS}nu/"])
def test_anonymous_persona_and_unverified_staff_are_refused(client, url):
    assert APIClient().get(url).status_code in (401, 403)
    persona = APIClient()
    persona.force_authenticate(ParentFactory())
    assert persona.get(url).json()["code"] == "PERMISSION_DENIED"
    staff = APIClient()
    staff.force_authenticate(staff_member(SUPER_ADMIN))
    response = staff.get(url)
    assert (response.status_code, response.json()["code"]) == (403, "OTP_REQUIRED")


@pytest.mark.parametrize(
    ("group", "overview", "kpis"),
    [(CONTENT, 200, 403), (SUPPORT, 200, 403), (FINANCE, 200, 200), (SUPER_ADMIN, 200, 200)],
)
def test_access_by_group(client, group, overview, kpis):
    verified_client(client, group)
    assert client.get(OVERVIEW).status_code == overview
    assert client.get(KPIS).status_code == kpis
    assert client.get(f"{KPIS}nu/").status_code == kpis


def test_a_superuser_without_group_reads_everything(client):
    verified_client(client, None, is_superuser=True)
    pending_consent()
    assert client.get(KPIS).status_code == 200
    assert client.get(OVERVIEW).json()["todo"][0]["count"] == 1


# --- WAD01 -------------------------------------------------------------------------------------------------


def test_overview_todo_is_filtered_by_group(client):
    pending_consent()
    expired = pending_consent()
    ConsentRequest.objects.filter(pk=expired.pk).update(
        expires_at=timezone.now() - datetime.timedelta(minutes=1)
    )
    verified_client(client, SUPPORT)
    todo = client.get(OVERVIEW).json()["todo"]
    assert todo == [
        {
            "kind": "consents_pending",
            "label": "Consentements en attente",
            "count": 1,
            "adminPath": "/admin/accounts/consentrequest/?status__exact=pending",
        }
    ]
    client.logout()
    verified_client(client, FINANCE)
    assert client.get(OVERVIEW).json()["todo"] == []


def test_overview_counts_highlight_and_report_deadline(client):
    verified_client(client, CONTENT)
    LearnerFactory(last_login=timezone.now())
    LearnerFactory(last_login=timezone.now() - datetime.timedelta(days=40))
    ParentFactory()
    LearnerFactory(status="pending")
    StaffFactory()
    month, quarter = Period.current(MONTH), Period.current(QUARTER)
    store("na", month, 150)
    store("nps", quarter, 9)
    store("fin_who", quarter, text="OIF")
    data = client.get(OVERVIEW).json()
    assert data["stats"] == {
        "users": 3,
        "activeLearners": 1,
        "salesMonth": None,
        "completionRate": None,
    }
    assert data["highlight"] == {
        "code": "na",
        "label": "Nouveaux apprenants",
        "value": 150,
        "target": 200,
        "status": {"status": "below", "tone": "amber", "label": "En dessous"},
    }
    assert data["period"]["key"] == month.key
    assert data["report"] == {
        "period": quarter.key,
        "label": quarter.label,
        "dueDate": str(quarter.end + datetime.timedelta(days=15)),
        "status": "draft",
        "entered": 2,
        "total": 11,
    }
    ImpactReport.objects.create(period=quarter.key, status="submitted")
    assert client.get(OVERVIEW).json()["report"]["status"] == "submitted"


# --- WAD02 -------------------------------------------------------------------------------------------------


def test_kpis_by_group_with_values_statuses_and_series(client):
    verified_client(client, FINANCE)
    month = Period.current(MONTH)
    store("nu", month, 220)
    store("nu", month.previous(), 195)
    store("fin_hors", month.quarter(), text="oui")
    data = client.get(KPIS).json()
    assert data["period"]["key"] == month.key
    assert [g["code"] for g in data["groups"]] == [c for c, _ in KpiDefinition.Group.choices]
    assert sum(len(g["kpis"]) for g in data["groups"]) == 30
    kpis = {k["code"]: k for g in data["groups"] for k in g["kpis"]}
    nu = kpis["nu"]
    assert (nu["value"], nu["target"], nu["status"]["status"]) == (220, 200, "achieved")
    assert [p["value"] for p in nu["series"]][-2:] == [195, 220]
    assert len(nu["series"]) == 5 and nu["series"][-1]["period"] == month.key
    assert kpis["nu_f"]["baseCode"] == "nu" and kpis["nu_f"]["status"]["label"] == "En attente"
    assert kpis["fin_hors"]["value"] is True  # saisi au trimestre, lu au mois
    assert kpis["fin_hors"]["status"]["label"] == "Renseignée"
    assert kpis["ventes"]["value"] is None and kpis["ventes"]["unit"] == "fcfa"


def test_year_view_reads_the_latest_filled_quarter(client):
    verified_client(client, FINANCE)
    year = Period.current(YEAR)
    first = Period.containing(QUARTER, year.start)
    store("emp", first, 3)
    store("fin_who", first, text="")  # vide : ignoré
    store("nps", first, 7.5)
    data = client.get(f"{KPIS}?period=year").json()
    kpis = {k["code"]: k for g in data["groups"] for k in g["kpis"]}
    assert data["period"]["key"] == year.key
    assert kpis["emp"]["value"] == 3 and kpis["fin_who"]["value"] is None
    assert kpis["nps"]["value"] == 7.5 and kpis["nps"]["status"]["status"] == "below"


def test_an_unknown_period_is_a_validation_error(client):
    verified_client(client, FINANCE)
    response = client.get(f"{KPIS}?period=semaine")
    assert (response.status_code, response.json()["code"]) == (400, "VALIDATION_ERROR")


# --- WAD03 -------------------------------------------------------------------------------------------------


def test_kpi_detail_with_definition_history_and_composition(client):
    verified_client(client, FINANCE)
    quarter = Period.current(QUARTER)
    store("nu", quarter, 450)
    store("nu", quarter.previous(), 100)
    store("nu_f", quarter, 200)
    data = client.get(f"{KPIS}nu/?period=quarter").json()
    assert data["value"] == 450 and data["attainment"] == 225
    assert data["periodicity"] == "month" and "inscrits dans la période" in data["calculation"]
    assert data["period"]["key"] == quarter.key and data["baseline"] is None
    assert len(data["history"]) == 8
    assert data["history"][0]["period"] == quarter.key  # du plus récent au plus ancien
    assert data["history"][1]["status"]["status"] == "off_target"
    assert data["composition"][:2] == [
        {"code": "nu_35", "label": "≤ 35 ans", "value": None},
        {"code": "nu_f", "label": "Femmes", "value": 200},
    ]


def test_kpi_detail_of_a_text_kpi_and_an_unknown_code(client):
    verified_client(client, FINANCE)
    assert client.get(f"{KPIS}fin_who/").json()["attainment"] is None
    response = client.get(f"{KPIS}inconnu/")
    assert (response.status_code, response.json()["code"]) == (404, "NOT_FOUND")


def test_decimal_target_and_baseline_are_numbers(client):
    verified_client(client, FINANCE)
    KpiDefinition.objects.filter(code="nps").update(target=7.5, baseline=6)
    data = client.get(f"{KPIS}nps/").json()
    assert (data["target"], data["baseline"]) == (7.5, 6)
