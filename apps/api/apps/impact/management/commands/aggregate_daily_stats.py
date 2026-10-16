from apps.core.scheduled import ScheduledTaskCommand
from apps.impact.tasks import aggregate_daily_stats


class Command(ScheduledTaskCommand):
    help = "Agrégats quotidiens et calcul des KPI auto de l'Impact Tracker (tâche nocturne)"
    task = aggregate_daily_stats
