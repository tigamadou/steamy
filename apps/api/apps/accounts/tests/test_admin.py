"""Admin Django des comptes : seul le personnel s'y crée, par l'équipe (S1, S5, WAD13)."""

import pytest
from django.contrib.admin.sites import site
from django.contrib.messages.storage.fallback import FallbackStorage
from rest_framework.test import APIRequestFactory

from apps.accounts.models import StaffMember, User
from apps.accounts.tests.factories import StaffFactory

pytestmark = pytest.mark.django_db


def admin_request():
    """Requête de l'admin avec messages (la création confirme l'envoi du lien d'activation)."""
    request = APIRequestFactory().post("/")
    request.user = StaffFactory(is_superuser=True)
    request.session = {}
    request._messages = FallbackStorage(request)
    return request


def test_a_user_created_in_the_admin_is_staff_without_role():
    model_admin = site._registry[StaffMember]
    request = admin_request()
    user = User(email="nouveau@steamy.test", role="learner")
    model_admin.save_model(request, user, form=None, change=False)
    user.refresh_from_db()
    assert (user.role, user.is_staff) == (None, True)


def test_editing_keeps_the_role():
    model_admin = site._registry[StaffMember]
    request = APIRequestFactory().post("/")
    request.user = StaffFactory(is_superuser=True)
    staff = StaffFactory()
    staff.first_name = "Modifié"
    model_admin.save_model(request, staff, form=None, change=True)
    staff.refresh_from_db()
    assert staff.first_name == "Modifié" and staff.is_staff
