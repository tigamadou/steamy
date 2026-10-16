from apps.accounts.tasks import send_weekly_reports
from apps.core.scheduled import ScheduledTaskCommand


class Command(ScheduledTaskCommand):
    help = send_weekly_reports.__doc__
    task = send_weekly_reports
