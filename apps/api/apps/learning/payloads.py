"""
Construction des réponses de la pédagogie (inscriptions, arbre, tentatives) : partagée par les vues de
l'apprenant et par l'espace parent (`accounts`), qui montre la progression et les tentatives d'un enfant.
"""

from apps.catalog.models import Quiz

from .models import Enrollment, QuizAttempt
from .progression import Container, Progression, Step, quiz_of


def ref(obj) -> dict:
    return {"id": obj.id, "order": obj.order, "title": obj.title}


def course_ref(course) -> dict:
    return {"slug": course.slug, "title": course.title}


def next_payload(progression: Progression, step: Step | None) -> dict:
    course_slug = progression.course.slug
    if step is None:
        return {
            "type": "certification",
            "id": None,
            "title": None,
            "course_slug": course_slug,
            "project_id": None,
            "level_id": None,
            "quiz_kind": None,
        }
    return {
        "type": step.type,
        "id": step.id,
        "title": step.title,
        "course_slug": course_slug,
        "project_id": step.project_id,
        "level_id": step.level_id,
        "quiz_kind": step.quiz_kind,
    }


def counts(progression: Progression, box: Container) -> dict:
    steps = [step for step in progression.steps[box.start : box.end] if step.type == "mission"]
    return {
        "mission_count": len(steps),
        "missions_done": sum(1 for step in steps if progression.is_done(step)),
    }


def missions_payload(progression: Progression, box: Container) -> list[dict]:
    return [
        {
            "id": mission.id,
            "order": mission.order,
            "title": mission.title,
            "duration_min": mission.duration_min,
            "icon": mission.icon,
            "state": progression.mission_state(mission.id),
        }
        for mission in box.obj.missions.all()
    ]


def level_item(progression: Progression, box: Container) -> dict:
    level = box.obj
    return {
        **ref(level),
        "duration_min": level.duration_min,
        "intro_summary": level.intro_summary,
        "state": progression.container_state(box),
        **counts(progression, box),
        "quiz": quiz_item(progression, quiz_of(level)),
    }


def quiz_item(progression: Progression, quiz) -> dict | None:
    if quiz is None:
        return None
    return {
        "id": quiz.id,
        "kind": quiz.kind,
        "title": quiz.display_title,
        "threshold": quiz.pass_threshold,
        "state": progression.quiz_state(quiz.id),
    }


def enrollment_payload(enrollment: Enrollment, progression: Progression) -> dict:
    position = progression.position()
    return {
        "id": enrollment.id,
        "course": progression.course,
        "source": enrollment.source,
        "status": enrollment.status,
        "progress_pct": enrollment.progress_pct,
        "mission_count": progression.mission_count,
        "missions_done": progression.missions_done,
        "created_at": enrollment.created_at,
        "last_activity_at": enrollment.last_activity_at,
        "completed_at": enrollment.completed_at,
        "current_project": ref(position[0].obj) if position else None,
        "current_level": ref(position[1].obj) if position and position[1] else None,
        "next": next_payload(progression, progression.next_step()),
    }


def quiz_ref(quiz: Quiz, course_slug: str) -> dict:
    project = quiz.project or quiz.level.project
    return {
        "id": quiz.id,
        "kind": quiz.kind,
        "title": quiz.display_title,
        "course_slug": course_slug,
        "project_id": project.id,
        "level_id": quiz.level_id,
    }


def attempt_item(attempt: QuizAttempt) -> dict:
    return {
        "id": attempt.id,
        "quiz": quiz_ref(attempt.quiz, attempt.enrollment.course.slug),
        "score": attempt.score,
        "total": attempt.total,
        "percentage": attempt.percentage,
        "threshold": attempt.threshold,
        "status": attempt.status,
        "passed": attempt.passed,
        "duration_sec": attempt.duration_sec,
        "points_earned": attempt.points_earned,
        "created_at": attempt.created_at,
    }
