from celery import shared_task

from . import services


@shared_task
def aggregate_daily_stats() -> int:
    """Nuit : agrégats quotidiens de l'année (`DailyAggregatedStat`), puis KPI `auto` (D75)."""
    rows = services.aggregate_daily_stats()
    return rows + services.compute_kpis()
