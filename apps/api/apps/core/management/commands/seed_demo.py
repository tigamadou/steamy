from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.core.demo import seed_all


class Command(BaseCommand):
    help = "Charge le jeu de démonstration unique (D2). Idempotent ; refusé en production."

    def handle(self, *args, **options):
        if settings.ENV == settings.PRODUCTION:
            raise CommandError("seed_demo est refusé en production (DJANGO_ENV=production).")
        with transaction.atomic():
            accounts = seed_all()
        self.stdout.write(
            self.style.SUCCESS(
                f"Jeu de démonstration chargé : {len(accounts)} comptes (voir fixtures/README.md)."
            )
        )
