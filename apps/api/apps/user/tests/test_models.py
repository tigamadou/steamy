from django.contrib.auth import get_user_model

from apps.user.models import Profile  # si ton fichier models est apps.user.models

User = get_user_model()


def test_usermanager_create_user_normalizes_email(db):
    manager = User.objects
    u = manager.create_user("UPPER@Example.COM", password="secret123")
    assert u.email == "upper@example.com"
    assert u.check_password("secret123")
    assert not u.is_staff
    assert not u.is_superuser


def test_usermanager_create_superuser_sets_flags(db):
    manager = User.objects
    # create_superuser expects kwargs per ton impl — we pass email + password
    su = manager.create_superuser(email="admin@example.com", password="adminpw")
    assert su.is_superuser is True
    assert su.is_staff is True
    assert su.email == "admin@example.com"


def test_normalize_email_method_lowercases():
    # teste le comportement de normalize_email du manager (méthode overridée)
    manager = User.objects
    assert manager.normalize_email("TeSt@DomAin.COM") == "test@domain.com"


def test_abstractemailuser_clean_lowercases_email(db):
    # instancier une sous-classe concrète (User) pour appeler clean()
    user = User.objects.create_user("MiXeD@Email.COM", password="pw")
    # alt: user.email = "MiXeD@Email.COM"; user.clean()
    user.email = "MiXeD@Email.COM"
    user.clean()
    assert user.email == "mixed@email.com"


def test_profile_str(db):
    u = User.objects.create_user("p@example.com", password="pw")
    profile = Profile.objects.create(user=u, bio="hey")
    assert str(profile) == f"Profile {u.email}"
