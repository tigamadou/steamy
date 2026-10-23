"""
Sonde manuelle de l'e-MCF, **hors CI, uniquement sur le serveur de TEST de la DGI** (ADR 0006) : elle répond aux questions
que la documentation laisse ouvertes, avec des factures d'essai **toutes annulées** (`PUT …/cancel`, aucune facture
normalisée n'est émise) :

1. quels sont les taux de chaque groupe, et quel montant de TVA l'e-MCF extrait d'un prix TTC (ligne par groupe) ;
2. `total` inclut-il l'AIB (même facture avec et sans `aib` A ou B) et sur quelle base l'AIB est-il calculé ;
3. la règle d'arrondi (quantité 3 au prix 101 dans le groupe taxable).

    python manage.py emecef_probe --yes-test

Refuse tout ce qui n'est pas le serveur de test (`EMECEF_ENVIRONMENT=test`). N'affiche jamais le jeton ; l'IFU est
masqué. À la fin, un bloc « À rapporter » résume les constats (sans secret) : il suffit de le coller dans le chat.
"""

from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.payments.fiscal import (
    FiscalClient,
    FiscalError,
    FiscalItem,
    FiscalPayment,
    InvoiceRequest,
    get_fiscal_provider,
)
from apps.payments.fiscal.base import GROUPS

PROBE_NAME = "SONDE STEAMY, annulée"
PRICE = 1000


def request_for(items, aib=None) -> InvoiceRequest:
    total = sum(item.price * int(item.quantity) for item in items)
    return InvoiceRequest(
        type="FV",
        items=items,
        client=FiscalClient(name=PROBE_NAME),
        payments=[FiscalPayment("MOBILEMONEY", total)],
        aib=aib,
        operator_name="Sonde Steamy",
    )


class Command(BaseCommand):
    help = "Sonde l'e-MCF de TEST (factures d'essai annulées) : groupes, TVA extraite, AIB dans le total, arrondi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes-test",
            action="store_true",
            help="Confirme que le jeton et le serveur sont ceux de TEST : des factures d'essai seront créées puis annulées.",
        )

    def handle(self, *args, **options):
        if not options["yes_test"]:
            raise CommandError(
                "Ajoutez --yes-test pour confirmer le serveur et le jeton de TEST (factures annulées)."
            )
        if settings.FISCAL_PROVIDER == "emecef" and settings.EMECEF_ENVIRONMENT != "test":
            raise CommandError(
                "La sonde ne tourne que sur le serveur de TEST : EMECEF_ENVIRONMENT doit valoir « test »."
            )
        try:
            provider = get_fiscal_provider()
        except Exception as error:  # configuration incomplète ou serveur refusé
            raise CommandError(f"e-MECeF : {error}") from error
        environment = getattr(provider, "environment", provider.name)
        if environment not in ("test", "fake"):
            raise CommandError("La sonde ne tourne que sur le serveur de TEST.")
        report: dict = {"serveur": environment}
        try:
            status = provider.status()
            if not status.token_valid or not status.active:
                raise CommandError("Jeton expiré ou e-MCF non actif : voir `emecef_check`.")
            groups = provider.tax_groups()
            report["taux"] = {**groups.rates, "AIB A": groups.aib_a, "AIB B": groups.aib_b}
            self.stdout.write(f"Serveur : {environment} · taux des groupes {report['taux']}")
            self._groups(provider, report)
            self._aib(provider, report)
            self._rounding(provider, report)
        except FiscalError as error:
            raise CommandError(f"e-MECeF : {error}") from error
        self.stdout.write("")
        self.stdout.write("À rapporter (aucun secret) :")
        for key, value in report.items():
            self.stdout.write(f"  {key} : {value}")

    def _request(self, provider, items, aib=None):
        """Demande d'essai, **toujours annulée** ensuite."""
        totals = provider.request_invoice(request_for(items, aib))
        try:
            return totals
        finally:
            provider.cancel(totals.uid)

    def _groups(self, provider, report):
        items = [
            FiscalItem("", f"{PROBE_NAME} {group}", PRICE, Decimal(1), group) for group in GROUPS
        ]
        totals = self._request(provider, items)
        report["lignes de 1000 par groupe"] = {
            group: {
                "total": totals.group_totals.get(group),
                "HT": totals.excl_tax.get(group),
                "TVA": totals.vat.get(group),
            }
            for group in GROUPS
        }
        report["total (6 lignes de 1000)"] = totals.total

    def _aib(self, provider, report):
        taxed = [FiscalItem("", PROBE_NAME, 11800, Decimal(1), "B")]
        base = self._request(provider, taxed)
        for letter in ("A", "B"):
            with_aib = self._request(provider, taxed, aib=letter)
            report[f"AIB {letter} sur 11800 en groupe B"] = {
                "aib": with_aib.aib,
                "total sans AIB": base.total,
                "total avec AIB": with_aib.total,
                "total inclut l'AIB": with_aib.total - base.total == with_aib.aib
                and with_aib.aib != 0,
                "HT": with_aib.excl_tax.get("B"),
                "TVA": with_aib.vat.get("B"),
            }

    def _rounding(self, provider, report):
        totals = self._request(provider, [FiscalItem("", PROBE_NAME, 101, Decimal(3), "B")])
        report["arrondi : 3 x 101 en groupe B"] = {
            "total": totals.group_totals.get("B"),
            "HT": totals.excl_tax.get("B"),
            "TVA": totals.vat.get("B"),
        }
