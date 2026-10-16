from apps.core.scheduled import ScheduledTaskCommand
from apps.payments.tasks import release_expired_reservations


class Command(ScheduledTaskCommand):
    help = "Annule les commandes non payées à l'échéance et rend leur stock (D38)."
    task = release_expired_reservations
