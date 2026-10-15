"""
Tableau de bord, progression et recommandations de l'apprenant (WD01, WD02, WD21, §7.4).

Recommandations (règle simple, PLAN-API) : parcours publiés auxquels l'apprenant n'est pas inscrit, ceux des
catégories liées à ses objectifs (W13) d'abord, puis les mis en avant, les plus suivis et les plus récents.
"""

from datetime import timedelta

from django.db.models import Case, Count, F, IntegerField, Q, Sum, Value, When
from django.utils import timezone

from apps.catalog.models import Category, Course

from .models import Certificate, Enrollment, LearnerBadge, LearningActivity
from .progression import Progression


def recommendations(learner, limit: int) -> list[Course]:
    profile = getattr(learner, "learner_profile", None)
    goals = profile.goals.all() if profile else []
    categories = list(Category.objects.filter(goals__in=goals).values_list("id", flat=True))
    matching = Q(category_id__in=categories)
    return list(
        Course.objects.filter(status=Course.Status.PUBLISHED)
        .exclude(enrollments__learner=learner)
        .select_related("category", "required_kit")
        .annotate(
            matches_goals=Case(
                When(matching, then=Value(1)), default=Value(0), output_field=IntegerField()
            ),
            popularity=Count("enrollments", distinct=True),
        )
        .order_by("-matches_goals", "-featured", "-popularity", "-created_at", "-id")[:limit]
    )


def resume_enrollment(learner) -> Enrollment | None:
    """Parcours à reprendre (WD01) : l'inscription en cours la plus récemment active ; aucune → WD02."""
    return (
        Enrollment.objects.filter(learner=learner, status=Enrollment.Status.ACTIVE)
        .order_by(F("last_activity_at").desc(nulls_last=True), "-created_at", "-id")
        .first()
    )


def seconds_by_day(learner, first_day, last_day) -> dict:
    rows = (
        LearningActivity.objects.filter(learner=learner, date__gte=first_day, date__lte=last_day)
        .values("date")
        .annotate(total=Sum("seconds"))
    )
    return {row["date"]: row["total"] for row in rows}


def last_days(learner, days: int = 7) -> list[dict]:
    """Secondes par jour, du plus ancien à aujourd'hui (histogramme de WD21)."""
    today = timezone.localdate()
    first = today - timedelta(days=days - 1)
    totals = seconds_by_day(learner, first, today)
    return [
        {"date": day, "seconds": totals.get(day, 0)}
        for day in (first + timedelta(days=n) for n in range(days))
    ]


def week_seconds(learner) -> int:
    """Temps d'apprentissage de la semaine en cours (lundi → aujourd'hui, fuseau `TIME_ZONE`)."""
    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    return sum(seconds_by_day(learner, monday, today).values())


def mastery_by_category(learner) -> list[dict]:
    """Missions faites / missions des parcours suivis, par catégorie (WD21)."""
    by_category = {}
    for enrollment in Enrollment.objects.filter(learner=learner).select_related("course__category"):
        progression = Progression(enrollment)
        category = enrollment.course.category
        entry = by_category.setdefault(
            category.id, {"category": category, "missions_done": 0, "mission_count": 0}
        )
        entry["missions_done"] += progression.missions_done
        entry["mission_count"] += progression.mission_count
    items = sorted(by_category.values(), key=lambda item: item["category"].order)
    for item in items:
        total = item["mission_count"]
        item["pct"] = item["missions_done"] * 100 // total if total else 0
    return items


def counters(learner) -> dict:
    """Compteurs de l'apprenant (shell, WD01, WD21)."""
    enrollments = Enrollment.objects.filter(learner=learner).aggregate(
        active=Count("id", filter=Q(status=Enrollment.Status.ACTIVE)),
        completed=Count("id", filter=Q(status=Enrollment.Status.COMPLETED)),
    )
    return {
        "active_enrollments": enrollments["active"],
        "completed_enrollments": enrollments["completed"],
        "certificates": Certificate.objects.filter(enrollment__learner=learner).count(),
        "badges": LearnerBadge.objects.filter(learner=learner).count(),
    }
