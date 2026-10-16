"""
Statut d'un KPI (`kpiStatus`, D73, SPEC-TECHNIQUE §4.5), calculé par le serveur et affiché tel quel par le front.
Conditions dans l'ordre : source indisponible ; valeur absente ; sans cible ou valeur textuelle ; puis le taux
d'atteinte de la cible (< 70 % : hors-cible ; < 100 % : en dessous ; sinon atteinte).
"""

from decimal import Decimal

UNAVAILABLE = {"status": "unavailable", "tone": "neutral", "label": "Indisponible"}
PENDING = {"status": "pending", "tone": "amber", "label": "En attente"}
FILLED = {"status": "filled", "tone": "info", "label": "Renseignée"}
OFF_TARGET = {"status": "off_target", "tone": "error", "label": "Hors-cible"}
BELOW = {"status": "below", "tone": "amber", "label": "En dessous"}
ACHIEVED = {"status": "achieved", "tone": "success", "label": "Atteinte"}

STATUSES = (UNAVAILABLE, PENDING, FILLED, OFF_TARGET, BELOW, ACHIEVED)
#: Énumérations du schéma OpenAPI (`KpiStatusEnum`, `KpiToneEnum`).
STATUS_CODES = [s["status"] for s in STATUSES]
TONES = list(dict.fromkeys(s["tone"] for s in STATUSES))

#: Sous ce taux d'atteinte de la cible, le KPI est « Hors-cible » (D73).
OFF_TARGET_RATIO = Decimal("0.7")


def kpi_status(source: str, value, target) -> dict:
    if source == "unavailable":
        return UNAVAILABLE
    if value is None or value == "":
        return PENDING
    if target is None or isinstance(value, (str, bool)):
        return FILLED
    value, target = Decimal(str(value)), Decimal(str(target))
    if value >= target:
        return ACHIEVED
    if target > 0 and value / target >= OFF_TARGET_RATIO:
        return BELOW
    return OFF_TARGET
