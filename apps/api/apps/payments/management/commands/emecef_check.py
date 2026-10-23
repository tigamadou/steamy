"""
Vérification manuelle de l'accès à l'API e-MECeF (ADR 0006), **hors CI** : lit `EMECEF_API_URL`, `EMECEF_TOKEN` et
`EMECEF_IFU` dans l'environnement (fichier `.env` local ignoré par git, ou secret de déploiement) et n'appelle que des
routes en **lecture seule** : `GET /api/info/status`, `taxGroups`, `invoiceTypes`, `paymentTypes`. Aucune facture n'est
créée. Le jeton n'est jamais affiché.

    python manage.py emecef_check
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.payments.fiscal import FiscalError, get_fiscal_provider


class Command(BaseCommand):
    help = "Lit le statut, les groupes de taxe et les types de l'API e-MECeF (lecture seule, aucune facture créée)."

    def handle(self, *args, **options):
        if settings.FISCAL_PROVIDER != "emecef":
            self.stdout.write(
                f"FISCAL_PROVIDER={settings.FISCAL_PROVIDER} : vérification avec ce fournisseur."
            )
        try:
            provider = get_fiscal_provider()
            status = provider.status()
            groups = provider.tax_groups()
            invoice_types = provider.invoice_types()
            payment_types = provider.payment_types()
        except FiscalError as error:
            raise CommandError(f"e-MECeF : {error}") from error
        self.stdout.write("Statut")
        self.stdout.write(f"  jeton valide : {'oui' if status.token_valid else 'NON'}")
        self.stdout.write(
            f"  IFU : {mask(status.ifu)} · NIM : {status.nim} · version : {status.version}"
        )
        self.stdout.write(f"  demandes en attente : {len(status.pending)}")
        self.stdout.write("Groupes de taxe (taux en %)")
        for group, rate in groups.rates.items():
            self.stdout.write(f"  {group} : {rate}")
        self.stdout.write(f"  AIB A : {groups.aib_a} · AIB B : {groups.aib_b}")
        self.stdout.write("Types de facture")
        for code, description in invoice_types:
            self.stdout.write(f"  {code} : {description}")
        self.stdout.write("Moyens de paiement")
        for code, description in payment_types:
            self.stdout.write(f"  {code} : {description}")
        if not status.token_valid:
            raise CommandError("Le jeton e-MECeF n'est pas valide.")


def mask(value: str) -> str:
    """IFU partiellement masqué : seuls les 4 derniers caractères restent visibles."""
    return f"{'•' * max(len(value) - 4, 0)}{value[-4:]}"
