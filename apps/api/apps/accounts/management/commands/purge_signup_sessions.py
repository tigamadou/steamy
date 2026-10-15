from apps.accounts.tasks import purge_signup_sessions
from apps.core.scheduled import ScheduledTaskCommand


class Command(ScheduledTaskCommand):
    help = purge_signup_sessions.__doc__
    task = purge_signup_sessions
