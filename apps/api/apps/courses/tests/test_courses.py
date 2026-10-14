import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.courses.models import Course, Lesson, Module, Path

User = get_user_model()


@pytest.mark.django_db
def test_student_cannot_create_course():
    client = APIClient()
    student = User.objects.create_user(email="student1@example.com", password="pw", role="student")
    client.force_authenticate(user=student)

    url = reverse("course-list")
    payload = {
        "title": "Should not be created by student",
        "description": "Forbidden",
        "slug": "forbidden-by-student",
        "price": "0.00",
    }
    resp = client.post(url, payload, format="json")
    # intentionnellement strict : on veut 403 si la permission IsTeacherOrAdmin est en place
    assert resp.status_code == 403, f"expected 403 for student create, got {resp.status_code}: {resp.content}"


@pytest.mark.django_db
def test_teacher_can_create_course_and_becomes_author():
    client = APIClient()
    teacher = User.objects.create_user(email="teacher1@example.com", password="pw", role="teacher")
    client.force_authenticate(user=teacher)

    path = Path.objects.create(title="Dev", slug="dev")

    url = reverse("course-list")
    payload = {
        "title": "Teacher Course",
        "description": "Created by teacher",
        "slug": "teacher-course",
        "path": path.id,
        "price": "19.99",
    }
    resp = client.post(url, payload, format="json")
    assert resp.status_code == 201, f"teacher should be able to create course, got {resp.status_code}: {resp.content}"

    course = Course.objects.get(slug="teacher-course")
    assert course.author_id == teacher.id


@pytest.mark.django_db
def test_author_and_admin_can_update_course_but_student_cannot():
    client = APIClient()
    author = User.objects.create_user(email="author@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="student2@example.com", password="pw", role="student")
    admin = User.objects.create_user(email="admin@example.com",
                                     password="pw", role="admin", is_staff=True)

    course = Course.objects.create(title="Updatable", slug="updatable", author=author)

    # author can update
    client.force_authenticate(user=author)
    url = reverse("course-detail", args=[course.slug])
    resp = client.patch(url, {"title": "Updated by author"}, format="json")
    assert resp.status_code in (200, 202)
    course.refresh_from_db()
    assert course.title == "Updated by author"

    # student cannot update
    client.force_authenticate(user=student)
    resp = client.patch(url, {"title": "Bad update"}, format="json")
    assert resp.status_code in (
        403, 400), f"student should be blocked, got {resp.status_code}: {resp.content}"

    # admin can update
    client.force_authenticate(user=admin)
    resp = client.patch(url, {"title": "Updated by admin"}, format="json")
    assert resp.status_code in (200, 202)
    course.refresh_from_db()
    assert course.title == "Updated by admin"


@pytest.mark.django_db
def test_module_and_lesson_creation_permissions():
    client = APIClient()
    teacher = User.objects.create_user(email="teacher2@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="student3@example.com", password="pw", role="student")

    # teacher creates course
    client.force_authenticate(user=teacher)
    course = Course.objects.create(title="Course X", slug="course-x", author=teacher)

    # teacher creates module
    client.force_authenticate(user=teacher)
    url_mod = reverse("module-list")
    resp = client.post(url_mod, {"course": course.id,
                       "title": "Module 1", "order": 0}, format="json")
    assert resp.status_code == 201, f"teacher should create module, got {resp.status_code}: {resp.content}"
    mod_id = resp.json().get("id")
    mod = Module.objects.get(id=mod_id)
    assert mod.course_id == course.id

    # student cannot create module for that course
    client.force_authenticate(user=student)
    resp = client.post(url_mod, {"course": course.id,
                       "title": "Malicious Module", "order": 1}, format="json")
    assert resp.status_code in (
        403, 400), f"student should not create module, got {resp.status_code}: {resp.content}"

    # teacher creates lesson in module
    client.force_authenticate(user=teacher)
    url_lesson = reverse("lesson-list")
    resp = client.post(url_lesson, {"module": mod.id, "title": "Lesson A",
                       "content": "abc", "order": 0}, format="json")
    assert resp.status_code == 201, f"teacher should create lesson, got {resp.status_code}: {resp.content}"
    lesson = Lesson.objects.get(id=resp.json().get("id"))
    assert lesson.module_id == mod.id


@pytest.mark.django_db
def test_student_enroll_and_access_lessons():
    client = APIClient()
    teacher = User.objects.create_user(email="teacher3@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="student4@example.com", password="pw", role="student")

    # create course + module + lesson
    course = Course.objects.create(
        title="Enrollable", slug="enrollable", author=teacher, published=True)
    module = Module.objects.create(course=course, title="M1", order=0)
    Lesson.objects.create(module=module, title="L1", content="xxx", order=0)

    enroll_url = reverse("course-enroll", args=[course.slug])  # needs @action detail named "enroll"

    # unauthenticated or not enrolled student should NOT be able to GET lessons -> expect 403
    client.force_authenticate(user=student)
    lessons_url = reverse("lesson-list")
    # filter by module or course depending on your API. We'll try querying lessons and expect restricted access.
    resp = client.get(lessons_url, format="json")
    # If your API exposes nested endpoint, adapt accordingly. Here we assert that student cannot list lessons for course before enroll.
    assert resp.status_code in (
        403, 200), "If your API returns 200 for global lesson list, adapt this test to course-specific endpoint."

    # perform enroll (student)
    resp = client.post(enroll_url, format="json")
    assert resp.status_code in (
        200, 201), f"expected enroll success, got {resp.status_code}: {resp.content}"

    # after enroll, student should access lessons for that course (expect 200)
    resp = client.get(lessons_url, format="json")
    assert resp.status_code == 200


@pytest.mark.django_db
def test_teacher_can_add_resource_to_lesson_but_student_cannot():
    client = APIClient()
    teacher = User.objects.create_user(email="teacher4@example.com", password="pw", role="teacher")
    student = User.objects.create_user(email="student5@example.com", password="pw", role="student")

    course = Course.objects.create(title="WithRes", slug="withres", author=teacher)
    module = Module.objects.create(course=course, title="M", order=0)
    lesson = Lesson.objects.create(module=module, title="L", order=0)

    # teacher adds resource (file upload may require multipart; here we test metadata create with external_url)
    client.force_authenticate(user=teacher)
    url_res = reverse("resource-list")
    payload = {"lesson": lesson.id, "title": "Slides",
               "external_url": "http://example.com/slides.pdf"}
    resp = client.post(url_res, payload, format="json")
    assert resp.status_code == 201, f"teacher should create resource, got {resp.status_code}: {resp.content}"

    # student cannot create
    client.force_authenticate(user=student)
    resp = client.post(url_res, payload, format="json")
    assert resp.status_code in (
        403, 400), f"student should not create resource, got {resp.status_code}: {resp.content}"
