"""
Jeu de données de démonstration unique (D2) : développement, tests de parcours et recette.

Idempotent : chaque objet est retrouvé par un identifiant stable puis mis à jour, jamais dupliqué. Chaque étape du
plan y ajoute les données de son domaine (une fonction `seed_<domaine>` appelée par `seed_all`). Les mots de passe
et le secret TOTP sont documentés dans `fixtures/README.md` ; ils ne servent jamais en production
(`seed_demo` y est refusé).
"""

import datetime

from django.contrib.auth.models import Group
from django.utils import timezone

from apps.accounts.models import LearnerProfile, ParentProfile, TeacherProfile, User
from apps.catalog import models as catalog
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.events.models import SteamyEvent
from apps.notifications.models import Category, Notification, Tone
from apps.referentials.models import Avatar, Goal, Locality, SchoolGrade
from apps.shop.models import Kit

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
    ("superadmin@steamy.test", "Awa", "Dossou", SUPER_ADMIN, True),
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
        defaults={
            "email": "marie.adjovi@steamy.test",
            "locality": cotonou,
            "gender": "female",
            "children_to_enroll": 1,
        },
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


CATEGORIES = [
    # slug, libellé, couleur (tokens --cat-* du design system), icône
    ("robotique", "Robotique", "#5B3FE0", "🤖"),
    ("electronique", "Électronique", "#0EA5E9", "⚡"),
    ("code", "Code", "#EC4899", "💻"),
    ("ia", "IA", "#14B8A6", "🧠"),
    ("mecanique", "Mécanique", "#F59E0B", "⚙️"),
    ("energie", "Énergie", "#84CC16", "🔋"),  # sans parcours : état vide de WL06
]

#: Parcours : slug, titre, catégorie, difficulté, prix (0 = gratuit), emoji, mis en avant, statut, projets
#: (titre, niveaux (titre, missions)).
COURSES = [
    (
        "decouverte-robotique",
        "Découverte de la robotique",
        "robotique",
        catalog.Course.Difficulty.BEGINNER,
        0,
        "🤖",
        True,
        catalog.Course.Status.PUBLISHED,
        [
            (
                "Mon premier robot",
                [
                    (
                        "Les moteurs",
                        ["Identifier les moteurs", "Brancher un moteur", "Inverser le sens"],
                    ),
                    ("Les roues", ["Monter les roues", "Faire avancer le robot"]),
                ],
            ),
            (
                "Le robot suiveur de ligne",
                [
                    ("Les capteurs", ["Le capteur infrarouge", "Lire une valeur"]),
                    (
                        "Suivre la ligne",
                        ["Tourner à gauche", "Tourner à droite", "Le parcours final"],
                    ),
                ],
            ),
        ],
    ),
    (
        "initiation-scratch",
        "Initiation à Scratch",
        "code",
        catalog.Course.Difficulty.BEGINNER,
        0,
        "💻",
        False,
        catalog.Course.Status.PUBLISHED,
        [
            (
                "Premiers blocs et animations",
                [
                    ("L'interface", ["Découvrir l'interface", "Mes premiers personnages"]),
                    ("Animer", ["Animation simple", "Les costumes"]),
                ],
            ),
            (
                "Mon mini-jeu complet",
                [
                    ("Variables et boucles", ["Créer une variable", "Boucles répéter"]),
                    ("Le jeu", ["Personnage jouable", "Niveaux et obstacles", "Écran de fin"]),
                ],
            ),
        ],
    ),
    (
        "robot-bluetooth",
        "Construis ton robot Bluetooth",
        "robotique",
        catalog.Course.Difficulty.INTERMEDIATE,
        25000,
        "📡",
        False,
        catalog.Course.Status.PUBLISHED,
        [
            (
                "Premiers circuits",
                [
                    ("Composants de base", ["La résistance", "La LED", "Loi d'Ohm en pratique"]),
                    ("Montages", ["Série et parallèle", "Mon premier circuit"]),
                ],
            ),
            (
                "Connexion Bluetooth",
                [
                    ("Le module HC-05", ["Brancher le module", "Appairer le téléphone"]),
                    ("Piloter le robot", ["Protocole de commandes", "Tests d'autonomie"]),
                ],
            ),
        ],
    ),
    (
        "capteurs-electroniques",
        "Capteurs électroniques",
        "electronique",
        catalog.Course.Difficulty.INTERMEDIATE,
        18000,
        "⚡",
        False,
        catalog.Course.Status.PUBLISHED,
        [
            (
                "Mesurer le monde",
                [
                    ("Lumière et température", ["La photorésistance", "Le thermistor"]),
                    ("Distance", ["Le capteur ultrason", "Calibration"]),
                ],
            ),
        ],
    ),
    (
        "ia-pour-les-curieux",
        "L'IA pour les curieux",
        "ia",
        catalog.Course.Difficulty.ADVANCED,
        15000,
        "🧠",
        False,
        catalog.Course.Status.DRAFT,  # brouillon : invisible du catalogue public
        [("Qu'est-ce qu'une IA ?", [("Les bases", ["Apprendre à partir d'exemples"])])],
    ),
]


def seed_catalog() -> None:
    categories = {}
    for order, (slug, label, color, icon) in enumerate(CATEGORIES):
        categories[slug], _ = catalog.Category.objects.update_or_create(
            slug=slug, defaults={"label": label, "color": color, "icon": icon, "order": order}
        )
    for slug, title, category, difficulty, price, emoji, featured, status, projects in COURSES:
        course, _ = catalog.Course.objects.update_or_create(
            slug=slug,
            defaults={
                "title": title,
                "category": categories[category],
                "difficulty": difficulty,
                "is_free": price == 0,
                "price": price,
                "emoji": emoji,
                "featured": featured,
                "status": status,
                "duration_hours": 2 * len(projects),
                "description": f"{title} : un parcours concret, projet après projet, pour apprendre en construisant.",
                "outcomes": [project for project, _ in projects],
                "audience": "Apprenants de 10 à 17 ans",
                "prerequisites": []
                if difficulty == catalog.Course.Difficulty.BEGINNER
                else ["Savoir lire un schéma simple"],
            },
        )
        for p_order, (project_title, levels) in enumerate(projects):
            project, _ = catalog.Project.objects.update_or_create(
                course=course,
                order=p_order,
                defaults={
                    "title": project_title,
                    "duration_hours": 2,
                    "objectives": [project_title],
                },
            )
            for l_order, (level_title, missions) in enumerate(levels):
                level, _ = catalog.Level.objects.update_or_create(
                    project=project,
                    order=l_order,
                    defaults={"title": level_title, "duration_min": 10 * len(missions)},
                )
                for m_order, mission_title in enumerate(missions):
                    catalog.Mission.objects.update_or_create(
                        level=level,
                        order=m_order,
                        defaults={
                            "title": mission_title,
                            "duration_min": 10,
                            "icon": "🎯",
                            "blocks": [
                                {
                                    "type": "text",
                                    "text": f"{mission_title} : suis les étapes pas à pas.",
                                },
                                {
                                    "type": "tip",
                                    "text": "Prends ton temps et teste à chaque étape.",
                                },
                            ],
                        },
                    )


#: Événements : slug, titre, emoji, couleur, décalage en jours depuis aujourd'hui, ville, lieu, public, prix, places,
#: places déjà attribuées. Couvre gratuit, payant, complet et passé (WL21, WL23).
EVENTS = [
    (
        "atelier-electronique",
        "Atelier Électronique débutant",
        "⚡",
        "#0EA5E9",
        21,
        "Porto-Novo",
        "Maison des jeunes, Ouando",
        "12 – 15 ans",
        0,
        20,
        12,
    ),
    (
        "defi-robots-cotonou",
        "Défi robots de Cotonou",
        "🤖",
        "#5B3FE0",
        45,
        "Cotonou",
        "Institut français",
        "10 – 17 ans",
        5000,
        40,
        5,
    ),
    (
        "hackathon-ia",
        "Hackathon IA junior",
        "🧠",
        "#14B8A6",
        14,
        "Cotonou",
        "Sèmè City",
        "14 – 17 ans",
        2000,
        30,
        30,
    ),
    (
        "fete-de-la-science",
        "Fête de la science Steamy",
        "🔋",
        "#84CC16",
        -30,
        "Parakou",
        "Université de Parakou",
        "10 – 17 ans",
        0,
        100,
        64,
    ),
]


def seed_events() -> None:
    today = timezone.localtime().replace(hour=14, minute=0, second=0, microsecond=0)
    for slug, title, emoji, color, days, city, place, audience, price, capacity, reserved in EVENTS:
        starts_at = today + datetime.timedelta(days=days)
        SteamyEvent.objects.update_or_create(
            slug=slug,
            defaults={
                "title": title,
                "emoji": emoji,
                "color": color,
                "starts_at": starts_at,
                "ends_at": starts_at + datetime.timedelta(hours=2, minutes=30),
                "application_deadline": starts_at - datetime.timedelta(days=3),
                "city": city,
                "place": place,
                "audience": audience,
                "price": price,
                "capacity": capacity,
                "seats_reserved": reserved,
                "description": f"{title} : une demi-journée pour construire, tester et partager avec d'autres "
                "jeunes inventeurs. L'accord de ton parent est toujours demandé.",
                "status": SteamyEvent.Status.PUBLISHED,
            },
        )


#: Kits : slug, nom, catégorie, prix, difficulté, emoji, stock, parcours compatibles, parcours qui l'exigent.
KITS = [
    (
        "steamy-bot-v1",
        "Steamy Bot v1",
        "robotique",
        35000,
        "beginner",
        "🤖",
        12,
        ["decouverte-robotique", "robot-bluetooth"],
        ["robot-bluetooth"],
    ),
    (
        "pack-electronique",
        "Pack Électronique",
        "electronique",
        22000,
        "beginner",
        "⚡",
        30,
        ["capteurs-electroniques"],
        [],
    ),
    (
        "kit-energie-solaire",
        "Kit Énergie Solaire",
        "energie",
        19000,
        "beginner",
        "🔆",
        0,
        [],
        [],
    ),  # rupture
]


def seed_kits() -> None:
    for slug, name, category, price, difficulty, emoji, stock, compatible, required_by in KITS:
        kit, _ = Kit.objects.update_or_create(
            slug=slug,
            defaults={
                "name": name,
                "category": catalog.Category.objects.get(slug=category),
                "price": price,
                "difficulty": difficulty,
                "emoji": emoji,
                "stock_quantity": stock,
                "active": True,
                "description": f"{name} : tout le matériel pour construire à la maison, notice et Kit Code inclus.",
                "contents": [
                    "Notice illustrée",
                    "Kit Code d'accès au parcours",
                    "Composants et câbles",
                ],
            },
        )
        kit.compatible_courses.set(catalog.Course.objects.filter(slug__in=compatible))
        catalog.Course.objects.filter(slug__in=required_by).update(required_kit=kit)


def seed_all() -> dict[str, User]:
    accounts = seed_accounts()
    seed_notifications(accounts)
    seed_catalog()
    seed_events()
    seed_kits()
    return accounts
