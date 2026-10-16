from apps.accounts.tasks import anonymize_due_accounts
from apps.core.scheduled import ScheduledTaskCommand


class Command(ScheduledTaskCommand):
    help = anonymize_due_accounts.__doc__
    task = anonymize_due_accounts
