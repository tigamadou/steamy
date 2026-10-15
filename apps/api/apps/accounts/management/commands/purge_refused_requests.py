from apps.accounts.tasks import purge_refused_requests
from apps.core.scheduled import ScheduledTaskCommand


class Command(ScheduledTaskCommand):
    help = purge_refused_requests.__doc__
    task = purge_refused_requests
