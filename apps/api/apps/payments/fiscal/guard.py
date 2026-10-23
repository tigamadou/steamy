"""
Garde-fou de la facture normalisée (ADR 0006) : nos taux ne divergent jamais de ceux de la DGI.

À l'activation (et avant chaque émission), `GET /info/taxGroups` doit renvoyer, pour le groupe choisi, un taux égal à
`vat_rate`, un taux nul pour le groupe exonéré, et `aib_rate` doit égaler `aibA` (1 %) ou `aibB` (5 %), ce qui donne
`aib = A` ou `B`. L'e-MCF doit être « Actif » et son jeton valide. Sinon : pas d'activation, pas d'émission.
"""

from decimal import Decimal

from django.conf import settings

from . import get_fiscal_provider
from .base import FiscalError, FiscalInvoiceProvider, TaxGroups


def aib_letter(config, groups: TaxGroups) -> str | None:
    """Groupe d'AIB de la facture : `A` ou `B` selon le taux réglé, `None` si l'AIB n'est pas activé ou ne correspond pas."""
    if not config.aib_enabled:
        return None
    for letter, rate in (("A", groups.aib_a), ("B", groups.aib_b)):
        if Decimal(rate) == config.aib_rate:
            return letter
    return None


def activation_errors(config, provider: FiscalInvoiceProvider | None = None) -> dict[str, str]:
    """Erreurs empêchant d'activer e-MECeF avec ces réglages, par champ ; vide si l'activation est possible."""
    errors: dict[str, str] = {}
    if settings.FISCAL_PROVIDER == "emecef" and not (settings.EMECEF_TOKEN and settings.EMECEF_IFU):
        return {
            "emecef_enabled": "EMECEF_TOKEN et EMECEF_IFU doivent être définis dans l'environnement."
        }
    try:
        provider = provider or get_fiscal_provider()
        status = provider.status()
        if not status.token_valid:
            return {"emecef_enabled": "Le jeton e-MECeF est expiré ou invalide."}
        if not status.active:
            return {
                "emecef_enabled": f"L'e-MCF n'est pas actif (statut : {status.emcf_status or 'inconnu'})."
            }
        groups = provider.tax_groups()
    except FiscalError as error:
        return {"emecef_enabled": f"e-MECeF est injoignable ou refuse la demande : {error}"}
    taxed, exempt = config.emecef_taxed_group, config.emecef_exempt_group
    if config.vat_enabled and Decimal(groups.rates[taxed]) != config.vat_rate:
        errors["emecef_taxed_group"] = (
            f"Le groupe {taxed} est à {groups.rates[taxed]} % chez la DGI, pas à {config.vat_rate} %."
        )
    if groups.rates[exempt] != 0:
        errors["emecef_exempt_group"] = (
            f"Le groupe {exempt} est à {groups.rates[exempt]} % chez la DGI : il devrait être exonéré."
        )
    if config.aib_enabled and settings.EMECEF_AIB_IN_TOTAL is None:
        errors["aib_enabled"] = (
            "Le total de l'e-MCF inclut-il l'AIB ? Lancez `emecef_probe` sur le serveur de test, puis renseignez "
            "EMECEF_AIB_IN_TOTAL."
        )
    if config.aib_enabled and aib_letter(config, groups) is None:
        errors["aib_rate"] = (
            f"Le taux d'AIB doit être {groups.aib_a} % (A) ou {groups.aib_b} % (B) chez la DGI."
        )
    return errors
