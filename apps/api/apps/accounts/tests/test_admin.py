"""Admin Django des comptes : seul le personnel s'y crée, par l'équipe (S1, S5, WAD13)."""

import pytest
from django.contrib.admin.sites import site
from rest_framework.test import APIRequestFactory

from apps.accounts.models import StaffMember, User
from apps.accounts.tests.factories import StaffFactory

pytestmark = pytest.mark.django_db


def test_a_user_created_in_the_admin_is_staff_without_role():
    model_admin = site._registry[StaffMember]
    request = APIRequestFactory().post("/")
    request.user = StaffFactory(is_superuser=True)
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
