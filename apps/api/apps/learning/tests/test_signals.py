import pytest
from django.contrib.auth import get_user_model

from apps.accounts.tests.factories import LearnerFactory, TeacherFactory
from apps.courses.models import Course
from apps.learning.models import Attempt, Certificate, Enrollment, Quiz

User = get_user_model()


@pytest.mark.django_db
def test_passed_attempt_no_longer_issues_certificate():
    """
    S8 : réussir un seul quiz ne doit pas délivrer le certificat. La certification exige
    toutes les missions et toutes les sommatives (D33, API-L3a).
    """
    teacher = TeacherFactory(email="prof@example.com")
    student = LearnerFactory()
    course = Course.objects.create(
        title="Robotique", slug="robotique", author=teacher, published=True
    )
    quiz = Quiz.objects.create(course=course, title="Quiz final")
    enrollment = Enrollment.objects.create(user=student, course=course)

    Attempt.objects.create(user=student, quiz=quiz, score=100, passed=True)

    assert not Certificate.objects.filter(enrollment=enrollment).exists()
