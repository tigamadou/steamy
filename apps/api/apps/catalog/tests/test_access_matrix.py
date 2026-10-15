"""Matrice d'accès du domaine `catalog` : endpoint × persona → statut attendu (PLAN-API, règles de l'API)."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import (
    LearnerFactory,
    ParentFactory,
    StaffFactory,
    TeacherFactory,
)

from .factories import CourseFactory

PERSONAS = {
    "anonyme": None,
    "apprenant": LearnerFactory,
    "parent": ParentFactory,
    "enseignant": TeacherFactory,
    "personnel": StaffFactory,
}
# Lecture publique pour tous ; aucune écriture, pour personne.
MATRIX = [
    ("get", "/api/catalog/categories/", 200),
    ("get", "/api/catalog/courses/", 200),
    ("get", "/api/catalog/courses/publie/", 200),
    ("get", "/api/catalog/courses/brouillon/", 404),
    ("post", "/api/catalog/courses/", 405),
    ("patch", "/api/catalog/courses/publie/", 405),
]


@pytest.mark.django_db
@pytest.mark.parametrize("persona", PERSONAS)
@pytest.mark.parametrize(("method", "url", "expected"), MATRIX)
def test_catalog_access_matrix(persona, method, url, expected):
    CourseFactory(slug="publie")
    CourseFactory(slug="brouillon", draft=True)
    client = APIClient()
    if PERSONAS[persona]:
        client.force_login(PERSONAS[persona]())
    assert getattr(client, method)(url, {}, format="json").status_code == expected
