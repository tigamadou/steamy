"""Jeu de démonstration (D2, API-1.7) : idempotent, refusé en production, comptes utilisables."""

import pytest
from django.contrib.auth import authenticate
from django.core.management import CommandError, call_command
from django.db.models import Q
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.models import LearnerProfile, PublicProfileReview, User
from apps.accounts.profile import profile_step
from apps.core.demo import DEMO_PASSWORD, DEMO_TOTP_KEY
from apps.core.groups import STAFF_GROUPS
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


def counts():
    return (
        User.objects.count(),
        LearnerProfile.objects.count(),
        TOTPDevice.objects.count(),
        Notification.objects.count(),
    )


def test_seed_demo_twice_creates_no_duplicate():
    call_command("seed_demo")
    first = counts()
    call_command("seed_demo")
    assert counts() == first
    # Léa, Noé, Marie, Koffi, un membre du personnel par groupe, Bernard Kpadé et ses deux enfants (élèves de Koffi)
    assert first[0] == 11


def test_seed_demo_is_refused_in_production(settings):
    settings.ENV = settings.PRODUCTION
    with pytest.raises(CommandError):
        call_command("seed_demo")
    assert not User.objects.exists()


def test_personas_log_in_with_the_documented_password():
    call_command("seed_demo")
    lea = authenticate(identifier="lea.adjovi", password=DEMO_PASSWORD)
    assert lea.get_full_name() == "Léa Adjovi"
    assert lea.learner_profile.school_grade.label == "4ᵉ"
    assert lea.learner_profile.locality.city == "Cotonou"
    assert profile_step(lea) is None  # profil complet
    assert authenticate(identifier="0190000001", password=DEMO_PASSWORD).first_name == "Marie"
    assert authenticate(identifier="koffi.adekambi@steamy.test", password=DEMO_PASSWORD).is_teacher


def test_one_staff_member_per_group_with_a_fixed_totp_secret():
    call_command("seed_demo")
    staff = User.objects.filter(is_staff=True)
    assert sorted(staff.values_list("groups__name", flat=True)) == sorted(STAFF_GROUPS)
    # Super-admin est un groupe ; `is_superuser` est réservé au compte de secours (D71)
    assert not staff.filter(is_superuser=True).exists()
    for member in staff:
        device = TOTPDevice.objects.get(user=member)
        assert device.confirmed and device.key == DEMO_TOTP_KEY
        assert authenticate(username=member.email, password=DEMO_PASSWORD) == member


def test_seed_demo_keeps_data_edited_by_hand_consistent():
    call_command("seed_demo")
    User.objects.filter(username="lea.adjovi").update(first_name="Autre")
    call_command("seed_demo")
    assert User.objects.get(username="lea.adjovi").first_name == "Léa"


def test_the_fixed_totp_secret_never_reaches_staging(settings):
    settings.ENV, settings.DEPLOYED = settings.STAGING, True
    call_command("seed_demo")
    assert User.objects.filter(is_staff=True).count() == 4
    assert not TOTPDevice.objects.exists()  # enrôlement à la première connexion (WAD15)


def test_lea_pseudonym_waits_for_moderation():
    call_command("seed_demo")
    call_command("seed_demo")
    review = PublicProfileReview.objects.get()
    assert (review.learner.username, review.status) == ("lea.adjovi", "pending")


def test_impact_tracker_has_computed_and_entered_values():
    from apps.impact.models import KpiValue
    from apps.impact.periods import MONTH, QUARTER, Period

    call_command("seed_demo")
    call_command("seed_demo")
    month, quarter = Period.current(MONTH).key, Period.current(QUARTER).key
    assert (
        KpiValue.objects.get(kpi__code="na", period=month).number >= 1
    )  # Léa, inscrite aujourd'hui
    assert KpiValue.objects.get(kpi__code="fin_who", period=quarter).text == "OIF"
    assert not KpiValue.objects.filter(kpi__code="prod_which", period=quarter).exists()


def test_seed_demo_links_marie_to_lea_and_leaves_a_pending_teacher_invitation():
    from django.core import mail

    from apps.accounts.models import ParentChildLink
    from apps.classrooms.models import TeacherInvitation
    from apps.core.demo import INVITED_TEACHER_EMAIL, KOFFI_EMAIL, LEA_USERNAME, MARIE_PHONE

    call_command("seed_demo")
    link = ParentChildLink.objects.get(learner__username=LEA_USERNAME)
    assert (link.parent.phone, link.relationship.code) == (MARIE_PHONE, "mere")
    koffi = User.objects.get(email=KOFFI_EMAIL)
    assert koffi.teacher_profile.school.name == "Collège Steamy de Cotonou"
    invitation = TeacherInvitation.objects.get(email=INVITED_TEACHER_EMAIL)
    assert invitation.accepted_at is None and invitation.token_hash
    assert mail.outbox[-1].to == [INVITED_TEACHER_EMAIL]
    # Activée lors d'un parcours, elle redevient en attente au seed suivant
    User.objects.create_teacher(INVITED_TEACHER_EMAIL, DEMO_PASSWORD)
    TeacherInvitation.objects.update(accepted_at=invitation.sent_at)
    call_command("seed_demo")
    invitation.refresh_from_db()
    assert invitation.accepted_at is None
    assert not User.objects.filter(email=INVITED_TEACHER_EMAIL).exists()


def test_catalog_has_published_courses_a_featured_one_a_draft_and_an_empty_category():
    from apps.catalog.models import Category, Course, Mission

    call_command("seed_demo")
    call_command("seed_demo")
    published = Course.objects.filter(status=Course.Status.PUBLISHED)
    assert published.count() == 5  # dont le parcours court du parcours Playwright P1 (API-L3a)
    assert published.filter(featured=True).count() == 1
    assert published.filter(is_free=False).exists() and published.filter(is_free=True).exists()
    assert Course.objects.filter(status=Course.Status.DRAFT).exists()
    assert all(
        course.projects.filter(levels__missions__isnull=False).exists() for course in published
    )
    assert Category.objects.filter(courses__isnull=True).exists()
    for mission in Mission.objects.all():
        mission.full_clean()  # blocs valides


def test_events_cover_free_paid_full_and_past():
    from apps.events.models import SteamyEvent

    call_command("seed_demo")
    call_command("seed_demo")
    events = list(SteamyEvent.objects.filter(status=SteamyEvent.Status.PUBLISHED))
    assert len(events) == 4
    assert any(e.price == 0 and not e.is_past for e in events)
    assert any(e.price > 0 and e.applications_open for e in events)
    assert any(e.seats_left == 0 and not e.is_past for e in events)
    assert any(e.is_past for e in events)


def test_kits_include_one_out_of_stock_and_one_required_by_a_course():
    from apps.catalog.models import Course
    from apps.shop.models import Kit

    call_command("seed_demo")
    call_command("seed_demo")
    assert Kit.objects.filter(active=True).count() == 3
    assert Kit.objects.filter(stock_quantity=0).exists()
    assert Course.objects.filter(required_kit__isnull=False, is_free=False).exists()


def test_seed_demo_gives_koffi_two_classrooms_within_the_offer():
    from apps.classrooms.demo import OFFER_COURSES
    from apps.classrooms.models import Classroom
    from apps.core.demo import KOFFI_EMAIL

    call_command("seed_demo")
    call_command("seed_demo")  # idempotent
    koffi = User.objects.get(email=KOFFI_EMAIL)
    school = koffi.teacher_profile.school
    assert sorted(school.courses.values_list("slug", flat=True)) == sorted(OFFER_COURSES)
    classrooms = Classroom.objects.filter(teacher=koffi)
    assert classrooms.count() == 2
    assert all(c.course.slug in OFFER_COURSES and c.school == school for c in classrooms)


def test_lea_has_a_course_in_progress_a_finished_one_and_the_short_course_reset():
    from apps.core.demo import SHORT_COURSE
    from apps.learning.models import Enrollment, MissionProgress

    call_command("seed_demo")
    lea = User.objects.get(username="lea.adjovi")
    short = Enrollment.objects.get(learner=lea, course__slug=SHORT_COURSE)
    MissionProgress.objects.create(
        enrollment=short, mission=short.course.projects.get().levels.get().missions.first()
    )
    call_command("seed_demo")
    progress = dict(
        Enrollment.objects.filter(learner=lea).values_list("course__slug", "progress_pct")
    )
    assert progress == {"decouverte-robotique": 30, "initiation-scratch": 100, SHORT_COURSE: 0}
    assert not MissionProgress.objects.filter(enrollment=short).exists()
    assert Enrollment.objects.get(learner=lea, course__slug=SHORT_COURSE).last_activity_at is None


def test_every_level_and_project_has_a_quiz_and_lea_has_ok_warn_ko_attempts():
    from apps.catalog.models import Level, Project, Quiz
    from apps.learning.models import QuizAttempt

    call_command("seed_demo")
    call_command("seed_demo")
    assert Quiz.objects.filter(kind="formative").count() == Level.objects.count()
    assert Quiz.objects.filter(kind="summative").count() == Project.objects.count()
    for quiz in Quiz.objects.all():
        assert quiz.questions.count() == 2
        for question in quiz.questions.all():
            assert question.choices.filter(is_correct=True).count() == 1
            question.full_clean()  # mission à revoir du même parcours
    lea = QuizAttempt.objects.filter(learner__username="lea.adjovi")
    assert set(lea.values_list("status", flat=True)) == {"ok", "warn", "ko"}
    # « Initiation à Scratch » : tout réussi ; « Découverte » : formative du niveau 1.1 réussie au 3ᵉ essai
    scratch = lea.filter(enrollment__course__slug="initiation-scratch")
    assert (
        scratch.count()
        == Quiz.objects.filter(
            Q(level__project__course__slug="initiation-scratch")
            | Q(project__course__slug="initiation-scratch")
        ).count()
    )
    assert not scratch.exclude(status="ok").exists()
    discovery = lea.filter(enrollment__course__slug="decouverte-robotique").order_by("created_at")
    assert list(discovery.values_list("status", flat=True)) == ["ko", "warn", "ok"]


def test_seed_demo_e2e_shortens_the_summative_cooldown():
    from apps.core.demo import E2E_SUMMATIVE_COOLDOWN
    from apps.core.models import PlatformSettings

    call_command("seed_demo")
    assert PlatformSettings.load().summative_retry_cooldown_seconds == 600
    call_command("seed_demo", "--e2e")
    assert PlatformSettings.load().summative_retry_cooldown_seconds == E2E_SUMMATIVE_COOLDOWN


def test_lea_has_points_badges_and_a_five_day_streak():
    from apps.catalog.models import Badge, Course, Level, Project
    from apps.learning.gamification import rank_for, streak_days
    from apps.learning.models import LearnerBadge, PointsEntry

    call_command("seed_demo")
    call_command("seed_demo")
    assert Badge.objects.filter(kind="level").count() == Level.objects.count()
    assert Badge.objects.filter(kind="project").count() == Project.objects.count()
    assert Badge.objects.filter(kind="course").count() == Course.objects.count()
    lea = User.objects.get(username="lea.adjovi")
    total = sum(PointsEntry.objects.filter(learner=lea).values_list("amount", flat=True))
    assert total > 0 and lea.learner_profile.points == total
    assert rank_for(total) is not None
    assert LearnerBadge.objects.filter(learner=lea).count() > 0
    assert streak_days(lea) == 5 and lea.learner_profile.streak_days == 5


def test_seed_keeps_a_points_scale_set_by_hand():
    from apps.core.models import PlatformSettings

    settings_ = PlatformSettings.load()
    settings_.points_scale = {"mission": 1}
    settings_.save()
    call_command("seed_demo")
    assert PlatformSettings.load().points_scale == {"mission": 1}


def test_lea_finished_course_is_certified_once_with_a_ticket():
    from apps.events.models import EventTicket
    from apps.learning.models import Certificate, Enrollment, PointsEntry

    call_command("seed_demo")
    call_command("seed_demo")
    finished = Enrollment.objects.get(
        learner__username="lea.adjovi", course__slug="initiation-scratch"
    )
    assert finished.status == "completed"
    assert Certificate.objects.filter(enrollment=finished).count() == 1
    assert EventTicket.objects.filter(enrollment=finished).count() == 1
    assert PointsEntry.objects.filter(learner=finished.learner, source="course").count() == 1
    assert Certificate.objects.count() == 1


def test_lea_dashboard_resumes_a_course_and_recommends_from_her_goals():
    from rest_framework.test import APIClient

    call_command("seed_demo")
    client = APIClient()
    client.force_authenticate(User.objects.get(username="lea.adjovi"))
    body = client.get("/api/learning/dashboard/").json()
    assert body["resume"]["course"]["slug"] == "decouverte-robotique"
    assert body["points"] > 0 and body["rank"]["label"] and body["streakDays"] == 5
    assert body["counters"]["certificates"] == 1
    recommended = client.get("/api/learning/recommendations/").json()
    assert recommended and recommended[0]["matchesGoals"] is True


def test_lea_has_two_courses_in_her_wishlist():
    from apps.wishlist.models import WishlistItem

    call_command("seed_demo")
    call_command("seed_demo")
    slugs = WishlistItem.objects.filter(learner__username="lea.adjovi").values_list(
        "course__slug", flat=True
    )
    assert sorted(slugs) == ["capteurs-electroniques", "robot-bluetooth"]


def test_seed_demo_fills_koffis_classrooms_with_learners_and_invitations(sms):
    from apps.accounts.models import ConsentRequest
    from apps.classrooms.demo import INVITATIONS, KPADE_PHONE
    from apps.classrooms.models import ClassroomMembership
    from apps.core.demo import KOFFI_EMAIL

    call_command("seed_demo")
    call_command("seed_demo")  # idempotent
    koffi = User.objects.get(email=KOFFI_EMAIL)
    memberships = ClassroomMembership.objects.filter(classroom__teacher=koffi)
    active = memberships.filter(status="active")
    assert sorted(active.values_list("learner__first_name", flat=True)) == ["Léa", "Sèna", "Yao"]
    statuses = sorted(
        memberships.filter(status="invited").values_list("consent_request__status", flat=True)
    )
    assert statuses == sorted(status for *_, status in INVITATIONS)
    assert ConsentRequest.objects.filter(origin="teacher").count() == len(INVITATIONS)
    assert User.objects.get(phone=KPADE_PHONE).children_links.count() == 2
    # SMS de l'invitation en attente (faux fournisseur, lisible dans Mailpit)
    assert "/consentement/" in sms.last(INVITATIONS[0][2])
