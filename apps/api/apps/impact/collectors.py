"""
Calcul des KPI `auto` (D75) depuis les tables métier.

- `ADDITIVE` : indicateurs additifs, comptés jour par jour (`DailyAggregatedStat`) puis sommés par période.
- `ACTIVE` : « connectés ≥ 1 fois », non additif, compté à la volée sur la dernière connexion.
- Sans collecteur (ventes, parcours complétés) : la valeur reste absente (« En attente ») jusqu'à la refonte des
  commandes (API-L3b) et des inscriptions (API-L3a), qui ajouteront leur collecteur ici.
"""

from django.db.models import Count, F, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.accounts.models import User
from apps.classrooms.models import School

Role = User.Role
FEMALE = "female"
RURAL = "rural"

_FEMALE = Q(learner_profile__gender=FEMALE) | Q(parent_profile__gender=FEMALE)
_RURAL = Q(learner_profile__locality__area_type=RURAL) | Q(
    parent_profile__locality__area_type=RURAL
)
_DISABLED = Q(learner_profile__disability__isnull=False) | Q(
    parent_profile__disability__isnull=False
)
_LEARNER = Q(role=Role.LEARNER)
_FEMALE_LEARNER = _LEARNER & Q(learner_profile__gender=FEMALE)


def _personas(*roles):
    """Comptes validés (hors inscriptions en attente de consentement) des rôles donnés."""
    return User.objects.filter(role__in=roles).exclude(status=User.Status.PENDING)


_ALL = (Role.LEARNER, Role.PARENT, Role.TEACHER)


def _demography(prefix, roles):
    people = _personas(*roles)
    return {
        prefix: (people, "date_joined"),
        f"{prefix}_35": (people.filter(_LEARNER), "date_joined"),
        f"{prefix}_f": (people.filter(_FEMALE), "date_joined"),
        f"{prefix}_f35": (people.filter(_FEMALE_LEARNER), "date_joined"),
        f"{prefix}_rural": (people.filter(_RURAL), "date_joined"),
        f"{prefix}_hand": (people.filter(_DISABLED), "date_joined"),
    }


def additive():
    """Code → (requête, champ date) : un enregistrement compte le jour de ce champ."""
    return {
        **_demography("nu", _ALL),
        **_demography("na", (Role.LEARNER,)),
        "educ": (_personas(Role.TEACHER), "date_joined"),
        # Offre active le jour de la création de l'école (« institutions », §8.18)
        "inst": (School.objects.all(), "created_at"),
    }


ACTIVE = {"nu_active": _ALL, "na_active": (Role.LEARNER,)}


def daily_counts(code: str, start, end) -> dict:
    """Comptes par jour (dates incluses `start`…`end`) pour un indicateur additif."""
    queryset, field = additive()[code]
    tz = timezone.get_current_timezone()
    queryset = queryset.annotate(day=TruncDate(field, tzinfo=tz))
    if queryset.model is School:  # offre valable au moins jusqu'au jour de création
        queryset = queryset.filter(valid_until__gte=F("day"))
    rows = (
        queryset.filter(day__gte=start, day__lte=end)
        .values("day")
        .annotate(count=Count("pk", distinct=True))
    )
    return {row["day"]: row["count"] for row in rows}


def active_count(code: str, period) -> int:
    start, end = period.bounds()
    return _personas(*ACTIVE[code]).filter(last_login__gte=start, last_login__lt=end).count()
