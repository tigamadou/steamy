"""API-L5.1 · Classes : offre et quotas de l'école (D61, C19), une classe = un parcours (D62), cloisonnement (D64)."""

from datetime import timedelta

import pytest
from django.contrib.admin.sites import site
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import ConsentRequest
from apps.accounts.tests.factories import LearnerFactory, ParentFactory, TeacherFactory
from apps.catalog.tests.factories import CourseFactory, MissionFactory
from apps.classrooms import services
from apps.classrooms.models import Classroom, ClassroomMembership
from apps.classrooms.serializers import MemberSerializer
from apps.core.tests.staff import verified_client
from apps.referentials.models import Avatar

from .factories import ClassroomFactory, MembershipFactory, SchoolFactory, teacher_of

pytestmark = pytest.mark.django_db

URL = "/api/classrooms/"
Status = ClassroomMembership.Status


@pytest.fixture
def admin_client(client):
    verified_client(client, is_superuser=True)
    return client


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def course():
    return CourseFactory(title="Robotique 1", emoji="🤖")


@pytest.fixture
def school(course):
    return SchoolFactory(courses=[course], learner_quota=5, classroom_quota=2)


@pytest.fixture
def teacher(school):
    return teacher_of(school)


@pytest.fixture
def api(teacher):
    return client_for(teacher)


def create(api, **payload):
    return api.post(URL, payload, format="json")


# --- Accès -----------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "path", ["", "school/", "courses/", "1/", "1/members/", "courses/robotique/"]
)
def test_anonymous_is_refused(path):
    assert APIClient().get(f"{URL}{path}").status_code == 401


@pytest.mark.parametrize("factory", [LearnerFactory, ParentFactory])
def test_only_teachers_are_allowed(factory):
    response = client_for(factory()).get(URL)
    assert response.status_code == 403
    assert response.json()["code"] == "PERMISSION_DENIED"


def test_teacher_without_school_has_no_classroom():
    response = client_for(TeacherFactory()).get(f"{URL}school/")
    assert response.status_code == 403
    assert response.json()["message"] == "Votre compte n'est rattaché à aucune école."


# --- École et quotas -------------------------------------------------------------------------


def test_school_shows_offer_courses_and_quotas_left(api, school, teacher, course):
    other_school = SchoolFactory()
    classroom = ClassroomFactory(school=school, teacher=teacher, course=course)
    MembershipFactory(classroom=classroom)
    MembershipFactory(classroom=classroom, status=Status.INVITED)
    MembershipFactory(classroom=classroom, status=Status.LEFT)
    expired = MembershipFactory(classroom=classroom, status=Status.INVITED)
    expired.consent_request.expires_at = timezone.now() - timedelta(minutes=1)
    expired.consent_request.save()
    refused = MembershipFactory(classroom=classroom, status=Status.INVITED)
    refused.consent_request.status = ConsentRequest.Status.REFUSED
    refused.consent_request.save()
    MembershipFactory(classroom__school=other_school)

    body = api.get(f"{URL}school/").json()

    assert body["name"] == school.name
    assert body["country"] == "BJ"
    assert body["offer"] == "Offre Découverte"
    assert (body["learnerQuota"], body["learnersUsed"], body["learnersLeft"]) == (5, 2, 3)
    assert (body["classroomQuota"], body["classroomsUsed"], body["classroomsLeft"]) == (2, 1, 1)
    assert [c["slug"] for c in body["courses"]] == [course.slug]


def test_an_active_learner_in_two_classrooms_counts_once(api, school, teacher, course):
    learner = LearnerFactory()
    for _ in range(2):
        MembershipFactory(
            classroom=ClassroomFactory(school=school, teacher=teacher, course=course),
            learner=learner,
        )
    body = api.get(f"{URL}school/").json()
    assert body["learnersUsed"] == 1
    assert body["classroomsLeft"] == 0


def test_quotas_left_never_go_below_zero(api, school, teacher, course):
    school.learner_quota = 0
    school.classroom_quota = 0
    school.save()
    MembershipFactory(classroom=ClassroomFactory(school=school, teacher=teacher, course=course))
    body = api.get(f"{URL}school/").json()
    assert (body["learnersLeft"], body["classroomsLeft"]) == (0, 0)


# --- Création --------------------------------------------------------------------------------


def test_create_a_classroom(api, course, teacher):
    response = create(api, name="  4e B  ", courseSlug=course.slug, schoolGrade="4e")
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "4e B"
    assert body["course"]["slug"] == course.slug
    assert body["schoolGrade"]["code"] == "4e"
    assert body["color"] == services.PALETTE[0]
    assert (body["memberCount"], body["pendingInvitationCount"], body["hasMembers"]) == (
        0,
        0,
        False,
    )
    classroom = Classroom.objects.get(pk=body["id"])
    assert classroom.teacher == teacher
    assert classroom.school == teacher.teacher_profile.school


def test_default_colours_follow_the_palette(api, course):
    create(api, name="A", courseSlug=course.slug)
    assert create(api, name="B", courseSlug=course.slug).json()["color"] == services.PALETTE[1]
    assert create(api, name="C", courseSlug=course.slug, color="#123456").status_code == 409


def test_chosen_colour_is_validated(api, course):
    response = create(api, name="A", courseSlug=course.slug, color="rouge")
    assert response.status_code == 400
    assert "color" in response.json()["fields"]
    assert (
        create(api, name="A", courseSlug=course.slug, color="#123abc").json()["color"] == "#123abc"
    )


def test_course_outside_the_offer_is_refused(api):
    response = create(api, name="4e B", courseSlug=CourseFactory().slug)
    assert response.status_code == 400
    assert response.json()["code"] == "COURSE_NOT_IN_OFFER"
    assert response.json()["fields"]["courseSlug"][0]["code"] == "COURSE_NOT_IN_OFFER"


def test_unpublished_or_unknown_course_is_refused(api, school):
    draft = CourseFactory(draft=True)
    school.courses.add(draft)
    for slug in (draft.slug, "inconnu"):
        response = create(api, name="4e B", courseSlug=slug)
        assert response.status_code == 400
        assert "courseSlug" in response.json()["fields"]


def test_name_is_unique_per_teacher_whatever_the_case(api, course, school):
    create(api, name="4e B", courseSlug=course.slug)
    response = create(api, name="4E b", courseSlug=course.slug)
    assert response.status_code == 409
    assert response.json()["code"] == "CLASSROOM_NAME_TAKEN"
    # Un autre enseignant de la même école peut l'utiliser
    other = client_for(teacher_of(school))
    assert create(other, name="4e B", courseSlug=course.slug).status_code == 201


def test_archived_classroom_frees_its_name_and_quota(api, course, teacher, school):
    ClassroomFactory(
        teacher=teacher, school=school, course=course, name="4e B", archived_at=timezone.now()
    )
    ClassroomFactory(
        teacher=teacher, school=school, course=course, name="4e C", archived_at=timezone.now()
    )
    assert create(api, name="4e B", courseSlug=course.slug).status_code == 201
    assert create(api, name="4e C", courseSlug=course.slug).status_code == 201


def test_classroom_quota_is_enforced(api, course):
    create(api, name="A", courseSlug=course.slug)
    create(api, name="B", courseSlug=course.slug)
    response = create(api, name="C", courseSlug=course.slug)
    assert response.status_code == 409
    assert response.json()["code"] == "CLASSROOM_QUOTA_EXCEEDED"


def test_quota_is_shared_by_the_teachers_of_a_school(api, course, school):
    create(api, name="A", courseSlug=course.slug)
    create(client_for(teacher_of(school)), name="B", courseSlug=course.slug)
    assert create(api, name="C", courseSlug=course.slug).json()["code"] == (
        "CLASSROOM_QUOTA_EXCEEDED"
    )


def test_database_constraint_settles_a_concurrent_duplicate(teacher, course, monkeypatch):
    monkeypatch.setattr(services, "_check_name", lambda *args, **kwargs: None)
    services.create_classroom(teacher, name="4e B", course=course)
    with pytest.raises(Exception) as error:
        services.create_classroom(teacher, name="4E B", course=course)
    assert error.value.default_code == "CLASSROOM_NAME_TAKEN"


def test_teacher_cannot_create_content():
    """S5 : l'enseignant encadre, il n'écrit aucun parcours."""
    teacher = TeacherFactory()
    api = client_for(teacher)
    assert api.post("/api/catalog/courses/", {"title": "x"}, format="json").status_code in (
        403,
        405,
    )


# --- Liste, détail, modification ------------------------------------------------------------


def test_list_shows_only_own_active_classrooms_with_counters(api, teacher, school, course):
    mine = ClassroomFactory(teacher=teacher, school=school, course=course, name="B")
    MembershipFactory(classroom=mine)
    MembershipFactory(classroom=mine, status=Status.INVITED)
    MembershipFactory(classroom=mine, status=Status.LEFT)
    ClassroomFactory(teacher=teacher, school=school, course=course, name="A")
    ClassroomFactory(teacher=teacher, school=school, name="Z", archived_at=timezone.now())
    ClassroomFactory(school=school, course=course)  # autre enseignant de l'école

    body = api.get(URL).json()

    assert body["count"] == 2
    assert [c["name"] for c in body["results"]] == ["A", "B"]
    b = body["results"][1]
    assert (b["memberCount"], b["pendingInvitationCount"], b["hasMembers"]) == (1, 1, True)


def test_another_teachers_classroom_does_not_exist(api, school):
    other = ClassroomFactory(school=school)
    member = MembershipFactory(classroom=other)
    assert api.get(f"{URL}{other.pk}/").status_code == 404
    assert api.patch(f"{URL}{other.pk}/", {"name": "x"}, format="json").status_code == 404
    assert api.get(f"{URL}{other.pk}/members/").status_code == 404
    assert api.post(f"{URL}{other.pk}/members/{member.pk}/remove/").status_code == 404
    member.refresh_from_db()
    assert member.status == Status.ACTIVE


def test_retrieve_and_rename(api, teacher, school, course):
    classroom = ClassroomFactory(teacher=teacher, school=school, course=course, name="4e B")
    assert api.get(f"{URL}{classroom.pk}/").json()["name"] == "4e B"
    response = api.patch(
        f"{URL}{classroom.pk}/",
        {"name": "4e Bleue", "color": "#00897B", "schoolGrade": None},
        format="json",
    )
    assert response.status_code == 200
    assert (response.json()["name"], response.json()["color"]) == ("4e Bleue", "#00897B")
    assert api.put(f"{URL}{classroom.pk}/", {}, format="json").status_code == 405
    assert api.delete(f"{URL}{classroom.pk}/").status_code == 405


def test_rename_keeps_its_own_name_but_not_a_sibling(api, teacher, school, course):
    classroom = ClassroomFactory(teacher=teacher, school=school, course=course, name="4e B")
    ClassroomFactory(teacher=teacher, school=school, course=course, name="4e C")
    assert api.patch(f"{URL}{classroom.pk}/", {"name": "4E B"}, format="json").status_code == 200
    response = api.patch(f"{URL}{classroom.pk}/", {"name": "4e c"}, format="json")
    assert response.json()["code"] == "CLASSROOM_NAME_TAKEN"


def test_course_can_change_until_the_first_member(api, teacher, school, course):
    other_course = CourseFactory()
    school.courses.add(other_course)
    classroom = ClassroomFactory(teacher=teacher, school=school, course=course)
    url = f"{URL}{classroom.pk}/"

    assert api.patch(url, {"courseSlug": CourseFactory().slug}, format="json").json()["code"] == (
        "COURSE_NOT_IN_OFFER"
    )
    assert (
        api.patch(url, {"courseSlug": other_course.slug}, format="json").json()["course"]["slug"]
        == other_course.slug
    )

    MembershipFactory(classroom=classroom, status=Status.LEFT)
    response = api.patch(url, {"courseSlug": course.slug}, format="json")
    assert response.status_code == 400
    assert response.json()["fields"]["courseSlug"][0]["code"] == "VALIDATION_ERROR"
    # Le même parcours renvoyé tel quel n'est pas un changement
    assert (
        api.patch(url, {"courseSlug": other_course.slug, "name": "X"}, format="json").status_code
        == 200
    )


# --- Membres ---------------------------------------------------------------------------------


def test_members_show_learners_and_invitations_without_sensitive_data(api, teacher, school):
    classroom = ClassroomFactory(teacher=teacher, school=school)
    learner = LearnerFactory(first_name="Léa", last_name="Kpadé")
    learner.learner_profile.avatar = Avatar.objects.get(code="renard")
    learner.learner_profile.save()
    active = MembershipFactory(classroom=classroom, learner=learner)
    pending = MembershipFactory(classroom=classroom, status=Status.INVITED)
    refused = MembershipFactory(classroom=classroom, status=Status.INVITED)
    refused.consent_request.status = ConsentRequest.Status.REFUSED
    refused.consent_request.save()
    MembershipFactory(classroom=classroom, status=Status.LEFT)
    orphan = MembershipFactory(classroom=classroom, status=Status.INVITED, consent_request=None)
    no_avatar = MembershipFactory(classroom=classroom)

    body = api.get(f"{URL}{classroom.pk}/members/").json()

    assert body["count"] == 4  # retirés et invitations purgées (C9) exclus
    rows = {row["id"]: row for row in body["results"]}
    row = rows[active.pk]
    assert set(row) == {
        "id",
        "status",
        "firstName",
        "lastName",
        "learner",
        "invitationStatus",
        "invitationExpiresAt",
        "joinedAt",
        "createdAt",
    }
    assert set(row["learner"]) == {"id", "firstName", "lastName", "avatar"}
    assert row["learner"]["avatar"]["code"] == "renard"
    assert (row["firstName"], row["invitationStatus"]) == ("Léa", None)
    assert rows[no_avatar.pk]["learner"]["avatar"] is None
    assert rows[pending.pk]["learner"] is None
    assert (rows[pending.pk]["firstName"], rows[pending.pk]["lastName"]) == ("Awa", "Dossou")
    assert rows[pending.pk]["invitationStatus"] == "pending"
    assert rows[pending.pk]["invitationExpiresAt"] is not None
    assert rows[refused.pk]["invitationStatus"] == "refused"
    assert rows[refused.pk]["invitationExpiresAt"] is None
    assert orphan.pk not in rows
    orphan_row = MemberSerializer(orphan).data
    assert (orphan_row["first_name"], orphan_row["invitation_status"]) == ("", None)
    assert "+229" not in str(body)


def test_remove_a_learner_frees_the_quota(api, teacher, school):
    classroom = ClassroomFactory(teacher=teacher, school=school)
    member = MembershipFactory(classroom=classroom)
    assert api.get(f"{URL}school/").json()["learnersUsed"] == 1

    response = api.post(f"{URL}{classroom.pk}/members/{member.pk}/remove/")

    assert response.status_code == 200
    assert response.json()["status"] == "left"
    member.refresh_from_db()
    assert member.left_at is not None
    assert api.get(f"{URL}school/").json()["learnersUsed"] == 0
    assert api.get(f"{URL}{classroom.pk}/members/").json()["count"] == 0
    # Retirer deux fois ne change rien
    left_at = member.left_at
    api.post(f"{URL}{classroom.pk}/members/{member.pk}/remove/")
    member.refresh_from_db()
    assert member.left_at == left_at


def test_removing_a_pending_invitation_cancels_the_parents_link(api, teacher, school):
    classroom = ClassroomFactory(teacher=teacher, school=school)
    pending = MembershipFactory(classroom=classroom, status=Status.INVITED)
    pending.consent_request.token_hash = "abc"
    pending.consent_request.save()
    refused = MembershipFactory(classroom=classroom, status=Status.INVITED)
    refused.consent_request.status = ConsentRequest.Status.REFUSED
    refused.consent_request.save()

    api.post(f"{URL}{classroom.pk}/members/{pending.pk}/remove/")
    api.post(f"{URL}{classroom.pk}/members/{refused.pk}/remove/")

    pending.consent_request.refresh_from_db()
    assert pending.consent_request.status == ConsentRequest.Status.CANCELLED
    assert pending.consent_request.token_hash == ""
    refused.consent_request.refresh_from_db()
    assert refused.consent_request.status == ConsentRequest.Status.REFUSED


def test_member_of_another_classroom_is_not_found(api, teacher, school):
    mine = ClassroomFactory(teacher=teacher, school=school)
    elsewhere = MembershipFactory(classroom=ClassroomFactory(teacher=teacher, school=school))
    assert api.post(f"{URL}{mine.pk}/members/{elsewhere.pk}/remove/").status_code == 404


# --- Parcours encadrés -----------------------------------------------------------------------


def test_supervised_courses_are_those_of_my_classrooms(api, teacher, school, course):
    a = ClassroomFactory(teacher=teacher, school=school, course=course)
    b = ClassroomFactory(teacher=teacher, school=school, course=course)
    learner = LearnerFactory()
    MembershipFactory(classroom=a, learner=learner)
    MembershipFactory(classroom=b, learner=learner)
    MembershipFactory(classroom=b)
    MembershipFactory(classroom=b, status=Status.INVITED)
    ClassroomFactory(teacher=teacher, school=school, archived_at=timezone.now())
    ClassroomFactory(school=school)  # parcours d'un collègue
    MembershipFactory(classroom=ClassroomFactory(school=school, course=course))

    body = api.get(f"{URL}courses/").json()

    assert body["count"] == 1
    row = body["results"][0]
    assert row["slug"] == course.slug
    assert (row["classroomCount"], row["learnerCount"]) == (2, 2)


def test_supervised_course_detail_is_a_read_only_tree(api, teacher, school, course):
    mission = MissionFactory(level__project__course=course)
    ClassroomFactory(teacher=teacher, school=school, course=course, name="4e B")
    ClassroomFactory(school=school, course=course, name="Collègue")

    response = api.get(f"{URL}courses/{course.slug}/")

    assert response.status_code == 200
    body = response.json()
    assert [c["name"] for c in body["classrooms"]] == ["4e B"]
    project = body["projects"][0]
    assert project["levels"][0]["missions"][0] == {
        "id": mission.pk,
        "order": mission.order,
        "title": mission.title,
        "durationMin": mission.duration_min,
        "icon": "",
    }
    assert "vimeoId" not in str(body) and "blocks" not in str(body)
    assert api.patch(f"{URL}courses/{course.slug}/", {}, format="json").status_code == 405


def test_course_not_supervised_is_not_found(api, school):
    colleague = ClassroomFactory(school=school)
    assert api.get(f"{URL}courses/{colleague.course.slug}/").status_code == 404
    assert api.get(f"{URL}courses/{CourseFactory().slug}/").status_code == 404


# --- Admin -----------------------------------------------------------------------------------


def test_admin_lists_classrooms_with_their_members(admin_client, teacher, school):
    classroom = ClassroomFactory(teacher=teacher, school=school)
    MembershipFactory(classroom=classroom)
    assert admin_client.get("/admin/classrooms/classroom/").status_code == 200
    assert (
        admin_client.get(f"/admin/classrooms/classroom/{classroom.pk}/change/").status_code == 200
    )
    assert admin_client.get(f"/admin/classrooms/school/{school.pk}/change/").status_code == 200
    inline = site._registry[Classroom].inlines[0](Classroom, site)
    assert inline.has_add_permission(None) is False


def test_strings():
    membership = ClassroomMembership(classroom=Classroom(name="4e B"), status=Status.INVITED)
    assert str(membership) == "Invitation · 4e B (invited)"
    assert str(membership.classroom) == "4e B"


# --- Offre échue (C21) -----------------------------------------------------------------------


def test_expired_offer_blocks_new_classrooms(api, school, course):
    from datetime import date, timedelta

    school.valid_until = timezone.localdate()
    school.save()
    assert api.get(f"{URL}school/").json()["offerExpired"] is False
    assert create(api, name="Dernier jour", courseSlug=course.slug).status_code == 201

    school.valid_until = timezone.localdate() - timedelta(days=1)
    school.save()
    assert api.get(f"{URL}school/").json()["offerExpired"] is True
    response = create(api, name="Trop tard", courseSlug=course.slug)
    assert response.status_code == 403
    assert response.json()["code"] == "SCHOOL_OFFER_EXPIRED"
    assert response.json()["message"].startswith("L'offre de votre école a expiré")
    assert isinstance(school.valid_until, date)
