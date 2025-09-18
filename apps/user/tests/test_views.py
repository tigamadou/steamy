import pytest
from types import SimpleNamespace
from django.contrib.auth import get_user_model
from apps.user.endpoints.public.signup.views import PublicSignupView
import apps.user.mail as user_mail_module

User = get_user_model()


def test_public_signup_view_perform_create_calls_send_welcome_email(db, monkeypatch):
    """
    Simule perform_create en fournissant un serializer stub qui crée un user et
    retourne {'user_id': <id>}. Vérifie que mail.send_welcome_email est appelé
    avec l'instance utilisateur créée.
    """
    # crée un utilisateur via ORM (on simule que serializer.save() a créé cet user)
    created_user = User.objects.create_user("newuser@example.com", password="pw123")

    # stub serializer qui retourne le dict attendu par perform_create()
    class FakeSerializer:
        def save(self_inner):
            return {"user_id": created_user.id}

    # spy sur send_welcome_email
    called = {}

    def fake_send_welcome_email(user):
        called["user"] = user

    monkeypatch.setattr(user_mail_module, "send_welcome_email", fake_send_welcome_email)

    view = PublicSignupView()
    serializer = FakeSerializer()

    # appeler perform_create (c'est la logique que tu as dans la view)
    view.perform_create(serializer)

    # assertions
    assert "user" in called
    assert called["user"].id == created_user.id
    assert called["user"].email == created_user.email


def test_public_signup_view_perform_create_handles_missing_user(monkeypatch):
    """
    Si serializer.save() retourne un id invalide / l'utilisateur est introuvable,
    on s'attend à une exception (ou comportement défini). Ici on vérifie que si
    get() lève, la fonction laisse remonter l'erreur — tu peux adapter selon ton code.
    """
    class BadSerializer:
        def save(self):
            return {"user_id": 999999999}

    # on veut s'assurer que send_welcome_email n'est jamais appelé
    called = {"count": 0}

    def fake_send_welcome_email(user):
        called["count"] += 1

    monkeypatch.setattr(user_mail_module, "send_welcome_email", fake_send_welcome_email)

    view = PublicSignupView()
    serializer = BadSerializer()

    with pytest.raises(Exception):
        view.perform_create(serializer)

    assert called["count"] == 0
