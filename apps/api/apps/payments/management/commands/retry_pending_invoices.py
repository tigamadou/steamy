from apps.core.scheduled import ScheduledTaskCommand
from apps.payments.tasks import retry_pending_invoices


class Command(ScheduledTaskCommand):
    help = "Relance les PDF de factures restés en préparation plus de 10 minutes."
    task = retry_pending_invoices
