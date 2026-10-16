"""
Exports du rapport trimestriel (WAD04, D74) : génération asynchrone CSV / PDF depuis le rapport figé à la demande,
contenu identique à WAD04, export réservé à qui l'a demandé, téléchargement par URL présignée ou fichier servi.
"""

import csv
import io

import pytest
from celery.exceptions import Retry
from rest_framework.test import APIClient

from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.core.models import AuditLog
from apps.core.storage import PrivateFileSystemStorage
from apps.core.tests.staff import staff_member, verified_client
from apps.impact import exports, tasks
from apps.impact.models import ImpactReport, KpiDefinition, KpiValue, ReportExport

pytestmark = pytest.mark.django_db

PERIOD = "2026-t1"
REPORT = f"/api/backoffice/impact-reports/{PERIOD}/"
EXPORTS = f"{REPORT}exports/"


def export_url(pk, suffix=""):
    return f"/api/backoffice/exports/{pk}/{suffix}"


def enter(code, **fields):
    KpiValue.objects.update_or_create(
        kpi=KpiDefinition.objects.get(code=code), period=PERIOD, defaults=fields
    )


@pytest.fixture
def finance(client):
    return verified_client(client, FINANCE)


def request_export(client, fmt, capture):
    with capture(execute=True):
        response = client.post(EXPORTS, {"format": fmt}, content_type="application/json")
    assert response.status_code == 202, response.content
    return response.json()


# --- Accès -----------------------------------------------------------------------------------------------


@pytest.mark.parametrize("group", [CONTENT, SUPPORT])
def test_other_groups_cannot_export(client, group):
    verified_client(client, group)
    assert (
        client.post(EXPORTS, {"format": "csv"}, content_type="application/json").status_code == 403
    )


def test_unverified_staff_gets_otp_required():
    client = APIClient()
    client.force_login(staff_member(FINANCE), backend="apps.accounts.backends.StaffBackend")
    response = client.post(EXPORTS, {"format": "csv"}, format="json")
    assert response.json()["code"] == "OTP_REQUIRED"


def test_format_and_quarter_are_checked(client, finance):
    response = client.post(EXPORTS, {"format": "xlsx"}, content_type="application/json")
    assert response.status_code == 400 and "format" in response.json()["fields"]
    response = client.post(
        "/api/backoffice/impact-reports/2026-01/exports/",
        {"format": "csv"},
        content_type="application/json",
    )
    assert response.status_code == 404


# --- Génération ------------------------------------------------------------------------------------------


def test_csv_export_matches_the_report(client, finance, django_capture_on_commit_callbacks):
    enter("fin_montant", number=1951472)
    enter("fin_hors", text="oui")
    enter("fin_who", text="OIF ; Fondation")
    enter("nps", number="8.5")
    shown = client.get(REPORT).json()

    created = request_export(client, "csv", django_capture_on_commit_callbacks)
    assert created["period"] == PERIOD and created["format"] == "csv"
    state = client.get(export_url(created["id"])).json()
    assert state["status"] == "ready"
    assert state["downloadPath"] == f"/api/backoffice/exports/{created['id']}/download/"

    response = client.get(state["downloadPath"])
    assert response.status_code == 200 and response["Content-Type"] == "text/csv"
    assert 'filename="rapport-impact-2026-t1.csv"' in response["Content-Disposition"]
    content = b"".join(response.streaming_content)
    assert content.startswith(b"\xef\xbb\xbf")  # BOM : accents lus par un tableur
    lines = [line.split(";") for line in content.decode("utf-8-sig").splitlines()]
    assert lines[0] == ["Indicateur", "Du", "Au", "Réponse", "Statut", "Source"]
    # Une ligne par indicateur de WAD04, dans le même ordre, mêmes plages, statuts et sources
    assert [line[0] for line in lines[1:]] == [row["label"] for row in shown["rows"]]
    by_label = {line[0]: line for line in lines[1:]}
    assert by_label["Financements reçus"][1:] == [
        "01/01/2026",
        "31/03/2026",
        "1951472 FCFA",
        "Renseignée",
        "Manuel",
    ]
    assert by_label["Financement hors programme ?"][3] == "Oui"
    assert by_label["Recommandation du programme (1-10)"][3] == "8,5"
    assert by_label["Ventes réalisées"][1:] == [
        "01/03/2026",
        "31/03/2026",
        "",
        "En attente",
        "Auto",
    ]
    assert any(
        "OIF" in line for line in content.decode("utf-8-sig").splitlines()
    )  # `;` protégé par les guillemets
    assert AuditLog.objects.filter(action="impact.export_requested").exists()


def test_the_export_freezes_the_report_at_the_request(client, finance, monkeypatch):
    monkeypatch.setattr(tasks.generate_report_export, "delay", lambda *args: None)
    enter("nps", number=7)
    created = client.post(EXPORTS, {"format": "csv"}, content_type="application/json").json()
    state = client.get(export_url(created["id"])).json()
    assert (state["status"], state["downloadPath"]) == ("pending", None)
    enter("nps", number=9)  # changé pendant la génération
    exports.build_export(created["id"])
    export = ReportExport.objects.get(pk=created["id"])
    assert ";7;" in export.file.read().decode("utf-8-sig")


def test_pdf_export(client, finance, django_capture_on_commit_callbacks, monkeypatch):
    rendered = {}

    def fake_render(template, context):
        rendered.update(template=template, context=context)
        return b"%PDF-1.7 rapport"

    monkeypatch.setattr(exports, "render_pdf", fake_render)
    ImpactReport.objects.create(period=PERIOD)
    created = request_export(client, "pdf", django_capture_on_commit_callbacks)
    response = client.get(export_url(created["id"], "download/"))
    assert response["Content-Type"] == "application/pdf"
    assert b"".join(response.streaming_content) == b"%PDF-1.7 rapport"
    context = rendered["context"]
    assert rendered["template"] == "pdf/impact_report.html"
    assert (context["label"], context["start"], context["end"], context["status"]) == (
        "T1 2026",
        "01/01/2026",
        "31/03/2026",
        "Brouillon",
    )
    assert (
        context["headers"][3] == "Réponse"
        and len(context["lines"]) == KpiDefinition.objects.count()
    )


def test_the_pdf_template_renders(client):
    data = {
        "label": "T1 2026",
        "start": "2026-01-01",
        "end": "2026-03-31",
        "status": "submitted",
        "entered": 1,
        "total": 2,
        "submitted_by": "Rachidi Bello",
        "rows": [
            {
                "label": "Financements reçus",
                "start": "2026-01-01",
                "end": "2026-03-31",
                "value": 12,
                "unit": "fcfa",
                "status": {"label": "Renseignée"},
                "source": "manual",
            }
        ],
    }
    assert exports.render_report_pdf(data).startswith(b"%PDF")


def test_generation_is_idempotent(client, finance, monkeypatch):
    monkeypatch.setattr(tasks.generate_report_export, "delay", lambda *args: None)
    created = client.post(EXPORTS, {"format": "csv"}, content_type="application/json").json()
    assert exports.build_export(created["id"]) is True
    export = ReportExport.objects.get(pk=created["id"])
    name = export.file.name
    assert name == f"impact-exports/{export.uuid}.csv"
    assert exports.build_export(created["id"]) is False  # déjà prêt
    ReportExport.objects.filter(pk=export.pk).update(status="pending")
    assert exports.build_export(created["id"]) is True
    export.refresh_from_db()
    assert export.file.name == name and export.status == "ready"
    assert str(export) == "Export CSV · 2026-t1"


def test_failure_is_retried_then_marked_failed(client, finance, monkeypatch):
    monkeypatch.setattr(tasks.generate_report_export, "delay", lambda *args: None)
    created = client.post(EXPORTS, {"format": "pdf"}, content_type="application/json").json()

    def broken(export_id):
        raise RuntimeError("WeasyPrint indisponible")

    countdowns = []

    def retry(exc, countdown):
        countdowns.append(countdown)
        return Retry()

    monkeypatch.setattr(exports, "build_export", broken)
    task = tasks.generate_report_export
    monkeypatch.setattr(task, "retry", retry)

    def run(retries):
        task.push_request(retries=retries)
        try:
            return task.run(created["id"])
        finally:
            task.pop_request()

    with pytest.raises(Retry):
        run(retries=1)
    assert countdowns == [60]
    with pytest.raises(RuntimeError):
        run(retries=tasks.EXPORT_MAX_RETRIES)
    assert client.get(export_url(created["id"])).json()["status"] == "failed"


def test_the_task_ignores_a_deleted_export():
    assert tasks.generate_report_export.apply(args=[999999]).get() is False


# --- Téléchargement ---------------------------------------------------------------------------------------


def test_download_before_the_export_is_ready(client, finance, monkeypatch):
    monkeypatch.setattr(tasks.generate_report_export, "delay", lambda *args: None)
    created = client.post(EXPORTS, {"format": "csv"}, content_type="application/json").json()
    response = client.get(export_url(created["id"], "download/"))
    assert response.status_code == 409 and response.json()["code"] == "EXPORT_NOT_READY"


def test_download_redirects_to_a_signed_url(
    client, finance, django_capture_on_commit_callbacks, monkeypatch
):
    created = request_export(client, "csv", django_capture_on_commit_callbacks)
    monkeypatch.setattr(
        PrivateFileSystemStorage,
        "signed_url",
        lambda self, name, filename: f"https://media.test/{filename}",
    )
    response = client.get(export_url(created["id"], "download/"))
    assert response.status_code == 302
    assert response["Location"] == "https://media.test/rapport-impact-2026-t1.csv"


def test_an_export_belongs_to_its_requester(client, finance, django_capture_on_commit_callbacks):
    created = request_export(client, "csv", django_capture_on_commit_callbacks)
    other = APIClient()
    verified_client(other, SUPER_ADMIN, email="autre@steamy.test")
    for path in (export_url(created["id"]), export_url(created["id"], "download/")):
        response = other.get(path)
        assert response.status_code == 404 and response.json()["code"] == "NOT_FOUND"
    support = APIClient()
    verified_client(support, SUPPORT, email="support2@steamy.test")
    assert support.get(export_url(created["id"])).status_code == 403


@pytest.mark.parametrize(
    ("text", "cell"),
    [
        ('=HYPERLINK("http://x")', '\'=HYPERLINK("http://x")'),
        ("+33 1 23", "'+33 1 23"),
        ("-2+3", "'-2+3"),
        ("@SUM(A1)", "'@SUM(A1)"),
        ("\tcachée", "'\tcachée"),
        ("\rretour", "'\rretour"),
        ("Fondation OIF", "Fondation OIF"),
    ],
)
def test_csv_neutralizes_formulas_in_free_text(text, cell):
    row = {
        "start": "2026-01-01",
        "end": "2026-03-31",
        "status": {"label": "Renseignée"},
        "source": "manual",
    }
    data = {
        "rows": [
            {**row, "label": "Lesquels ?", "value": text, "unit": "text"},
            {**row, "label": "Variation", "value": -1500, "unit": "fcfa"},
        ]
    }
    content = exports.render_csv(data).decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(content, newline=""), delimiter=";"))
    assert rows[1][3] == cell
    assert rows[2][3] == "-1500 FCFA"  # un nombre n'est jamais préfixé


def test_an_export_finished_meanwhile_is_not_rewritten(client, finance, monkeypatch):
    monkeypatch.setattr(tasks.generate_report_export, "delay", lambda *args: None)
    created = client.post(EXPORTS, {"format": "csv"}, content_type="application/json").json()
    original = exports.RENDERERS["csv"]

    def render_then_finish(data):
        content = original(data)
        monkeypatch.setitem(exports.RENDERERS, "csv", original)
        exports.build_export(created["id"])  # un autre essai termine pendant ce rendu
        return content

    monkeypatch.setitem(exports.RENDERERS, "csv", render_then_finish)
    assert exports.build_export(created["id"]) is False
    assert ReportExport.objects.get(pk=created["id"]).status == "ready"
