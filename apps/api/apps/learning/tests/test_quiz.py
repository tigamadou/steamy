"""
Quiz et tentatives (§4.4, D31, D32, C8) : correction serveur, corrigé jamais exposé, seuils 70/80 et bornes de
`warn`, délai entre deux essais d'une sommative ratée, quiz verrouillé tant que les missions ne sont pas faites.
"""

from datetime import timedelta

import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import LearnerFactory
from apps.catalog.models import Quiz
from apps.catalog.tests.factories import QuizFactory, add_questions
from apps.core.models import PlatformSettings
from apps.learning.models import MissionProgress, QuizAttempt
from apps.learning.services import attempt_status

from .factories import EnrollmentFactory, answers, build_course, missions_of

pytestmark = pytest.mark.django_db

FORBIDDEN_KEYS = {"isCorrect", "is_correct"}


def walk_keys(value):
    """Toutes les clés d'un JSON, à toute profondeur."""
    if isinstance(value, dict):
        for key, item in value.items():
            yield key
            yield from walk_keys(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk_keys(item)


@pytest.fixture
def learner():
    return LearnerFactory()


@pytest.fixture
def client(learner):
    client = APIClient()
    client.force_authenticate(learner)
    return client


@pytest.fixture
def course():
    return build_course(projects=2, levels=1, missions=1, quizzes=True)


@pytest.fixture
def enrollment(learner, course):
    return EnrollmentFactory(learner=learner, course=course)


def formative(course, project=0) -> Quiz:
    return Quiz.objects.filter(level__project__course=course).order_by("level__project__order")[
        project
    ]


def summative(course, project=0) -> Quiz:
    return Quiz.objects.filter(project__course=course).order_by("project__order")[project]


def finish_missions(enrollment, course, project=0):
    for mission in missions_of(course):
        if mission.level.project.order == project:
            MissionProgress.objects.get_or_create(enrollment=enrollment, mission=mission)


def submit(client, quiz, right):
    return client.post(
        f"/api/learning/quizzes/{quiz.id}/attempts/",
        {"answers": answers(quiz, right), "durationSec": 42},
        format="json",
    )


def pass_quiz(enrollment, quiz):
    QuizAttempt.objects.create(
        learner=enrollment.learner,
        enrollment=enrollment,
        quiz=quiz,
        score=2,
        total=2,
        percentage=100,
        threshold=quiz.pass_threshold,
        status="ok",
        passed=True,
    )


# --- Statut D31 : seuils et bornes ------------------------------------------------------------------


@pytest.mark.parametrize(
    ("score", "total", "threshold", "expected"),
    [
        (70, 100, 70, "ok"),  # seuil de la formative atteint
        (69, 100, 70, "warn"),
        (7, 10, 70, "ok"),
        (2, 3, 70, "warn"),  # 66,67 % : pas d'arrondi vers le haut
        (80, 100, 80, "ok"),  # seuil de la sommative
        (79, 100, 80, "warn"),
        (50, 100, 70, "warn"),  # borne basse de `warn`
        (1, 2, 80, "warn"),
        (49, 100, 70, "ko"),
        (0, 2, 70, "ko"),
        (0, 0, 70, "ko"),  # quiz sans question
    ],
)
def test_attempt_status_thresholds_and_warn_bounds(score, total, threshold, expected):
    assert attempt_status(score, total, threshold) == expected


def test_default_thresholds_are_70_and_80_and_can_be_overridden(course):
    assert formative(course).pass_threshold == 70
    assert summative(course).pass_threshold == 80
    quiz = formative(course)
    quiz.threshold = 60
    assert quiz.pass_threshold == 60


# --- Accès ------------------------------------------------------------------------------------------


def test_quiz_is_locked_until_the_missions_are_done(client, course, enrollment):
    quiz = formative(course)
    for resp in (client.get(f"/api/learning/quizzes/{quiz.id}/"), submit(client, quiz, 2)):
        assert resp.status_code == 403 and resp.json()["code"] == "CONTENT_LOCKED"
    assert not QuizAttempt.objects.exists()


def test_summative_is_locked_until_the_formatives_are_passed(client, course, enrollment):
    finish_missions(enrollment, course)
    resp = client.get(f"/api/learning/quizzes/{summative(course).id}/")
    assert resp.status_code == 403 and resp.json()["code"] == "CONTENT_LOCKED"


def test_not_enrolled_and_unknown_quiz(client, course):
    quiz = formative(course)
    resp = client.get(f"/api/learning/quizzes/{quiz.id}/")
    assert resp.status_code == 403 and resp.json()["code"] == "NOT_ENROLLED"
    assert submit(client, quiz, 2).json()["code"] == "NOT_ENROLLED"
    assert client.get("/api/learning/quizzes/999999/").status_code == 404


def test_quiz_of_a_draft_course_is_not_found(client, learner):
    course = build_course(projects=1, levels=1, missions=1, quizzes=True, draft=True)
    EnrollmentFactory(learner=learner, course=course)
    assert client.get(f"/api/learning/quizzes/{formative(course).id}/").status_code == 404
    assert client.get(f"/api/learning/quizzes/{summative(course).id}/").status_code == 404


# --- Corrigé jamais exposé ---------------------------------------------------------------------------


def test_is_correct_never_appears_in_any_response(client, course, enrollment):
    finish_missions(enrollment, course)
    quiz = formative(course)
    responses = [
        client.get(f"/api/learning/quizzes/{quiz.id}/"),
        submit(client, quiz, 1),
        submit(client, quiz, 2),
        client.get("/api/learning/attempts/"),
        client.get(f"/api/learning/attempts/{QuizAttempt.objects.first().id}/"),
        client.get(f"/api/learning/enrollments/{course.slug}/tree/"),
        client.get(f"/api/learning/projects/{quiz.level.project_id}/"),
        client.get(f"/api/learning/levels/{quiz.level_id}/"),
    ]
    for resp in responses:
        assert resp.status_code in (200, 201), resp.content
        assert not FORBIDDEN_KEYS & set(walk_keys(resp.json())), resp.json()


def test_quiz_gives_questions_and_choices_in_order(client, course, enrollment):
    finish_missions(enrollment, course)
    quiz = formative(course)
    body = client.get(f"/api/learning/quizzes/{quiz.id}/").json()
    assert body["kind"] == "formative" and body["threshold"] == 70
    assert body["title"] == "Quiz · Niveau 1.1" and body["timeLimitSec"] is None
    assert body["questionCount"] == 2 and body["state"] == "available"
    assert body["level"]["id"] == quiz.level_id and body["project"]["id"] == quiz.level.project_id
    assert [c["text"] for c in body["questions"][0]["choices"]] == [
        "Bonne réponse",
        "Mauvaise réponse",
    ]
    assert set(body["questions"][0]["choices"][0]) == {"id", "text"}


# --- Tentatives ---------------------------------------------------------------------------------------


def test_formative_failed_then_passed_immediately(client, course, enrollment):
    finish_missions(enrollment, course)
    quiz = formative(course)
    failed = submit(client, quiz, 1)
    assert failed.status_code == 201
    body = failed.json()
    assert (body["score"], body["total"], body["percentage"]) == (1, 2, 50)
    assert body["status"] == "warn" and body["passed"] is False and body["threshold"] == 70
    assert body["retryInSec"] == 0 and body["next"] is None and body["durationSec"] == 42
    assert body["failedConcepts"] == [quiz.questions.order_by("order")[1].concept]
    assert [q["correct"] for q in body["questions"]] == [True, False]

    passed = submit(client, quiz, 2)  # rejouable tout de suite (C8)
    assert passed.status_code == 201 and passed.json()["status"] == "ok"
    # Après le badge : la sommative du projet
    assert passed.json()["next"]["type"] == "quiz"
    assert passed.json()["next"]["id"] == summative(course).id
    assert passed.json()["next"]["quizKind"] == "summative"
    assert passed.json()["next"]["levelId"] is None


def test_ko_below_fifty_percent(client, course, enrollment):
    finish_missions(enrollment, course)
    body = submit(client, formative(course), 0).json()
    assert body["status"] == "ko" and body["percentage"] == 0


def test_summative_failed_is_blocked_during_the_cooldown(client, course, enrollment):
    finish_missions(enrollment, course)
    pass_quiz(enrollment, formative(course))
    quiz = summative(course)
    failed = submit(client, quiz, 1)
    assert failed.status_code == 201 and failed.json()["retryInSec"] == 600

    blocked = submit(client, quiz, 2)
    assert blocked.status_code == 429 and blocked.json()["code"] == "QUIZ_COOLDOWN"
    assert 595 <= int(blocked["Retry-After"]) <= 600
    assert 595 <= client.get(f"/api/learning/quizzes/{quiz.id}/").json()["retryInSec"] <= 600
    assert QuizAttempt.objects.filter(quiz=quiz).count() == 1

    QuizAttempt.objects.filter(quiz=quiz).update(
        created_at=QuizAttempt.objects.get(quiz=quiz).created_at - timedelta(seconds=600)
    )
    assert client.get(f"/api/learning/quizzes/{quiz.id}/").json()["retryInSec"] == 0
    passed = submit(client, quiz, 2)
    assert passed.status_code == 201 and passed.json()["passed"] is True
    assert passed.json()["retryInSec"] == 0
    # Sommative réussie : le projet suivant commence
    assert passed.json()["next"]["type"] == "mission"
    assert passed.json()["next"]["projectId"] == summative(course, 1).project_id


def test_cooldown_comes_from_platform_settings(client, course, enrollment):
    settings_ = PlatformSettings.load()
    settings_.summative_retry_cooldown_seconds = 5
    settings_.save()
    finish_missions(enrollment, course)
    pass_quiz(enrollment, formative(course))
    assert submit(client, summative(course), 0).json()["retryInSec"] == 5


def test_passing_the_last_summative_points_to_certification(client, learner):
    course = build_course(projects=1, levels=1, missions=1, quizzes=True)
    enrollment = EnrollmentFactory(learner=learner, course=course)
    finish_missions(enrollment, course)
    pass_quiz(enrollment, formative(course))
    body = submit(client, summative(course), 2).json()
    assert body["next"]["type"] == "certification"


def test_invalid_answers_are_refused(client, course, enrollment):
    finish_missions(enrollment, course)
    quiz = formative(course)
    other = summative(course).questions.first()
    first, second = quiz.questions.order_by("order")
    wrong_choice = second.choices.first()
    for payload in (
        [{"questionId": other.id, "choiceId": other.choices.first().id}],
        [{"questionId": first.id, "choiceId": wrong_choice.id}],
        [
            {"questionId": first.id, "choiceId": first.choices.first().id},
            {"questionId": first.id, "choiceId": first.choices.last().id},
        ],
    ):
        resp = client.post(
            f"/api/learning/quizzes/{quiz.id}/attempts/", {"answers": payload}, format="json"
        )
        assert resp.status_code == 400 and "answers" in resp.json()["fields"], payload
    assert not QuizAttempt.objects.exists()


def test_unanswered_question_counts_as_wrong(client, course, enrollment):
    finish_missions(enrollment, course)
    quiz = formative(course)
    first = quiz.questions.order_by("order").first()
    body = client.post(
        f"/api/learning/quizzes/{quiz.id}/attempts/",
        {"answers": [{"questionId": first.id, "choiceId": first.choices.get(is_correct=True).id}]},
        format="json",
    ).json()
    assert body["score"] == 1 and body["questions"][1]["chosenChoiceId"] is None


def test_weights_and_remediation_missions(client, learner):
    course = build_course(projects=1, levels=1, missions=2)
    enrollment = EnrollmentFactory(learner=learner, course=course)
    m1, m2 = missions_of(course)
    quiz = QuizFactory(level=m1.level)
    questions = add_questions(quiz, count=3, weights=[3, 1, 1])
    questions[1].remediation_mission = m2
    questions[1].concept = "Le courant"
    questions[2].remediation_mission = m2
    questions[2].concept = "Le courant"
    for question in questions:
        question.save()
    finish_missions(enrollment, course)

    body = submit(client, quiz, 1).json()
    assert (body["score"], body["total"], body["percentage"]) == (3, 5, 60)
    assert body["failedConcepts"] == ["Le courant"]
    assert body["remediation"] == [{"missionId": m2.id, "title": m2.title, "concept": "Le courant"}]
    assert body["questions"][1]["remediationMissionId"] == m2.id

    questions[2].delete()  # question supprimée après la tentative : ignorée au relu
    detail = client.get(f"/api/learning/attempts/{body['id']}/").json()
    assert len(detail["questions"]) == 2


# --- Liste et détail ---------------------------------------------------------------------------------


def test_attempt_list_with_filters_and_summary(client, course, enrollment, learner):
    finish_missions(enrollment, course)
    quiz = formative(course)
    submit(client, quiz, 0)
    submit(client, quiz, 1)
    submit(client, quiz, 2)
    other = EnrollmentFactory(course=course)
    pass_quiz(other, quiz)  # tentative d'un autre apprenant

    body = client.get("/api/learning/attempts/").json()
    assert body["count"] == 3
    assert [a["status"] for a in body["results"]] == ["ok", "warn", "ko"]
    assert body["summary"] == {
        "attemptCount": 3,
        "successRate": 33,
        "perfectCount": 1,
        "streakDays": 1,  # quiz passés aujourd'hui
    }
    assert body["results"][0]["quiz"]["courseSlug"] == course.slug

    warn = client.get("/api/learning/attempts/?status=warn").json()
    assert [a["status"] for a in warn["results"]] == ["warn"]
    assert warn["summary"]["attemptCount"] == 3  # le bandeau ignore les filtres
    assert client.get(f"/api/learning/attempts/?quiz={quiz.id}").json()["count"] == 3
    assert client.get("/api/learning/attempts/?quiz=999999").json()["count"] == 0
    assert client.get("/api/learning/attempts/?status=autre").status_code == 400


def test_empty_attempt_list(client):
    body = client.get("/api/learning/attempts/").json()
    assert body["summary"] == {
        "attemptCount": 0,
        "successRate": 0,
        "perfectCount": 0,
        "streakDays": 0,
    }


def test_another_learners_attempt_is_not_found(client, course):
    other = EnrollmentFactory(course=course)
    pass_quiz(other, formative(course))
    attempt = QuizAttempt.objects.get()
    assert client.get(f"/api/learning/attempts/{attempt.id}/").status_code == 404


def test_tree_shows_quizzes_and_their_state(client, course, enrollment):
    finish_missions(enrollment, course)
    pass_quiz(enrollment, formative(course))
    tree = client.get(f"/api/learning/enrollments/{course.slug}/tree/").json()
    project = tree["projects"][0]
    assert project["levels"][0]["quiz"]["state"] == "done"
    assert project["levels"][0]["state"] == "done"
    assert project["quiz"]["kind"] == "summative" and project["quiz"]["state"] == "available"
    assert project["quiz"]["threshold"] == 80
    assert project["state"] == "available"
    assert tree["next"]["type"] == "quiz" and tree["next"]["quizKind"] == "summative"
    assert tree["currentProject"]["id"] == project["id"] and tree["currentLevel"] is None
    assert (project["missionCount"], project["missionsDone"]) == (1, 1)
