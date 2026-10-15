"""
Certification (D33, ADR 0005) : seulement à 100 % des missions et toutes les sommatives réussies, une seule fois même
en appels concurrents, avec un ticket Steamy Events unique ; PDF asynchrone dans le stockage privé ; certificats
d'autrui illisibles.
"""

import threading
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from celery.exceptions import Retry
from django.db import IntegrityError, connection, transaction
from django.db.transaction import TransactionManagementError
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory
from apps.catalog.models import Badge, Quiz
from apps.core.models import DocumentSequence
from apps.core.pdf import RemoteResourceRefused, refuse_url, render_pdf
from apps.core.storage import PrivateFileSystemStorage, PrivateMediaStorage
from apps.core.tests.staff import verified_client
from apps.events.models import EventTicket
from apps.learning import tasks
from apps.learning.certification import complete_if_done
from apps.learning.models import Certificate, Enrollment, MissionProgress, QuizAttempt
from apps.notifications.models import Notification

from .factories import EnrollmentFactory, answers, build_course, missions_of

pytestmark = pytest.mark.django_db


@pytest.fixture
def learner():
    return LearnerFactory(first_name="Léa", last_name="Adjovi")


@pytest.fixture
def client(learner):
    client = APIClient()
    client.force_authenticate(learner)
    return client


@pytest.fixture
def course():
    course = build_course(projects=1, levels=1, missions=1, quizzes=True, title="Robotique")
    Badge.objects.create(
        kind="project", project=course.projects.get(), label="Mon robot", icon="🤖"
    )
    return course


@pytest.fixture
def enrollment(learner, course):
    return EnrollmentFactory(learner=learner, course=course)


def pass_quiz(enrollment, quiz):
    QuizAttempt.objects.create(
        learner=enrollment.learner,
        enrollment=enrollment,
        quiz=quiz,
        score=2,
        total=2,
        percentage=100,
        threshold=quiz.pass_threshold,
        status="ok",
        passed=True,
    )


def all_but_summative(enrollment, course):
    for mission in missions_of(course):
        MissionProgress.objects.create(enrollment=enrollment, mission=mission)
    pass_quiz(enrollment, Quiz.objects.get(level__project__course=course))


# --- Conditions D33 -----------------------------------------------------------------------------------


def test_last_summative_issues_the_certificate_ticket_and_pdf(
    client, learner, course, enrollment, django_capture_on_commit_callbacks
):
    all_but_summative(enrollment, course)
    summative = Quiz.objects.get(project__course=course)
    with django_capture_on_commit_callbacks(execute=True):
        resp = client.post(
            f"/api/learning/quizzes/{summative.id}/attempts/",
            {"answers": answers(summative, 2)},
            format="json",
        )
    assert resp.json()["next"]["type"] == "certification"
    enrollment.refresh_from_db()
    assert enrollment.status == "completed" and enrollment.completed_at is not None
    certificate = Certificate.objects.get(enrollment=enrollment)
    year = timezone.localtime().year
    assert certificate.number == f"CERT-{year}-000001"
    assert certificate.snapshot["learner_name"] == "Léa Adjovi"
    assert certificate.snapshot["course_title"] == "Robotique"
    assert certificate.snapshot["project_badges"] == ["Mon robot"]
    assert certificate.pdf_status == "ready"
    assert certificate.pdf.name == f"certificates/{certificate.uuid}.pdf"
    assert certificate.pdf.read().startswith(b"%PDF")
    assert EventTicket.objects.filter(enrollment=enrollment, learner=learner).count() == 1
    notification = Notification.objects.get(user=learner, type="certificate_issued")
    assert notification.url == f"/apprenant/parcours/{course.slug}/certification"

    tree = client.get(f"/api/learning/enrollments/{course.slug}/tree/").json()
    assert tree["status"] == "completed"
    assert tree["certification"] == {
        "eligible": True,
        "missionsDone": 1,
        "missionCount": 1,
        "summativesPassed": 1,
        "summativeCount": 1,
        "certificateEnabled": True,
        "certificate": {
            "id": certificate.id,
            "number": certificate.number,
            "course": {"slug": course.slug, "title": "Robotique"},
            "issuedAt": tree["certification"]["certificate"]["issuedAt"],
            "pdfStatus": "ready",
        },
        "eventTicket": True,
    }


def test_last_mission_completes_a_course_without_summative(client, learner):
    course = build_course(projects=1, levels=1, missions=1)
    enrollment = EnrollmentFactory(learner=learner, course=course)
    client.post(f"/api/learning/missions/{missions_of(course)[0].id}/complete/")
    enrollment.refresh_from_db()
    assert enrollment.status == "completed"
    assert Certificate.objects.filter(enrollment=enrollment).exists()


def test_no_certificate_without_every_summative(client, course, enrollment):
    all_but_summative(enrollment, course)
    assert complete_if_done(enrollment) is None
    tree = client.get(f"/api/learning/enrollments/{course.slug}/tree/").json()
    assert tree["certification"]["eligible"] is False
    assert tree["certification"]["summativesPassed"] == 0
    assert tree["certification"]["certificate"] is None
    assert tree["certification"]["eventTicket"] is False
    assert tree["status"] == "active"


def test_no_certificate_for_an_empty_course(learner):
    course = build_course(projects=0)
    assert complete_if_done(EnrollmentFactory(learner=learner, course=course)) is None


def test_course_without_certificate_is_completed_without_document(learner):
    course = build_course(projects=1, levels=1, missions=1, certificate_enabled=False)
    enrollment = EnrollmentFactory(learner=learner, course=course)
    MissionProgress.objects.create(enrollment=enrollment, mission=missions_of(course)[0])
    assert complete_if_done(enrollment) is None
    enrollment.refresh_from_db()
    assert enrollment.status == "completed"
    assert not Certificate.objects.exists() and not EventTicket.objects.exists()


def test_certificate_is_issued_once(course, enrollment):
    all_but_summative(enrollment, course)
    pass_quiz(enrollment, Quiz.objects.get(project__course=course))
    first = complete_if_done(enrollment)
    assert complete_if_done(enrollment) == first
    assert Certificate.objects.count() == 1 and EventTicket.objects.count() == 1
    assert DocumentSequence.objects.get(kind="certificate").last == 1


def test_numbers_follow_each_other(course):
    numbers = []
    for _ in range(2):
        enrollment = EnrollmentFactory(course=course)
        all_but_summative(enrollment, course)
        pass_quiz(enrollment, Quiz.objects.get(project__course=course))
        numbers.append(complete_if_done(enrollment).number)
    year = timezone.localtime().year
    assert numbers == [f"CERT-{year}-000001", f"CERT-{year}-000002"]


def test_document_sequence_counts_per_kind_and_year():
    with transaction.atomic():
        assert DocumentSequence.next("certificate", 2026) == 1
        assert DocumentSequence.next("certificate", 2026) == 2
        assert DocumentSequence.next("certificate", 2027) == 1
    assert str(DocumentSequence.objects.get(year=2026)) == "certificate 2026 : 2"


@pytest.mark.django_db(transaction=True)
def test_document_sequence_is_refused_outside_a_transaction():
    with pytest.raises(TransactionManagementError):
        DocumentSequence.next("certificate", 2026)


def test_ticket_is_unique_per_enrollment(enrollment):
    EventTicket.objects.create(learner=enrollment.learner, enrollment=enrollment)
    with pytest.raises(IntegrityError), transaction.atomic():
        EventTicket.objects.create(learner=enrollment.learner, enrollment=enrollment)
    assert str(EventTicket.objects.get()).startswith("Ticket de ")


@pytest.mark.django_db(transaction=True)
def test_concurrent_completion_issues_one_certificate_and_one_ticket(monkeypatch):
    monkeypatch.setattr(tasks.generate_certificate_pdf, "delay", lambda *args: None)
    course = build_course(projects=1, levels=1, missions=1, quizzes=True)
    enrollment = EnrollmentFactory(course=course)
    all_but_summative(enrollment, course)
    pass_quiz(enrollment, Quiz.objects.get(project__course=course))
    barrier = threading.Barrier(4)
    errors = []

    def finish():
        try:
            barrier.wait()
            complete_if_done(Enrollment.objects.get(pk=enrollment.pk))
        except Exception as exc:  # pragma: no cover - remonté par l'assertion ci-dessous
            errors.append(exc)
        finally:
            connection.close()

    threads = [threading.Thread(target=finish) for _ in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert errors == []
    assert Certificate.objects.count() == 1
    assert EventTicket.objects.count() == 1
    assert DocumentSequence.objects.get(kind="certificate").last == 1


# --- PDF et tâches ---------------------------------------------------------------------------------------


@pytest.fixture
def certificate(course, enrollment, monkeypatch):
    monkeypatch.setattr(tasks.generate_certificate_pdf, "delay", lambda *args: None)
    all_but_summative(enrollment, course)
    pass_quiz(enrollment, Quiz.objects.get(project__course=course))
    return complete_if_done(enrollment)


def test_pdf_generation_is_idempotent(certificate):
    assert certificate.pdf_status == "pending"
    assert tasks.build_certificate_pdf(certificate.id) is True
    certificate.refresh_from_db()
    name = certificate.pdf.name
    assert tasks.build_certificate_pdf(certificate.id) is False  # déjà prêt
    # Régénération : même clé, fichier remplacé
    Certificate.objects.filter(pk=certificate.pk).update(pdf_status="pending")
    assert tasks.build_certificate_pdf(certificate.id) is True
    certificate.refresh_from_db()
    assert certificate.pdf.name == name and certificate.pdf_status == "ready"


def test_pdf_failure_is_retried_then_marked_failed(certificate, monkeypatch):
    def broken(certificate_id):
        raise RuntimeError("WeasyPrint indisponible")

    countdowns = []

    def retry(exc, countdown):
        countdowns.append(countdown)
        return Retry()

    monkeypatch.setattr(tasks, "build_certificate_pdf", broken)
    task = tasks.generate_certificate_pdf
    monkeypatch.setattr(task, "retry", retry)

    def run(retries):
        task.push_request(retries=retries)
        try:
            return task.run(certificate.id)
        finally:
            task.pop_request()

    with pytest.raises(Retry):
        run(retries=2)
    assert countdowns == [120]  # attente exponentielle
    certificate.refresh_from_db()
    assert certificate.pdf_status == "pending"

    with pytest.raises(RuntimeError):
        run(retries=tasks.MAX_RETRIES)
    certificate.refresh_from_db()
    assert certificate.pdf_status == "failed"


def test_pdf_task_ignores_a_deleted_certificate():
    assert tasks.generate_certificate_pdf.apply(args=[999999]).get() is False


def test_stale_pending_certificates_are_relaunched(certificate, monkeypatch):
    launched = []
    monkeypatch.setattr(tasks.generate_certificate_pdf, "delay", launched.append)
    assert tasks.retry_pending_certificates() == 0
    Certificate.objects.filter(pk=certificate.pk).update(
        issued_at=timezone.now() - timedelta(minutes=11)
    )
    from django.core.management import call_command

    call_command("retry_pending_certificates")
    assert launched == [certificate.id]


def test_render_pdf_refuses_any_resource():
    with pytest.raises(RemoteResourceRefused):
        refuse_url("https://exemple.test/image.png")
    pdf = render_pdf(
        "pdf/certificate.html",
        {
            "learner_name": "Léa",
            "course_title": "Robotique",
            "issued_on": "1 janvier 2026",
            "number": "N",
        },
    )
    assert pdf.startswith(b"%PDF")


# --- Lecture et téléchargement -----------------------------------------------------------------------


def test_list_and_download_my_certificate(client, certificate):
    tasks.build_certificate_pdf(certificate.id)
    other = EnrollmentFactory(course=certificate.enrollment.course)
    all_but_summative(other, other.course)
    pass_quiz(other, Quiz.objects.get(project__course=other.course))
    complete_if_done(other)

    body = client.get("/api/learning/certificates/").json()
    assert [item["id"] for item in body["results"]] == [certificate.id]
    assert body["results"][0]["pdfStatus"] == "ready"

    resp = client.get(f"/api/learning/certificates/{certificate.id}/download/")
    assert resp.status_code == 200
    assert resp["Content-Type"] == "application/pdf"
    assert "no-store" in resp["Cache-Control"]
    assert (
        f'filename="certificat-{certificate.enrollment.course.slug}.pdf"'
        in resp["Content-Disposition"]
    )
    assert b"".join(resp.streaming_content).startswith(b"%PDF")


def test_someone_elses_certificate_is_not_found(certificate):
    intruder = APIClient()
    intruder.force_authenticate(LearnerFactory())
    assert intruder.get("/api/learning/certificates/").json()["count"] == 0
    resp = intruder.get(f"/api/learning/certificates/{certificate.id}/download/")
    assert resp.status_code == 404


def test_download_before_the_pdf_is_ready(client, certificate):
    resp = client.get(f"/api/learning/certificates/{certificate.id}/download/")
    assert resp.status_code == 409 and resp.json()["code"] == "PDF_NOT_READY"


def test_download_redirects_to_a_signed_url_when_the_storage_signs(
    client, certificate, monkeypatch
):
    tasks.build_certificate_pdf(certificate.id)
    monkeypatch.setattr(
        PrivateFileSystemStorage,
        "signed_url",
        lambda self, name, filename: "https://media.test/x?s=1",
    )
    resp = client.get(f"/api/learning/certificates/{certificate.id}/download/")
    assert resp.status_code == 302 and resp["Location"] == "https://media.test/x?s=1"
    assert "no-store" in resp["Cache-Control"]


@pytest.mark.parametrize(
    ("public_endpoint", "host"),
    [("", "rustfs:9000"), ("https://media.steamy.test", "media.steamy.test")],
)
def test_private_s3_storage_signs_five_minute_urls(settings, public_endpoint, host):
    settings.AWS_S3_ENDPOINT_URL = "http://rustfs:9000"
    settings.AWS_S3_PUBLIC_ENDPOINT_URL = public_endpoint
    settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY = "cle", "secret"
    storage = PrivateMediaStorage(bucket_name="steamy-media")
    url = urlparse(storage.signed_url("certificates/abc.pdf", "certificat-robotique.pdf"))
    query = parse_qs(url.query)
    assert url.netloc == host
    assert url.path == "/steamy-media/private/certificates/abc.pdf"
    assert query["X-Amz-Expires"] == ["300"]
    assert query["response-content-disposition"] == [
        'attachment; filename="certificat-robotique.pdf"'
    ]


def test_certificate_admin_regenerates_the_pdf(
    certificate, monkeypatch, django_capture_on_commit_callbacks
):
    launched = []
    monkeypatch.setattr(tasks.generate_certificate_pdf, "delay", launched.append)
    Certificate.objects.filter(pk=certificate.pk).update(pdf_status="failed")
    client = APIClient()
    verified_client(client, is_superuser=True)
    assert client.get(reverse("admin:learning_certificate_changelist")).status_code == 200
    page = client.get(reverse("admin:learning_certificate_change", args=[certificate.id]))
    assert page.status_code == 200
    assert client.get(reverse("admin:learning_certificate_add")).status_code == 403
    with django_capture_on_commit_callbacks(execute=True):
        client.post(
            reverse("admin:learning_certificate_changelist"),
            {"action": "regenerate", "_selected_action": [certificate.id]},
        )
    certificate.refresh_from_db()
    assert certificate.pdf_status == "pending" and launched == [certificate.id]
    assert str(certificate) == certificate.number


def test_event_ticket_admin_is_read_only(certificate):
    client = APIClient()
    verified_client(client, is_superuser=True)
    assert client.get(reverse("admin:events_eventticket_changelist")).status_code == 200
    assert client.get(reverse("admin:events_eventticket_add")).status_code == 403
