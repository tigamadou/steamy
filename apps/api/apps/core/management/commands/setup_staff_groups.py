from django.core.management.base import BaseCommand

from apps.core.groups import setup_staff_groups


class Command(BaseCommand):
    help = "Applique la matrice des groupes du personnel (D71). Idempotent ; lancé aussi après chaque migrate."

    def handle(self, *args, **options):
        for group, count in setup_staff_groups().items():
            self.stdout.write(f"{group} : {count} permissions")
