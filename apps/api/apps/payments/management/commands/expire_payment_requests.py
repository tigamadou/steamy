from apps.core.scheduled import ScheduledTaskCommand
from apps.payments.tasks import expire_payment_requests


class Command(ScheduledTaskCommand):
    help = "Fait expirer les demandes de paiement en attente depuis 7 jours (C4)."
    task = expire_payment_requests
