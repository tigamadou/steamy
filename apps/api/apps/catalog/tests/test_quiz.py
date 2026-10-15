"""Quiz du catalogue (§3.2, S2) : formative au niveau, sommative au projet, choix unique, saisie dans l'admin."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.forms.models import inlineformset_factory
from django.urls import reverse
from rest_framework.test import APIClient

from apps.catalog.admin import SingleCorrectChoiceFormSet
from apps.catalog.models import Choice, Question, Quiz
from apps.core.tests.staff import verified_client

from .factories import (
    LevelFactory,
    MissionFactory,
    ProjectFactory,
    QuestionFactory,
    QuizFactory,
    add_questions,
)

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "fields",
    [
        {"kind": "formative", "project": True},  # formative sur un projet
        {"kind": "summative", "level": True},  # sommative sur un niveau
        {"kind": "formative", "level": True, "project": True},  # deux cibles
        {"kind": "formative"},  # aucune cible
        {"kind": "formative", "level": True, "threshold": 0},
        {"kind": "formative", "level": True, "threshold": 101},
    ],
)
def test_quiz_constraints(fields):
    quiz = Quiz(
        kind=fields["kind"],
        level=LevelFactory() if fields.get("level") else None,
        project=ProjectFactory() if fields.get("project") else None,
        threshold=fields.get("threshold"),
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        quiz.save()


def test_titles_and_course():
    formative = QuizFactory(level__title="Les moteurs")
    summative = QuizFactory(summative=True, project__title="Mon robot")
    assert str(formative) == "Quiz · Les moteurs"
    assert str(summative) == "Évaluation · Mon robot"
    formative.title = "Quiz final"
    assert str(formative) == "Quiz final"
    assert formative.course_id == formative.level.project.course_id
    assert summative.course_id == summative.project.course_id
    question = QuestionFactory(quiz=formative, text="Combien de roues ?")
    choice = Choice.objects.create(question=question, text="Quatre")
    assert (str(question), str(choice)) == ("Combien de roues ?", "Quatre")


def test_remediation_mission_must_belong_to_the_same_course():
    quiz = QuizFactory()
    question = QuestionFactory(quiz=quiz)
    question.remediation_mission = MissionFactory()  # autre parcours
    with pytest.raises(ValidationError) as error:
        question.full_clean()
    assert "remediation_mission" in error.value.message_dict
    question.remediation_mission = MissionFactory(level=quiz.level)
    question.full_clean()


def formset(data):
    FormSet = inlineformset_factory(
        Question, Choice, formset=SingleCorrectChoiceFormSet, fields=("text", "is_correct", "order")
    )
    question = QuestionFactory()
    prefix = "choices"
    payload = {
        f"{prefix}-TOTAL_FORMS": str(len(data)),
        f"{prefix}-INITIAL_FORMS": "0",
        f"{prefix}-MIN_NUM_FORMS": "0",
        f"{prefix}-MAX_NUM_FORMS": "1000",
    }
    for index, (text, correct, delete) in enumerate(data):
        payload[f"{prefix}-{index}-text"] = text
        payload[f"{prefix}-{index}-order"] = str(index)
        if correct:
            payload[f"{prefix}-{index}-is_correct"] = "on"
        if delete:
            payload[f"{prefix}-{index}-DELETE"] = "on"
    return FormSet(data=payload, instance=question, prefix=prefix)


@pytest.mark.parametrize(
    ("data", "valid"),
    [
        ([("A", True, False), ("B", False, False)], True),
        ([("A", True, False), ("B", True, False)], False),
        ([("A", False, False), ("B", False, False)], False),
        ([("A", True, True), ("B", False, False)], False),  # la bonne réponse est supprimée
    ],
)
def test_admin_requires_exactly_one_correct_choice(data, valid):
    assert formset(data).is_valid() is valid


def test_quiz_and_question_admin_pages():
    quiz = QuizFactory()
    question = add_questions(quiz, count=1)[0]
    client = APIClient()
    verified_client(client, is_superuser=True)
    for url in (
        reverse("admin:catalog_quiz_changelist"),
        reverse("admin:catalog_quiz_change", args=[quiz.id]),
        reverse("admin:catalog_question_changelist"),
        reverse("admin:catalog_question_change", args=[question.id]),
    ):
        assert client.get(url).status_code == 200, url
