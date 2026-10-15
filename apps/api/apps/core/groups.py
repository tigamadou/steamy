"""
Groupes du personnel et matrice des permissions (D71, LOT-6-ADMIN « Groupes et permissions »).

La matrice est la seule source des droits des groupes : `setup_staff_groups()` l'applique après chaque `migrate`
(signal `post_migrate`, voir `apps.core.apps`) et par la commande `manage.py setup_staff_groups`. Elle est
idempotente et remplace les permissions de chaque groupe : un droit ajouté à la main disparaît au `migrate` suivant.

Elle décrit aussi les modèles des lots suivants (catalogue, boutique, événements, classes, impact) : une entrée dont
le modèle ou la permission n'existe pas encore est ignorée, et s'applique dès que la migration qui la crée passe.
Les permissions personnalisées (en italique dans la matrice du plan) sont déclarées par ces modèles
(`Meta.permissions`) sous le codename indiqué ici.
"""

from django.db.models import Q

SUPER_ADMIN = "Super-admin"
CONTENT = "Contenu"
SUPPORT = "Support"
FINANCE = "Finance"

STAFF_GROUPS = (SUPER_ADMIN, CONTENT, SUPPORT, FINANCE)

#: Actions standard de Django, notées comme dans la matrice : `v` lecture, `a` ajout, `c` modification,
#: `d` suppression.
ACTIONS = {"v": "view", "a": "add", "c": "change", "d": "delete"}

_CATALOG = (
    "category",
    "course",
    "project",
    "level",
    "mission",
    "quiz",
    "question",
    "choice",
    "badge",
)
_REFERENTIALS = (
    "country",
    "schoolgrade",
    "goal",
    "avatar",
    "disability",
    "relationship",
    "refusalreason",
    "locality",
)
_CELERY_BEAT = (
    "periodictask",
    "intervalschedule",
    "crontabschedule",
    "solarschedule",
    "clockedschedule",
)

#: Modèle (`app_label.model`) → groupe → permissions : lettres de `ACTIONS` puis codenames personnalisés.
PERMISSIONS: dict[str, dict[str, tuple[str, ...]]] = {
    # Comptes (WAD06-WAD08)
    "accounts.user": {
        SUPER_ADMIN: ("vac",),
        SUPPORT: ("vc", "invite_teacher", "deactivate_user", "reset_password"),
        FINANCE: ("v",),
    },
    **{
        f"accounts.{model}": {SUPER_ADMIN: ("vac",), SUPPORT: ("vc",), FINANCE: ("v",)}
        for model in ("parentprofile", "teacherprofile")
    },
    # Genre et handicap des apprenants : permission dédiée (D6)
    "accounts.learnerprofile": {
        SUPER_ADMIN: ("vac", "view_sensitive_profile"),
        SUPPORT: ("vc", "view_sensitive_profile"),
        FINANCE: ("v",),
    },
    "accounts.parentchildlink": {
        SUPER_ADMIN: ("v", "change_parent"),
        SUPPORT: ("v", "change_parent"),
    },
    "accounts.consentrequest": {
        SUPER_ADMIN: ("v", "resend", "flag_dispute"),
        SUPPORT: ("v", "resend", "flag_dispute"),
    },
    "accounts.publicprofilereview": {SUPER_ADMIN: ("vc",), SUPPORT: ("vc",)},
    # Contenu (WAD09)
    **{
        f"catalog.{model}": {SUPER_ADMIN: ("vacd",), CONTENT: ("vacd",), SUPPORT: ("v",)}
        for model in _CATALOG
    },
    "catalog.course": {
        SUPER_ADMIN: ("vacd", "publish_course"),
        CONTENT: ("vacd", "publish_course"),
        SUPPORT: ("v",),
        FINANCE: ("v",),
    },
    # Boutique, commandes, paiements (WAD10, WAD11)
    **{
        f"shop.{model}": {
            SUPER_ADMIN: ("vacd",),
            CONTENT: ("vacd",),
            SUPPORT: ("v",),
            FINANCE: ("v",),
        }
        for model in ("kit", "deliveryzone")
    },
    "payments.order": {
        SUPER_ADMIN: ("v",),
        SUPPORT: ("v", "set_shipping_status"),
        FINANCE: ("v",),
    },
    "payments.orderitem": {SUPER_ADMIN: ("v",), SUPPORT: ("v",), FINANCE: ("v",)},
    "payments.kitcode": {SUPER_ADMIN: ("v",), SUPPORT: ("v", "revoke_kitcode"), FINANCE: ("v",)},
    "shop.restockalert": {SUPER_ADMIN: ("v",), SUPPORT: ("v",), FINANCE: ("v",)},
    # `payload` du paiement réservé à Finance : restriction de champ portée par l'admin (6.4)
    "payments.payment": {SUPER_ADMIN: ("v",), SUPPORT: ("v",), FINANCE: ("v",)},
    "payments.invoice": {SUPER_ADMIN: ("v",), SUPPORT: ("v",), FINANCE: ("v",)},
    "payments.refund": {SUPER_ADMIN: ("v",), FINANCE: ("vac", "process_refund")},
    # Steamy Events (WAD12)
    "events.steamyevent": {
        SUPER_ADMIN: ("vacd",),
        CONTENT: ("vacd",),
        SUPPORT: ("v",),
        FINANCE: ("v",),
    },
    "events.eventapplication": {
        SUPER_ADMIN: ("v",),
        CONTENT: ("v",),
        SUPPORT: ("v", "refuse_application"),
        FINANCE: ("v",),
    },
    # Écoles et classes
    "classrooms.school": {SUPER_ADMIN: ("vacd",), SUPPORT: ("vac",), FINANCE: ("v",)},
    "classrooms.teacherinvitation": {SUPER_ADMIN: ("vacd",), SUPPORT: ("vac",)},
    "classrooms.classroom": {SUPER_ADMIN: ("vacd",), SUPPORT: ("vac",)},
    # Réglages et référentiels (WAD14)
    "core.platformsettings": {SUPER_ADMIN: ("vac",), SUPPORT: ("v",)},
    "core.announcement": {SUPER_ADMIN: ("vac",), SUPPORT: ("v",)},
    "referentials.paymentnetwork": {SUPER_ADMIN: ("vac",), SUPPORT: ("v",), FINANCE: ("v",)},
    **{
        f"referentials.{model}": {SUPER_ADMIN: ("vac",), SUPPORT: ("v",)} for model in _REFERENTIALS
    },
    **{
        f"mail.{model}": {SUPER_ADMIN: ("vac",), SUPPORT: ("v",)}
        for model in ("mail", "template", "layout")
    },
    # Équipe (WAD13)
    "accounts.staffmember": {SUPER_ADMIN: ("vacd",)},
    "auth.group": {SUPER_ADMIN: ("vacd",)},
    "otp_totp.totpdevice": {SUPER_ADMIN: ("vd",)},
    # Système : journal, télémétrie, tâches planifiées, thème versionné (fixture)
    "core.auditlog": {SUPER_ADMIN: ("v",)},
    "analytics.trackingevent": {SUPER_ADMIN: ("v",)},
    "analytics.dailyaggregatedstat": {SUPER_ADMIN: ("v",)},
    "notifications.notification": {SUPER_ADMIN: ("v",)},
    "file.file": {SUPER_ADMIN: ("v",)},
    **{f"django_celery_beat.{model}": {SUPER_ADMIN: ("vacd",)} for model in _CELERY_BEAT},
    **{
        f"django_celery_results.{model}": {SUPER_ADMIN: ("v",)}
        for model in ("taskresult", "groupresult")
    },
    "admin_interface.theme": {SUPER_ADMIN: ("v",)},
    # Impact Tracker (WAD02-WAD05)
    "impact.kpidefinition": {SUPER_ADMIN: ("v",), FINANCE: ("v",)},
    "impact.impactreport": {
        SUPER_ADMIN: ("v", "enter_kpi_value", "submit_impact_report"),
        FINANCE: ("v", "enter_kpi_value", "submit_impact_report"),
    },
}


def codenames(model: str, tokens: tuple[str, ...]) -> list[str]:
    """`("vc", "resend")` pour `accounts.user` → `["view_user", "change_user", "resend"]`."""
    name = model.split(".")[1]
    letters, *custom = tokens
    return [f"{ACTIONS[letter]}_{name}" for letter in letters] + custom


def expected_permissions() -> dict[str, set[tuple[str, str, str]]]:
    """Groupe → `(app_label, model, codename)` attendus, que le modèle existe ou non."""
    expected = {group: set() for group in STAFF_GROUPS}
    for model, grants in PERMISSIONS.items():
        app_label, name = model.split(".")
        for group, tokens in grants.items():
            expected[group].update((app_label, name, c) for c in codenames(model, tokens))
    return expected


def setup_staff_groups() -> dict[str, int]:
    """Crée les 4 groupes et leur donne exactement les permissions existantes de la matrice. Idempotente."""
    from django.contrib.auth.models import Group, Permission

    applied = {}
    for group_name, triples in expected_permissions().items():
        group, _ = Group.objects.get_or_create(name=group_name)
        lookup = Q(pk__in=[])
        for app_label, model, codename in triples:
            lookup |= Q(
                content_type__app_label=app_label, content_type__model=model, codename=codename
            )
        permissions = list(Permission.objects.filter(lookup))
        group.permissions.set(permissions)
        applied[group_name] = len(permissions)
    return applied
