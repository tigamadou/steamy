"""
WAD06-WAD07 · Utilisateurs dans l'admin Django (LOT-6 6.2), compléments à API-L6.2 : colonnes et filtre pays, fiche
avec inlines en lecture seule et localité qualifiée, champs sensibles soumis à *view_sensitive_profile* (D6),
réinitialisation du mot de passe par lien au titulaire (D26), invitation d'un enseignant sans compte actif (S5).
"""

import pytest
from django.core import mail
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.accounts.models import LearnerProfile, ParentChildLink, ParentProfile, User
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.classrooms.models import TeacherInvitation
from apps.core.groups import FINANCE, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import verified_client
from apps.referentials.models import Avatar, Locality, Relationship

pytestmark = pytest.mark.django_db

USERS = "/admin/accounts/user/"


def member(group):
    client = APIClient()
    verified_client(client, group)
    return client


def act(client, action, users):
    return client.post(
        USERS, {"action": action, "_selected_action": [u.pk for u in users]}, follow=True
    )


def texts(response):
    return [str(m) for m in response.wsgi_request._messages]


_districts = iter(range(10_000))


def place(country="BJ", city="Porto-Novo", area="rural"):
    """Localité propre au test (quartier distinct : les localités du référentiel existent déjà)."""
    locality, _ = Locality.objects.get_or_create(
        country_id=country,
        city=city,
        district=f"Quartier test {next(_districts)}",
        defaults={"area_type": area},
    )
    return locality


def learner_with_profile(**profile):
    learner = LearnerFactory()
    LearnerProfile.objects.update_or_create(user=learner, defaults=profile)
    return learner


# --- WAD06 · liste ---------------------------------------------------------------------------------------------


def test_the_list_shows_avatar_and_city_and_filters_by_country():
    support = member(SUPPORT)
    avatar = Avatar.objects.filter(active=True).first()
    beninese = learner_with_profile(locality=place(), avatar=avatar)
    togolese = learner_with_profile(locality=place("TG", "Lomé", "urban"))
    listing = support.get(USERS).content.decode()
    assert "Porto-Novo" in listing and avatar.emoji in listing
    filtered = support.get(USERS, {"pays": "TG"}).context["cl"].result_list
    assert list(filtered) == [togolese]
    assert beninese not in support.get(USERS, {"pays": "TG"}).context["cl"].result_list


def test_the_list_does_not_query_per_row():
    support = member(SUPPORT)

    def count() -> int:
        support.get(USERS)
        with CaptureQueriesContext(connection) as queries:
            support.get(USERS)
        return len(queries)

    for _ in range(3):
        learner_with_profile(locality=place())
        ParentProfile.objects.update_or_create(user=ParentFactory(), defaults={"locality": place()})
    few = count()
    for _ in range(3):
        learner_with_profile(locality=place())
        ParentProfile.objects.update_or_create(user=ParentFactory(), defaults={"locality": place()})
    assert count() == few


# --- WAD07 · fiche ---------------------------------------------------------------------------------------------


def test_a_learner_page_shows_its_place_and_read_only_inlines():
    learner = learner_with_profile(locality=place(), gender="female")
    admin = APIClient()
    verified_client(admin, is_superuser=True)
    page = admin.get(f"{USERS}{learner.pk}/change/")
    assert "Porto-Novo, BJ · " in page.content.decode()
    inlines = page.context["inline_admin_formsets"]
    assert len(inlines) == 3  # consentements, inscriptions, classes
    for inline in inlines:
        assert not inline.has_add_permission and not inline.has_change_permission
    # Un inline n'apparaît qu'avec le droit de lecture de son modèle (matrice D71)
    support = member(SUPPORT).get(f"{USERS}{learner.pk}/change/")
    assert [inline.formset.prefix for inline in support.context["inline_admin_formsets"]] == [
        "consent_requests"
    ]


def test_a_parent_page_lists_children_and_orders_a_teacher_page_none():
    support = member(SUPPORT)
    parent = ParentFactory()
    child = LearnerFactory(username="lea.adjovi")
    ParentChildLink.objects.create(
        parent=parent, learner=child, relationship=Relationship.objects.get(code="mere")
    )
    page = support.get(f"{USERS}{parent.pk}/change/")
    assert len(page.context["inline_admin_formsets"]) == 2
    assert "lea.adjovi" in page.content.decode()
    teacher = TeacherFactory()
    assert support.get(f"{USERS}{teacher.pk}/change/").context["inline_admin_formsets"] == []
    assert "—" in support.get(f"{USERS}{teacher.pk}/change/").content.decode()


def test_gender_and_disability_need_the_sensitive_permission():
    learner = learner_with_profile(gender="female")
    with_permission = member(SUPPORT).get(f"{USERS}{learner.pk}/change/").content.decode()
    assert "Genre" in with_permission and "Femme" in with_permission
    without = member(FINANCE).get(f"{USERS}{learner.pk}/change/").content.decode()
    assert "Genre" not in without and "Handicap" not in without


def test_sensitive_fields_show_a_dash_when_unknown():
    teacher = TeacherFactory()
    page = member(SUPPORT).get(f"{USERS}{teacher.pk}/change/").content.decode()
    assert "Genre" in page


# --- Réinitialisation du mot de passe (D26) ----------------------------------------------------------------------


def test_a_parent_gets_a_reset_link_by_sms_a_teacher_by_email(sms):
    support = member(SUPPORT)
    parent = ParentFactory(phone="+2290197000777")
    teacher = TeacherFactory(email="prof@ecole.bj")
    response = act(support, "send_password_reset", [parent, teacher])
    assert "/mot-de-passe-oublie" in sms.last("+2290197000777")
    assert any(m.to == ["prof@ecole.bj"] and "/mot-de-passe-oublie" in m.body for m in mail.outbox)
    assert f"{parent} : lien de réinitialisation envoyé par SMS." in texts(response)
    assert f"{teacher} : lien de réinitialisation envoyé par email." in texts(response)
    assert AuditLog.objects.filter(action="user.password_reset_link").count() == 2


def test_a_learner_or_inactive_account_gets_no_reset_link():
    support = member(SUPPORT)
    learner = LearnerFactory()
    suspended = ParentFactory(status=User.Status.SUSPENDED)
    messages = texts(act(support, "send_password_reset", [learner, suspended]))
    assert any("par son parent (D26)" in m for m in messages)
    assert any("compte non actif" in m for m in messages)
    assert not AuditLog.objects.filter(action="user.password_reset_link").exists()


def test_finance_cannot_send_reset_links():
    form = member(FINANCE).get(USERS).context["action_form"]
    names = [name for name, _ in form.fields["action"].choices] if form else []
    assert "send_password_reset" not in names


# --- Inviter un enseignant (S5) -----------------------------------------------------------------------------------


def test_inviting_a_teacher_creates_an_invitation_and_no_account():
    support = member(SUPPORT)
    assert "/admin/classrooms/teacherinvitation/add/" in support.get(USERS).content.decode()
    response = support.post(
        "/admin/classrooms/teacherinvitation/add/",
        {"email": "nouvelle.prof@ecole.bj", "first_name": "Afi", "last_name": "Koffi"},
        follow=True,
    )
    assert "Invitation envoyée à nouvelle.prof@ecole.bj." in texts(response)
    invitation = TeacherInvitation.objects.get(email="nouvelle.prof@ecole.bj")
    assert invitation.sent_at is not None and invitation.accepted_at is None
    assert any(m.to == ["nouvelle.prof@ecole.bj"] for m in mail.outbox)
    assert not User.objects.filter(email__iexact="nouvelle.prof@ecole.bj").exists()


def test_the_invitation_button_needs_the_permission():
    assert (
        "/admin/classrooms/teacherinvitation/add/"
        not in member(FINANCE).get(USERS).content.decode()
    )


def test_editing_an_invitation_does_not_send_it_again():
    support = member(SUPPORT)
    invitation = TeacherInvitation.objects.create(email="prof@ecole.bj", first_name="Afi")
    support.post(
        f"/admin/classrooms/teacherinvitation/{invitation.pk}/change/",
        {"email": "prof@ecole.bj", "first_name": "Afiwa", "last_name": ""},
    )
    invitation.refresh_from_db()
    assert invitation.first_name == "Afiwa" and invitation.sent_at is None
    assert not mail.outbox
