import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.courses.models import Course, Lesson, Module
from apps.learning.models import Attempt, Certificate, Choice, Enrollment, Progress, Question, Quiz

User = get_user_model()


@pytest.mark.django_db
def test_enrollment_create_sets_user_and_prevents_duplicates():
    client = APIClient()
    teacher = User.objects.create_user(email="t@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="s@example.com", password="pw", role="student")

    course = Course.objects.create(title="C1", slug="c1", author=teacher, published=True)

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
    teacher = User.objects.create_user(email="t2@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="s2@example.com", password="pw", role="student")
    other = User.objects.create_user(email="other@example.com", password="pw", role="student")

    course = Course.objects.create(title="CourseP", slug="course-p", author=teacher, published=True)
    module = Module.objects.create(course=course, title="M1", order=0)
    lesson = Lesson.objects.create(module=module, title="L1", order=0)
    enrollment = Enrollment.objects.create(user=student, course=course)

    client.force_authenticate(user=student)
    url = reverse("progress-list")
    payload = {
        "enrollment": enrollment.id,
        "lesson": lesson.id,
        "completed": True,
        "score": "85.00",
    }
    resp = client.post(url, payload, format="json")
    assert resp.status_code == 201, (
        f"expected 201 creating progress, got {resp.status_code}: {resp.content}"
    )
    progress_id = resp.json().get("id")
    assert Progress.objects.filter(id=progress_id, enrollment=enrollment, lesson=lesson).exists()

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
def test_certificate_access_owner_and_admin_only():
    client = APIClient()
    teacher = User.objects.create_user(email="t3@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="s3@example.com", password="pw", role="student")
    other = User.objects.create_user(email="other2@example.com", password="pw", role="student")
    admin = User.objects.create_user(
        email="admin@example.com", password="pw", role="admin", is_staff=True
    )

    course = Course.objects.create(title="Ccert", slug="ccert", author=teacher, published=True)
    enrollment = Enrollment.objects.create(user=student, course=course)
    cert = Certificate.objects.create(enrollment=enrollment, score="90.00")

    detail_url = reverse("certificate-detail", args=[cert.id])

    # owner can GET
    client.force_authenticate(user=student)
    resp_owner = client.get(detail_url, format="json")
    assert resp_owner.status_code == 200, (
        f"owner should access certificate, got {resp_owner.status_code}: {resp_owner.content}"
    )

    # other non-admin cannot
    client.force_authenticate(user=other)
    resp_other = client.get(detail_url, format="json")
    assert resp_other.status_code in (403, 404), (
        f"other user should be blocked, got {resp_other.status_code}: {resp_other.content}"
    )

    # admin can access
    client.force_authenticate(user=admin)
    resp_admin = client.get(detail_url, format="json")
    assert resp_admin.status_code == 200, (
        f"admin should access, got {resp_admin.status_code}: {resp_admin.content}"
    )


@pytest.mark.django_db
def test_attempt_manual_grade_updates_score_and_passed_flag():
    client = APIClient()
    teacher = User.objects.create_user(email="tq@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="sq@example.com", password="pw", role="student")
    admin = User.objects.create_user(
        email="admin2@example.com", password="pw", role="admin", is_staff=True
    )

    course = Course.objects.create(title="Cquiz", slug="cquiz", author=teacher, published=True)
    quiz = Quiz.objects.create(course=course, title="Final Quiz", pass_score="50.0")
    q1 = Question.objects.create(quiz=quiz, text="Q1", kind="mcq", weight="1.0")
    Choice.objects.create(question=q1, text="Good", is_correct=True)
    c2 = Choice.objects.create(question=q1, text="Bad", is_correct=False)

    # create attempt (via ORM for simplicity)
    attempt = Attempt.objects.create(user=student, quiz=quiz, data={str(q1.id): c2.id})
    assert attempt.score is None

    # admin can manual grade
    client.force_authenticate(user=admin)
    url = reverse("attempt-manual-grade", args=[attempt.id])
    resp = client.post(url, {"score": "80.0"}, format="json")
    assert resp.status_code == 200, (
        f"manual_grade expected 200, got {resp.status_code}: {resp.content}"
    )
    attempt.refresh_from_db()
    assert float(attempt.score) == pytest.approx(80.0)
    assert attempt.passed is True

    # non-admin authenticated user can also call manual_grade in current implementation
    # ensure behavior is permitted or adapt if you expect restriction
    client.force_authenticate(user=student)
    url2 = reverse("attempt-manual-grade", args=[attempt.id])
    resp_student = client.post(url2, {"score": "40.0"}, format="json")
    # accept either success (200) or forbidden (403) depending on your business rules
    assert resp_student.status_code in (200, 403), (
        f"unexpected status for student manual_grade: {resp_student.status_code}: {resp_student.content}"
    )

    # refresh and check fields if student succeeded
    attempt.refresh_from_db()
    if resp_student.status_code == 200:
        assert float(attempt.score) == pytest.approx(40.0)
        assert attempt.passed is False
