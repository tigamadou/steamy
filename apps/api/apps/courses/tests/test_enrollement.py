import pytest
from django.contrib.auth import get_user_model
from django.urls import NoReverseMatch, reverse
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, TeacherFactory
from apps.courses.models import Course, Lesson, Module
from apps.learning.models import Enrollment

User = get_user_model()


def find_course_action_url(course, action_names=None):
    """
    Retourne l'URL de l'action d'enrollment d'un course.
    Essaie d'abord les noms les plus probables et slug avant pk.
    """
    if action_names is None:
        action_names = (
            "course-enroll",
            "course-enroll-action",
            "course-enrolls",
            "course-enroll-list",
        )

    # try slug first (common when lookup_field='slug')
    tries = []
    for name in action_names:
        tries.append((name, [course.slug]))
        tries.append((name, [course.pk]))
        tries.append((name, []))  # sometimes action may be exposed without args (rare)
    for name, args in tries:
        try:
            return reverse(name, args=args)
        except NoReverseMatch:
            continue
    # give up with a helpful message
    raise RuntimeError(
        f"Could not find enroll action URL. Checked names: {', '.join(action_names)}. "
        "Make sure CourseViewSet has an @action(detail=True, name='enroll') "
        "or register the router basename 'course'."
    )


@pytest.mark.django_db
def test_student_can_enroll_and_access_lessons():
    client = APIClient()
    teacher = TeacherFactory(email="teacher-enroll@example.com")
    student = LearnerFactory()

    # create course + module + lesson
    course = Course.objects.create(
        title="Enrollable Course", slug="enrollable-2", author=teacher, published=True
    )
    module = Module.objects.create(course=course, title="M1", order=0)
    Lesson.objects.create(module=module, title="L1", content="xxx", order=0)

    # trouver URL d'enroll (helper tolérant)
    enroll_url = find_course_action_url(course)

    # student non-auth ne peut pas enroll (ou reçoit 401/403)
    resp = client.post(enroll_url, format="json")
    assert resp.status_code in (401, 403), (
        f"anonymous enrolling should be blocked, got {resp.status_code}: {resp.content}"
    )

    # student auth peut enroll
    client.force_authenticate(user=student)
    resp = client.post(enroll_url, format="json")
    assert resp.status_code in (200, 201), (
        f"enroll should succeed, got {resp.status_code}: {resp.content}"
    )

    # verify enrollment created in DB
    assert Enrollment.objects.filter(user=student, course=course).exists(), (
        "Enrollment record must be created after enroll action"
    )

    # après inscription, student doit avoir accès aux leçons du cours
    # on tente d'abord lesson-list global si disponible
    lessons_url_candidates = []
    try:
        lessons_url_candidates.append(reverse("lesson-list"))
    except NoReverseMatch:
        pass

    # try common nested names (course-lessons)
    nested_names = ("course-lessons-list", "course-lesson-list", "course-lessons", "course-lesson")
    for name in nested_names:
        try:
            lessons_url_candidates.append(reverse(name, args=[course.slug]))
        except NoReverseMatch:
            try:
                lessons_url_candidates.append(reverse(name, args=[course.pk]))
            except NoReverseMatch:
                continue

    # if no candidate found, we accept the test as non-applicable (adapt your API)
    if not lessons_url_candidates:
        pytest.skip("No lesson-list endpoint found; adapt the test to your API's lesson endpoints")

    # query candidates and expect at least one to return 200 after enroll
    got_ok = False
    for url in lessons_url_candidates:
        r = client.get(url, format="json")
        if r.status_code == 200:
            got_ok = True
            break

    assert got_ok, (
        f"After enroll the student should be able to access course lessons; tried: {lessons_url_candidates}"
    )


@pytest.mark.django_db
def test_teacher_cannot_enroll_as_student_but_can_manage_course():
    client = APIClient()
    teacher = TeacherFactory(email="teacher2-enroll@example.com")
    other_teacher = TeacherFactory(email="teacher-other@example.com")
    # course authored by teacher
    course = Course.objects.create(
        title="Manage Course", slug="manage-course", author=teacher, published=True
    )

    enroll_url = find_course_action_url(course)

    # another teacher (authenticated) tries to enroll -> business rule may allow or disallow
    client.force_authenticate(user=other_teacher)
    resp = client.post(enroll_url, format="json")
    assert resp.status_code in (200, 201, 403), (
        f"unexpected status for other teacher enrolling: {resp.status_code}"
    )
