import pytest
from rest_framework.test import APIRequestFactory

from apps.accounts.tests.factories import LearnerFactory


@pytest.fixture
def user(db):
    return LearnerFactory()


@pytest.fixture
def api_rf():
    return APIRequestFactory()
