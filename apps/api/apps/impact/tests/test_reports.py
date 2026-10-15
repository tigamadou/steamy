"""
Rapport trimestriel (WAD04-WAD05, D74) : plages calculées par le serveur, saisie typée des KPI manuels, soumission
idempotente qui verrouille (`REPORT_LOCKED`) et fige le rapport. Chaque permission testée, autorisée et refusée.
"""

import pytest
from django.contrib.auth.models import Group, Permission
from rest_framework.test import APIClient

from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import staff_member, verified_client
from apps.impact.models import ImpactReport, KpiDefinition, KpiValue

pytestmark = pytest.mark.django_db

PERIOD = "2026-t1"
REPORT = f"/api/backoffice/impact-reports/{PERIOD}/"
VALUES = f"{REPORT}values/"
SUBMIT = f"{REPORT}submit/"


def patch(client, *entries):
    return client.patch(VALUES, {"values": list(entries)}, content_type="application/json")


def rows(response):
    return {row["code"]: row for row in response.json()["rows"]}


def store(code, period, number):
    KpiValue.objects.update_or_create(
        kpi=KpiDefinition.objects.get(code=code), period=period, defaults={"number": number}
    )


# --- Accès -----------------------------------------------------------------------------------------------


@pytest.mark.parametrize("group", [CONTENT, SUPPORT])
def test_only_finance_and_super_admin_reach_the_report(client, group):
    verified_client(client, group)
    assert client.get(REPORT).status_code == 403
    assert patch(client, {"code": "nps", "value": 9}).status_code == 403
    assert client.post(SUBMIT).status_code == 403
    assert not ImpactReport.objects.exists()


def test_unverified_staff_gets_otp_required():
    api = APIClient()
    api.force_authenticate(staff_member(FINANCE))
    assert api.get(REPORT).json()["code"] == "OTP_REQUIRED"


@pytest.mark.parametrize("group", [FINANCE, SUPER_ADMIN])
def test_finance_and_super_admin_read_enter_and_submit(client, group):
    verified_client(client, group)
    assert client.get(REPORT).status_code == 200
    assert patch(client, {"code": "nps", "value": 9}).status_code == 200
    assert client.post(SUBMIT).status_code == 200


@pytest.mark.parametrize(
    ("codename", "request_"),
    [
        ("enter_kpi_value", lambda c: patch(c, {"code": "nps", "value": 9})),
        ("submit_impact_report", lambda c: c.post(SUBMIT)),
    ],
)
def test_each_custom_permission_is_required(client, codename, request_):
    verified_client(client, FINANCE)
    Group.objects.get(name=FINANCE).permissions.remove(Permission.objects.get(codename=codename))
    response = request_(client)
    assert (response.status_code, response.json()["code"]) == (403, "PERMISSION_DENIED")
    assert client.get(REPORT).status_code == 200  # la lecture reste ouverte


@pytest.mark.parametrize("key", ["2026-01", "2026", "2026-t9", "trimestre"])
def test_only_quarters_are_reports(client, key):
    verified_client(client, FINANCE)
    response = client.get(f"/api/backoffice/impact-reports/{key}/")
    assert (response.status_code, response.json()["code"]) == (404, "NOT_FOUND")


# --- WAD04 : lignes ------------------------------------------------------------------------------------


def test_rows_ranges_values_and_completeness(client):
    verified_client(client, FINANCE)
    store("nu", "2026-03", 220)  # acquisition : dernier mois du trimestre
    store("nu", "2026-t1", 999)
    store("complete", "2026-t1", 12)  # pédagogie : trimestre
    data = client.get(REPORT).json()
    assert (data["label"], data["status"], data["dueDate"]) == ("T1 2026", "draft", "2026-04-15")
    assert (data["entered"], data["total"], data["submittedBy"]) == (0, 11, None)
    lines = rows(client.get(REPORT))
    assert len(lines) == 30
    assert (lines["nu"]["start"], lines["nu"]["end"], lines["nu"]["value"]) == (
        "2026-03-01",
        "2026-03-31",
        220,
    )
    assert lines["nu"]["status"]["label"] == "Atteinte"
    assert (lines["complete"]["start"], lines["complete"]["value"]) == ("2026-01-01", 12)
    assert (lines["nps"]["start"], lines["nps"]["end"]) == ("2026-01-01", "2026-03-31")
    assert lines["nps"]["status"]["label"] == "En attente"


# --- WAD05 : saisie ---------------------------------------------------------------------------------------


def test_typed_entry_with_note_and_clearing(client):
    staff = verified_client(client, FINANCE)
    response = patch(
        client,
        {"code": "fin_montant", "value": 1951472.5},
        {"code": "fin_hors", "value": True},
        {"code": "fin_who", "value": "  OIF  ", "note": "Convention signée"},
        {"code": "emp", "value": 5},
        {"code": "nps", "value": 10},
    )
    assert response.status_code == 200
    lines = rows(response)
    assert lines["fin_montant"]["value"] == 1951472.5 and lines["fin_hors"]["value"] is True
    assert (lines["fin_who"]["value"], lines["fin_who"]["note"]) == ("OIF", "Convention signée")
    assert lines["nps"]["status"]["label"] == "Atteinte"
    assert response.json()["entered"] == 5
    assert KpiValue.objects.get(kpi__code="emp").entered_by == staff
    assert ImpactReport.objects.get().status == "draft"
    assert AuditLog.objects.filter(action="impact.values_saved").exists()
    cleared = patch(
        client, {"code": "fin_hors", "value": False}, {"code": "fin_who", "value": None}
    )
    lines = rows(cleared)
    assert lines["fin_hors"]["value"] is False and lines["fin_who"]["value"] is None
    assert patch(client, {"code": "prod_which", "value": "   "}).json()["entered"] == 4


@pytest.mark.parametrize(
    ("code", "value"),
    [
        ("emp", 2.5),
        ("emp", -1),
        ("emp", "5"),
        ("emp", True),
        ("fin_montant", -10),
        ("nps", 11),
        ("nps", 0),
        ("fin_hors", "oui"),
        ("fin_who", 12),
        ("fin_who", "x" * 501),
    ],
)
def test_values_are_checked_against_the_unit(client, code, value):
    verified_client(client, FINANCE)
    response = patch(client, {"code": "nps", "value": 9}, {"code": code, "value": value})
    body = response.json()
    assert (response.status_code, body["code"]) == (400, "VALIDATION_ERROR")
    assert body["fields"]["values"][0] == {}
    assert "value" in body["fields"]["values"][1]
    assert not KpiValue.objects.exists()


@pytest.mark.parametrize("code", ["nu", "inconnu"])
def test_auto_or_unknown_kpis_cannot_be_entered(client, code):
    verified_client(client, FINANCE)
    response = patch(client, {"code": code, "value": 3})
    assert "code" in response.json()["fields"]["values"][0]


def test_an_empty_entry_is_refused(client):
    verified_client(client, FINANCE)
    response = client.patch(VALUES, {"values": []}, content_type="application/json")
    assert response.json()["code"] == "VALIDATION_ERROR"


# --- Soumission (D74) -------------------------------------------------------------------------------------


def test_a_submitted_report_is_locked_frozen_and_idempotent(client):
    staff = verified_client(client, FINANCE, first_name="Rachidi", last_name="Bello")
    patch(client, {"code": "nps", "value": 9})
    store("nu", "2026-03", 150)
    first = client.post(SUBMIT).json()
    assert (first["status"], first["submittedBy"]) == ("submitted", "Rachidi Bello")
    assert AuditLog.objects.filter(action="impact.report_submitted").count() == 1
    # Saisie refusée, recalcul sans effet sur le rapport figé
    response = patch(client, {"code": "nps", "value": 3})
    assert (response.status_code, response.json()["code"]) == (409, "REPORT_LOCKED")
    store("nu", "2026-03", 400)
    assert rows(client.get(REPORT))["nu"]["value"] == 150
    assert rows(client.get(REPORT))["nps"]["value"] == 9
    # Seconde soumission : rien ne change
    again = client.post(SUBMIT).json()
    assert again["submittedAt"] == first["submittedAt"]
    assert AuditLog.objects.filter(action="impact.report_submitted").count() == 1
    report = ImpactReport.objects.get()
    assert (report.submitted_by, str(report)) == (staff, "Rapport 2026-t1")


def test_a_report_submitted_by_a_deleted_member_has_no_author(client):
    verified_client(client, SUPER_ADMIN)
    ImpactReport.objects.create(period=PERIOD, status="submitted", snapshot=[])
    data = client.get(REPORT).json()
    assert (data["submittedBy"], data["rows"], data["total"]) == (None, [], 0)
