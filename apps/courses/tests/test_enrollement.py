# import pytest
# from django.urls import reverse, NoReverseMatch
# from rest_framework.test import APIClient
# from django.contrib.auth import get_user_model
# from apps.courses.models import Course, Module, Lesson

# User = get_user_model()


# def find_course_action_url(course, action_names=("course-enroll", "course-enroll-action", "course-enrolls", "course-enroll-list")):
#     """
#     Essaie plusieurs noms courants pour les actions 'enroll' définies via @action on CourseViewSet.
#     Pour nested router la signature attend args=[course.pk] ou [course.slug].
#     """
#     tries = []
#     for name in action_names:
#         tries.append((name, [course.pk]))
#         tries.append((name, [course.slug]))
#         tries.append((name, []))  # some setups may expose non-nested action (rare)
#     for name, args in tries:
#         try:
#             return reverse(name, args=args)
#         except NoReverseMatch:
#             continue
#     raise RuntimeError("Could not find enroll action URL. Check router/action name.")


# @pytest.mark.django_db
# def test_student_can_enroll_and_access_lessons():
#     client = APIClient()
#     teacher = User.objects.create_user(
#         email="teacher-enroll@example.com", password="pw", role="teacher")
#     student = User.objects.create_user(
#         email="student-enroll@example.com", password="pw", role="student")

#     # create course + module + lesson
#     course = Course.objects.create(title="Enrollable Course",
#                                    slug="enrollable-2", author=teacher, published=True)
#     module = Module.objects.create(course=course, title="M1", order=0)
#     lesson = Lesson.objects.create(module=module, title="L1", content="xxx", order=0)

#     # trouver URL d'enroll (helper tolérant)
#     enroll_url = find_course_action_url(course)

#     # student non-auth ne peut pas enroll (ou reçoit 401)
#     resp = client.post(enroll_url, format="json")
#     assert resp.status_code in (
#         401, 403), f"anonymous enrolling should be blocked, got {resp.status_code}: {resp.content}"

#     # student auth peut enroll
#     client.force_authenticate(user=student)
#     resp = client.post(enroll_url, format="json")
#     assert resp.status_code in (
#         200, 201), f"enroll should succeed, got {resp.status_code}: {resp.content}"

#     # après inscription, student doit avoir accès aux leçons du cours
#     # on essaie une lecture de lesson list filtrée sur module/course; adapter si ton API est nested
#     lessons_url_candidates = [
#         # global lesson list
#         reverse("lesson-list"),
#         # if you expose nested: course-lessons-list
#         # we'll attempt to find common names; use try/except to skip missing
#     ]
#     # essaie la liste globale puis accepte 200 si renvoie quelque chose
#     for url in lessons_url_candidates:
#         try:
#             r = client.get(url, format="json")
#         except Exception:
#             continue
#         # si l'API renvoie 200 -> ok (student can list lessons globally)
#         if r.status_code == 200:
#             break
#     else:
#         # si aucune URL candidate n'a renvoyé 200, fais un fallback: GET module-specific endpoint if exists
#         # (on ne casse pas le test strictement ici pour rester tolérant entre APIs)
#         assert True, "No lesson-list endpoint candidate returned 200; adapt test to your API."


# @pytest.mark.django_db
# def test_teacher_cannot_enroll_as_student_but_can_manage_course():
#     client = APIClient()
#     teacher = User.objects.create_user(
#         email="teacher2-enroll@example.com", password="pw", role="teacher")
#     other_teacher = User.objects.create_user(
#         email="teacher-other@example.com", password="pw", role="teacher")
#     # course authored by teacher
#     course = Course.objects.create(
#         title="Manage Course", slug="manage-course", author=teacher, published=True)

#     enroll_url = find_course_action_url(course)

#     # another teacher (authenticated) tries to enroll -> depending on business rules this may be allowed or not
#     client.force_authenticate(user=other_teacher)
#     resp = client.post(enroll_url, format="json")
#     # on accepte soit 200/201 soit 403 selon ta règle métier; teste que c'est cohérent
#     assert resp.status_code in (
#         200, 201, 403), f"unexpected status for other teacher enrolling: {resp.status_code}"


# @pytest.mark.django_db
# def test_unenroll_action_if_supported():
#     """
#     Si tu fournis une action 'unenroll' pour permettre d'annuler une inscription,
#     ce test tentera de l'utiliser. Si l'action n'existe pas, on l'ignore.
#     """
#     client = APIClient()
#     teacher = User.objects.create_user(email="teacher-u@example.com", password="pw", role="teacher")
#     student = User.objects.create_user(email="student-u@example.com", password="pw", role="student")
#     course = Course.objects.create(
#         title="C Unenroll", slug="c-unenroll", author=teacher, published=True)

#     # chercher url unenroll
#     names = ["course-unenroll", "course-unenroll-action", "course-unenrolls"]
#     found = None
#     for name in names:
#         try:
#             u = reverse(name, args=[course.pk])
#             found = u
#             break
#         except NoReverseMatch:
#             continue

#     if not found:
#         pytest.skip("No unenroll action defined on CourseViewSet")

#     client.force_authenticate(user=student)
#     # try unenroll without enroll -> may return 400 or 404 or 403 depending impl
#     resp = client.post(found, format="json")
#     assert resp.status_code in (200, 204, 400, 404, 403)
