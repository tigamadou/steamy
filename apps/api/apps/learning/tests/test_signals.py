import pytest
from django.contrib.auth import get_user_model

from apps.courses.models import Course
from apps.learning.models import Attempt, Certificate, Enrollment, Quiz

User = get_user_model()


@pytest.fixture
def setup(db):
    teacher = User.objects.create_user(email="prof@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="eleve@example.com", password="pw", role="student")
    course = Course.objects.create(
        title="Robotique", slug="robotique", author=teacher, published=True
    )
    quiz = Quiz.objects.create(course=course, title="Quiz final")
    return student, course, quiz


def test_passed_attempt_issues_certificate_once(setup):
    """Le signal post_save d'Attempt (apps.learning.signals) délivre le certificat."""
    student, course, quiz = setup
    enrollment = Enrollment.objects.create(user=student, course=course)

    Attempt.objects.create(user=student, quiz=quiz, score=80, passed=True)
    certificate = Certificate.objects.get(enrollment=enrollment)
    assert certificate.score == 80

    # Une seconde réussite ne crée pas de doublon
    Attempt.objects.create(user=student, quiz=quiz, score=95, passed=True)
    assert Certificate.objects.filter(enrollment=enrollment).count() == 1


def test_failed_attempt_or_missing_enrollment_issues_nothing(setup):
    student, course, quiz = setup
    Attempt.objects.create(user=student, quiz=quiz, score=90, passed=True)  # pas inscrit
    enrollment = Enrollment.objects.create(user=student, course=course)
    Attempt.objects.create(user=student, quiz=quiz, score=20, passed=False)
    assert not Certificate.objects.filter(enrollment=enrollment).exists()
