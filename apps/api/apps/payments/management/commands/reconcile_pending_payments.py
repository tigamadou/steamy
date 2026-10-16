from apps.core.scheduled import ScheduledTaskCommand
from apps.payments.tasks import reconcile_pending_payments


class Command(ScheduledTaskCommand):
    help = "Vérifie auprès du prestataire les paiements sans issue depuis 10 min (webhook perdu)."
    task = reconcile_pending_payments
