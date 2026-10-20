"""
Admin des comptes (API-L6.2, WAD06-WAD08, WAD13) : chaque action et chaque permission, accès autorisé et refusé.
Invariants : le personnel ne tranche jamais un consentement (D70), le lien ne change qu'à l'acceptation du nouveau
parent (D22), modération a priori (D15), garde-fous du dernier Super-admin (D71).
"""

import datetime
from datetime import timedelta

import pytest
from django.contrib.auth.models import Group
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts import backoffice, consent
from apps.accounts.models import (
    ConsentRequest,
    LearnerProfile,
    ParentChildLink,
    PublicProfileReview,
    StaffMember,
    User,
)
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, StaffFactory
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.core.models import AuditLog
from apps.core.tests.staff import staff_member, verified_client
from apps.referentials.models import Avatar, RefusalReason, Relationship

pytestmark = pytest.mark.django_db

USERS = "/admin/accounts/user/"
CONSENTS = "/admin/accounts/consentrequest/"
LINKS = "/admin/accounts/parentchildlink/"
REVIEWS = "/admin/accounts/publicprofilereview/"
STAFF = "/admin/accounts/staffmember/"
NEW_PHONE = "+2290197555000"


def run_action(client, url, action, objects, **data):
    """Déclenche une action d'admin ; avec `data`, valide aussi son formulaire (deuxième temps)."""
    payload = {"action": action, "_selected_action": [obj.pk for obj in objects]}
    if data:
        payload.update(apply="1", **data)
    return client.post(url, payload)


def messages_of(response):
    return [str(m) for m in response.wsgi_request._messages]


def mother():
    return Relationship.objects.get(code="mere")


def family(parent_phone="+2290197000111"):
    parent = ParentFactory(phone=parent_phone)
    learner = LearnerFactory()
    link = ParentChildLink.objects.create(parent=parent, learner=learner, relationship=mother())
    return parent, learner, link


def pending_consent(**fields):
    learner = fields.pop("learner", None) or LearnerFactory(status=User.Status.PENDING)
    return ConsentRequest.objects.create(
        origin=ConsentRequest.Origin.LEARNER,
        subject={"first_name": "Kofi", "last_name": "Mensah", "age": 12},
        learner=learner,
        parent_phone=fields.pop("parent_phone", "+2290197000222"),
        relationship=mother(),
        expires_at=fields.pop("expires_at", timezone.now() + timedelta(days=7)),
        **fields,
    )


# --- Accès par groupe -------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("group", "url", "status"),
    [
        (CONTENT, USERS, 403),
        (CONTENT, CONSENTS, 403),
        (CONTENT, "/admin/payments/payment/", 403),
        (FINANCE, CONSENTS, 403),
        (FINANCE, LINKS, 403),
        (FINANCE, USERS, 200),
        (SUPPORT, STAFF, 403),
        (SUPPORT, CONSENTS, 200),
        (SUPPORT, REVIEWS, 200),
        (SUPER_ADMIN, STAFF, 200),
    ],
)
def test_group_access(client, group, url, status):
    verified_client(client, group)
    assert client.get(url).status_code == status


# --- Utilisateurs (WAD06, WAD07) -----------------------------------------------------------------


def test_the_user_list_has_only_personas_and_no_add(client):
    staff = verified_client(client, SUPPORT)
    learner = LearnerFactory()
    response = client.get(USERS)
    listed = set(response.context["cl"].queryset)
    assert learner in listed and staff not in listed
    assert client.get(f"{USERS}add/").status_code == 403


def inline_management(client, url) -> dict:
    """Champs de gestion des inlines (en lecture seule) de la fiche, à renvoyer avec le formulaire."""
    data = {}
    for inline in client.get(url).context["inline_admin_formsets"]:
        management = inline.formset.management_form
        data.update(
            {management.add_prefix(name): value for name, value in management.initial.items()}
        )
    return data


def test_role_status_and_identifiers_are_read_only(client):
    verified_client(client, SUPPORT)
    learner = LearnerFactory(first_name="Léa")
    change = f"{USERS}{learner.pk}/change/"
    response = client.post(
        change,
        {
            **inline_management(client, change),
            "first_name": "Lina",
            "last_name": "Adjovi",
            "role": "parent",
            "status": "suspended",
        },
    )
    assert response.status_code == 302
    learner.refresh_from_db()
    assert (learner.first_name, learner.role, learner.status) == ("Lina", "learner", "active")


def test_the_user_page_links_to_the_parent(client):
    verified_client(client, SUPPORT)
    parent, learner, _ = family()
    page = client.get(f"{USERS}{learner.pk}/change/").content.decode()
    assert f"/admin/accounts/user/{parent.pk}/change/" in page
    assert client.get(f"{USERS}{parent.pk}/change/").status_code == 200  # sans enfant : « — »


def test_suspend_asks_a_reason_then_logs_it(client):
    verified_client(client, SUPPORT)
    learner = LearnerFactory()
    form = run_action(client, USERS, "suspend", [learner])
    assert form.status_code == 200 and b"Motif" in form.content
    invalid = run_action(client, USERS, "suspend", [learner], reason="")
    assert invalid.status_code == 200
    learner.refresh_from_db()
    assert learner.status == User.Status.ACTIVE
    done = run_action(client, USERS, "suspend", [learner], reason="Propos déplacés")
    assert done.status_code == 302
    learner.refresh_from_db()
    assert learner.status == User.Status.SUSPENDED and not learner.is_active
    entry = AuditLog.objects.get(action="account.status_changed")
    assert entry.data == {"from": "active", "to": "suspended", "reason": "Propos déplacés"}


def test_deactivate_and_reactivate(client):
    verified_client(client, SUPPORT)
    learner = LearnerFactory(status=User.Status.SUSPENDED)
    run_action(client, USERS, "deactivate", [learner], reason="Demande du parent")
    learner.refresh_from_db()
    assert learner.status == User.Status.DEACTIVATED
    run_action(client, USERS, "reactivate", [learner], reason="Erreur")
    learner.refresh_from_db()
    assert learner.status == User.Status.ACTIVE


def test_a_pending_account_is_never_changed_by_the_support(client):
    verified_client(client, SUPPORT)
    pending = LearnerFactory(status=User.Status.PENDING)
    response = run_action(client, USERS, "reactivate", [pending], reason="…")
    pending.refresh_from_db()
    assert pending.status == User.Status.PENDING
    assert any("ignoré" in m for m in messages_of(response))


def test_staff_status_is_never_changed_by_the_service():
    staff = StaffFactory()
    assert not backoffice.set_status(staff, User.Status.SUSPENDED, "…", request=None)


def test_finance_reads_users_without_status_actions(client):
    verified_client(client, FINANCE)
    learner = LearnerFactory()
    assert client.get(USERS).context["action_form"] is None  # aucune action pour Finance
    run_action(client, USERS, "suspend", [learner], reason="…")
    learner.refresh_from_db()
    assert learner.status == User.Status.ACTIVE


@pytest.mark.parametrize("path", ["learnerprofile", "parentprofile"])
def test_sensitive_fields_need_the_permission(client, path):
    support = verified_client(client, SUPPORT)
    learner = LearnerFactory() if path == "learnerprofile" else ParentFactory()
    profile = learner.learner_profile if path == "learnerprofile" else learner.parent_profile
    url = f"/admin/accounts/{path}/{profile.pk}/change/"
    assert "gender" in client.get(url).context["adminform"].form.fields
    support.groups.clear()
    support.groups.add(Group.objects.get(name=FINANCE))
    assert "gender" not in client.get(url).content.decode()


# --- Consentements (WAD08, D70) -------------------------------------------------------------------


def test_the_support_cannot_accept_or_edit_a_consent(client):
    verified_client(client, SUPPORT)
    request = pending_consent()
    assert client.get(f"{CONSENTS}add/").status_code == 403
    client.post(f"{CONSENTS}{request.pk}/change/", {"status": "accepted"})
    client.post(f"{CONSENTS}{request.pk}/delete/", {"post": "yes"})
    request.refresh_from_db()
    assert request.status == ConsentRequest.Status.PENDING
    assert client.get(f"{CONSENTS}{request.pk}/change/").status_code == 200  # lecture seule


def test_the_consent_list_shows_child_age_and_effective_status(client):
    verified_client(client, SUPPORT)
    pending_consent(expires_at=timezone.now() - timedelta(minutes=1))
    page = client.get(CONSENTS).content.decode()
    assert "Kofi Mensah" in page and "Expirée" in page


def test_resend_follows_the_caps(client, sms):
    verified_client(client, SUPPORT)
    request = pending_consent()
    run_action(client, CONSENTS, "resend", [request])
    assert len(sms.messages(request.parent_phone)) == 1
    response = run_action(client, CONSENTS, "resend", [request])  # avant le délai de renvoi
    assert len(sms.messages(request.parent_phone)) == 1
    assert any("Patiente" in m for m in messages_of(response))
    request.refresh_from_db()
    assert request.status == ConsentRequest.Status.PENDING


def test_flag_dispute_requires_a_note_and_keeps_the_status(client):
    verified_client(client, SUPPORT)
    request = pending_consent()
    assert run_action(client, CONSENTS, "flag_dispute", [request]).status_code == 200
    run_action(client, CONSENTS, "flag_dispute", [request], note="Le parent conteste")
    request.refresh_from_db()
    assert request.disputed_at and request.dispute_note == "Le parent conteste"
    assert request.status == ConsentRequest.Status.PENDING
    assert AuditLog.objects.filter(action="consent.disputed", target_id=str(request.pk)).exists()


def test_without_the_permissions_the_consent_actions_do_nothing(client, sms):
    verified_client(client, SUPPORT)
    request = pending_consent()
    Group.objects.get(name=SUPPORT).permissions.remove(
        *Group.objects.get(name=SUPPORT).permissions.filter(codename__in=["resend", "flag_dispute"])
    )
    run_action(client, CONSENTS, "resend", [request])
    run_action(client, CONSENTS, "flag_dispute", [request], note="…")
    request.refresh_from_db()
    assert not sms.messages(request.parent_phone) and request.disputed_at is None


# --- Changement de parent (D22) ---------------------------------------------------------------------


def ask_parent_change(client, link, phone=NEW_PHONE):
    return run_action(client, LINKS, "change_parent", [link], phone=phone, relationship=mother().pk)


def test_parent_change_sends_a_request_and_keeps_the_link(client, sms):
    support = verified_client(client, SUPPORT)
    parent, learner, link = family()
    LearnerProfile.objects.filter(user=learner).update(birth_date=datetime.date(2013, 3, 14))
    assert run_action(client, LINKS, "change_parent", [link]).status_code == 200
    ask_parent_change(client, link, phone="0197555000")
    request = ConsentRequest.objects.get(replaces_link=link)
    assert request.origin == ConsentRequest.Origin.SUPPORT and request.parent_phone == NEW_PHONE
    assert request.requested_by == support and isinstance(request.subject["age"], int)
    assert "vous désigne comme parent" in sms.last(NEW_PHONE)
    link.refresh_from_db()
    assert link.parent == parent


def test_the_link_changes_only_when_the_new_parent_accepts(client, sms):
    verified_client(client, SUPPORT)
    former, learner, link = family()
    ask_parent_change(client, link)
    request = ConsentRequest.objects.get(replaces_link=link)
    newcomer = ParentFactory(phone=NEW_PHONE)
    consent.accept(request.pk, newcomer)
    link.refresh_from_db()
    assert link.parent == newcomer and link.consent_request == request
    assert "n'êtes plus le parent" in sms.last(former.phone)
    assert ParentChildLink.objects.filter(learner=learner).count() == 1


def test_a_refused_parent_change_keeps_the_link_and_the_child(client, sms):
    verified_client(client, SUPPORT)
    former, learner, link = family()
    ask_parent_change(client, link)
    request = ConsentRequest.objects.get(replaces_link=link)
    consent.refuse(request.pk, ParentFactory(phone=NEW_PHONE), reason=RefusalReason.objects.first())
    link.refresh_from_db()
    assert link.parent == former and User.objects.filter(pk=learner.pk).exists()


@pytest.mark.parametrize(
    ("phone", "message"),
    [("+2290197000111", "déjà celui du parent"), ("12", "Numéro invalide")],
)
def test_parent_change_rejects_the_same_or_an_invalid_number(client, phone, message):
    verified_client(client, SUPPORT)
    _, _, link = family()
    response = ask_parent_change(client, link, phone=phone)
    assert message in response.content.decode() + " ".join(messages_of(response))
    assert not ConsentRequest.objects.filter(replaces_link=link).exists()


def test_parent_change_refuses_a_second_pending_request(client, sms):
    verified_client(client, SUPPORT)
    _, learner, link = family()
    pending_consent(learner=learner, parent_phone="+2290197000999")
    response = ask_parent_change(client, link)
    assert any("déjà en attente" in m for m in messages_of(response))


def test_parent_change_respects_the_refusal_cooldown(client, sms):
    verified_client(client, SUPPORT)
    _, _, link = family()
    pending_consent(
        parent_phone=NEW_PHONE,
        status=ConsentRequest.Status.REFUSED,
        resolved_at=timezone.now(),
    )
    response = ask_parent_change(client, link)
    assert any("30 jours" in m for m in messages_of(response))


def test_parent_change_needs_a_single_link_and_the_permission(client, sms):
    verified_client(client, SUPPORT)
    _, _, first = family()
    _, _, second = family("+2290197000333")
    response = run_action(client, LINKS, "change_parent", [first, second])
    assert any("un seul lien" in m for m in messages_of(response))
    Group.objects.get(name=SUPPORT).permissions.remove(
        Group.objects.get(name=SUPPORT).permissions.get(codename="change_parent")
    )
    ask_parent_change(client, first)
    assert not ConsentRequest.objects.exists()


def test_the_support_cannot_edit_a_link(client):
    verified_client(client, SUPPORT)
    parent, _, link = family()
    client.post(f"{LINKS}{link.pk}/change/", {"parent": ParentFactory().pk})
    link.refresh_from_db()
    assert link.parent == parent


# --- Modération des affichages publics (D15) --------------------------------------------------------


def test_approve_copies_the_pseudonym_and_the_avatar(client):
    support = verified_client(client, SUPPORT)
    learner = LearnerFactory()
    avatar = Avatar.objects.first()
    review = PublicProfileReview.objects.create(learner=learner, pseudonym="Robo", avatar=avatar)
    run_action(client, REVIEWS, "approve", [review])
    review.refresh_from_db()
    learner.learner_profile.refresh_from_db()
    assert review.status == "approved" and review.reviewed_by == support
    assert (learner.learner_profile.public_pseudonym, learner.learner_profile.avatar) == (
        "Robo",
        avatar,
    )


def test_reject_leaves_the_profile_and_reviews_are_moderated_once(client):
    verified_client(client, SUPPORT)
    learner = LearnerFactory()
    review = PublicProfileReview.objects.create(learner=learner, pseudonym="Moqueur")
    run_action(client, REVIEWS, "reject", [review])
    run_action(client, REVIEWS, "approve", [review])
    review.refresh_from_db()
    learner.learner_profile.refresh_from_db()
    assert review.status == "rejected" and learner.learner_profile.public_pseudonym is None
    assert str(review) == "Moqueur (rejeté)"
    assert client.get(f"{REVIEWS}add/").status_code == 403


def test_approve_without_avatar_keeps_the_current_one(client):
    verified_client(client, SUPPORT)
    learner = LearnerFactory()
    review = PublicProfileReview.objects.create(learner=learner, pseudonym="Zeti")
    run_action(client, REVIEWS, "approve", [review])
    learner.learner_profile.refresh_from_db()
    assert learner.learner_profile.public_pseudonym == "Zeti"


def test_finance_cannot_moderate(client):
    verified_client(client, FINANCE)
    review = PublicProfileReview.objects.create(learner=LearnerFactory(), pseudonym="Robo")
    assert client.get(REVIEWS).status_code == 403
    run_action(client, REVIEWS, "approve", [review])
    review.refresh_from_db()
    assert review.status == "pending"


# --- Équipe (WAD13) -----------------------------------------------------------------------------------


def test_the_team_lists_staff_only_and_creates_staff(client):
    verified_client(client, SUPER_ADMIN)
    learner = LearnerFactory()
    page = client.get(STAFF)
    assert learner not in set(page.context["cl"].queryset)
    response = client.post(
        f"{STAFF}add/",
        {
            "email": "nouveau@steamy.test",
            "first_name": "Ama",
            "last_name": "Zinsou",
            "password1": "Steamy2026x",
            "password2": "Steamy2026x",
            "groups": [Group.objects.get(name=CONTENT).pk],
        },
    )
    assert response.status_code == 302, response.context["adminform"].form.errors
    created = User.objects.get(email="nouveau@steamy.test")
    assert (created.role, created.is_staff) == (None, True)
    assert "delete_selected" not in page.context["action_form"].fields["action"].choices


def edit_groups(client, member, *groups):
    return client.post(
        f"{STAFF}{member.pk}/change/",
        {
            "email": member.email,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "groups": [Group.objects.get(name=g).pk for g in groups],
        },
    )


def test_nobody_leaves_the_super_admin_group_by_himself(client):
    me = verified_client(client, SUPER_ADMIN)
    response = edit_groups(client, me, CONTENT)
    assert "vous retirer vous-même" in response.content.decode()
    assert me.groups.filter(name=SUPER_ADMIN).exists()


def test_a_super_admin_can_leave_when_another_remains(client):
    me = verified_client(client, SUPER_ADMIN)
    other = staff_member(SUPER_ADMIN)
    assert edit_groups(client, other, SUPER_ADMIN, CONTENT).status_code == 302
    assert edit_groups(client, other, CONTENT).status_code == 302
    assert backoffice.is_last_super_admin(me) and not backoffice.is_last_super_admin(other)


def test_the_last_super_admin_cannot_be_removed_by_another_hand(client):
    me = verified_client(client, SUPER_ADMIN)
    other = staff_member(SUPER_ADMIN)
    me.groups.clear()  # `other` devient le seul Super-admin ; `me` garde sa session vérifiée
    me.user_permissions.add(*Group.objects.get(name=SUPER_ADMIN).permissions.all())
    response = edit_groups(client, other, CONTENT)
    assert "dernier Super-admin" in response.content.decode()
    assert client.get(f"{STAFF}{other.pk}/delete/").status_code == 403


def test_nobody_deletes_himself_or_the_last_super_admin(client):
    me = verified_client(client, SUPER_ADMIN)
    assert client.get(f"{STAFF}{me.pk}/delete/").status_code == 403
    colleague = staff_member(CONTENT)
    assert client.post(f"{STAFF}{colleague.pk}/delete/", {"post": "yes"}).status_code == 302
    assert not User.objects.filter(pk=colleague.pk).exists()


def test_reset_totp_removes_the_devices(client):
    verified_client(client, SUPER_ADMIN)
    colleague = staff_member(SUPPORT)
    page = client.get(STAFF).content.decode()
    assert colleague.email in page
    run_action(client, STAFF, "reset_totp", [StaffMember.objects.get(pk=colleague.pk)])
    assert not TOTPDevice.objects.filter(user=colleague).exists()
    assert AuditLog.objects.filter(action="staff.totp_reset", target_id=str(colleague.pk)).exists()
