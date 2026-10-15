from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.core.demo import seed_all, seed_e2e


class Command(BaseCommand):
    help = "Charge le jeu de démonstration unique (D2). Idempotent ; refusé en production."

    def add_arguments(self, parser):
        parser.add_argument(
            "--e2e",
            action="store_true",
            help="Réglages des parcours Playwright : délai d'une sommative ratée raccourci (5 s)",
        )

    def handle(self, *args, **options):
        if settings.ENV == settings.PRODUCTION:
            raise CommandError("seed_demo est refusé en production (DJANGO_ENV=production).")
        with transaction.atomic():
            accounts = seed_all()
            if options["e2e"]:
                seed_e2e()
        self.stdout.write(
            self.style.SUCCESS(
                f"Jeu de démonstration chargé : {len(accounts)} comptes (voir fixtures/README.md)."
            )
        )
