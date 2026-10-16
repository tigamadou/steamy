"""
Rapport hebdomadaire d'un enfant (WPD11, D55) : temps d'apprentissage (journal `LearningActivity`), missions
terminées et quiz réussis de la semaine ISO (lundi → dimanche, fuseau `TIME_ZONE`), histogramme des 7 jours et
progression par parcours. Visible dans l'application ; chaque lundi, le parent est notifié pour la semaine écoulée,
par email s'il a renseigné une adresse et n'a pas coupé la catégorie « Progression » (`send_weekly_reports`).
"""

import re
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ErrorDetail, ValidationError

from apps.learning.models import LearningActivity, MissionProgress, QuizAttempt
from apps.notifications.models import Category
from apps.notifications.services import notify

from .children import children_of
from .models import User, WeeklyReportSent

WEEK_REGEX = re.compile(r"^(\d{4})-W(\d{2})$")
#: Années acceptées : au-delà, la semaine précédente ou suivante sortirait des dates représentables.
MIN_YEAR, MAX_YEAR = 2000, 9998


def week_code(day: date) -> str:
    year, week, _ = day.isocalendar()
    return f"{year}-W{week:02d}"


def parse_week(value: str | None) -> date:
    """`AAAA-Www` → lundi de la semaine ; absent : semaine en cours."""
    if not value:
        today = timezone.localdate()
        return today - timedelta(days=today.weekday())
    match = WEEK_REGEX.match(value)
    try:
        if not MIN_YEAR <= int(match[1]) <= MAX_YEAR:
            raise ValueError(value)
        return date.fromisocalendar(int(match[1]), int(match[2]), 1)
    except (TypeError, ValueError) as error:
        raise ValidationError(
            {"week": [ErrorDetail("Semaine invalide (AAAA-Www).", code="INVALID")]}
        ) from error


def report(child: User, monday: date) -> dict:
    sunday = monday + timedelta(days=6)
    activity = LearningActivity.objects.filter(learner=child, date__gte=monday, date__lte=sunday)
    seconds = {}
    for row in activity.values("date", "seconds"):
        seconds[row["date"]] = seconds.get(row["date"], 0) + row["seconds"]
    days = [monday + timedelta(days=n) for n in range(7)]
    current = timezone.localdate()
    current_monday = current - timedelta(days=current.weekday())
    previous = monday - timedelta(days=7)
    return {
        "week": week_code(monday),
        "start_date": monday,
        "end_date": sunday,
        "previous_week": week_code(previous) if previous.isocalendar()[0] >= MIN_YEAR else None,
        "next_week": week_code(monday + timedelta(days=7)) if monday < current_monday else None,
        "seconds": sum(seconds.values()),
        "missions_completed": MissionProgress.objects.filter(
            enrollment__learner=child,
            completed_at__date__gte=monday,
            completed_at__date__lte=sunday,
        ).count(),
        "quizzes_passed": QuizAttempt.objects.filter(
            learner=child,
            passed=True,
            created_at__date__gte=monday,
            created_at__date__lte=sunday,
        ).count(),
        "days": [{"date": day, "seconds": seconds.get(day, 0)} for day in days],
    }


def send_weekly_reports() -> int:
    """
    Chaque lundi : une notification par enfant actif pour la semaine écoulée (email selon la préférence).
    Relançable, y compris en parallèle : chaque (parent, enfant, semaine) est réservé dans `WeeklyReportSent`
    (contrainte d'unicité) dans la même transaction que la notification ; un rapport réservé n'est pas renvoyé.
    """
    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday() + 7)
    code = week_code(monday)
    sent = 0
    parents = User.objects.filter(role=User.Role.PARENT, status=User.Status.ACTIVE)
    for parent in parents.filter(children_links__isnull=False).distinct():
        for child in children_of(parent).filter(status=User.Status.ACTIVE):
            with transaction.atomic():
                _, created = WeeklyReportSent.objects.get_or_create(
                    parent=parent, child=child, week=code
                )
                if not created:
                    continue
                data = report(child, monday)
                minutes = data["seconds"] // 60
                notify(
                    parent,
                    Category.PROGRESS,
                    "weekly_report",
                    f"Semaine de {child.first_name} : {minutes} min d'apprentissage",
                    f"{data['missions_completed']} mission(s) terminée(s), "
                    f"{data['quizzes_passed']} quiz réussi(s).",
                    url=f"/parent/enfants/{child.pk}/rapport?semaine={code}",
                )
            sent += 1
    return sent
