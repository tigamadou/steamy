from celery import shared_task

from . import services


@shared_task
def aggregate_daily_stats() -> int:
    """Nuit : agrégats quotidiens de l'année (`DailyAggregatedStat`), puis KPI `auto` (D75)."""
    rows = services.aggregate_daily_stats()
    return rows + services.compute_kpis()


#: Réessais de la génération d'un export, à attente exponentielle
EXPORT_MAX_RETRIES = 5


@shared_task(bind=True, acks_late=True, max_retries=EXPORT_MAX_RETRIES)
def generate_report_export(self, export_id: int) -> bool:
    """Fichier d'un export de rapport (D74) ; après les réessais, l'export passe à `failed` (WAD04 le signale)."""
    from .exports import build_export
    from .models import ReportExport

    try:
        return build_export(export_id)
    except ReportExport.DoesNotExist:
        return False
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            ReportExport.objects.filter(pk=export_id).update(status=ReportExport.Status.FAILED)
            raise
        raise self.retry(exc=exc, countdown=30 * 2**self.request.retries) from exc
