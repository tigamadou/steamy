"""`IsStaffVerified` (API-L6.1) : permission DRF de toute route `/api/backoffice/` (D71, D72)."""

import pytest
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from apps.accounts.tests.factories import ParentFactory, StaffFactory
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.core.staff_auth import STAFF_BACKEND
from apps.core.tests.staff import login, staff_member
from libs.permissions import IsStaffVerified

pytestmark = pytest.mark.django_db


class Overview(APIView):
    """Vue de test, isolée des routes réelles (`backoffice/overview/`, API-L6.4)."""

    permission_classes = [IsStaffVerified]

    def get(self, request):
        return Response({"ok": True})


class Impact(Overview):
    permission_classes = [IsStaffVerified.of(FINANCE)]


def call(view, user=None, *, verified=False):
    request = APIRequestFactory().get("/api/backoffice/overview/")
    if user is not None:
        if verified:
            user.is_verified = lambda: True
        force_authenticate(request, user)
    return view.as_view()(request)


def test_anonymous_is_asked_to_log_in():
    response = call(Overview)
    assert (response.status_code, response.data["code"]) == (401, "NOT_AUTHENTICATED")


def test_a_persona_is_refused():
    response = call(Overview, ParentFactory(), verified=True)
    assert (response.status_code, response.data["code"]) == (403, "PERMISSION_DENIED")


def test_an_unverified_staff_member_must_validate_the_totp():
    response = call(Overview, StaffFactory())
    assert (response.status_code, response.data["code"]) == (403, "OTP_REQUIRED")
    assert response.data["message"] == "Validation en deux étapes requise."


def test_any_verified_staff_member_reaches_the_overview():
    assert call(Overview, staff_member(CONTENT), verified=True).status_code == 200


@pytest.mark.parametrize(
    ("group", "superuser", "status"),
    [(FINANCE, False, 200), (SUPER_ADMIN, False, 200), (None, True, 200), (SUPPORT, False, 403)],
)
def test_group_restricted_routes(group, superuser, status):
    staff = staff_member(group, is_superuser=superuser)
    assert call(Impact, staff, verified=True).status_code == status


def test_the_session_opened_by_wad15_is_verified_by_the_api(client):
    """Bout en bout : la session ouverte par WAD15 (cookie `sessionid`) sert à l'API du back-office (D72)."""
    url = "/api/backoffice/overview/"
    assert client.get(url).json()["code"] == "NOT_AUTHENTICATED"
    staff = staff_member(SUPPORT)
    client.force_login(staff, backend=STAFF_BACKEND)  # session sans TOTP validé
    response = client.get(url)
    assert (response.status_code, response.json()["code"]) == (403, "OTP_REQUIRED")
    client.logout()
    login(client, staff)
    assert client.get(url).status_code == 200
