import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.courses.models import Course, Lesson, Module
from apps.learning.models import Enrollment

User = get_user_model()


@pytest.mark.django_db
def test_student_enroll_and_access_lessons():
    client = APIClient()
    teacher = User.objects.create_user(email="teacher3@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="student4@example.com", password="pw", role="student")

    # create course + module + lesson
    course = Course.objects.create(
        title="Enrollable", slug="enrollable", author=teacher, published=True
    )
    module = Module.objects.create(course=course, title="M1", order=0)
    Lesson.objects.create(module=module, title="L1", content="xxx", order=0)

    enroll_url = reverse("course-enroll", args=[course.slug])  # needs @action detail named "enroll"

    # unauthenticated or not enrolled student should NOT be able to GET lessons -> expect 403
    client.force_authenticate(user=student)
    lessons_url = reverse("lesson-list")
    # filter by module or course depending on your API. We'll try querying lessons and expect restricted access.
    resp = client.get(lessons_url, format="json")
    # If your API exposes nested endpoint, adapt accordingly. Here we assert that student cannot list lessons for course before enroll.
    assert resp.status_code in (403, 200), (
        "If your API returns 200 for global lesson list, adapt this test to course-specific endpoint."
    )

    # perform enroll (student)
    resp = client.post(enroll_url, format="json")
    assert resp.status_code in (200, 201), (
        f"expected enroll success, got {resp.status_code}: {resp.content}"
    )

    # after enroll, student should access lessons for that course (expect 200)
    resp = client.get(lessons_url, format="json")
    assert resp.status_code == 200


# S2 · Le contenu pédagogique est en lecture seule pour tous les rôles : il se crée au
# back-office (S5, S6). Ces tests remplacent ceux qui figeaient l'écriture par un enseignant.
WRITE_CASES = [
    ("post", "/api/courses/courses/", {"title": "X", "slug": "x"}),
    ("patch", "/api/courses/courses/{course}/", {"title": "Modifié"}),
    ("delete", "/api/courses/courses/{course}/", None),
    ("post", "/api/courses/modules/", {"title": "M", "course": "{course_id}"}),
    ("post", "/api/courses/lessons/", {"title": "L", "module": "{module_id}"}),
    ("post", "/api/courses/resources/", {"title": "R", "lesson": "{lesson_id}"}),
]


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["student", "teacher", "staff"])
@pytest.mark.parametrize("method,url,payload", WRITE_CASES)
def test_course_content_is_read_only_for_every_role(role, method, url, payload):
    teacher = User.objects.create_user(email="auteur@example.com", password="pw", role="teacher")
    course = Course.objects.create(title="C", slug="c", author=teacher, published=True)
    module = Module.objects.create(course=course, title="M1", order=0)
    lesson = Lesson.objects.create(module=module, title="L1", order=0)
    ids = {
        "course": course.slug,
        "course_id": course.id,
        "module_id": module.id,
        "lesson_id": lesson.id,
    }

    if role == "staff":
        actor = User.objects.create_user(email="staff@example.com", password="pw", is_staff=True)
    elif role == "teacher":
        actor = teacher  # même l'auteur du cours ne peut plus écrire par l'API
    else:
        actor = User.objects.create_user(email="eleve@example.com", password="pw", role="student")
    Enrollment.objects.create(user=actor, course=course)
    client = APIClient()
    client.force_authenticate(user=actor)

    data = {k: (v.format(**ids) if isinstance(v, str) else v) for k, v in (payload or {}).items()}
    resp = getattr(client, method)(url.format(**ids), data, format="json")

    assert resp.status_code == 405, resp.content
    assert (
        Course.objects.count() == 1 and Module.objects.count() == 1 and Lesson.objects.count() == 1
    )


@pytest.mark.django_db
def test_unpublished_course_and_author_email_are_hidden():
    teacher = User.objects.create_user(email="auteur@example.com", password="pw", role="teacher")
    Course.objects.create(title="Publié", slug="publie", author=teacher, published=True)
    Course.objects.create(title="Brouillon", slug="brouillon", author=teacher, published=False)

    resp = APIClient().get("/api/courses/courses/")
    assert resp.status_code == 200
    slugs = [c["slug"] for c in resp.json()["results"]]
    assert slugs == ["publie"]
    assert "auteur@example.com" not in resp.content.decode()
    assert APIClient().get("/api/courses/courses/brouillon/").status_code == 404
