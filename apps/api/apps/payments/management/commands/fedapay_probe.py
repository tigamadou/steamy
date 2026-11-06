"""
Sonde manuelle de FedaPay, **hors CI, uniquement dans le bac à sable** (ADR 0008 §10) : elle établit, par un vrai
parcours (transaction de 100 FCFA, jeton, débit `momo_test`, relectures bornées), ce que la documentation laisse
ouvert : le statut final obtenu dans le bac à sable, les frais, l'enveloppe de la réponse (`v1/transaction` ou la
transaction à la racine) et les clés qu'elle contient.

    python manage.py fedapay_probe

Refuse tout environnement autre que `sandbox` avant le moindre appel réseau. Ne crée ni commande ni paiement. N'affiche
jamais la clé, le jeton de paiement ni le numéro. À la fin, un bloc « À rapporter » résume les constats (sans secret) :
il suffit de le coller dans le chat.
"""

import time
from datetime import UTC, datetime

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.management.base import BaseCommand, CommandError

from apps.payments.providers import Charge, PaymentProviderError, PaymentStatus
from apps.payments.providers.fedapay import FedaPayProvider

PROBE_AMOUNT = 100
#: Numéro de succès du bac à sable : `64000001` une fois réduit à ses 8 derniers chiffres
PROBE_MSISDN = "+2290164000001"
MAX_POLLS = 10
POLL_INTERVAL_SECONDS = 3
ENVELOPE = "v1/transaction"


class Command(BaseCommand):
    help = "Sonde le bac à sable FedaPay (transaction de 100 FCFA, débit momo_test, relectures bornées)."

    def handle(self, *args, **options):
        if settings.FEDAPAY_ENVIRONMENT != "sandbox":
            raise CommandError(
                "La sonde ne tourne que dans le bac à sable : FEDAPAY_ENVIRONMENT doit valoir « sandbox »."
            )
        try:
            provider = FedaPayProvider()
        except ImproperlyConfigured as error:
            raise CommandError(f"FedaPay : {error}") from error
        reference = f"SONDE-{datetime.now(UTC):%Y%m%d%H%M%S}"
        charge = Charge(
            reference=reference,
            merchant_reference=reference,
            amount=PROBE_AMOUNT,
            currency="XOF",
            country="BJ",
            network="mtn",
            msisdn=PROBE_MSISDN,
            description="Sonde Steamy",
            first_name="Sonde",
            last_name="Steamy",
            metadata={"probe": "1"},
        )
        try:
            provider_tx_id = provider.initiate(charge).provider_tx_id
        except PaymentProviderError as error:
            raise CommandError(self._failure("initiation", error)) from error
        self.stdout.write(f"Transaction créée : {provider_tx_id}")
        try:
            polls, fetched = self._poll(provider, provider_tx_id)
            raw = provider.raw_transaction(provider_tx_id)
        except PaymentProviderError as error:
            raise CommandError(
                self._failure("relecture", error, provider_tx_id=provider_tx_id)
            ) from error
        wrapped = isinstance(raw.get(ENVELOPE), dict)
        transaction = raw[ENVELOPE] if wrapped else raw
        final = self._is_final(fetched)
        self.stdout.write("")
        self.stdout.write("À rapporter (aucun secret) :")
        report = {
            "environnement": settings.FEDAPAY_ENVIRONMENT,
            "mode": settings.FEDAPAY_SANDBOX_MODE,
            "identifiant": provider_tx_id,
            "statut brut": fetched.provider_status,
            "statut normalisé": fetched.status.value,
            "frais": fetched.fees,
            "devise": fetched.currency,
            "montant": fetched.amount,
            "enveloppe": ENVELOPE if wrapped else "racine",
            "clés de la transaction": sorted(transaction),
            "relectures": polls,
        }
        for key, value in report.items():
            self.stdout.write(f"  {key} : {value}")
        if not final:
            self.stdout.write(f"  constat : non finale après {polls} relectures")

    def _poll(self, provider, provider_tx_id):
        for poll in range(1, MAX_POLLS + 1):
            fetched = provider.fetch_transaction(provider_tx_id)
            if self._is_final(fetched):
                return poll, fetched
            if poll < MAX_POLLS:
                time.sleep(POLL_INTERVAL_SECONDS)
        return MAX_POLLS, fetched

    @staticmethod
    def _is_final(fetched) -> bool:
        return (
            fetched.status in (PaymentStatus.SUCCEEDED, PaymentStatus.FAILED)
            and fetched.provider_status != "pending"
        )

    @staticmethod
    def _failure(step: str, error: PaymentProviderError, provider_tx_id=None) -> str:
        provider_tx_id = error.provider_tx_id or provider_tx_id
        suffix = f" (transaction {provider_tx_id})" if provider_tx_id else ""
        return f"FedaPay, {step} : {error}{suffix}"
