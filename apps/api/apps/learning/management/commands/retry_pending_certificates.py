from apps.core.scheduled import ScheduledTaskCommand
from apps.learning.tasks import retry_pending_certificates


class Command(ScheduledTaskCommand):
    help = retry_pending_certificates.__doc__
    task = retry_pending_certificates
