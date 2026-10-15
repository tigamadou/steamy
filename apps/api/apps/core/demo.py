"""
Jeu de données de démonstration unique (D2) : développement, tests de parcours et recette.

Idempotent : chaque objet est retrouvé par un identifiant stable puis mis à jour, jamais dupliqué. Chaque étape du
plan y ajoute les données de son domaine (une fonction `seed_<domaine>` appelée par `seed_all`). Les mots de passe
et le secret TOTP sont documentés dans `fixtures/README.md` ; ils ne servent jamais en production
(`seed_demo` y est refusé).
"""

import datetime

from django.conf import settings
from django.contrib.auth.models import Group

from apps.accounts.models import LearnerProfile, ParentProfile, TeacherProfile, User
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.notifications.models import Category, Notification, Tone
from apps.referentials.models import Avatar, Goal, Locality, SchoolGrade

#: Mot de passe de tous les comptes de démonstration (D25 : 8 caractères, une lettre et un chiffre).
DEMO_PASSWORD = "Steamy2026"
#: Secret TOTP fixe du personnel de démonstration (hexadécimal, vecteur de test RFC 6238). En base32 pour une
#: application d'authentification : GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ.
DEMO_TOTP_KEY = "3132333435363738393031323334353637383930"

LEA_USERNAME = "lea.adjovi"
MARIE_PHONE = "+2290190000001"
KOFFI_EMAIL = "koffi.adekambi@steamy.test"
STAFF = [
    # email, prénom, nom, groupe, superutilisateur
    # Super-admin est un groupe : `is_superuser` est réservé au compte de secours (LOT-6, D71)
    ("superadmin@steamy.test", "Awa", "Dossou", SUPER_ADMIN, False),
    ("contenu@steamy.test", "Yao", "Kpodar", CONTENT, False),
    ("support@steamy.test", "Fifamè", "Hounkpatin", SUPPORT, False),
    ("finance@steamy.test", "Rachidi", "Bello", FINANCE, False),
]


def _user(lookup: dict, **fields) -> User:
    user = User.objects.filter(**lookup).first() or User(**lookup)
    for name, value in fields.items():
        setattr(user, name, value)
    user.set_password(DEMO_PASSWORD)
    user.save()
    return user


def seed_accounts() -> dict[str, User]:
    cotonou = Locality.objects.get(country_id="BJ", city="Cotonou", district="")

    lea = _user(
        {"username": LEA_USERNAME},
        role=User.Role.LEARNER,
        first_name="Léa",
        last_name="Adjovi",
        status=User.Status.ACTIVE,
    )
    profile, _ = LearnerProfile.objects.update_or_create(
        user=lea,
        defaults={
            "birth_date": datetime.date(2013, 3, 14),
            "locality": cotonou,
            "school_grade": SchoolGrade.objects.get(code="4e"),
            "avatar": Avatar.objects.get(code="hibou"),
            "gender": "female",
            "public_pseudonym": "LéaBot",
        },
    )
    profile.goals.set(Goal.objects.filter(code__in=["robots", "coder", "ia"]))

    marie = _user(
        {"phone": MARIE_PHONE},
        role=User.Role.PARENT,
        first_name="Marie",
        last_name="Adjovi",
        status=User.Status.ACTIVE,
    )
    parent_profile, _ = ParentProfile.objects.update_or_create(
        user=marie,
        defaults={"email": "marie.adjovi@steamy.test", "locality": cotonou, "gender": "female"},
    )
    parent_profile.goals_for_children.set(Goal.objects.filter(code__in=["robots", "coder"]))

    koffi = _user(
        {"email": KOFFI_EMAIL},
        role=User.Role.TEACHER,
        first_name="Koffi",
        last_name="Adékambi",
        status=User.Status.ACTIVE,
    )
    TeacherProfile.objects.update_or_create(
        user=koffi, defaults={"specialty": "Robotique et électronique"}
    )

    accounts = {"lea": lea, "marie": marie, "koffi": koffi}
    for email, first_name, last_name, group, superuser in STAFF:
        staff = _user(
            {"email": email},
            role=None,
            is_staff=True,
            is_superuser=superuser,
            first_name=first_name,
            last_name=last_name,
            status=User.Status.ACTIVE,
        )
        staff.groups.set([Group.objects.get(name=group)])
        if not settings.DEPLOYED:  # secret fixe : jamais en staging ni en production
            _totp_device(staff)
        accounts[group] = staff
    return accounts


def _totp_device(user: User) -> None:
    from django_otp.plugins.otp_totp.models import TOTPDevice

    TOTPDevice.objects.update_or_create(
        user=user, name="Démo", defaults={"key": DEMO_TOTP_KEY, "confirmed": True}
    )


def seed_notifications(accounts: dict[str, User]) -> None:
    lea = accounts["lea"]
    for type_, category, tone, title, message, url, read in [
        (
            "welcome",
            Category.ACCOUNT,
            Tone.PRIMARY,
            "Bienvenue sur Steamy, Léa !",
            "Ton profil est prêt : choisis ton premier parcours.",
            "/apprenant/catalogue",
            True,
        ),
        (
            "course_recommended",
            Category.LEARNING,
            Tone.INFO,
            "Un parcours pour toi",
            "Découvre les bases de la robotique avec Zeti.",
            "/apprenant/catalogue",
            False,
        ),
    ]:
        notification, _ = Notification.objects.update_or_create(
            user=lea,
            type=type_,
            defaults={
                "category": category,
                "tone": tone,
                "title": title,
                "message": message,
                "url": url,
            },
        )
        if read and notification.read_at is None:
            notification.read_at = notification.created_at
            notification.save(update_fields=["read_at"])


def seed_all() -> dict[str, User]:
    accounts = seed_accounts()
    seed_notifications(accounts)
    return accounts
