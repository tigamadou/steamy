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
from django.utils import timezone

from apps.accounts.demo import seed_parent_space
from apps.accounts.models import (
    LearnerProfile,
    ParentChildLink,
    ParentProfile,
    PublicProfileReview,
    TeacherProfile,
    User,
)
from apps.catalog import models as catalog
from apps.classrooms.demo import seed_classes
from apps.classrooms.invitations import send_invitation
from apps.classrooms.models import School, TeacherInvitation
from apps.core.groups import CONTENT, FINANCE, SUPER_ADMIN, SUPPORT
from apps.events.models import SteamyEvent
from apps.impact import services as impact
from apps.impact.models import KpiDefinition, KpiValue
from apps.impact.periods import QUARTER, Period
from apps.notifications.models import Category, Notification, Tone
from apps.payments.demo import seed_commerce
from apps.referentials.models import (
    Avatar,
    Country,
    Goal,
    Locality,
    Relationship,
    SchoolGrade,
)
from apps.shop.models import Kit

#: Mot de passe de tous les comptes de démonstration (D25 : 8 caractères, une lettre et un chiffre).
DEMO_PASSWORD = "Steamy2026"
#: Secret TOTP fixe du personnel de démonstration (hexadécimal, vecteur de test RFC 6238). En base32 pour une
#: application d'authentification : GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ.
DEMO_TOTP_KEY = "3132333435363738393031323334353637383930"

LEA_USERNAME = "lea.adjovi"
MARIE_PHONE = "+2290190000001"
KOFFI_EMAIL = "koffi.adekambi@steamy.test"
SCHOOL_NAME = "Collège Steamy de Cotonou"
#: Invitation enseignant en attente (P6 du lot 2 : lien lu dans Mailpit).
INVITED_TEACHER_EMAIL = "nadia.houngbo@steamy.test"
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
        defaults={
            "email": "marie.adjovi@steamy.test",
            "locality": cotonou,
            "gender": "female",
            "children_to_enroll": 1,
        },
    )
    parent_profile.goals_for_children.set(Goal.objects.filter(code__in=["robots", "coder"]))
    # Marie est le parent de Léa (S3) ; le consentement a été donné
    ParentChildLink.objects.update_or_create(
        learner=lea,
        defaults={"parent": marie, "relationship": Relationship.objects.get(code="mere")},
    )

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


def seed_classrooms(accounts: dict[str, User]) -> None:
    """L'école de M. Adékambi et une invitation enseignant en attente, envoyée (Mailpit en local)."""
    school, _ = School.objects.update_or_create(
        name=SCHOOL_NAME,
        defaults={
            "country": Country.objects.get(code="BJ"),
            "city": "Cotonou",
            "learner_quota": 120,
            "classroom_quota": 4,
        },
    )
    TeacherProfile.objects.filter(user=accounts["koffi"]).update(school=school)
    invitation, _ = TeacherInvitation.objects.update_or_create(
        email=INVITED_TEACHER_EMAIL,
        defaults={
            "first_name": "Nadia",
            "last_name": "Houngbo",
            "school": school,
            "accepted_at": None,
        },
    )
    # Invitation déjà activée lors d'un parcours précédent : on remet le compte à l'état « invité »
    User.objects.filter(email=INVITED_TEACHER_EMAIL, role=User.Role.TEACHER).delete()
    send_invitation(invitation, invited_by=accounts.get(SUPER_ADMIN))


CATEGORIES = [
    # slug, libellé, couleur (tokens --cat-* du design system), icône, objectifs liés (recommandations, API-L3a.5)
    ("robotique", "Robotique", "#5B3FE0", "🤖", ["robots", "challenges", "bricoler"]),
    ("electronique", "Électronique", "#0EA5E9", "⚡", ["electronique", "domotique"]),
    ("code", "Code", "#EC4899", "💻", ["coder", "jeu", "creativite"]),
    ("ia", "IA", "#14B8A6", "🧠", ["ia"]),
    ("mecanique", "Mécanique", "#F59E0B", "⚙️", ["bricoler", "robots"]),
    ("energie", "Énergie", "#84CC16", "🔋", ["domotique"]),  # sans parcours : état vide de WL06
]

#: Parcours court du parcours Playwright P1 (lot 3) : Léa y est inscrite sans progression, remise à zéro à chaque seed.
SHORT_COURSE = "premiers-pas-zeti"
#: Délai entre deux essais d'une sommative ratée dans la stack e2e (au lieu de 10 min).
E2E_SUMMATIVE_COOLDOWN = 5
#: Vidéo Vimeo de démonstration (publique, ADR 0004 point V4 : jamais une vidéo de production).
DEMO_VIMEO_ID = "76979871"

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
        SHORT_COURSE,
        "Premiers pas avec Zeti",
        "robotique",
        catalog.Course.Difficulty.BEGINNER,
        0,
        "🔦",
        False,
        catalog.Course.Status.PUBLISHED,
        # Parcours court du parcours Playwright P1 (LOT-3 §8.3) : 1 projet, 1 niveau, 2 missions
        [("Allumer une LED", [("Le circuit", ["Les composants", "Brancher la LED"])])],
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
    for order, (slug, label, color, icon, goals) in enumerate(CATEGORIES):
        categories[slug], _ = catalog.Category.objects.update_or_create(
            slug=slug, defaults={"label": label, "color": color, "icon": icon, "order": order}
        )
        categories[slug].goals.set(Goal.objects.filter(code__in=goals))
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
                    defaults={
                        "title": level_title,
                        "duration_min": 10 * len(missions),
                        "intro_vimeo_id": DEMO_VIMEO_ID,
                        "intro_summary": f"{level_title} : ce que tu vas faire dans ce niveau.",
                    },
                )
                for m_order, mission_title in enumerate(missions):
                    catalog.Mission.objects.update_or_create(
                        level=level,
                        order=m_order,
                        defaults={
                            "title": mission_title,
                            "duration_min": 10,
                            "icon": "🎯",
                            "vimeo_id": DEMO_VIMEO_ID,
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
                seed_quiz(catalog.Quiz.Kind.FORMATIVE, level=level)
                catalog.Badge.objects.update_or_create(
                    level=level, defaults={"kind": "level", "label": level_title, "icon": "🏅"}
                )
            seed_quiz(catalog.Quiz.Kind.SUMMATIVE, project=project)
            catalog.Badge.objects.update_or_create(
                project=project, defaults={"kind": "project", "label": project_title, "icon": "🏆"}
            )
        catalog.Badge.objects.update_or_create(
            course=course, defaults={"kind": "course", "label": f"Diplômé · {title}", "icon": "🎓"}
        )


def seed_quiz(kind: str, level=None, project=None) -> None:
    """
    Quiz de deux questions à deux réponses (la première est la bonne) : formative de chaque niveau, sommative de
    chaque projet (S2). Chaque question renvoie vers une mission à revoir (D32).
    """
    target = level or project
    quiz, _ = catalog.Quiz.objects.update_or_create(
        level=level, project=project, defaults={"kind": kind}
    )
    missions = list(
        catalog.Mission.objects.filter(
            **({"level": level} if level else {"level__project": project})
        ).order_by("level__order", "order")
    )
    for order, mission in enumerate([missions[0], missions[-1]]):
        question, _ = catalog.Question.objects.update_or_create(
            quiz=quiz,
            order=order,
            defaults={
                "text": f"{target.title} : qu'as-tu retenu de « {mission.title} » ?",
                "concept": mission.title,
                "remediation_mission": mission,
            },
        )
        for c_order, (text, correct) in enumerate(
            [("L'idée vue dans la mission", True), ("Une idée qui n'y figure pas", False)]
        ):
            catalog.Choice.objects.update_or_create(
                question=question, order=c_order, defaults={"text": text, "is_correct": correct}
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


def seed_backoffice(accounts: dict[str, User]) -> None:
    """WAD08 : le pseudonyme public de Léa attend la modération du support (D15)."""
    PublicProfileReview.objects.update_or_create(
        learner=accounts["lea"],
        pseudonym="LéaBot",
        defaults={
            "avatar": Avatar.objects.get(code="hibou"),
            "status": PublicProfileReview.Status.PENDING,
            "reviewed_by": None,
            "reviewed_at": None,
        },
    )


#: Saisie manuelle du trimestre en cours (WAD05) : quelques indicateurs restent à renseigner.
IMPACT_MANUAL = {
    "fin_montant": 1951472,
    "fin_hors": "oui",
    "fin_first": "oui",
    "fin_who": "OIF",
    "prod": "non",
    "prod_vuln": "non",
    "nps": 10,
    "emp": 5,
    "emp_f": 2,
}


def seed_impact(accounts: dict[str, User]) -> None:
    """Impact Tracker : KPI `auto` calculés sur le jeu D2 et saisie manuelle du trimestre en cours (brouillon)."""
    impact.aggregate_daily_stats(timezone.localdate())
    impact.compute_kpis(timezone.localdate())
    quarter = Period.current(QUARTER).key
    for code, value in IMPACT_MANUAL.items():
        kpi = KpiDefinition.objects.get(code=code)
        number, text = (value, "") if kpi.is_numeric else (None, value)
        KpiValue.objects.update_or_create(
            kpi=kpi,
            period=quarter,
            defaults={"number": number, "text": text, "entered_by": accounts[FINANCE]},
        )


#: Inscriptions de Léa : parcours, nombre de missions faites (None : toutes). Les quiz suivant des missions faites
#: sont réussis ; « Découverte de la robotique » montre en plus une tentative `ko` puis `warn` avant la réussite
#: (WD07). Le parcours court de P1 repart de zéro à chaque seed, pour rejouer le parcours Playwright.
LEA_ENROLLMENTS = [
    ("decouverte-robotique", 3),  # en cours : niveau 1.1 fait, niveau 1.2 commencé
    ("initiation-scratch", None),  # terminé
    (SHORT_COURSE, 0),
]


#: Barème de points et paliers de rang de DÉMONSTRATION (C8 : les valeurs réelles restent à fixer par l'équipe dans
#: l'admin). Saisis seulement s'ils sont vides, pour ne pas écraser un réglage fait à la main.
DEMO_POINTS_SCALE = {"mission": 10, "formative": 20, "summative": 50, "course": 100}
DEMO_RANK_THRESHOLDS = [
    {"rank": "Explorateur", "points": 0},
    {"rank": "Bricoleur", "points": 100},
    {"rank": "Inventeur", "points": 300},
    {"rank": "Ingénieur", "points": 600},
    {"rank": "Maître Steamy", "points": 1000},
]
#: « Mes souhaits » de Léa (WW01) : un parcours à kit et un parcours payant
LEA_WISHLIST = ["robot-bluetooth", "capteurs-electroniques"]
#: Secondes de vidéo de Léa, d'aujourd'hui (0) aux jours précédents : un streak de 5 jours (WD01, WD21).
LEA_ACTIVITY = [600, 1200, 900, 300, 1500]


def seed_learning(accounts: dict[str, User]) -> None:
    from apps.core.models import PlatformSettings
    from apps.learning.certification import complete_if_done
    from apps.learning.gamification import award_badge, award_points, badge_of, streak_days
    from apps.learning.models import (
        Enrollment,
        LearnerBadge,
        LearningActivity,
        MissionProgress,
        PointsEntry,
    )
    from apps.learning.progression import Progression

    platform = PlatformSettings.load()
    platform.points_scale = platform.points_scale or DEMO_POINTS_SCALE
    platform.rank_thresholds = platform.rank_thresholds or DEMO_RANK_THRESHOLDS
    platform.save()

    lea = accounts["lea"]
    PointsEntry.objects.filter(learner=lea).delete()
    LearnerBadge.objects.filter(learner=lea).delete()
    LearningActivity.objects.filter(learner=lea).delete()
    LearnerProfile.objects.filter(user=lea).update(points=0)
    for slug, done in LEA_ENROLLMENTS:
        course = catalog.Course.objects.get(slug=slug)
        enrollment, _ = Enrollment.objects.update_or_create(
            learner=lea, course=course, defaults={"source": Enrollment.Source.FREE}
        )
        missions = list(
            catalog.Mission.objects.filter(level__project__course=course).order_by(
                "level__project__order", "level__order", "order", "id"
            )
        )
        done_missions = missions if done is None else missions[:done]
        MissionProgress.objects.filter(enrollment=enrollment).exclude(
            mission__in=done_missions
        ).delete()
        for mission in done_missions:
            MissionProgress.objects.get_or_create(enrollment=enrollment, mission=mission)
        enrollment.attempts.all().delete()
        progression = Progression(enrollment)
        for step in progression.steps:
            if step.type == "quiz" and _quiz_reached(progression, step):
                quiz = catalog.Quiz.objects.get(pk=step.id)
                if slug == "decouverte-robotique":
                    _attempt(enrollment, quiz, right=0)
                    _attempt(enrollment, quiz, right=1)
                _attempt(enrollment, quiz, right=2)
                progression = Progression(enrollment)
        for mission in done_missions:
            award_points(
                lea, "mission", f"mission:{mission.id}", f"Mission terminée : {mission.title}"
            )
        for attempt in enrollment.attempts.filter(passed=True).select_related("quiz"):
            quiz = attempt.quiz
            attempt.points_earned = award_points(
                lea, quiz.kind, f"quiz:{quiz.id}", f"Quiz réussi : {quiz}"
            )
            attempt.save(update_fields=["points_earned"])
            award_badge(lea, badge_of(quiz.level or quiz.project))
        enrollment.progress_pct = Progression(enrollment).progress_pct
        enrollment.last_activity_at = timezone.now() if done_missions else None
        enrollment.status, enrollment.completed_at = Enrollment.Status.ACTIVE, None
        enrollment.save()
        # Parcours fini : terminé, points et badge du parcours, certificat (gardé d'un seed à l'autre) et ticket
        complete_if_done(enrollment)
    from apps.wishlist.models import WishlistItem

    for slug in LEA_WISHLIST:
        WishlistItem.objects.get_or_create(
            learner=lea, course=catalog.Course.objects.get(slug=slug)
        )
    today = timezone.localdate()
    for days_ago, seconds in enumerate(LEA_ACTIVITY):
        LearningActivity.objects.create(
            learner=lea, date=today - datetime.timedelta(days=days_ago), seconds=seconds
        )
    LearnerProfile.objects.filter(user=lea).update(streak_days=streak_days(lea))


def _quiz_reached(progression, step) -> bool:
    """Quiz dont toutes les étapes précédentes sont faites (ses missions comprises)."""
    index = progression.steps.index(step)
    return all(progression.is_done(s) for s in progression.steps[:index])


def _attempt(enrollment, quiz, right: int) -> None:
    from apps.learning.models import QuizAttempt
    from apps.learning.services import attempt_status

    status = attempt_status(right, 2, quiz.pass_threshold)
    QuizAttempt.objects.create(
        learner=enrollment.learner,
        enrollment=enrollment,
        quiz=quiz,
        results=[
            {"question_id": q.id, "correct": i < right}
            for i, q in enumerate(quiz.questions.order_by("order"))
        ],
        score=right,
        total=2,
        percentage=right * 50,
        threshold=quiz.pass_threshold,
        status=status,
        passed=status == QuizAttempt.Status.OK,
        duration_sec=60,
        failed_concepts=[q.concept for q in quiz.questions.order_by("order")[right:]],
    )


def seed_e2e() -> None:
    """Réglages des parcours Playwright (`seed_demo --e2e`) : délai d'une sommative ratée de 5 s (P1, D32)."""
    from apps.core.models import PlatformSettings

    settings_ = PlatformSettings.load()
    settings_.summative_retry_cooldown_seconds = E2E_SUMMATIVE_COOLDOWN
    settings_.save()


def seed_all() -> dict[str, User]:
    accounts = seed_accounts()
    seed_backoffice(accounts)
    seed_classrooms(accounts)
    seed_notifications(accounts)
    seed_catalog()
    seed_events()
    seed_kits()
    seed_learning(accounts)
    seed_impact(accounts)
    seed_commerce(accounts)
    accounts["noe"] = seed_parent_space(accounts, DEMO_PASSWORD)
    seed_classes(School.objects.get(name=SCHOOL_NAME), accounts["koffi"])
    return accounts
