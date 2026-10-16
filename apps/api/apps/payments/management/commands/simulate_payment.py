"""
Outillage de test (PLAN-API) : fixe l'issue du dernier paiement en attente d'une commande, payé avec le faux
prestataire, comme si son webhook arrivait. Exemple : `manage.py simulate_payment CMD-ABCD1234 success`.
"""

from django.core.management.base import BaseCommand, CommandError

from apps.payments.models import Payment
from apps.payments.tasks import deliver_fake_webhook

OUTCOMES = {"success": "succeeded", "failed": "failed"}


class Command(BaseCommand):
    help = "Fixe l'issue d'un paiement du faux prestataire (success ou failed)."

    def add_arguments(self, parser):
        parser.add_argument("reference")
        parser.add_argument("outcome", choices=sorted(OUTCOMES))

    def handle(self, *args, reference, outcome, **options):
        payment = (
            Payment.objects.filter(
                order__reference=reference,
                provider="fake",
                status__in=[Payment.Status.INITIATED, Payment.Status.PENDING],
                provider_transaction_id__isnull=False,
            )
            .order_by("-created_at")
            .first()
        )
        if payment is None:
            raise CommandError(f"Aucun paiement en attente du faux prestataire pour {reference}.")
        status = deliver_fake_webhook(payment.provider_transaction_id, OUTCOMES[outcome])
        self.stdout.write(f"{reference} : {outcome} (webhook HTTP {status})")
