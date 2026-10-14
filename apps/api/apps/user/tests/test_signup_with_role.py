import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_user_signup_with_role_and_profile():
    client = APIClient()
    url = reverse("user-signup")
    payload = {
        "email": "student@example.com",
        "password": "test12345",
        "role": "student",
        "profile": {
            "bio": "I am a test student",
            "country": "Benin",
            "phone": "+22990000000",
        },
    }

    response = client.post(url, payload, format="json")  # <-- APIClient supporte "format"
    assert response.status_code == 201

    user = User.objects.get(email="student@example.com")
    assert user.role == "student"
    assert user.profile.bio == "I am a test student"
    assert user.profile.country == "Benin"
    assert user.profile.phone == "+22990000000"


@pytest.mark.django_db
def test_user_signup_without_profile():
    client = APIClient()
    url = reverse("user-signup")
    payload = {
        "email": "teacher@example.com",
        "password": "test12345",
        "role": "teacher",
    }

    response = client.post(url, payload, format="json")
    assert response.status_code == 201

    user = User.objects.get(email="teacher@example.com")
    assert user.role == "teacher"
    assert not hasattr(user, "profile") or user.profile.bio is None
