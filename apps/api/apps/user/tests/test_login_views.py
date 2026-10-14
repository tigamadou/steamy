import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from django.urls import reverse

User = get_user_model()


@pytest.mark.django_db
def test_public_login_returns_token_and_userid(client):
    """
    Vérifie qu'un utilisateur peut se connecter avec email/password,
    et que la réponse contient le token + userId.
    """
    user = User.objects.create_user(email="login@example.com", password="pass123")
    url = reverse("public-user-login")

    response = client.post(url, {"email": "login@example.com", "password": "pass123"})
    assert response.status_code == 200

    data = response.json()
    assert "token" in data
    assert "userId" in data

    # vérifier que le token correspond bien à celui créé en DB
    token = Token.objects.get(user=user)
    assert data["token"] == token.key
    assert data["userId"] == user.id


@pytest.mark.django_db
def test_public_login_invalid_credentials(client):
    """
    Vérifie qu'un mauvais email ou mot de passe renvoie 400.
    """
    User.objects.create_user(email="login2@example.com", password="correctpw")
    url = reverse("public-user-login")

    response = client.post(url, {"email": "login2@example.com", "password": "wrongpw"})
    assert response.status_code == 400
    data = response.json()
    assert "non_field_errors" in data
