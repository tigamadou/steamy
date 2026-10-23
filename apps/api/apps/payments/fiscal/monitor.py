"""
Surveillance quotidienne de l'accès e-MECeF (ADR 0006) : jeton (date de validité), e-MCF « Actif », IFU du jeton,
accessibilité de l'API. Une alerte part à la Finance (courriel) et au journal d'audit ; sans jeton valide, aucune
émission (les factures restent « demandées » et sont relancées au retour du jeton).
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.accounts.models import User
from apps.core.audit import audit
from apps.core.groups import FINANCE
from apps.core.models import PlatformSettings

from . import get_fiscal_provider
from .base import FiscalError
from .guard import activation_errors

log = logging.getLogger(__name__)

#: Alerte quand le jeton expire dans moins de ce délai
TOKEN_WARNING = timedelta(days=14)


def alert_finance(subject: str, body: str) -> None:
    """Journal d'audit, journal applicatif et courriel aux membres actifs du groupe Finance."""
    audit("emecef.alert", data={"subject": subject, "body": body})
    log.error("e-MECeF : %s : %s", subject, body)
    recipients = list(
        User.objects.filter(groups__name=FINANCE, is_active=True)
        .exclude(email="")
        .exclude(email__isnull=True)
        .values_list("email", flat=True)
    )
    if recipients:
        send_mail(f"[Steamy] {subject}", body, settings.DEFAULT_FROM_EMAIL, recipients)


def check_status() -> list[str]:
    """Contrôle l'accès e-MECeF ; renvoie les alertes envoyées (vide : tout va bien, ou e-MECeF désactivé)."""
    config = PlatformSettings.load()
    if not config.emecef_enabled:
        return []
    alerts: list[str] = []
    try:
        provider = get_fiscal_provider()
        status = provider.status()
    except FiscalError as error:
        alerts.append(f"e-MECeF injoignable ou refuse la demande : {error}")
    else:
        alerts.extend(activation_errors(config, provider).values())
        if (
            status.token_valid
            and status.token_valid_until - (status.server_time or timezone.now()) < TOKEN_WARNING
        ):
            alerts.append(
                f"Le jeton e-MECeF expire le {status.token_valid_until:%d/%m/%Y} : à renouveler auprès de la DGI."
            )
    for message in alerts:
        alert_finance("Facture normalisée e-MECeF", message)
    return alerts
