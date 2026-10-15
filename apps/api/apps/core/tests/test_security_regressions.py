"""
Non-régression des failles de sécurité de l'API existante (CONSTATS §2.1, PLAN-API · API-0).

Chaque test fige la correction d'une faille : il doit échouer si la surface est rouverte.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory, StaffFactory

User = get_user_model()


@pytest.fixture
def user(db):
    return LearnerFactory()


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
        "/api/public/user/login", {"email": "x@example.com", "password": "secret123"}, format="json"
    )
    assert resp.status_code == 404


@pytest.mark.django_db
def test_s12_token_header_does_not_authenticate(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Token 0123456789abcdef")
    assert client.get("/api/accounts/me/").status_code == 401


# --- Surfaces inutilisées : API navigable, messagerie, fichiers, Path -------------------


@pytest.mark.parametrize(
    "url",
    [
        "/api/",  # api_root
        "/api-auth/login/",  # connexion de l'API navigable de DRF
        "/api/messaging/conversations/",
        "/api/messaging/messages/",
        "/api/messaging/attachments/",
        "/api/messaging/notifications/",  # messagerie supprimée (C15)
        "/api/files",
        "/api/user/files/create-signed-file",
        "/api/courses/paths/",
        # Vues racines et suffixes de format des routeurs DRF (D5 : /api/<domaine>/…/ uniquement)
        "/api/courses/",
        "/api/learning/",
        "/api/payments/",
        "/api/analytics/",
        "/api/courses/courses.json",
        # Ancienne app `courses`, remplacée par `catalog` (API-L1.1)
        "/api/courses/courses/",
        "/api/courses/lessons/",
        "/api/courses/resources/",
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
    from apps.catalog.tests.factories import MissionFactory

    mission = MissionFactory(
        level__project__course__paid=True,
        blocks=[{"type": "text", "text": "CONTENU-SECRET"}],
    )
    return mission.level.project.course


@pytest.mark.django_db
def test_s6_mission_content_is_never_served_publicly(paid_course, user):
    # Le contenu des missions n'est servi qu'à un inscrit (API-L3a) ; les routes de `courses` ont disparu.
    for client in (APIClient(), APIClient()):
        for url in (f"/api/courses/courses/{paid_course.slug}/", "/api/courses/lessons/"):
            resp = client.get(url)
            assert resp.status_code == 404 and "CONTENU-SECRET" not in resp.content.decode()
        client.force_authenticate(user)

    # Le catalogue public donne le plan du parcours, jamais le contenu des missions (D11, API-L1.2).
    detail = APIClient().get(f"/api/catalog/courses/{paid_course.slug}/")
    assert detail.status_code == 200 and "CONTENU-SECRET" not in detail.content.decode()

    # En appel direct, sans inscription : `NOT_ENROLLED`, sans contenu (API-L3a.1).
    mission = paid_course.projects.get().levels.get().missions.get()
    client = APIClient()
    client.force_authenticate(user)
    resp = client.get(f"/api/learning/missions/{mission.id}/")
    assert resp.json()["code"] == "NOT_ENROLLED" and "CONTENU-SECRET" not in resp.content.decode()


# --- S7 · Inscription gratuite à un parcours payant ----------------------------------------


@pytest.mark.django_db
def test_s7_paid_course_cannot_be_enrolled_for_free(paid_course, user):
    from apps.learning.models import Enrollment

    client = APIClient()
    client.force_authenticate(user)
    resp = client.post(
        "/api/learning/enrollments/", {"courseSlug": paid_course.slug}, format="json"
    )

    assert resp.status_code == 402 and resp.json()["code"] == "PAYMENT_REQUIRED"
    assert not Enrollment.objects.filter(learner=user).exists()


# --- S4 · Listes non filtrées par propriétaire ----------------------------------------------


@pytest.mark.django_db
def test_s4_lists_only_return_the_callers_objects(user):
    from apps.learning.tests.factories import EnrollmentFactory
    from apps.notifications.tests.factories import NotificationFactory
    from apps.payments.models import Order, Payment

    other = LearnerFactory()
    EnrollmentFactory(learner=other)
    order = Order.objects.create(user=other, reference="REF-AUTRE", total=1000)
    Payment.objects.create(order=order, provider="kkiapay", amount=1000)
    NotificationFactory(user=other, title="Privée")

    client = APIClient()
    client.force_authenticate(user)
    for url in [
        "/api/learning/enrollments/",
        "/api/payments/orders/",
        "/api/payments/payments/",
        "/api/notifications/",
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
            "/api/auth/login/",
            {"identifier": user.username, "password": "mauvais"},
            format="json",
        )
        assert resp.status_code == 400
    resp = client.post(
        "/api/auth/login/",
        {"identifier": user.username, "password": "mauvais"},
        format="json",
    )
    assert resp.status_code == 429
    assert resp.json()["code"] == "THROTTLED"


@pytest.mark.django_db
def test_errors_use_the_single_format_in_french(user):
    resp = APIClient().post(
        "/api/auth/login/",
        {"identifier": user.username, "password": "mauvais"},
        format="json",
    )
    body = resp.json()
    assert body == {
        "code": "INVALID_CREDENTIALS",
        "message": "Identifiant ou mot de passe incorrect.",
    }

    invalid = APIClient().post("/api/auth/login/", {}, format="json").json()
    assert set(invalid) == {"code", "message", "fields"}
    assert invalid["code"] == "VALIDATION_ERROR"
    assert invalid["fields"]["identifier"] == [
        {"code": "REQUIRED", "message": "Ce champ est obligatoire."}
    ]

    client = APIClient()
    client.force_authenticate(user)
    not_found = client.get("/api/payments/orders/999999/").json()
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
    from apps.analytics.models import TrackingEvent

    other = LearnerFactory()
    anonymous = APIClient()
    resp = anonymous.post(
        "/api/analytics/events/", {"eventType": "view", "user": other.id}, format="json"
    )
    assert resp.status_code == 201
    assert TrackingEvent.objects.get().user is None  # l'utilisateur fourni par le client est ignoré

    event_id = TrackingEvent.objects.get().id
    assert anonymous.get("/api/analytics/events/").status_code == 405
    assert anonymous.delete(f"/api/analytics/events/{event_id}/").status_code in (404, 405)
    assert TrackingEvent.objects.filter(id=event_id).exists()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "url", ["/api/analytics/dashboard/summary/", "/api/analytics/export/events/"]
)
def test_s3_dashboard_and_export_are_staff_only(user, url):
    client = APIClient()
    client.force_authenticate(user)
    assert client.get(url).status_code == 403
    client.force_authenticate(StaffFactory(email="staff@example.com"))
    assert client.get(url).status_code == 200
