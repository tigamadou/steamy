"""
Non-régression des failles de sécurité de l'API existante (CONSTATS §2.1, PLAN-API · API-0).

Chaque test fige la correction d'une faille : il doit échouer si la surface est rouverte.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(email="eleve@example.com", password="secret123")


# --- S1 · Inscription libre avec choix du rôle ---------------------------------------------


@pytest.mark.parametrize("url", ["/api/signup/", "/api/public/user/signup"])
@pytest.mark.django_db
def test_s1_open_signup_endpoints_are_gone(url):
    resp = APIClient().post(
        url,
        {"email": "pirate@example.com", "password": "secret123", "role": "admin"},
        format="json",
    )
    assert resp.status_code == 404
    assert not User.objects.filter(email="pirate@example.com").exists()


@pytest.mark.django_db
def test_s1_no_schema_operation_accepts_a_role():
    # Aucun corps de requête du contrat ne doit exposer le champ « role » en écriture.
    resp = APIClient().get("/api/schema/?format=json")
    if resp.status_code == 404:  # documentation fermée hors dev : rien à exposer
        return
    schema = resp.json()
    for name, component in schema["components"]["schemas"].items():
        if name.endswith("Request"):
            assert "role" not in component.get("properties", {}), name


# --- S12 · Connexion par token DRF ---------------------------------------------------------


@pytest.mark.django_db
def test_s12_token_login_is_gone(user):
    resp = APIClient().post(
        "/api/public/user/login", {"email": user.email, "password": "secret123"}, format="json"
    )
    assert resp.status_code == 404


@pytest.mark.django_db
def test_s12_token_header_does_not_authenticate(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Token 0123456789abcdef")
    assert client.get("/api/user/my-profile").status_code == 403


# --- Surfaces inutilisées : API navigable, messagerie, fichiers, Path -------------------


@pytest.mark.parametrize(
    "url",
    [
        "/api/",  # api_root
        "/api-auth/login/",  # connexion de l'API navigable de DRF
        "/api/messaging/conversations/",
        "/api/messaging/messages/",
        "/api/messaging/attachments/",
        "/api/files",
        "/api/user/files/create-signed-file",
        "/api/courses/paths/",
    ],
)
@pytest.mark.django_db
def test_unused_surfaces_are_gone(user, url):
    client = APIClient()
    client.force_authenticate(user)
    assert client.get(url).status_code == 404


def test_websocket_is_not_served():
    from project.asgi import application

    # L'application ASGI ne route plus que le HTTP (pas de ProtocolTypeRouter websocket).
    assert not hasattr(application, "application_mapping")


# --- S6 · Contenu lisible sans inscription ------------------------------------------------


@pytest.fixture
def paid_course(db):
    from apps.courses.models import Course, Lesson, Module

    course = Course.objects.create(title="Payant", slug="payant", published=True, price=5000)
    module = Module.objects.create(course=course, title="M1", order=0)
    Lesson.objects.create(module=module, title="L1", content="CONTENU-SECRET", order=0)
    return course


@pytest.mark.django_db
def test_s6_lesson_content_requires_enrollment(paid_course, user):
    anonymous = APIClient()
    assert anonymous.get("/api/courses/lessons/").status_code == 403
    # Le détail public du parcours donne le plan, jamais le contenu.
    detail = anonymous.get(f"/api/courses/courses/{paid_course.slug}/")
    assert detail.status_code == 200 and "CONTENU-SECRET" not in detail.content.decode()

    not_enrolled = APIClient()
    not_enrolled.force_authenticate(user)
    assert not_enrolled.get("/api/courses/lessons/").json()["results"] == []


# --- S7 · Inscription gratuite à un parcours payant ----------------------------------------


@pytest.mark.django_db
def test_s7_paid_course_cannot_be_enrolled_for_free(paid_course, user):
    from apps.learning.models import Enrollment

    client = APIClient()
    client.force_authenticate(user)
    via_course = client.post(f"/api/courses/courses/{paid_course.slug}/enroll/")
    via_learning = client.post(
        "/api/learning/enrollments/", {"course": paid_course.id}, format="json"
    )

    assert via_course.status_code == 402 and via_learning.status_code == 402
    assert via_course.json()["detail"]
    assert not Enrollment.objects.filter(user=user).exists()
