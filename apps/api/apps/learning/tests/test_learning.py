import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, StaffFactory
from apps.catalog.tests.factories import CourseFactory, MissionFactory
from apps.learning.models import Attempt, Certificate, Choice, Enrollment, Progress, Question, Quiz

User = get_user_model()


@pytest.mark.django_db
def test_enrollment_create_sets_user_and_prevents_duplicates():
    client = APIClient()
    student = LearnerFactory()

    course = CourseFactory(slug="c1")

    client.force_authenticate(user=student)
    url = reverse("enrollment-list")
    resp = client.post(url, {"course": course.id}, format="json")
    assert resp.status_code == 201, (
        f"expected 201 creating enrollment, got {resp.status_code}: {resp.content}"
    )
    en = Enrollment.objects.filter(user=student, course=course).first()
    assert en is not None

    # Trying to create the same enrollment again should be rejected (unique_together)
    resp2 = client.post(url, {"course": course.id}, format="json")
    assert resp2.status_code in (400, 409), (
        f"expected duplicate create to fail, got {resp2.status_code}: {resp2.content}"
    )


@pytest.mark.django_db
def test_progress_create_and_owner_permission():
    client = APIClient()
    student = LearnerFactory()
    other = LearnerFactory()

    mission = MissionFactory()
    course = mission.level.project.course
    enrollment = Enrollment.objects.create(user=student, course=course)

    client.force_authenticate(user=student)
    url = reverse("progress-list")
    payload = {
        "enrollment": enrollment.id,
        "mission": mission.id,
        "completed": True,
        "score": "85.00",
    }
    resp = client.post(url, payload, format="json")
    assert resp.status_code == 201, (
        f"expected 201 creating progress, got {resp.status_code}: {resp.content}"
    )
    progress_id = resp.json().get("id")
    assert Progress.objects.filter(id=progress_id, enrollment=enrollment, mission=mission).exists()

    # Another user (not owner, not admin) should not be able to patch this progress
    client.force_authenticate(user=other)
    detail_url = reverse("progress-detail", args=[progress_id])
    resp_patch = client.patch(detail_url, {"completed": False}, format="json")
    assert resp_patch.status_code in (403, 404, 400), (
        f"expected forbidden or not found for other user, got {resp_patch.status_code}: {resp_patch.content}"
    )

    # Owner can patch
    client.force_authenticate(user=student)
    resp_patch_owner = client.patch(detail_url, {"completed": False}, format="json")
    assert resp_patch_owner.status_code in (200, 202), (
        f"owner should update, got {resp_patch_owner.status_code}: {resp_patch_owner.content}"
    )
    Progress.objects.get(id=progress_id).refresh_from_db()
    assert Progress.objects.get(id=progress_id).completed is False


@pytest.mark.django_db
def test_certificate_is_visible_to_its_owner_only():
    client = APIClient()
    student = LearnerFactory()
    other = LearnerFactory()
    admin = StaffFactory(email="admin@example.com")

    course = CourseFactory(slug="ccert")
    enrollment = Enrollment.objects.create(user=student, course=course)
    cert = Certificate.objects.create(enrollment=enrollment, score="90.00")

    detail_url = reverse("certificate-detail", args=[cert.id])

    # owner can GET
    client.force_authenticate(user=student)
    resp_owner = client.get(detail_url, format="json")
    assert resp_owner.status_code == 200, (
        f"owner should access certificate, got {resp_owner.status_code}: {resp_owner.content}"
    )

    # Ni un autre utilisateur, ni le personnel (qui passe par le back-office) : 404 (S4)
    for intruder in (other, admin):
        client.force_authenticate(user=intruder)
        assert client.get(detail_url, format="json").status_code == 404
        assert client.get(reverse("certificate-list")).json()["results"] == []


@pytest.mark.django_db
def test_attempt_is_graded_by_server_and_cannot_be_regraded():
    """S8 : le score vient du serveur, et il n'y a plus de correction manuelle."""
    client = APIClient()
    student = LearnerFactory()

    course = CourseFactory(slug="cquiz")
    Enrollment.objects.create(user=student, course=course)
    quiz = Quiz.objects.create(course=course, title="Final Quiz", pass_score="50.0")
    q1 = Question.objects.create(quiz=quiz, text="Q1", kind="mcq", weight="1.0")
    Choice.objects.create(question=q1, text="Good", is_correct=True)
    wrong = Choice.objects.create(question=q1, text="Bad", is_correct=False)

    client.force_authenticate(user=student)
    # Un score et un « passed » envoyés par le client sont ignorés.
    resp = client.post(
        "/api/learning/attempts/",
        {"quiz": quiz.id, "data": {str(q1.id): wrong.id}, "score": 100, "passed": True},
        format="json",
    )
    assert resp.status_code == 201, resp.content
    attempt = Attempt.objects.get(pk=resp.json()["id"])
    assert float(attempt.score) == 0 and attempt.passed is False

    assert (
        client.post(f"/api/learning/attempts/{attempt.id}/manual_grade/", {"score": 90}).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/learning/attempts/{attempt.id}/", {"score": 90}, format="json"
        ).status_code
        == 405
    )


@pytest.mark.django_db
def test_quiz_choices_never_expose_the_answer_key():
    student = LearnerFactory()
    course = CourseFactory(slug="cq")
    quiz = Quiz.objects.create(course=course, title="Q")
    q1 = Question.objects.create(quiz=quiz, text="Q1", kind="mcq", weight="1.0")
    Choice.objects.create(question=q1, text="Good", is_correct=True)

    client = APIClient()
    # Ni anonyme, ni connecté non inscrit : le quiz n'est pas visible.
    assert client.get("/api/learning/quizzes/").status_code == 401
    client.force_authenticate(user=student)
    assert client.get("/api/learning/quizzes/").json()["results"] == []

    Enrollment.objects.create(user=student, course=course)
    body = client.get("/api/learning/quizzes/").content.decode()
    assert "Good" in body and "isCorrect" not in body and "is_correct" not in body


@pytest.mark.django_db
def test_enrollment_is_refused_on_a_draft_course_and_progress_on_a_foreign_mission():
    student = LearnerFactory()
    client = APIClient()
    client.force_authenticate(user=student)

    draft = CourseFactory(draft=True)
    resp = client.post(reverse("enrollment-list"), {"course": draft.id}, format="json")
    assert resp.status_code == 400 and not Enrollment.objects.exists()

    enrollment = Enrollment.objects.create(user=student, course=CourseFactory())
    resp = client.post(
        reverse("progress-list"),
        {"enrollment": enrollment.id, "mission": MissionFactory().id, "completed": True},
        format="json",
    )
    assert resp.status_code == 400 and "mission" in resp.json()["fields"]


@pytest.mark.django_db
def test_progress_is_named_and_staff_reads_every_quiz():
    mission = MissionFactory(title="Brancher un moteur")
    enrollment = Enrollment.objects.create(
        user=LearnerFactory(), course=mission.level.project.course
    )
    progress = Progress.objects.create(enrollment=enrollment, mission=mission)
    assert str(progress).endswith("Brancher un moteur (pending)")

    Quiz.objects.create(course=enrollment.course, title="Q")
    client = APIClient()
    client.force_authenticate(user=StaffFactory())
    assert client.get("/api/learning/quizzes/").json()["count"] == 1
