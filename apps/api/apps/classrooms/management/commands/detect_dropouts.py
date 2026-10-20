from apps.classrooms.tasks import detect_dropouts
from apps.core.scheduled import ScheduledTaskCommand


class Command(ScheduledTaskCommand):
    help = detect_dropouts.__doc__
    task = detect_dropouts
