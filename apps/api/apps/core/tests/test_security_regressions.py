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
    assert via_course.json()["code"] == via_learning.json()["code"] == "PAYMENT_REQUIRED"
    assert not Enrollment.objects.filter(user=user).exists()


# --- S4 · Listes non filtrées par propriétaire ----------------------------------------------


@pytest.mark.django_db
def test_s4_lists_only_return_the_callers_objects(user):
    from apps.courses.models import Course
    from apps.learning.models import Attempt, Certificate, Enrollment, Quiz
    from apps.messaging.models import Notification
    from apps.payments.models import Order, Payment

    other = User.objects.create_user(email="autre@example.com", password="secret123")
    course = Course.objects.create(title="Gratuit", slug="gratuit", published=True, price=0)
    enrollment = Enrollment.objects.create(user=other, course=course)
    Certificate.objects.create(enrollment=enrollment, score=90)
    Attempt.objects.create(user=other, quiz=Quiz.objects.create(course=course, title="Q"))
    order = Order.objects.create(user=other, reference="REF-AUTRE", total=1000)
    Payment.objects.create(order=order, provider="kkiapay", amount=1000)
    Notification.objects.create(user=other, title="Privée", body="x")

    client = APIClient()
    client.force_authenticate(user)
    for url in [
        "/api/learning/enrollments/",
        "/api/learning/progress/",
        "/api/learning/attempts/",
        "/api/learning/certificates/",
        "/api/payments/orders/",
        "/api/payments/payments/",
        "/api/messaging/notifications/",
    ]:
        resp = client.get(url)
        assert resp.status_code == 200, url
        assert resp.json()["results"] == [], url

    # Et l'objet d'autrui n'existe pas pour l'appelant.
    assert client.get(f"/api/payments/orders/{order.id}/").status_code == 404


# --- S9 · Throttling, et format d'erreur unique en français (D4) ----------------------------


@pytest.mark.django_db
def test_s9_login_is_throttled_after_five_attempts(user, settings):
    client = APIClient()  # le client de test désactive le CSRF par défaut
    for _ in range(5):
        resp = client.post(
            "/api/public/user/session-login",
            {"email": user.email, "password": "mauvais"},
            format="json",
        )
        assert resp.status_code == 400
    resp = client.post(
        "/api/public/user/session-login",
        {"email": user.email, "password": "mauvais"},
        format="json",
    )
    assert resp.status_code == 429
    assert resp.json()["code"] == "THROTTLED"


@pytest.mark.django_db
def test_errors_use_the_single_format_in_french(user):
    resp = APIClient().post(
        "/api/public/user/session-login",
        {"email": user.email, "password": "mauvais"},
        format="json",
    )
    body = resp.json()
    assert set(body) == {"code", "message", "fields"}
    assert body["code"] == "VALIDATION_ERROR"
    assert body["fields"]["nonFieldErrors"] == ["Identifiant ou mot de passe incorrect."]

    not_found = APIClient().get("/api/courses/courses/inexistant/").json()
    assert not_found == {"code": "NOT_FOUND", "message": not_found["message"]}
    assert "trouvé" in not_found["message"].lower()


def test_api_docs_are_closed_unless_allowed(settings):
    # En staging et en prod, ALLOW_API_DOCS n'est pas défini : la documentation n'est pas montée.
    from django.urls import NoReverseMatch, clear_url_caches, reverse

    import project.urls

    settings.ALLOW_API_DOCS = False
    clear_url_caches()
    import importlib

    importlib.reload(project.urls)
    try:
        with pytest.raises(NoReverseMatch):
            reverse("schema")
    finally:
        settings.ALLOW_API_DOCS = True
        importlib.reload(project.urls)
        clear_url_caches()


# --- S3 · Télémétrie ouverte ----------------------------------------------------------------


@pytest.mark.django_db
def test_s3_tracking_events_are_write_only_and_not_attributable(user):
    from apps.analytics.models import Event

    other = User.objects.create_user(email="autre@example.com", password="secret123")
    anonymous = APIClient()
    resp = anonymous.post(
        "/api/analytics/events/", {"eventType": "view", "user": other.id}, format="json"
    )
    assert resp.status_code == 201
    assert Event.objects.get().user is None  # l'utilisateur fourni par le client est ignoré

    event_id = Event.objects.get().id
    assert anonymous.get("/api/analytics/events/").status_code == 405
    assert anonymous.delete(f"/api/analytics/events/{event_id}/").status_code in (404, 405)
    assert Event.objects.filter(id=event_id).exists()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "url", ["/api/analytics/dashboard/summary/", "/api/analytics/export/events.csv"]
)
def test_s3_dashboard_and_export_are_staff_only(user, url):
    client = APIClient()
    client.force_authenticate(user)
    assert client.get(url).status_code == 403
    client.force_authenticate(
        User.objects.create_user(email="staff@example.com", password="x", is_staff=True)
    )
    assert client.get(url).status_code == 200
