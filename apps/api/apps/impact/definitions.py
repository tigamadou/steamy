"""
Les 30 indicateurs de l'Impact Tracker (format du rapport trimestriel des bailleurs, maquette WAD02-WAD05), chargés
par la migration `0002_kpi_definitions`. Inclusion alimentée par le profil (D75) ; « institutions » = écoles sous
offre active (§8.18).

Tuple : code, groupe, libellé, unité, source, cible, fréquence, indicateur de base, mode de calcul.
"""

_NEW = "inscrits dans la période (compte validé : hors inscriptions en attente de consentement)"
_INCLUSION = {
    "35": (
        "≤ 35 ans",
        "Âge connu par la date de naissance du profil : les apprenants (10-17 ans) ; les parents et enseignants "
        "n'ont pas de date de naissance et ne sont pas comptés",
    ),
    "f": ("Femmes", "Genre « femme » déclaré dans le profil (apprenant ou parent)"),
    "f35": ("Femmes ≤ 35 ans", "Apprenantes (genre « femme », 10-17 ans)"),
    "rural": ("Zone rurale", "Localité du profil qualifiée « rurale » (D75)"),
    "hand": ("Situation de handicap", "Handicap déclaré dans le profil (D6, D75)"),
}


def _demography(prefix: str, group: str, who: str) -> list[tuple]:
    rows = [
        (
            prefix,
            group,
            f"Nouveaux {who}",
            "count",
            "auto",
            200,
            "month",
            None,
            f"Nombre de {who} {_NEW}",
        )
    ]
    for suffix, (label, rule) in _INCLUSION.items():
        rows.append(
            (
                f"{prefix}_{suffix}",
                group,
                label,
                "count",
                "auto",
                None,
                "month",
                prefix,
                f"Parmi les nouveaux {who} : {rule[0].lower()}{rule[1:]}",
            )
        )
    rows.append(
        (
            f"{prefix}_active",
            group,
            "Connectés ≥ 1 fois",
            "count",
            "auto",
            None,
            "month",
            None,
            f"{who.capitalize()} dont la dernière connexion tombe dans la période",
        )
    )
    return rows


KPIS = [
    # Ventes & finance
    (
        "ventes",
        "sales",
        "Ventes réalisées",
        "fcfa",
        "auto",
        50000,
        "month",
        None,
        "Montant des commandes payées dans la période (FCFA)",
    ),
    (
        "fin_montant",
        "sales",
        "Financements reçus",
        "fcfa",
        "manual",
        None,
        "quarter",
        None,
        "Saisi",
    ),
    (
        "fin_hors",
        "sales",
        "Financement hors programme ?",
        "yes_no",
        "manual",
        None,
        "quarter",
        None,
        "Saisi",
    ),
    (
        "fin_first",
        "sales",
        "Financeurs inédits (1ʳᵉ fois) ?",
        "yes_no",
        "manual",
        None,
        "quarter",
        None,
        "Saisi",
    ),
    ("fin_who", "sales", "Nouveaux financeurs", "text", "manual", None, "quarter", None, "Saisi"),
    # Utilisateurs et apprenants (inclusion, D75)
    *_demography("nu", "users", "utilisateurs"),
    *_demography("na", "learners", "apprenants"),
    # Écosystème
    (
        "educ",
        "ecosystem",
        "Nouveaux éducateurs",
        "count",
        "auto",
        None,
        "month",
        None,
        f"Nombre d'enseignants {_NEW}",
    ),
    (
        "inst",
        "ecosystem",
        "Nouvelles institutions",
        "count",
        "auto",
        None,
        "month",
        None,
        "Écoles créées dans la période dont l'offre est active (valable au moins jusqu'au début de la période)",
    ),
    # Impact pédagogique
    (
        "complete",
        "learning",
        "Parcours complétés",
        "count",
        "auto",
        None,
        "quarter",
        None,
        "Inscriptions terminées dans la période",
    ),
    (
        "complete_conf",
        "learning",
        "Complétés + compétences confirmées",
        "count",
        "auto",
        None,
        "quarter",
        None,
        "Inscriptions terminées dans la période, toutes les sommatives réussies (certificat délivré)",
    ),
    # Produit & innovation
    (
        "prod",
        "product",
        "Nouveaux produits / fonctionnalités ?",
        "yes_no",
        "manual",
        None,
        "quarter",
        None,
        "Saisi",
    ),
    ("prod_which", "product", "Lesquels ?", "text", "manual", None, "quarter", None, "Saisi"),
    (
        "prod_vuln",
        "product",
        "… destinés aux publics vulnérables ?",
        "yes_no",
        "manual",
        None,
        "quarter",
        None,
        "Saisi",
    ),
    ("prod_vuln_which", "product", "Lesquels ?", "text", "manual", None, "quarter", None, "Saisi"),
    # Satisfaction
    (
        "nps",
        "satisfaction",
        "Recommandation du programme (1-10)",
        "score",
        "manual",
        8,
        "quarter",
        None,
        "Note moyenne de recommandation, saisie",
    ),
    # Emploi
    (
        "emp",
        "employment",
        "Employés à temps plein",
        "count",
        "manual",
        None,
        "quarter",
        None,
        "Saisi",
    ),
    (
        "emp_f",
        "employment",
        "Employées femmes à temps plein",
        "count",
        "manual",
        None,
        "quarter",
        "emp",
        "Saisi",
    ),
]


def load_definitions(KpiDefinition) -> None:
    """Crée ou met à jour les 30 définitions (idempotent), les indicateurs de base d'abord."""
    by_code = {}
    for order, (
        code,
        group,
        label,
        unit,
        source,
        target,
        periodicity,
        base,
        calculation,
    ) in enumerate(KPIS):
        by_code[code], _ = KpiDefinition.objects.update_or_create(
            code=code,
            defaults={
                "group": group,
                "label": label,
                "unit": unit,
                "source": source,
                "target": target,
                "periodicity": periodicity,
                "base": by_code[base] if base else None,
                "calculation": calculation,
                "order": order,
            },
        )
