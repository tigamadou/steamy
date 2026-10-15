"""
Matrice d'accès du domaine `learning` : endpoint × persona → statut attendu (PLAN-API, règles de l'API).

Réservé à l'apprenant connecté : anonyme 401, parent, enseignant et personnel 403. L'apprenant de la matrice est
inscrit au parcours `suivi` (première mission disponible) ; l'objet d'un autre apprenant n'existe pas pour lui.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import (
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)
from apps.catalog.models import Quiz

from .factories import EnrollmentFactory, build_course, missions_of

PERSONAS = {
    "anonyme": None,
    "apprenant": "learner",
    "parent": ParentFactory,
    "enseignant": TeacherFactory,
    "personnel": StaffFactory,
}


def matrix(ids):
    first, locked = ids["first"], ids["locked"]
    return [
        ("get", "/api/learning/enrollments/", 200),
        ("post", "/api/learning/enrollments/", 200),  # déjà inscrit
        ("get", "/api/learning/enrollments/suivi/tree/", 200),
        ("get", "/api/learning/enrollments/autre/tree/", 403),  # NOT_ENROLLED
        ("get", f"/api/learning/projects/{first.level.project_id}/", 200),
        ("get", f"/api/learning/levels/{first.level_id}/", 200),
        ("get", f"/api/learning/missions/{first.id}/", 200),
        ("get", f"/api/learning/missions/{locked.id}/", 403),  # CONTENT_LOCKED
        ("post", f"/api/learning/missions/{first.id}/complete/", 200),
        ("get", f"/api/learning/quizzes/{ids['quiz']}/", 403),  # CONTENT_LOCKED
        ("post", f"/api/learning/quizzes/{ids['quiz']}/attempts/", 403),
        ("get", "/api/learning/attempts/", 200),
        ("get", "/api/learning/attempts/999999/", 404),
        ("post", "/api/learning/activity/", 200),
        ("get", "/api/learning/badges/", 200),
        ("get", "/api/learning/certificates/", 200),
        ("get", "/api/learning/certificates/999999/download/", 404),
        ("get", "/api/learning/dashboard/", 200),
        ("get", "/api/learning/progress/", 200),
        ("get", "/api/learning/recommendations/", 200),
        ("delete", "/api/learning/enrollments/", 405),
        ("put", f"/api/learning/missions/{first.id}/", 405),
    ]


@pytest.mark.django_db
@pytest.mark.parametrize("persona", PERSONAS)
def test_learning_access_matrix(persona):
    learner = LearnerFactory()
    course = build_course(slug="suivi", projects=1, levels=1, missions=2, quizzes=True)
    build_course(slug="autre", projects=1, levels=1, missions=1)
    EnrollmentFactory(learner=learner, course=course)
    first, locked = missions_of(course)
    client = APIClient()
    if persona == "apprenant":
        client.force_authenticate(learner)
    elif PERSONAS[persona]:
        client.force_authenticate(PERSONAS[persona]())

    quiz = Quiz.objects.get(level__project__course=course)
    bodies = {
        "/api/learning/enrollments/": {"courseSlug": "suivi"},
        "/api/learning/activity/": {"missionId": first.id, "seconds": 30},
        f"/api/learning/quizzes/{quiz.id}/attempts/": {"answers": []},
    }
    for method, url, learner_status in matrix({"first": first, "locked": locked, "quiz": quiz.id}):
        body = bodies.get(url, {}) if method == "post" else {}
        resp = getattr(client, method)(url, body, format="json")
        expected = {"anonyme": 401, "apprenant": learner_status}.get(persona, 403)
        assert resp.status_code == expected, (persona, method, url, resp.content)
