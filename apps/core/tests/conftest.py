import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory


@pytest.fixture
def user(db):
    User = get_user_model()
    return User.objects.create_user(email="test@example.com", password="pass1234")


@pytest.fixture
def api_rf():
    return APIRequestFactory()
