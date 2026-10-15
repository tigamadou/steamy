from apps.accounts.tasks import expire_consent_requests
from apps.core.scheduled import ScheduledTaskCommand


class Command(ScheduledTaskCommand):
    help = expire_consent_requests.__doc__
    task = expire_consent_requests
