"""
Publication d'un parcours (WAD09, S2) : un parcours ne se publie que si son arbre est complet. Chaque niveau a sa
formative, chaque projet sa sommative, chaque quiz au moins une question, chaque mission une vidéo ou des blocs.
Un parcours payant a toujours un prix (contrainte `course_free_iff_no_price`). L'admin passe par ces fonctions, jamais
par une modification directe du statut.
"""

from django.db import transaction

from apps.core.audit import audit

from .models import Course


def publication_problems(course: Course) -> list[str]:
    """Raisons qui empêchent la publication ; liste vide si le parcours est publiable."""
    problems = []
    projects = list(
        course.projects.prefetch_related(
            "levels__missions", "levels__quiz__questions", "quiz__questions"
        )
    )
    if not projects:
        problems.append("Le parcours n'a aucun projet.")
    for project in projects:
        levels = list(project.levels.all())
        if not levels:
            problems.append(f"Le projet « {project.title} » n'a aucun niveau.")
        if not _quiz_with_questions(project):
            problems.append(
                f"Le projet « {project.title} » n'a pas d'évaluation sommative avec des questions."
            )
        for level in levels:
            missions = list(level.missions.all())
            if not missions:
                problems.append(f"Le niveau « {level.title} » n'a aucune mission.")
            if not _quiz_with_questions(level):
                problems.append(
                    f"Le niveau « {level.title} » n'a pas de quiz formatif avec des questions."
                )
            problems += [
                f"La mission « {mission.title} » n'a ni vidéo ni contenu."
                for mission in missions
                if not mission.vimeo_id and not mission.blocks
            ]
    return problems


def _quiz_with_questions(node) -> bool:
    quiz = getattr(node, "quiz", None)
    return quiz is not None and len(quiz.questions.all()) > 0  # questions préchargées


def publish(course: Course, user, request=None) -> list[str]:
    """Publie le parcours s'il est complet ; renvoie les problèmes sinon (le parcours reste en brouillon)."""
    problems = publication_problems(course)
    if problems:
        return problems
    with transaction.atomic():
        Course.objects.filter(pk=course.pk).update(status=Course.Status.PUBLISHED)
        audit("catalog.course_published", request=request, actor=user, target=course)
    return []


def unpublish(course: Course, user, request=None) -> None:
    """
    Repasse le parcours en brouillon : il disparaît du catalogue et ses inscrits n'ouvrent plus son contenu jusqu'à
    une nouvelle publication (d'où la confirmation demandée par l'admin quand il a des inscrits).
    """
    with transaction.atomic():
        Course.objects.filter(pk=course.pk).update(status=Course.Status.DRAFT)
        audit("catalog.course_unpublished", request=request, actor=user, target=course)
