"""Modèle du catalogue (SPEC-TECHNIQUE §3.2) : invariants et validation de la saisie du groupe Contenu."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.catalog.models import Category, Course
from apps.catalog.validators import validate_mission_blocks, validate_string_list

from .factories import CategoryFactory, CourseFactory, MissionFactory

pytestmark = pytest.mark.django_db


def test_hierarchy_is_ordered_and_named():
    mission = MissionFactory(title="Identifier les moteurs")
    level, project, course = mission.level, mission.level.project, mission.level.project.course
    assert (
        str(mission) == f"{course.title} · {project.title} · {level.title} · Identifier les moteurs"
    )
    assert str(course.category) == course.category.label
    assert list(course.projects.all()) == [project]
    assert course.is_published


def test_categories_are_sorted_by_order():
    CategoryFactory(slug="b", order=2)
    CategoryFactory(slug="a", order=1)
    assert list(Category.objects.values_list("slug", flat=True)) == ["a", "b"]


@pytest.mark.parametrize(("is_free", "price"), [(True, 5000), (False, 0)])
def test_free_iff_no_price(is_free, price):
    with pytest.raises(IntegrityError):
        CourseFactory(is_free=is_free, price=price)


def test_draft_is_the_default_status():
    course = Course(title="Brouillon")
    assert course.status == Course.Status.DRAFT and not course.is_published


def test_category_in_use_cannot_be_deleted():
    course = CourseFactory()
    with pytest.raises(IntegrityError):
        course.category.delete()


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("trailer_vimeo_id", "vimeo.com/123"),
        ("trailer_vimeo_hash", "abc-def"),
        ("outcomes", ["", "ok"]),
        ("prerequisites", "pas une liste"),
    ],
)
def test_course_fields_are_validated(field, value):
    course = CourseFactory.build(category=CategoryFactory(), **{field: value})
    with pytest.raises(ValidationError) as error:
        course.full_clean()
    assert field in error.value.message_dict


def test_category_color_is_validated():
    with pytest.raises(ValidationError) as error:
        CategoryFactory.build(color="violet").full_clean()
    assert "color" in error.value.message_dict


def test_valid_mission_blocks_pass():
    validate_mission_blocks(
        [
            {"type": "text", "text": "Un moteur transforme l'électricité en mouvement."},
            {"type": "media", "src": "https://cdn.steamy.test/moteur.png", "alt": "Moteur"},
            {"type": "media", "src": "catalog/moteur.png", "alt": "Moteur", "caption": "Le +"},
            {"type": "tip", "text": "Un petit + est gravé sur le moteur."},
        ]
    )
    validate_string_list([])


@pytest.mark.parametrize(
    ("blocks", "message"),
    [
        ({"type": "text"}, "liste"),
        (["texte"], "type attendu"),
        ([{"type": "video", "text": "x"}], "type attendu"),
        ([{"type": "text"}], "champs attendus"),
        ([{"type": "text", "text": "x", "src": "y"}], "champs attendus"),
        ([{"type": "tip", "text": "  "}], "vide"),
        ([{"type": "media", "src": "a.png", "alt": 3}], "vide"),
        ([{"type": "media", "src": "a.png", "alt": "A", "caption": 3}], "texte attendu"),
        ([{"type": "media", "src": "http://x.test/a.png", "alt": "A"}], "https"),
        ([{"type": "media", "src": "javascript:alert(1)", "alt": "A"}], "https"),
    ],
)
def test_invalid_mission_blocks_are_refused(blocks, message):
    with pytest.raises(ValidationError) as error:
        validate_mission_blocks(blocks)
    assert message in error.value.messages[0]


def test_mission_vimeo_fields_are_validated():
    mission = MissionFactory.build(level=MissionFactory().level, vimeo_id="abc", vimeo_hash="a/b")
    with pytest.raises(ValidationError) as error:
        mission.full_clean()
    assert {"vimeo_id", "vimeo_hash"} <= set(error.value.message_dict)
