"""Valeurs initiales des référentiels, posées par la migration `0002_initial_data` (idempotente)."""

COUNTRIES = [
    # code, libellé, drapeau, indicatif, format, numéro national
    ("BJ", "Bénin", "🇧🇯", "229", "XX XX XX XX XX", r"^01[0-9]{8}$"),
    ("TG", "Togo", "🇹🇬", "228", "XX XX XX XX", r"^[0-9]{8}$"),
    ("CI", "Côte d'Ivoire", "🇨🇮", "225", "XX XX XX XX XX", r"^[0-9]{10}$"),
    ("SN", "Sénégal", "🇸🇳", "221", "XX XXX XX XX", r"^[0-9]{9}$"),
    ("BF", "Burkina Faso", "🇧🇫", "226", "XX XX XX XX", r"^[0-9]{8}$"),
    ("NE", "Niger", "🇳🇪", "227", "XX XX XX XX", r"^[0-9]{8}$"),
]

# Réseaux Mobile Money (D76). Bénin activé ; ailleurs, activés quand le prestataire retenu les couvre (S9).
PAYMENT_NETWORKS = [
    ("BJ", "mtn", "MTN Mobile Money", True),
    ("BJ", "moov", "Moov Money", True),
    ("BJ", "celtiis", "Celtiis Cash", True),
    ("TG", "moov", "Moov Money (Flooz)", False),
    ("CI", "orange", "Orange Money", False),
    ("CI", "mtn", "MTN Mobile Money", False),
    ("CI", "moov", "Moov Money", False),
    ("CI", "wave", "Wave", False),
    ("SN", "orange", "Orange Money", False),
    ("SN", "wave", "Wave", False),
    ("BF", "orange", "Orange Money", False),
    ("BF", "moov", "Moov Money", False),
]

# 10-17 ans (D23), dans l'ordre scolaire
SCHOOL_GRADES = [
    ("cm2", "CM2"),
    ("6e", "6ᵉ"),
    ("5e", "5ᵉ"),
    ("4e", "4ᵉ"),
    ("3e", "3ᵉ"),
    ("2nde", "2nde"),
    ("1re", "1ʳᵉ"),
    ("terminale", "Terminale"),
]

GOALS = [
    ("robots", "Construire des robots", "🤖"),
    ("coder", "Apprendre à coder", "💻"),
    ("ia", "Découvrir l'IA", "🧠"),
    ("electronique", "Comprendre l'électronique", "⚡"),
    ("jeu", "Créer un jeu", "🎮"),
    ("challenges", "Concourir aux challenges", "🚀"),
    ("bricoler", "Bricoler chez moi", "🛠"),
    ("domotique", "Domotique", "📡"),
    ("aller-plus-loin", "Aller plus loin que l'école", "🪐"),
    ("creativite", "Créativité numérique", "🎨"),
]

# W14 : 10 avatars (couleurs = jetons du design system)
AVATARS = [
    ("renard", "Renard", "🦊", "cat-mecanique"),
    ("panda", "Panda", "🐼", "cat-ia"),
    ("grenouille", "Grenouille", "🐸", "success-500"),
    ("tigre", "Tigre", "🐯", "amber-500"),
    ("pieuvre", "Pieuvre", "🐙", "cat-code"),
    ("hibou", "Hibou", "🦉", "primary-500"),
    ("dragon", "Dragon", "🐲", "error-500"),
    ("abeille", "Abeille", "🐝", "cat-energie"),
    ("licorne", "Licorne", "🦄", "cat-electronique"),
    ("robot", "Robot", "🤖", "cat-robotique"),
]

# Facultatif (D6) : l'absence de réponse vaut « aucune »
DISABILITIES = [
    ("visuel", "Visuel"),
    ("auditif", "Auditif"),
    ("moteur", "Moteur"),
    ("autre", "Autre"),
]

RELATIONSHIPS = [
    ("mere", "Mère", "Vous êtes sa mère"),
    ("pere", "Père", "Vous êtes son père"),
    ("tuteur", "Tuteur·rice", "Vous êtes son tuteur ou sa tutrice"),
    ("autre", "Autre", "Vous êtes l'adulte responsable"),
]

# WP11
REFUSAL_REASONS = [
    ("trop-jeune", "Mon enfant est trop jeune"),
    ("a-discuter", "Nous en discutons d'abord à la maison"),
    ("non-demande", "Je n'ai pas demandé cette inscription"),
    ("autre", "Autre raison"),
]

# Localités du Bénin, qualifiées urbain / rural (D75) ; complétées dans l'admin
LOCALITIES = [
    ("BJ", "Cotonou", "", "urban"),
    ("BJ", "Porto-Novo", "", "urban"),
    ("BJ", "Abomey-Calavi", "", "urban"),
    ("BJ", "Parakou", "", "urban"),
    ("BJ", "Bohicon", "", "urban"),
    ("BJ", "Abomey", "", "urban"),
    ("BJ", "Ouidah", "", "urban"),
    ("BJ", "Lokossa", "", "urban"),
    ("BJ", "Natitingou", "", "urban"),
    ("BJ", "Djougou", "", "urban"),
    ("BJ", "Kandi", "", "urban"),
    ("BJ", "Sèmè-Podji", "", "urban"),
    ("BJ", "Allada", "", "rural"),
    ("BJ", "Dassa-Zoumè", "", "rural"),
    ("BJ", "Savalou", "", "rural"),
    ("BJ", "Tchaourou", "", "rural"),
    ("BJ", "Zè", "", "rural"),
    ("BJ", "Toffo", "", "rural"),
    ("BJ", "Malanville", "", "rural"),
    ("BJ", "Banikoara", "", "rural"),
]


def load(apps, schema_editor=None):
    """Crée ou met à jour les valeurs initiales (migration de données, relançable)."""
    get = apps.get_model

    Country = get("referentials", "Country")
    for order, (code, label, flag, dial, fmt, regex) in enumerate(COUNTRIES):
        Country.objects.update_or_create(
            code=code,
            defaults={
                "label": label,
                "flag": flag,
                "dial_code": dial,
                "phone_format": fmt,
                "phone_regex": regex,
                "order": order,
            },
        )
    countries = {c.code: c for c in Country.objects.all()}

    PaymentNetwork = get("referentials", "PaymentNetwork")
    for order, (country, code, label, enabled) in enumerate(PAYMENT_NETWORKS):
        PaymentNetwork.objects.update_or_create(
            country=countries[country],
            code=code,
            defaults={"label": label, "enabled": enabled, "order": order},
        )

    simple = {
        "SchoolGrade": SCHOOL_GRADES,
        "Disability": DISABILITIES,
        "RefusalReason": REFUSAL_REASONS,
    }
    for model, rows in simple.items():
        for order, (code, label) in enumerate(rows):
            get("referentials", model).objects.update_or_create(
                code=code, defaults={"label": label, "order": order}
            )
    for order, (code, label, emoji) in enumerate(GOALS):
        get("referentials", "Goal").objects.update_or_create(
            code=code, defaults={"label": label, "emoji": emoji, "order": order}
        )
    for order, (code, label, emoji, color) in enumerate(AVATARS):
        get("referentials", "Avatar").objects.update_or_create(
            code=code, defaults={"label": label, "emoji": emoji, "color": color, "order": order}
        )
    for order, (code, label, parent_label) in enumerate(RELATIONSHIPS):
        get("referentials", "Relationship").objects.update_or_create(
            code=code, defaults={"label": label, "parent_label": parent_label, "order": order}
        )

    Locality = get("referentials", "Locality")
    for country, city, district, area in LOCALITIES:
        Locality.objects.update_or_create(
            country=countries[country], city=city, district=district, defaults={"area_type": area}
        )
