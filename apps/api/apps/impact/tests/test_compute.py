"""
KPI `auto` (D75) : valeurs de référence écrites à la main sur un jeu construit, agrégats quotidiens idempotents,
définitions chargées par migration.
"""

import datetime
from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.accounts.models import LearnerProfile, ParentProfile, User
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.analytics.models import DailyAggregatedStat
from apps.classrooms.models import School
from apps.impact import services
from apps.impact.definitions import KPIS, load_definitions
from apps.impact.models import ImpactReport, KpiDefinition, KpiValue
from apps.referentials.models import Country, Disability, Locality

pytestmark = pytest.mark.django_db

D = datetime.date
DAY = D(2026, 2, 20)  # « hier » du calcul


def at(day, hour=12):
    return datetime.datetime.combine(
        day, datetime.time(hour), tzinfo=timezone.get_current_timezone()
    )


def rural():
    return Locality.objects.get(country_id="BJ", city="Allada", area_type="rural")


@pytest.fixture
def dataset():
    """
    Janvier : Léa (fille, rurale), Kofi (garçon, handicap), un parent (femme), un enseignant, une inscription en
    attente. Février : Awa (fille), un parent (homme, rural). Une école avec offre en février, une sans offre.
    """
    january, february = D(2026, 1, 10), D(2026, 2, 5)
    lea = LearnerFactory(date_joined=at(january), last_login=at(D(2026, 2, 10)))
    LearnerProfile.objects.filter(user=lea).update(gender="female", locality=rural())
    kofi = LearnerFactory(date_joined=at(january), last_login=at(D(2026, 1, 15)))
    LearnerProfile.objects.filter(user=kofi).update(
        gender="male", disability=Disability.objects.first()
    )
    mother = ParentFactory(date_joined=at(january))
    ParentProfile.objects.filter(user=mother).update(gender="female")
    TeacherFactory(date_joined=at(january), last_login=at(D(2026, 2, 1)))
    LearnerFactory(date_joined=at(january), status=User.Status.PENDING)
    awa = LearnerFactory(date_joined=at(february), last_login=at(D(2026, 2, 19)))
    LearnerProfile.objects.filter(user=awa).update(gender="female")
    father = ParentFactory(date_joined=at(february))
    ParentProfile.objects.filter(user=father).update(gender="male", locality=rural())
    LearnerFactory(date_joined=at(D(2026, 2, 25)))  # après « hier » : pas encore compté
    benin = Country.objects.get(code="BJ")
    with_offer = School.objects.create(
        name="Collège A", country=benin, city="Cotonou", valid_until=D(2026, 12, 31)
    )
    School.objects.filter(pk=with_offer.pk).update(created_at=at(february))
    School.objects.create(name="Collège B", country=benin, city="Cotonou")
    expired = School.objects.create(
        name="Collège C", country=benin, city="Cotonou", valid_until=D(2025, 12, 31)
    )
    School.objects.filter(pk=expired.pk).update(created_at=at(february))


def values(period):
    return {
        v.kpi.code: v.number for v in KpiValue.objects.filter(period=period).select_related("kpi")
    }


#: Valeurs attendues, calculées à la main sur `dataset`.
EXPECTED = {
    "2026-01": {
        "nu": 4, "nu_35": 2, "nu_f": 2, "nu_f35": 1, "nu_rural": 1, "nu_hand": 1,
        "na": 2, "na_35": 2, "na_f": 1, "na_f35": 1, "na_rural": 1, "na_hand": 1,
        "educ": 1, "inst": 0,
    },
    "2026-02": {
        "nu": 2, "nu_35": 1, "nu_f": 1, "nu_f35": 1, "nu_rural": 1, "nu_hand": 0,
        "na": 1, "na_35": 1, "na_f": 1, "na_f35": 1, "na_rural": 0, "na_hand": 0,
        "educ": 0, "inst": 1, "nu_active": 3, "na_active": 2,
    },
    "2026-t1": {"nu": 6, "na": 3, "nu_f": 3, "nu_rural": 2, "inst": 1, "nu_active": 4, "na_active": 3},
    "2026": {"nu": 6, "na": 3, "educ": 1},
}  # fmt: skip


def test_reference_values_on_the_dataset(dataset):
    services.aggregate_daily_stats(DAY)
    services.compute_kpis(DAY)
    for period, expected in EXPECTED.items():
        computed = values(period)
        assert {code: computed.get(code) for code in expected} == expected, period
    # Pas de collecteur avant API-L3a/L3b : aucune valeur, statut « En attente »
    assert not KpiValue.objects.filter(kpi__code__in=["ventes", "complete", "complete_conf"])
    # Pas de valeur « connectés » pour un mois passé (calculée seulement pour les périodes en cours)
    assert "nu_active" not in values("2026-01")


def test_daily_stats_are_idempotent_and_follow_profile_changes(dataset):
    services.aggregate_daily_stats(DAY)
    first = DailyAggregatedStat.objects.filter(group_by="impact").count()
    assert services.aggregate_daily_stats(DAY) == first
    assert DailyAggregatedStat.objects.filter(group_by="impact").count() == first
    LearnerProfile.objects.filter(gender="female").update(gender="male")
    services.aggregate_daily_stats(DAY)
    services.compute_kpis(DAY)
    assert values("2026-01")["na_f"] == 0


def test_the_nightly_task_and_its_command(dataset, monkeypatch):
    monkeypatch.setattr(services, "_yesterday", lambda: DAY)
    out = StringIO()
    call_command("aggregate_daily_stats", stdout=out)
    assert "aggregate_daily_stats" in out.getvalue()
    assert values("2026-02")["nu"] == Decimal(2)


def test_the_30_definitions_are_loaded_by_migration():
    assert KpiDefinition.objects.count() == 30 == len(KPIS)
    assert KpiDefinition.objects.values("group").distinct().count() == 8
    assert KpiDefinition.objects.get(code="nu_f").base.code == "nu"
    assert KpiDefinition.objects.get(code="nps").target == 8
    load_definitions(KpiDefinition)  # idempotent
    assert KpiDefinition.objects.count() == 30
    assert str(KpiDefinition.objects.get(code="nu")) == "Nouveaux utilisateurs (nu)"


def test_labels_and_default_day():
    value = KpiValue.objects.create(kpi=KpiDefinition.objects.get(code="nu"), period="2026-01")
    assert str(value) == "nu · 2026-01"
    assert str(ImpactReport(period="2026-t1")) == "Rapport 2026-t1"
    assert services._yesterday() == timezone.localdate() - datetime.timedelta(days=1)
