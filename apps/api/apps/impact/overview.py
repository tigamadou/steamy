"""Vue d'ensemble du back-office (WAD01) : chiffres clés, échéance du rapport, « À traiter » filtré par groupe."""

import datetime

from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import ConsentRequest, User
from apps.core.groups import SUPER_ADMIN, SUPPORT

from .models import ImpactReport, KpiDefinition
from .periods import MONTH, QUARTER, Period
from .services import ValueIndex

#: Le rapport trimestriel est dû 15 jours après la fin du trimestre (hypothèse de travail, à confirmer).
REPORT_DUE_DAYS = 15
#: Fenêtre des « apprenants actifs » (dernière connexion).
ACTIVE_DAYS = 30
HIGHLIGHT = "na"


def _in_groups(user, *groups) -> bool:
    return user.is_superuser or user.groups.filter(name__in=(*groups, SUPER_ADMIN)).exists()


def _pending_consents() -> int:
    return ConsentRequest.objects.filter(
        status=ConsentRequest.Status.PENDING, expires_at__gt=timezone.now()
    ).count()


#: « À traiter » : (type, libellé, groupes, compteur, chemin de la liste filtrée dans l'admin Django). Paiements
#: échoués (Finance) et candidatures à suivre (Support) s'ajoutent avec leurs modèles (API-L3b).
TODO = (
    (
        "consents_pending",
        "Consentements en attente",
        (SUPPORT,),
        _pending_consents,
        "/admin/accounts/consentrequest/?status__exact=pending",
    ),
)


def todo(user) -> list[dict]:
    return [
        {"kind": kind, "label": label, "count": count(), "admin_path": path}
        for kind, label, groups, count, path in TODO
        if _in_groups(user, *groups)
    ]


def report_deadline(period: Period) -> dict:
    report = ImpactReport.objects.filter(period=period.key).first()
    manual = list(KpiDefinition.objects.filter(source=KpiDefinition.Source.MANUAL))
    index = ValueIndex(manual, [period])
    return {
        "period": period.key,
        "label": period.label,
        "due_date": period.end + datetime.timedelta(days=REPORT_DUE_DAYS),
        "status": report.status if report else ImpactReport.Status.DRAFT,
        "entered": sum(index.value(kpi, period) is not None for kpi in manual),
        "total": len(manual),
    }


def build(user) -> dict:
    month = Period.current(MONTH)
    highlight = KpiDefinition.objects.filter(code__in=[HIGHLIGHT, "ventes"])
    index = ValueIndex(list(highlight), [month])
    kpis = {kpi.code: kpi for kpi in highlight}
    key = kpis[HIGHLIGHT]
    personas = User.objects.filter(role__isnull=False, status=User.Status.ACTIVE)
    since = timezone.now() - datetime.timedelta(days=ACTIVE_DAYS)
    return {
        "period": month,
        "highlight": {
            "code": key.code,
            "label": key.label,
            "value": index.value(key, month),
            "target": key.target,
            "status": index.status(key, month),
        },
        "stats": {
            "users": personas.count(),
            "active_learners": personas.filter(
                Q(role=User.Role.LEARNER) & Q(last_login__gte=since)
            ).count(),
            "sales_month": index.value(kpis["ventes"], month),
            # Taux de complétion : avec les inscriptions refondues (API-L3a)
            "completion_rate": None,
        },
        "report": report_deadline(Period.current(QUARTER)),
        "todo": todo(user),
    }
