"""Commande `manage.py <tâche>` pour lancer à la main une tâche planifiée (outillage de test, PLAN-API)."""

from django.core.management.base import BaseCommand


class ScheduledTaskCommand(BaseCommand):
    #: Tâche Celery à exécuter sur place.
    task = None

    def handle(self, *args, **options):
        result = self.task()
        self.stdout.write(f"{self.task.name} : {result}")
