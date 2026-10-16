"""
API-L5.2 · Invitations d'élèves (D60, C11, C19) : demande d'origine enseignant, quota (invitations en attente
comprises), import partiel, décision du parent, place libérée au refus ou à l'expiration.
"""

import io
import re
from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from openpyxl import Workbook
from rest_framework.test import APIClient

from apps.accounts.models import ConsentRequest, ParentChildLink, User
from apps.accounts.tasks import expire_consent_requests, purge_refused_requests
from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.classrooms import imports
from apps.classrooms.models import ClassroomMembership
from apps.notifications.models import Notification

from .factories import ClassroomFactory, MembershipFactory, SchoolFactory, teacher_of

pytestmark = pytest.mark.django_db

Status = ClassroomMembership.Status
PHONE = "+2290197112233"
CONSENT_URL = "/api/accounts/consent-requests/"


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def school():
    return SchoolFactory(learner_quota=3)


@pytest.fixture
def teacher(school):
    return teacher_of(school, first_name="Koffi", last_name="Adékambi")


@pytest.fixture
def classroom(school, teacher):
    return ClassroomFactory(school=school, teacher=teacher, name="4e B")


@pytest.fixture
def api(teacher):
    return client_for(teacher)


def invite(api, classroom, **overrides):
    payload = {
        "firstName": "Awa",
        "lastName": "Dossou",
        "parentPhone": "01 97 11 22 33",
        "relationship": "mere",
        **overrides,
    }
    return api.post(f"/api/classrooms/{classroom.pk}/invitations/", payload, format="json")


def token_from(sms, phone=PHONE):
    return re.search(r"/consentement/(\S+)$", sms.last(phone)).group(1)


def import_rows(api, classroom, rows):
    return api.post(
        f"/api/classrooms/{classroom.pk}/invitations/import/", {"rows": rows}, format="json"
    )


def row(first="Awa", last="Dossou", phone="0197112233", relationship="Mère", **extra):
    return {
        "firstName": first,
        "lastName": last,
        "parentPhone": phone,
        "relationship": relationship,
        **extra,
    }


# --- Invitation individuelle -----------------------------------------------------------------


def test_invitation_creates_a_teacher_request_and_sends_a_link(api, classroom, teacher, sms):
    response = invite(api, classroom)

    assert response.status_code == 201
    body = response.json()
    assert (body["status"], body["invitationStatus"]) == ("invited", "pending")
    assert (body["firstName"], body["lastName"], body["learner"]) == ("Awa", "Dossou", None)
    consent = ConsentRequest.objects.get()
    assert consent.origin == ConsentRequest.Origin.TEACHER
    assert (consent.parent_phone, consent.requested_by, consent.learner) == (PHONE, teacher, None)
    assert consent.subject == {"first_name": "Awa", "last_name": "Dossou", "relationship": "mere"}
    assert consent.expires_at - timezone.now() > timedelta(days=6)
    text = sms.last(PHONE)
    assert "Awa" not in text and "Dossou" not in text  # aucune donnée de l'enfant (ADR 0002)
    assert consent.token_hash and token_from(sms) not in consent.token_hash
    assert api.get("/api/classrooms/school/").json()["learnersUsed"] == 1


def test_invitation_fields_are_validated(api, classroom):
    response = invite(api, classroom, parentPhone="12", relationship="voisin", firstName="")
    assert response.status_code == 400
    assert set(response.json()["fields"]) == {"parentPhone", "relationship", "firstName"}


def test_same_child_cannot_be_invited_twice(api, classroom, sms):
    invite(api, classroom)
    response = invite(api, classroom, firstName=" awa ", lastName="DOSSOU")
    assert response.status_code == 409
    assert response.json()["code"] == "ALREADY_IN_CLASSROOM"
    # Un frère, ou le même enfant dans une autre classe, peut l'être
    assert invite(api, classroom, firstName="Koffi").status_code == 201
    other = ClassroomFactory(school=classroom.school, teacher=classroom.teacher)
    assert invite(api, other).status_code == 201


def test_expired_invitation_does_not_block_a_new_one(api, classroom, sms):
    invite(api, classroom)
    ConsentRequest.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
    assert invite(api, classroom).status_code == 201


def test_child_already_active_in_the_classroom(api, classroom, sms):
    parent = ParentFactory(phone=PHONE)
    learner = LearnerFactory(first_name="Awa", last_name="Dossou")
    ParentChildLink.objects.create(
        parent=parent, learner=learner, relationship_id=_relationship().pk
    )
    MembershipFactory(classroom=classroom, learner=learner)
    MembershipFactory(classroom=classroom)  # élève sans parent rattaché
    assert invite(api, classroom).json()["code"] == "ALREADY_IN_CLASSROOM"
    assert invite(api, classroom, firstName="Kémi").status_code == 201


def _relationship():
    from apps.referentials.models import Relationship

    return Relationship.objects.get(code="mere")


def test_learner_quota_counts_pending_invitations(api, classroom, sms):
    for first in ("A", "B", "C"):
        assert invite(api, classroom, firstName=first).status_code == 201
    response = invite(api, classroom, firstName="D")
    assert response.status_code == 409
    assert response.json()["code"] == "LEARNER_QUOTA_EXCEEDED"


def test_parent_refusal_cooldown_applies(api, classroom, sms):
    ConsentRequest.objects.create(
        origin=ConsentRequest.Origin.LEARNER,
        parent_phone=PHONE,
        relationship=_relationship(),
        status=ConsentRequest.Status.REFUSED,
        resolved_at=timezone.now(),
        expires_at=timezone.now(),
    )
    assert invite(api, classroom).json()["code"] == "CONSENT_COOLDOWN"


def test_daily_cap_per_teacher(api, classroom, sms, settings):
    settings.CLASSROOM_INVITATIONS_PER_DAY = 1
    invite(api, classroom)
    response = invite(api, classroom, firstName="Kémi")
    assert response.status_code == 429
    assert response.json()["code"] == "INVITATION_DAILY_LIMIT"


def test_cannot_invite_into_another_teachers_classroom(api, school, sms):
    other = ClassroomFactory(school=school)
    assert invite(api, other).status_code == 404
    assert import_rows(api, other, [row()]).status_code == 404
    assert not ConsentRequest.objects.exists()


# --- Import ----------------------------------------------------------------------------------


def test_import_is_partial_with_a_code_per_line(api, classroom, sms):
    MembershipFactory(classroom=classroom, status=Status.INVITED)  # quota : 2 places restantes
    invite(api, classroom, firstName="Déjà", parentPhone="0197000001")
    response = import_rows(
        api,
        classroom,
        [
            row(),
            row(first="awa", last="dossou"),  # doublon
            row(phone="12"),
            row(relationship=""),
            row(first="Déjà", phone="+229 01 97 00 00 01"),
            row(first="Kémi", relationship="pere"),
            row(first="Hors quota", line=42),
        ],
    )

    assert response.status_code == 200
    body = response.json()
    assert [m["firstName"] for m in body["created"]] == ["Awa"]
    assert [(e["line"], e["code"]) for e in body["errors"]] == [
        (2, "DUPLICATE_ROW"),
        (3, "PHONE_INVALID"),
        (4, "MALFORMED_ROW"),
        (5, "ALREADY_IN_CLASSROOM"),
        (6, "LEARNER_QUOTA_EXCEEDED"),
        (42, "LEARNER_QUOTA_EXCEEDED"),
    ]
    error = body["errors"][1]
    assert error["data"] == {
        "firstName": "Awa",
        "lastName": "Dossou",
        "parentPhone": "12",
        "relationship": "Mère",
    }
    assert error["message"] == "Ce numéro de téléphone n'est pas valide."


def test_import_respects_the_daily_cap_and_the_cooldown(api, classroom, sms, settings):
    classroom.school.learner_quota = 10
    classroom.school.save()
    settings.CLASSROOM_INVITATIONS_PER_DAY = 1
    ConsentRequest.objects.create(
        origin=ConsentRequest.Origin.LEARNER,
        parent_phone="+2290197000009",
        relationship=_relationship(),
        status=ConsentRequest.Status.REFUSED,
        resolved_at=timezone.now(),
        expires_at=timezone.now(),
    )
    body = import_rows(api, classroom, [row(phone="0197000009"), row(), row(first="Kémi")]).json()
    assert len(body["created"]) == 1
    assert [e["code"] for e in body["errors"]] == ["CONSENT_COOLDOWN", "INVITATION_DAILY_LIMIT"]


def test_import_requires_a_file_or_rows(api, classroom):
    response = api.post(f"/api/classrooms/{classroom.pk}/invitations/import/", {}, format="json")
    assert response.status_code == 400


def test_import_of_more_than_200_lines_is_refused(api, classroom):
    response = import_rows(api, classroom, [row(first=f"E{i}") for i in range(201)])
    assert response.status_code == 413
    assert response.json()["code"] == "IMPORT_TOO_LARGE"


def upload(api, classroom, name, content):
    return api.post(
        f"/api/classrooms/{classroom.pk}/invitations/import/",
        {"file": SimpleUploadedFile(name, content)},
        format="multipart",
    )


def test_import_a_csv_file_with_header_in_latin1(api, classroom, sms):
    content = (
        "Prénom;Nom;Téléphone du parent;Lien de parenté\n"
        "Awa;Dossou;0197112233;mère\n"
        "\n"
        "Kémi;Dossou;0197112233;Pere;\n"
        "Ola;Dossou;0197112233;tuteur;en trop\n"
    ).encode("latin-1")
    body = upload(api, classroom, "eleves.csv", content).json()
    assert [m["firstName"] for m in body["created"]] == ["Awa", "Kémi"]
    assert [(e["line"], e["code"]) for e in body["errors"]] == [(5, "MALFORMED_ROW")]


def test_import_a_comma_separated_utf8_file(api, classroom, sms):
    content = "﻿Awa,Dossou,+229 01 97 11 22 33,Mère\n".encode()
    assert len(upload(api, classroom, "eleves.csv", content).json()["created"]) == 1


def test_unguessable_separator_falls_back_to_semicolon(api, classroom, sms):
    body = upload(api, classroom, "eleves.txt", b"Awa").json()
    assert body["errors"][0]["code"] == "MALFORMED_ROW"


def test_import_an_excel_file(api, classroom, sms):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Prénom", "Nom", "Téléphone du parent", "Lien de parenté"])
    sheet.append(["Awa", "Dossou", "0197112233", "Mère"])
    sheet.append([None, None, None, None])
    sheet.append(["Kémi", "Dossou", None, "Père"])
    buffer = io.BytesIO()
    workbook.save(buffer)
    body = upload(api, classroom, "eleves.xlsx", buffer.getvalue()).json()
    assert [m["firstName"] for m in body["created"]] == ["Awa"]
    assert [(e["line"], e["code"]) for e in body["errors"]] == [(4, "MALFORMED_ROW")]


def test_excel_numbers_are_read_as_text():
    assert (imports._cell(97112233.0), imports._cell(1.5), imports._cell(None)) == (
        "97112233",
        "1.5",
        "",
    )


def test_corrupted_excel_or_oversized_file(api, classroom, monkeypatch):
    response = upload(api, classroom, "eleves.xlsx", b"PK\x03\x04 pas un classeur")
    assert response.json()["code"] == "IMPORT_INVALID_FILE"
    monkeypatch.setattr(imports, "MAX_BYTES", 10)
    response = upload(api, classroom, "eleves.csv", b"Awa;Dossou;0197112233;Mere\n")
    assert response.status_code == 413
    assert (
        response.json()["message"] == "Le fichier dépasse 1 Mo : découpez-le en plusieurs imports."
    )


def test_names_longer_than_150_characters_are_malformed(api, classroom):
    body = import_rows(api, classroom, [row(first="A" * 151), row(last="B" * 151)]).json()
    assert [e["code"] for e in body["errors"]] == ["MALFORMED_ROW", "MALFORMED_ROW"]


# --- Décision du parent ----------------------------------------------------------------------


@pytest.fixture
def invited(api, classroom, sms):
    """Invitation envoyée, lien ouvert par le parent connecté (claim)."""
    invite(api, classroom)
    parent = ParentFactory(phone=PHONE)
    client = client_for(parent)
    claimed = client.post(f"{CONSENT_URL}claim/", {"token": token_from(sms)}, format="json")
    assert claimed.status_code == 200, claimed.json()
    return parent, client, ConsentRequest.objects.get()


def test_parent_sees_the_classroom_he_is_invited_to(invited, classroom):
    _, client, consent = invited
    body = client.get(f"{CONSENT_URL}{consent.pk}/").json()
    assert body["origin"] == "teacher"
    assert (body["firstName"], body["username"], body["age"]) == ("Awa", None, None)
    assert body["classroom"] == {
        "name": "4e B",
        "teacherName": "Koffi Adékambi",
        "schoolName": classroom.school.name,
        "courseTitle": classroom.course.title,
    }


def test_parent_creates_the_account_and_the_child_joins(invited, classroom, teacher):
    parent, client, consent = invited
    response = client.post(
        f"{CONSENT_URL}{consent.pk}/accept/",
        {"username": "awa.d", "password": "Robots2026"},
        format="json",
    )

    assert response.status_code == 200, response.json()
    assert response.json()["status"] == "accepted"
    learner = User.objects.get(username="awa.d")
    assert (learner.first_name, learner.last_name, learner.status) == ("Awa", "Dossou", "active")
    assert learner.check_password("Robots2026")
    assert learner.parent_link.parent == parent
    membership = ClassroomMembership.objects.get()
    assert (membership.learner, membership.status) == (learner, Status.ACTIVE)
    assert membership.joined_at is not None
    consent.refresh_from_db()
    assert consent.learner == learner
    notification = Notification.objects.get(user=teacher)
    assert notification.title == "Awa Dossou a rejoint la classe 4e B"
    assert notification.url == f"/enseignant/classes/{classroom.pk}"
    assert (
        APIClient()
        .post("/api/auth/login/", {"identifier": "awa.d", "password": "Robots2026"}, format="json")
        .status_code
        == 200
    )
    # Le quota compte désormais l'élève actif, plus l'invitation
    api = client_for(teacher)
    assert api.get("/api/classrooms/school/").json()["learnersUsed"] == 1
    members = api.get(f"/api/classrooms/{classroom.pk}/members/").json()["results"]
    assert members[0]["learner"]["firstName"] == "Awa"


def test_account_creation_needs_a_free_username_and_a_strong_password(invited):
    _, client, consent = invited
    url = f"{CONSENT_URL}{consent.pk}/accept/"
    response = client.post(url, {}, format="json")
    assert response.status_code == 400
    assert set(response.json()["fields"]) == {"username", "password"}
    assert client.post(url, {"username": "awa.d"}, format="json").json()["fields"].keys() == {
        "password"
    }
    assert (
        client.post(url, {"username": "awa.d", "password": "court"}, format="json").json()[
            "fields"
        ]["password"][0]["code"]
        == "PASSWORD_TOO_WEAK"
    )
    LearnerFactory(username="Awa.D")
    response = client.post(url, {"username": "awa.d", "password": "Robots2026"}, format="json")
    assert response.json()["code"] == "USERNAME_TAKEN"
    assert ClassroomMembership.objects.get().status == Status.INVITED


def test_parent_attaches_an_existing_child(invited, classroom):
    parent, client, consent = invited
    child = LearnerFactory(first_name="Awa")
    ParentChildLink.objects.create(parent=parent, learner=child, relationship=_relationship())
    response = client.post(
        f"{CONSENT_URL}{consent.pk}/accept/", {"learnerId": child.pk}, format="json"
    )

    assert response.status_code == 200
    membership = ClassroomMembership.objects.get()
    assert (membership.learner, membership.status) == (child, Status.ACTIVE)
    assert User.objects.filter(role="learner").count() == 1  # aucun nouveau compte


def test_parent_cannot_attach_someone_elses_child(invited):
    _, client, consent = invited
    stranger = LearnerFactory()
    response = client.post(
        f"{CONSENT_URL}{consent.pk}/accept/", {"learnerId": stranger.pk}, format="json"
    )
    assert response.status_code == 404
    assert response.json()["fields"]["learnerId"][0]["code"] == "NOT_FOUND"


def test_child_already_active_cannot_join_twice(invited, classroom):
    parent, client, consent = invited
    child = LearnerFactory()
    ParentChildLink.objects.create(parent=parent, learner=child, relationship=_relationship())
    MembershipFactory(classroom=classroom, learner=child)
    response = client.post(
        f"{CONSENT_URL}{consent.pk}/accept/", {"learnerId": child.pk}, format="json"
    )
    assert response.json()["code"] == "ALREADY_IN_CLASSROOM"


def test_refusal_frees_the_seat_and_warns_the_teacher(invited, teacher, classroom):
    _, client, consent = invited
    response = client.post(
        f"{CONSENT_URL}{consent.pk}/refuse/", {"reason": "trop-jeune"}, format="json"
    )

    assert response.status_code == 200
    api = client_for(teacher)
    assert api.get("/api/classrooms/school/").json()["learnersUsed"] == 0
    member = api.get(f"/api/classrooms/{classroom.pk}/members/").json()["results"][0]
    assert (member["status"], member["invitationStatus"]) == ("invited", "refused")
    notification = Notification.objects.get(user=teacher)
    assert notification.type == "classroom.invitation_refused"
    assert notification.title == "Invitation refusée : Awa Dossou"
    assert notification.url == f"/enseignant/classes/{classroom.pk}"


def test_expiry_frees_the_seat_and_warns_the_teacher(api, classroom, teacher, sms):
    invite(api, classroom)
    ConsentRequest.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
    assert expire_consent_requests() == 1
    notification = Notification.objects.get(user=teacher)
    assert notification.type == "classroom.invitation_expired"
    assert "n'a pas répondu" in notification.message
    assert ClassroomMembership.objects.get().status == Status.INVITED


def test_removed_invitation_cannot_be_accepted(invited, api, classroom):
    _, client, consent = invited
    member = ClassroomMembership.objects.get()
    api.post(f"/api/classrooms/{classroom.pk}/members/{member.pk}/remove/")
    response = client.post(
        f"{CONSENT_URL}{consent.pk}/accept/",
        {"username": "awa.d", "password": "Robots2026"},
        format="json",
    )
    assert response.json()["code"] == "CONSENT_ALREADY_RESOLVED"
    # Fermée sans notification : c'est l'enseignant qui l'a retirée
    from apps.classrooms.joining import invitation_closed

    invitation_closed(consent)
    assert not Notification.objects.exists()


def test_purged_request_disappears_from_the_members(api, classroom, sms):
    invite(api, classroom)
    ConsentRequest.objects.update(
        status=ConsentRequest.Status.EXPIRED, resolved_at=timezone.now() - timedelta(days=31)
    )
    purge_refused_requests()
    assert ClassroomMembership.objects.get().consent_request is None
    assert api.get(f"/api/classrooms/{classroom.pk}/members/").json()["count"] == 0


def test_invitation_without_account_is_not_an_orphan_request(invited):
    """Une demande d'enseignant n'a pas de compte apprenant avant l'accord : elle reste ouverte."""
    _, client, consent = invited
    assert client.get(f"{CONSENT_URL}{consent.pk}/").json()["status"] == "pending"


# --- Inscription au parcours de la classe (D62) ----------------------------------------------


def test_joining_enrolls_the_child_in_the_classroom_course_without_payment(
    api, school, teacher, sms
):
    from apps.catalog.tests.factories import CourseFactory, MissionFactory
    from apps.learning.models import Enrollment

    course = CourseFactory(paid=True)
    mission = MissionFactory(level__project__course=course)
    classroom = ClassroomFactory(school=school, teacher=teacher, course=course)
    parent = ParentFactory(phone=PHONE)
    child = LearnerFactory(first_name="Awa", last_name="Dossou")
    ParentChildLink.objects.create(parent=parent, learner=child, relationship=_relationship())
    child_api = client_for(child)
    invite(api, classroom)

    # Invitation non acceptée : aucun accès au parcours
    response = child_api.get(f"/api/learning/missions/{mission.pk}/")
    assert (response.status_code, response.json()["code"]) == (403, "NOT_ENROLLED")

    parent_api = client_for(parent)
    parent_api.post(f"{CONSENT_URL}claim/", {"token": token_from(sms)}, format="json")
    consent = ConsentRequest.objects.get()
    parent_api.post(f"{CONSENT_URL}{consent.pk}/accept/", {"learnerId": child.pk}, format="json")

    enrollment = Enrollment.objects.get(learner=child)
    assert (enrollment.course, enrollment.source) == (course, Enrollment.Source.CLASSROOM)
    assert child_api.get(f"/api/learning/missions/{mission.pk}/").status_code == 200


def test_an_earlier_enrollment_is_kept(invited, classroom):
    from apps.learning.models import Enrollment

    parent, client, consent = invited
    child = LearnerFactory()
    ParentChildLink.objects.create(parent=parent, learner=child, relationship=_relationship())
    Enrollment.objects.create(learner=child, course=classroom.course, source=Enrollment.Source.FREE)
    client.post(f"{CONSENT_URL}{consent.pk}/accept/", {"learnerId": child.pk}, format="json")
    assert Enrollment.objects.get(learner=child).source == Enrollment.Source.FREE


# --- Relecture d'API-L5.2 : fichiers hostiles, plafonds, cas limites -------------------------


def test_unreadable_csv_is_an_invalid_file(api, classroom):
    for content in (b"Awa;Dossou\x00;0197112233;Mere\n", b'"' + b"A" * 140_000 + b'"\n'):
        response = upload(api, classroom, "eleves.csv", content)
        assert response.status_code == 400
        assert response.json()["code"] == "IMPORT_INVALID_FILE"


def _workbook(rows) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    for values in rows:
        sheet.append(values)
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def test_excel_reading_stops_early(api, classroom, monkeypatch):
    # Trop de lignes non vides : arrêt de la lecture, sans charger le reste du classeur
    content = _workbook([["Awa", "Dossou", "0197112233", "Mère"]] * 205)
    response = upload(api, classroom, "eleves.xlsx", content)
    assert (response.status_code, response.json()["code"]) == (413, "IMPORT_TOO_LARGE")
    # Des milliers de lignes vides (classeur gonflé) : arrêt aussi
    monkeypatch.setattr(imports, "MAX_SCANNED", 3)
    far = [*[None] * 20, "x"]  # hors des colonnes lues : ligne vide pour l'import
    content = _workbook([["Awa", "Dossou", "0197112233", "Mère"], far, far, far])
    assert upload(api, classroom, "eleves.xlsx", content).json()["code"] == "IMPORT_TOO_LARGE"


def test_excel_columns_are_bounded(api, classroom, sms):
    content = _workbook([["Awa", "Dossou", "0197112233", "Mère", *[""] * 20, "très loin"]])
    body = upload(api, classroom, "eleves.xlsx", content).json()
    assert [m["firstName"] for m in body["created"]] == ["Awa"]


def test_accents_do_not_hide_a_duplicate(api, classroom, sms):
    invite(api, classroom, firstName="Kémi")
    assert invite(api, classroom, firstName="kemi").json()["code"] == "ALREADY_IN_CLASSROOM"


def test_daily_cap_per_parent_phone(api, classroom, sms, settings):
    settings.CLASSROOM_INVITATIONS_PER_PHONE_PER_DAY = 1
    classroom.school.learner_quota = 10
    classroom.school.save()
    invite(api, classroom)
    response = invite(api, classroom, firstName="Kémi")
    assert (response.status_code, response.json()["code"]) == (429, "INVITATION_DAILY_LIMIT")
    assert (
        response.json()["message"]
        == "Ce parent a reçu trop d'invitations aujourd'hui. Réessayez demain."
    )
    body = import_rows(
        api,
        classroom,
        [
            row(first="Ola"),
            row(first="Tobi", phone="0197000002"),
            row(first="Ada", phone="0197000002"),
        ],
    ).json()
    assert [m["firstName"] for m in body["created"]] == ["Tobi"]
    assert [(e["line"], e["code"]) for e in body["errors"]] == [
        (1, "INVITATION_DAILY_LIMIT"),
        (3, "INVITATION_DAILY_LIMIT"),
    ]


def test_expired_offer_blocks_invitations_and_joining(api, classroom, sms):
    from datetime import timedelta as days

    invite(api, classroom)
    parent = ParentFactory(phone=PHONE)
    client = client_for(parent)
    client.post(f"{CONSENT_URL}claim/", {"token": token_from(sms)}, format="json")
    consent = ConsentRequest.objects.get()
    classroom.school.valid_until = timezone.localdate() - days(days=1)
    classroom.school.save()

    for response in (
        invite(api, classroom, firstName="Kémi"),
        import_rows(api, classroom, [row(first="Ola")]),
        client.post(
            f"{CONSENT_URL}{consent.pk}/accept/",
            {"username": "awa.d", "password": "Robots2026"},
            format="json",
        ),
    ):
        assert (response.status_code, response.json()["code"]) == (403, "SCHOOL_OFFER_EXPIRED")
    assert ClassroomMembership.objects.get().status == Status.INVITED


def test_rows_beyond_200_are_refused_before_validation(api, classroom):
    response = import_rows(api, classroom, [{}] * 201)
    assert (response.status_code, response.json()["code"]) == (413, "IMPORT_TOO_LARGE")


def test_join_fails_cleanly_when_the_invitation_is_gone(invited, classroom):
    _, client, consent = invited
    url = f"{CONSENT_URL}{consent.pk}/accept/"
    payload = {"username": "awa.d", "password": "Robots2026"}
    classroom.archived_at = timezone.now()
    classroom.save()
    assert client.post(url, payload, format="json").json()["code"] == "CONSENT_REQUEST_EXPIRED"
    classroom.archived_at = None
    classroom.save()
    ClassroomMembership.objects.update(status=Status.ACTIVE)
    assert client.post(url, payload, format="json").json()["code"] == "CONSENT_REQUEST_EXPIRED"
    ClassroomMembership.objects.all().delete()
    assert client.post(url, payload, format="json").json()["code"] == "CONSENT_REQUEST_EXPIRED"


def test_concurrent_username_is_reported_as_taken(invited, monkeypatch):
    from django.db import IntegrityError

    _, client, consent = invited

    def clash(*args, **kwargs):
        raise IntegrityError("accounts_user_username_unique")

    monkeypatch.setattr(User.objects, "create_learner", clash)
    response = client.post(
        f"{CONSENT_URL}{consent.pk}/accept/",
        {"username": "awa.d", "password": "Robots2026"},
        format="json",
    )
    assert (response.status_code, response.json()["code"]) == (409, "USERNAME_TAKEN")


def test_csv_of_more_than_200_lines_is_refused(api, classroom):
    content = "".join(f"E{i};Dossou;0197112233;Mère\n" for i in range(201)).encode()
    response = upload(api, classroom, "eleves.csv", content)
    assert (response.status_code, response.json()["code"]) == (413, "IMPORT_TOO_LARGE")
