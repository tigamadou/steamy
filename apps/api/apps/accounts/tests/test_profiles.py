"""Profils (W11-W14, WP07-WP09, WD17) : D23 (âge cohérent), objectifs ≥ 2, champs facultatifs (D6), `profileStep`."""

from datetime import date, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import LearnerProfile, User
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.accounts.views.profiles import age_on
from apps.referentials.models import Locality

pytestmark = pytest.mark.django_db

ME = "/api/accounts/me/"
LEARNER_URL = f"{ME}learner-profile/"
PARENT_URL = f"{ME}parent-profile/"


def client_for(user):
    client = APIClient()
    client.force_login(user)
    return client


def birthday(years_ago, days=0):
    today = timezone.localdate()  # date du Bénin (C16), comme l'API
    # Un 29 février n'existe pas toutes les années : on prend le 28.
    day = today.replace(
        year=today.year - years_ago, day=min(today.day, 28 if today.month == 2 else 31)
    )
    return (day - timedelta(days=days)).isoformat()


@pytest.fixture
def learner():
    """Apprenant inscrit aujourd'hui en déclarant 12 ans (W05)."""
    user = LearnerFactory(learner_profile__declared_age=12)
    return user


@pytest.fixture
def cotonou():
    return Locality.objects.get(country_id="BJ", city="Cotonou", district="")


def patch(client, url, payload):
    return client.patch(url, payload, format="json")


# --- Refus d'abord -------------------------------------------------------------------------------


@pytest.mark.parametrize("url", [LEARNER_URL, PARENT_URL])
def test_anonymous_is_refused(url):
    assert APIClient().patch(url, {}, format="json").status_code == 401


def test_each_profile_belongs_to_its_role(learner):
    assert patch(client_for(learner), PARENT_URL, {}).status_code == 403
    assert patch(client_for(ParentFactory()), LEARNER_URL, {}).status_code == 403
    teacher = client_for(TeacherFactory())
    assert patch(teacher, LEARNER_URL, {}).status_code == 403
    assert patch(teacher, PARENT_URL, {}).status_code == 403


# --- Apprenant : parcours W11 → W14 ---------------------------------------------------------------


def test_learner_profile_steps(learner, cotonou):
    client = client_for(learner)
    assert client.get(ME).json()["profileStep"] == "learner-info"
    body = patch(
        client,
        LEARNER_URL,
        {"birthDate": birthday(12, 10), "locality": cotonou.pk, "email": "kofi@exemple.bj"},
    ).json()
    assert body["profileStep"] == "learner-school"
    assert body["locality"]["city"] == "Cotonou"
    body = patch(client, LEARNER_URL, {"schoolGrade": "5e", "gender": None}).json()
    assert body["profileStep"] == "learner-goals"
    assert body["schoolGrade"]["code"] == "5e" and body["gender"] is None
    body = patch(client, LEARNER_URL, {"goals": ["robots", "coder"]}).json()
    assert body["profileStep"] == "learner-avatar"
    assert {goal["code"] for goal in body["goals"]} == {"robots", "coder"}
    body = patch(client, LEARNER_URL, {"avatar": "hibou"}).json()
    assert body["profileStep"] is None
    assert body["avatar"]["code"] == "hibou"
    assert client.get(ME).json()["profileStep"] is None
    # WD13, WD17 : relecture du profil complet
    body = client.get(LEARNER_URL).json()
    assert body["avatar"]["code"] == "hibou" and body["locality"]["city"] == "Cotonou"
    assert body["email"] == "kofi@exemple.bj" and body["profileStep"] is None


def test_learner_profile_is_read_by_its_owner_only(learner):
    assert APIClient().get(LEARNER_URL).status_code == 401
    assert client_for(ParentFactory()).get(LEARNER_URL).status_code == 403
    assert client_for(learner).get(LEARNER_URL).json()["profileStep"] == "learner-info"


def test_birth_date_must_match_the_declared_age(learner):
    client = client_for(learner)
    for value in (birthday(13, 1), birthday(11)):
        resp = patch(client, LEARNER_URL, {"birthDate": value})
        assert resp.status_code == 400
        assert resp.json()["fields"]["birthDate"][0]["code"] == "BIRTHDATE_AGE_MISMATCH"
    # 12 ans à la date d'inscription, anniversaire compris
    assert patch(client, LEARNER_URL, {"birthDate": birthday(12)}).status_code == 200
    assert patch(client, LEARNER_URL, {"birthDate": birthday(12, 364)}).status_code == 200


def test_consistency_is_checked_against_the_signup_date(learner):
    """Inscrit il y a un an en déclarant 12 ans : il en a 13 aujourd'hui."""
    User.objects.filter(pk=learner.pk).update(date_joined=timezone.now() - timedelta(days=366))
    learner.refresh_from_db()
    client = client_for(learner)
    assert patch(client, LEARNER_URL, {"birthDate": birthday(13, 2)}).status_code == 200


@pytest.mark.parametrize("years", [9, 18])
def test_birth_date_out_of_10_17_is_refused(years):
    user = LearnerFactory()  # créé par son parent : pas d'âge déclaré
    resp = patch(client_for(user), LEARNER_URL, {"birthDate": birthday(years, 1)})
    assert resp.json()["fields"]["birthDate"][0]["code"] == "AGE_OUT_OF_RANGE"
    assert patch(client_for(user), LEARNER_URL, {"birthDate": birthday(14)}).status_code == 200


def test_at_least_two_goals(learner):
    client = client_for(learner)
    for goals in (["robots"], ["robots", "robots"], []):
        resp = patch(client, LEARNER_URL, {"goals": goals})
        assert resp.status_code == 400
        assert resp.json()["fields"]["goals"][0]["code"] == "MIN_GOALS"
    assert patch(client, LEARNER_URL, {"goals": ["robots", "inconnu"]}).status_code == 400


def test_sensitive_fields_are_optional_and_clearable(learner):
    client = client_for(learner)
    body = patch(client, LEARNER_URL, {"gender": "female", "disability": "visuel"}).json()
    assert (body["gender"], body["disability"]["code"]) == ("female", "visuel")
    body = patch(client, LEARNER_URL, {"gender": None, "disability": None}).json()
    assert (body["gender"], body["disability"]) == (None, None)


def test_learner_profile_is_created_if_missing():
    user = LearnerFactory(learner_profile=None)
    resp = patch(client_for(user), LEARNER_URL, {"schoolGrade": "6e"})
    assert resp.status_code == 200
    assert LearnerProfile.objects.get(user=user).school_grade.code == "6e"


def test_age_on():
    assert age_on(date(2012, 6, 15), date(2024, 6, 14)) == 11
    assert age_on(date(2012, 6, 15), date(2024, 6, 15)) == 12


# --- Parent : WP07 → WP09 -------------------------------------------------------------------------


def test_parent_profile_steps(cotonou):
    parent = ParentFactory()
    client = client_for(parent)
    assert client.get(ME).json()["profileStep"] == "parent-location"
    body = patch(client, PARENT_URL, {"locality": cotonou.pk, "email": "awa@exemple.bj"}).json()
    assert body["profileStep"] == "parent-children"
    body = patch(client, PARENT_URL, {"gender": "female", "profession": "Infirmière"}).json()
    assert body["profileStep"] == "parent-children"
    body = patch(client, PARENT_URL, {"goalsForChildren": ["robots"]}).json()
    assert body["profileStep"] == "parent-children"  # nombre d'enfants encore manquant
    body = patch(client, PARENT_URL, {"childrenToEnroll": 2}).json()
    assert body["profileStep"] is None
    assert (body["childrenToEnroll"], body["profession"]) == (2, "Infirmière")


def test_parent_profile_validation():
    client = client_for(ParentFactory())
    assert patch(client, PARENT_URL, {"goalsForChildren": []}).json()["fields"]["goalsForChildren"][
        0
    ]["code"] == ("MIN_GOALS")
    for count in (0, 11):
        assert (
            "childrenToEnroll"
            in patch(client, PARENT_URL, {"childrenToEnroll": count}).json()["fields"]
        )
    assert "locality" in patch(client, PARENT_URL, {"locality": 999999}).json()["fields"]


def test_parent_profile_is_created_if_missing():
    parent = ParentFactory(parent_profile=None)
    assert patch(client_for(parent), PARENT_URL, {"profession": "Juriste"}).status_code == 200


# --- Identité (WD17, WPD08, WT08) -----------------------------------------------------------------


def test_patch_me_changes_only_the_names(learner):
    client = client_for(learner)
    body = patch(
        client,
        ME,
        {
            "firstName": "Kofi",
            "lastName": "Mensah",
            "username": "autre",
            "role": "parent",
            "status": "suspended",
            "isStaff": True,
        },
    ).json()
    assert (body["firstName"], body["lastName"]) == ("Kofi", "Mensah")
    learner.refresh_from_db()
    assert (learner.role, learner.status, learner.is_staff) == ("learner", "active", False)
    assert learner.username != "autre"


def test_patch_me_requires_authentication():
    assert APIClient().patch(ME, {"firstName": "X"}, format="json").status_code == 401
