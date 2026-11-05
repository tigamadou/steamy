# Chantier `methode-chantiers` · Mise en place de la méthode des chantiers parallèles

Met en place l'[ADR 0007](../../adr/0007-methode-chantiers-paralleles.md) : environnements d'agent en Docker, tests
plus rapides, kit générique (skill `chantier`, agents, superviseur), puis un chantier pilote qui valide le tout.

L'orchestrateur n'existant pas encore, ces plans s'exécutent **en session**, dans l'ordre du graphe. Les lots 1 et 3
peuvent tourner en même temps (fichiers disjoints).

## Graphe

```
development
   └─ feature/methode-chantiers
        ├─ lot 1 · Environnement Docker des agents ──┬──► lot 2 · Tests plus rapides ──┐
        └─ lot 3 · Kit générique ────────────────────┴─────────────────────────────────┴──► lot 4 · Chantier pilote
```

| Lot | Plan | Branche | Dépend de | Statut |
| --- | --- | --- | --- | --- |
| 1 | [Environnement Docker des agents](1-environnement-docker.md) | `feature/methode-chantiers-1` | — | ⬜ à faire |
| 2 | [Tests plus rapides et CI alignée](2-tests-rapides.md) | `feature/methode-chantiers-2` | 1 | ⬜ à faire |
| 3 | [Kit générique](3-kit-generique.md) | `feature/methode-chantiers-3` | — | ⬜ à faire |
| 4 | [Chantier pilote](4-chantier-pilote.md) | selon le chantier choisi | 1, 2, 3 | ⬜ à faire |

## Fusion

- Chaque lot passe par une PR vers `feature/methode-chantiers` (CI verte requise), fusionnée en merge commit.
- Ordre : 1 et 3 (dans n'importe quel ordre), puis 2, puis la PR `feature/methode-chantiers` → `development`
  avant de lancer le pilote, qui part de `development` à jour.
- Points de fusion connus entre 1 et 3 : la ligne `include make/chantier.mk` du `Makefile` (ajoutée par le lot 3,
  `Makefile` détenu par le lot 1) et `.superpowers/` dans `.gitignore` (lot 1).

## Règles

Celles de l'ADR 0007 (§ 8 tests, § 9 gardes-fous) : tout en Docker, rien sur l'hôte hors `docker`, `make`, `git`,
`gh` ; un commit par tâche, Conventional Commits d'une ligne en français, aucune mention de co-auteur IA ; jamais
de commit sur `development` ni `main`.
