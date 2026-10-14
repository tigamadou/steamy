# apps/analytics/tasks.py
from datetime import timedelta

from celery import shared_task
from django.db.models import Count, Sum
from django.utils import timezone

from .models import DailyAggregatedStat, Event


@shared_task
def aggregate_daily_stats(day=None):
    """
    Calcul des statistiques agrégées pour un jour donné (default: yesterday).
    Exemple d'agrégats calculés:
      - vues par course ('views' group_by 'course')
      - inscriptions par course ('enrollments')
      - completions par course ('completions')
      - revenue (si des events 'purchase' -> value = amount)
    """
    if day is None:
        day = (timezone.now() - timedelta(days=1)).date()
    start = timezone.datetime.combine(day, timezone.datetime.min.time(), tzinfo=timezone.utc)
    end = timezone.datetime.combine(day, timezone.datetime.max.time(), tzinfo=timezone.utc)

    # 1) views per course (event_type == 'course_view' and entity_type == 'course')
    qs = Event.objects.filter(event_type="course_view", entity_type="course", created_at__range=(start, end))
    # group by entity_id (course id/slug)
    views = qs.values("entity_id").annotate(count=Count("id"))
    for row in views:
        DailyAggregatedStat.objects.update_or_create(
            date=day, group_by="course", key=row["entity_id"], metric="views",
            defaults={"value": row["count"]}
        )

    # 2) enrollments per course (could be events 'enrollment')
    qs2 = Event.objects.filter(event_type="enrollment", entity_type="course", created_at__range=(start, end))
    enrolls = qs2.values("entity_id").annotate(count=Count("id"))
    for row in enrolls:
        DailyAggregatedStat.objects.update_or_create(
            date=day, group_by="course", key=row["entity_id"], metric="enrollments",
            defaults={"value": row["count"]}
        )

    # 3) revenue (events 'purchase' with value)
    qs3 = Event.objects.filter(event_type="purchase", created_at__range=(start, end)).exclude(value__isnull=True)
    revenue = qs3.aggregate(total=Sum("value"))["total"] or 0
    DailyAggregatedStat.objects.update_or_create(
        date=day, group_by="global", key="all", metric="revenue",
        defaults={"value": revenue}
    )

    # 4) optionally fill course revenue if purchase contains entity_type course
    course_revenue_qs = Event.objects.filter(event_type="purchase", entity_type="course", created_at__range=(start, end)).exclude(value__isnull=True)
    cr = course_revenue_qs.values("entity_id").annotate(total=Sum("value"))
    for row in cr:
        DailyAggregatedStat.objects.update_or_create(
            date=day, group_by="course", key=row["entity_id"], metric="revenue",
            defaults={"value": row["total"] or 0}
        )

    # 5) global active users (unique users who triggered events that day)
    active_users = Event.objects.filter(created_at__range=(start, end)).values("user").distinct().count()
    DailyAggregatedStat.objects.update_or_create(
        date=day, group_by="global", key="active_users", metric="count",
        defaults={"value": active_users}
    )

    return True

@shared_task
def schedule_aggregate_yesterday():
    # helper to call daily - use celery beat
    yesterday = (timezone.now() - timedelta(days=1)).date()
    return aggregate_daily_stats.delay(str(yesterday))
