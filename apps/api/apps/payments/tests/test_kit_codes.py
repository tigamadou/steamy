"""Kit Codes (API-L3b.4, D35, D36) : format, génération au paiement, rachat atomique, compatibilité, throttle."""

import threading

import pytest
from django.db import connection
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.tests.factories import LearnerFactory, ParentFactory
from apps.catalog.tests.factories import CourseFactory
from apps.learning.models import Enrollment
from apps.payments.kit_codes import normalize, redeem
from apps.payments.models import KitCode
from apps.payments.providers import PaymentEvent, PaymentStatus
from apps.payments.utils import handle_payment_event
from apps.shop.tests.factories import KitFactory
from libs.errors import ApiError

from .factories import OrderItemFactory, PaymentFactory, link_child, load_referentials

pytestmark = pytest.mark.django_db
URL = "/api/payments/kit-codes/redeem/"


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


@pytest.fixture
def kit():
    return KitFactory()


@pytest.fixture
def course(kit):
    return CourseFactory(paid=True, required_kit=kit)


@pytest.fixture
def code(kit):
    return KitCode.objects.create(kit=kit, code="STEAMY-AB12-CD34")


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("STEAMY-AB12-CD34", "STEAMY-AB12-CD34"),
        ("steamy-ab12-cd34", "STEAMY-AB12-CD34"),
        (" ab12 cd34 ", "STEAMY-AB12-CD34"),
        ("STEAMY-ABI2-CDO4", "STEAMY-AB12-CD04"),
        ("steamy abl2cd34", "STEAMY-AB12-CD34"),
        ("STEAMY-AB12-CD3", None),
        ("STEAMY-AB12-CD3U", None),
        ("", None),
        (None, None),
    ],
)
def test_normalization(raw, expected):
    assert normalize(raw) == expected


def test_generated_codes_follow_the_format():
    import re

    code = KitCode.objects.create(kit=KitFactory())
    assert re.fullmatch(r"STEAMY-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}", code.code)
    assert str(code) == code.code


def test_codes_are_generated_at_payment_and_shown_to_the_payer_only(kit):
    parent = ParentFactory()
    child = link_child(parent)
    item = OrderItemFactory(
        order__payer=parent,
        order__beneficiary=child,
        order__kind="kit",
        course=None,
        kit=kit,
        quantity=2,
        unit_price=35000,
        order__subtotal=70000,
    )
    order = item.order
    payment = PaymentFactory(order=order)
    handle_payment_event(
        "fake",
        PaymentEvent(
            order.reference,
            payment.provider_transaction_id,
            order.total,
            "XOF",
            PaymentStatus.SUCCEEDED,
        ),
    )
    codes = KitCode.objects.filter(order_item=item)
    assert codes.count() == 2 and len({c.code for c in codes}) == 2
    url = f"/api/payments/orders/{order.reference}/"
    shown = client_for(parent).get(url).json()["kitCodes"]
    assert sorted(c["code"] for c in shown) == sorted(c.code for c in codes)
    assert shown[0] == {
        "code": shown[0]["code"],
        "kitSlug": kit.slug,
        "redeemed": False,
        "revoked": False,
    }
    # Un code révoqué par le Support reste listé au payeur, marqué comme tel
    revoked = codes.first()
    revoked.revoked_at = revoked.created_at
    revoked.save()
    shown = client_for(parent).get(url).json()["kitCodes"]
    assert {c["code"]: c["revoked"] for c in shown} == {c.code: c.pk == revoked.pk for c in codes}
    assert "kitCodes" not in client_for(child).get(url).json()
    assert "kitCodes" not in client_for(child).get("/api/payments/orders/").json()["results"][0]


def test_learner_redeems_a_code_for_the_kit_course(code, course):
    learner = LearnerFactory()
    resp = client_for(learner).post(
        URL, {"code": "steamy-ab12-cd34", "courseSlug": course.slug}, format="json"
    )
    assert resp.status_code == 201
    assert resp.json() == {"courseSlug": course.slug, "courseTitle": course.title, "created": True}
    enrollment = Enrollment.objects.get(learner=learner)
    assert (enrollment.course, enrollment.source) == (course, Enrollment.Source.KIT_CODE)
    code.refresh_from_db()
    assert (code.redeemed_by, code.redeemed_course) == (learner, course) and code.redeemed_at


def test_compatible_course_can_also_be_unlocked(kit, code):
    other = CourseFactory(paid=True)
    kit.compatible_courses.add(other)
    resp = client_for(LearnerFactory()).post(
        URL, {"code": code.code, "courseSlug": other.slug}, format="json"
    )
    assert resp.status_code == 201


def test_used_code_is_refused(code, course):
    client_for(LearnerFactory()).post(
        URL, {"code": code.code, "courseSlug": course.slug}, format="json"
    )
    resp = client_for(LearnerFactory()).post(
        URL, {"code": code.code, "courseSlug": course.slug}, format="json"
    )
    assert (resp.status_code, resp.json()["code"]) == (409, "KIT_CODE_ALREADY_USED")


def test_already_enrolled_learner_keeps_the_code(code, course):
    learner = LearnerFactory()
    Enrollment.objects.create(learner=learner, course=course, source=Enrollment.Source.FREE)
    resp = client_for(learner).post(
        URL, {"code": code.code, "courseSlug": course.slug}, format="json"
    )
    assert resp.status_code == 200 and resp.json()["created"] is False
    code.refresh_from_db()
    assert code.redeemed_at is None


def test_invalid_codes_and_courses(code, course):
    learner = LearnerFactory()
    for payload, expected in [
        ({"code": "STEAMY-ZZZZ-ZZZZ", "courseSlug": course.slug}, (400, "KIT_CODE_INVALID")),
        ({"code": "pas un code", "courseSlug": course.slug}, (400, "KIT_CODE_INVALID")),
        ({"code": code.code, "courseSlug": "inconnu"}, (404, "NOT_FOUND")),
        (
            {"code": code.code, "courseSlug": CourseFactory(paid=True).slug},
            (400, "KIT_CODE_NOT_COMPATIBLE"),
        ),
    ]:
        resp = client_for(learner).post(URL, payload, format="json")
        assert (resp.status_code, resp.json()["code"]) == expected, payload
    code.revoked_at = code.created_at
    code.save()
    resp = client_for(learner).post(
        URL, {"code": code.code, "courseSlug": course.slug}, format="json"
    )
    assert resp.json()["code"] == "KIT_CODE_INVALID"


def test_only_learners_redeem(code, course):
    assert client_for().post(URL, {}, format="json").status_code == 401
    assert (
        client_for(ParentFactory())
        .post(URL, {"code": code.code, "courseSlug": course.slug}, format="json")
        .status_code
        == 403
    )


@pytest.mark.parametrize("scope", ["kit-code", "kit-code-ip"])
def test_redemptions_are_throttled(monkeypatch, scope):
    rates = {**SimpleRateThrottle.THROTTLE_RATES, scope: "2/hour"}
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)
    learner = LearnerFactory()
    for _ in range(2):
        assert (
            client_for(learner)
            .post(URL, {"code": "x", "courseSlug": "y"}, format="json")
            .status_code
            == 404
        )
    assert (
        client_for(learner).post(URL, {"code": "x", "courseSlug": "y"}, format="json").status_code
        == 429
    )


def test_generation_retries_on_collision(kit, monkeypatch):
    KitCode.objects.create(kit=kit, code="STEAMY-AAAA-AAAA")
    draws = iter(["STEAMY-AAAA-AAAA", "STEAMY-BBBB-BBBB"])
    monkeypatch.setattr("apps.payments.kit_codes.new_kit_code", lambda: next(draws))
    from apps.payments.kit_codes import generate_codes

    item = OrderItemFactory(course=None, kit=kit)
    assert [c.code for c in generate_codes(item)] == ["STEAMY-BBBB-BBBB"]


def test_generation_gives_up_after_repeated_collisions(kit, monkeypatch):
    from django.db import IntegrityError

    from apps.payments.kit_codes import generate_codes

    KitCode.objects.create(kit=kit, code="STEAMY-AAAA-AAAA")
    monkeypatch.setattr("apps.payments.kit_codes.new_kit_code", lambda: "STEAMY-AAAA-AAAA")
    with pytest.raises(IntegrityError):
        generate_codes(OrderItemFactory(course=None, kit=kit))


@pytest.mark.django_db(transaction=True)
def test_concurrent_redemptions_only_one_succeeds():
    load_referentials()
    kit = KitFactory()
    course = CourseFactory(paid=True, required_kit=kit)
    KitCode.objects.create(kit=kit, code="STEAMY-AB12-CD34")
    learners = [LearnerFactory(), LearnerFactory()]
    barrier = threading.Barrier(2)
    outcomes = []

    def attempt(learner):
        try:
            barrier.wait()
            redeem(learner, "STEAMY-AB12-CD34", course)
            outcomes.append("ok")
        except ApiError as error:
            outcomes.append(error.default_code)
        finally:
            connection.close()

    threads = [threading.Thread(target=attempt, args=(learner,)) for learner in learners]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sorted(outcomes) == ["KIT_CODE_ALREADY_USED", "ok"]
    assert Enrollment.objects.filter(course=course).count() == 1
