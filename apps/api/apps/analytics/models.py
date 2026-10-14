# apps/analytics/models.py
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class Event(models.Model):
    """
    Stocke un événement brut généré par l'application (tracking).
    - event_type: eg. 'course_view', 'enrollment', 'lesson_complete', 'quiz_attempt', 'purchase'
    - entity_type/entity_id: facultatif, pour lier l'event (ex: course, lesson, quiz)
    - metadata: JSON libre (browser, ip, duration, score, country, age, sex...)
    """

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="events"
    )
    event_type = models.CharField(max_length=64, db_index=True)
    entity_type = models.CharField(max_length=64, blank=True, null=True)
    entity_id = models.CharField(max_length=128, blank=True, null=True)
    value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )  # montant/score/durée etc.
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"{self.event_type} ({self.entity_type}:{self.entity_id}) @ {self.created_at}"


class DailyAggregatedStat(models.Model):
    """
    Agrégat quotidien simple (pré-calculé par Celery).
    group_by: ex: 'course', 'country', 'age_group', 'sex', 'global'
    key: identifier (ex: course_slug or country code)
    metric: ex: 'views', 'enrollments', 'completions', 'revenue'
    value: numeric aggregated value
    date: day of aggregation
    """

    date = models.DateField(db_index=True)
    group_by = models.CharField(max_length=64, db_index=True)  # 'course', 'country', 'global', ...
    key = models.CharField(
        max_length=128, blank=True, null=True, db_index=True
    )  # ex course slug, country code
    metric = models.CharField(
        max_length=64, db_index=True
    )  # 'views', 'enrollments', 'completions', 'revenue'
    value = models.DecimalField(max_digits=20, decimal_places=2)

    class Meta:
        unique_together = ("date", "group_by", "key", "metric")
        indexes = [
            models.Index(fields=["metric", "date"]),
        ]

    def __str__(self):
        return f"{self.date} {self.group_by}:{self.key} {self.metric}={self.value}"
