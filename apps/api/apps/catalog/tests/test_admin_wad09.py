"""
WAD09 · Contenu des parcours dans l'admin Django (LOT-6 6.3) : groupe Contenu seul en écriture, publication refusée
sur un arbre incomplet, dépublication confirmée quand le parcours a des inscrits, statut jamais modifiable à la main,
quiz rattaché à exactement un niveau ou un projet, prix modifiable sans effet sur les commandes passées.
"""

import pytest
from django.contrib.auth.models import Permission
from django.contrib.messages import get_messages
from django.urls import reverse
from rest_framework.test import APIClient

from apps.catalog.models import Course, Mission, Quiz
from apps.catalog.publication import publication_problems
from apps.core.groups import CONTENT, FINANCE, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import verified_client
from apps.learning.tests.factories import EnrollmentFactory
from apps.payments.tests.factories import OrderItemFactory

from .factories import (
    CourseFactory,
    LevelFactory,
    MissionFactory,
    ProjectFactory,
    QuizFactory,
    add_questions,
)

pytestmark = pytest.mark.django_db

CHANGELIST = reverse("admin:catalog_course_changelist")


@pytest.fixture
def content(client):
    verified_client(client, CONTENT)
    return client


def complete_course(**fields) -> Course:
    """Parcours publiable : un projet (sommative), un niveau (formative), deux missions (vidéo, blocs)."""
    course = CourseFactory(draft=True, **fields)
    project = ProjectFactory(course=course, title="Robot suiveur")
    level = LevelFactory(project=project, title="Capteurs")
    MissionFactory(level=level, title="Vidéo", vimeo_id="76979871")
    MissionFactory(
        level=level, title="Lecture", vimeo_id="", blocks=[{"type": "text", "text": "Bonjour"}]
    )
    add_questions(QuizFactory(level=level))
    add_questions(QuizFactory(summative=True, project=project))
    return course


def act(client, action, courses, **extra):
    return client.post(
        CHANGELIST,
        {"action": action, "_selected_action": [course.pk for course in courses], **extra},
        follow=True,
    )


def texts(response):
    return [str(message) for message in get_messages(response.wsgi_request)]


# --- Accès ------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("group", [SUPPORT, FINANCE])
def test_only_content_writes_the_catalog(group):
    course = CourseFactory()
    other = APIClient()
    verified_client(other, group)
    change = reverse("admin:catalog_course_change", args=[course.pk])
    # Lecture éventuelle selon la matrice D71, jamais d'écriture
    assert other.get(reverse("admin:catalog_course_add")).status_code == 403
    assert other.post(change, {"title": "Modifié"}).status_code == 403
    course.refresh_from_db()
    assert course.title != "Modifié"


def test_content_lists_courses_with_access_kit_and_enrollments(content):
    course = CourseFactory(paid=True, title="Arduino")
    EnrollmentFactory(course=course)
    CourseFactory(title="Scratch")
    body = content.get(CHANGELIST).content.decode()
    assert "Payant · 15 000 FCFA" in body and "Gratuit" in body
    assert content.get(CHANGELIST, {"o": "6"}).status_code == 200  # tri par inscrits
    assert content.get(CHANGELIST, {"required_kit__isempty": "1"}).status_code == 200
    assert content.get(CHANGELIST, {"o": "4"}).status_code == 200  # tri par accès


# --- Publication ------------------------------------------------------------------------------------------


def test_a_complete_course_is_published_and_audited(content):
    course = complete_course()
    assert publication_problems(course) == []
    response = act(content, "publish", [course])
    assert "1 parcours publié." in texts(response)
    course.refresh_from_db()
    assert course.status == Course.Status.PUBLISHED
    assert AuditLog.objects.filter(
        action="catalog.course_published", target_id=str(course.pk)
    ).exists()


def test_an_incomplete_tree_is_refused_with_its_reasons(content):
    course = complete_course(title="Incomplet")
    project = course.projects.get()
    level = project.levels.get()
    Mission.objects.filter(level=level, title="Lecture").update(blocks=[])
    Quiz.objects.get(level=level).questions.all().delete()
    Quiz.objects.get(project=project).delete()
    LevelFactory(project=project, title="Vide")
    ProjectFactory(course=course, title="Sans niveau")
    response = act(content, "publish", [course])
    [message] = texts(response)
    for reason in (
        "La mission « Lecture » n'a ni vidéo ni contenu.",
        "Le niveau « Capteurs » n'a pas de quiz formatif avec des questions.",
        "Le projet « Robot suiveur » n'a pas d'évaluation sommative avec des questions.",
        "Le niveau « Vide » n'a aucune mission.",
        "Le projet « Sans niveau » n'a aucun niveau.",
    ):
        assert reason.replace("'", "&#x27;") in message or reason in message
    course.refresh_from_db()
    assert course.status == Course.Status.DRAFT


def test_a_course_without_project_is_refused():
    assert publication_problems(CourseFactory(draft=True)) == ["Le parcours n'a aucun projet."]


def test_publishing_requires_the_publish_permission():
    course = complete_course()
    editor = APIClient()
    staff = verified_client(editor)
    staff.user_permissions.add(
        *Permission.objects.filter(
            codename__in=["view_course", "change_course"], content_type__app_label="catalog"
        )
    )
    response = act(editor, "publish", [course])
    assert response.status_code == 200
    course.refresh_from_db()
    assert course.status == Course.Status.DRAFT


def test_the_status_is_never_edited_by_hand(content):
    course = complete_course()
    change = reverse("admin:catalog_course_change", args=[course.pk])
    page = content.get(change).content.decode()
    assert 'name="status"' not in page


# --- Dépublication ----------------------------------------------------------------------------------------


def test_unpublishing_without_enrollment_is_immediate(content):
    course = CourseFactory()
    response = act(content, "unpublish", [course])
    assert "1 parcours repassé en brouillon." in texts(response)
    course.refresh_from_db()
    assert course.status == Course.Status.DRAFT
    assert AuditLog.objects.filter(action="catalog.course_unpublished").exists()


def test_unpublishing_a_followed_course_asks_for_confirmation(content):
    course = CourseFactory(title="Suivi")
    EnrollmentFactory(course=course)
    response = act(content, "unpublish", [course])
    body = response.content.decode()
    assert "Repasser en brouillon des parcours suivis" in body and "Je confirme" in body
    course.refresh_from_db()
    assert course.status == Course.Status.PUBLISHED

    # Sans la case cochée : toujours rien
    act(content, "unpublish", [course], apply="1")
    course.refresh_from_db()
    assert course.status == Course.Status.PUBLISHED

    response = act(content, "unpublish", [course], apply="1", confirm="on")
    assert "1 parcours repassé en brouillon." in texts(response)
    course.refresh_from_db()
    assert course.status == Course.Status.DRAFT


# --- Arbre, quiz, missions ----------------------------------------------------------------------------------


def test_chained_pages_show_the_path_to_the_parents(content):
    course = complete_course(title="Arduino")
    project = course.projects.get()
    level = project.levels.get()
    mission = level.missions.get(title="Vidéo")
    project_page = content.get(
        reverse("admin:catalog_project_change", args=[project.pk])
    ).content.decode()
    assert reverse("admin:catalog_course_change", args=[course.pk]) in project_page
    level_page = content.get(
        reverse("admin:catalog_level_change", args=[level.pk])
    ).content.decode()
    assert reverse("admin:catalog_project_change", args=[project.pk]) in level_page
    mission_page = content.get(
        reverse("admin:catalog_mission_change", args=[mission.pk])
    ).content.decode()
    assert reverse("admin:catalog_level_change", args=[level.pk]) in mission_page
    for model in ("project", "level", "mission"):
        assert content.get(reverse(f"admin:catalog_{model}_add")).status_code == 200


@pytest.mark.parametrize(
    ("vimeo_id", "vimeo_hash", "expected"),
    [
        ("76979871", "", 'src="https://player.vimeo.com/video/76979871"'),
        ("76979871", "abc123", 'src="https://player.vimeo.com/video/76979871?h=abc123"'),
        ("", "", "Aucune vidéo."),
    ],
)
def test_mission_shows_a_vimeo_preview(content, vimeo_id, vimeo_hash, expected):
    mission = MissionFactory(vimeo_id=vimeo_id, vimeo_hash=vimeo_hash)
    page = content.get(reverse("admin:catalog_mission_change", args=[mission.pk])).content.decode()
    assert expected in page
    assert content.get(reverse("admin:catalog_mission_changelist")).status_code == 200


def test_a_quiz_on_both_or_neither_target_is_refused(content):
    level = LevelFactory()
    project = level.project
    add = reverse("admin:catalog_quiz_add")
    management = {
        "questions-TOTAL_FORMS": "0",
        "questions-INITIAL_FORMS": "0",
        "questions-MIN_NUM_FORMS": "0",
        "questions-MAX_NUM_FORMS": "1000",
    }
    for target in ({"level": level.pk, "project": project.pk}, {}):
        response = content.post(add, {"kind": "formative", **target, **management})
        assert response.status_code == 200
        assert (
            "Une formative se rattache à un niveau, une sommative à un projet."
            in response.content.decode()
        )
    assert not Quiz.objects.exists()
    response = content.post(add, {"kind": "formative", "level": level.pk, **management})
    assert response.status_code == 302 and Quiz.objects.get().pass_threshold == 70


def test_changing_a_price_leaves_past_orders_untouched(content):
    item = OrderItemFactory()
    course = item.course
    Course.objects.filter(pk=course.pk).update(price=25000)
    item.refresh_from_db()
    assert (item.unit_price, item.total) == (15000, 15000)
