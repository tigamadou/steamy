# Valeurs du projet pour le skill `chantier`

Réponses de ce projet au [contrat](skills/chantier/contrat.md) : une section par clé. Les profils d'environnement, la
mémoire mesurée et le budget vivent dans [`docs/infra/agents.md`](../docs/infra/agents.md) et ne sont **jamais
recopiés ici**.

## docker

Toutes les commandes de build, test, lint et génération passent par des cibles `make` qui lancent des conteneurs.
Sur l'hôte : `docker`, `make`, `git`, `gh` seulement.

## agent_env

- `make agent-up LOT=<lot> PROFIL=web|api|complet BASE=<branche>`, `make agent-down LOT=<lot>`,
  `make agent-status`.
- Worktree `../steamy-wt-<lot>` ; projet Compose `steamy-ag-<lot>` ; variable `AGENT_LOT` posée dans les conteneurs
  de l'agent.
- Profils : voir `docs/infra/agents.md`.

## isolation

- Bases `steamy_<lot>` et `test_steamy_<lot>[_gwN]` ; buckets, bases Redis et boîte d'emails propres au lot (détail
  dans `docs/infra/agents.md`).
- Garde-fou : `apps/api/conftest.py` refuse de lancer pytest sur une base qui n'est pas la base de test de l'agent.

## cibles

Toutes lancées depuis le worktree : `make test-cible T=<chemins>`, `make coverage-diff BASE=<branche>`, `make lint`,
`make typecheck`, `make generate`, `make check-generated`, `make migrations-check`, `make e2e-fixtures`, `make e2e`.

Cibles du chantier : labels `make chantier-labels SLUG=<slug> [LOTS="a b"]` ; périmètre
`make chantier-perimetre LOT=<lot> PLAN=<plan> BASE=<branche>` ; tests des scripts `make chantier-test`.

## branches

- Intégration : `development`. Protégées : `main` et `development`.
- Nommage : `feature/<slug>`, `feature/<slug>-<lot>`, `fix/<slug>-<sujet>`.
- PR de lot vers `feature/<slug>`, fusionnée en **merge commit** par le lead dev ; PR finale vers `development`,
  **jamais fusionnée par un agent**.
- Commits : une ligne, Conventional Commits en français, par exemple `feat(web): …`, `fix(api): …`, `test(api): …`,
  `docs: …` (voir [CONTRIBUTING.md](../CONTRIBUTING.md)) ; aucune mention d'IA, aucun trailer.

## ci

Check requis `ci-ok`, déclenché sur toute PR. `gh` authentifié (`gh auth status`).

## budget

Profils, mémoire mesurée et budget agents : voir `docs/infra/agents.md` (aucune valeur recopiée ici).
Jeton e2e : 1 e2e complet à la fois.

## generes_migrations

- Fichiers générés, **jamais fusionnés à la main** : `apps/api/openapi.yaml` et
  `packages/api-client/src/schema.d.ts`. En conflit : prendre un côté, `make generate`, puis `make check-generated`
  après chaque fusion.
- Migrations : les modèles et migrations d'une app appartiennent à **un seul lot actif** ; un modèle partagé remonte
  dans un lot amont. `make migrations-check` à chaque fusion.

## taches_planifiees

Application de bureau Claude ouverte, machine éveillée, Docker lancé.

## Plans et labels

- Plans : `docs/plans/<slug>/<n>-<lot>.md` + `README.md` du chantier ; spec dans `docs/adr/` (ou
  `docs/plans/<slug>/` pour la section « Organisation du travail »).
- Labels : `chantier:<slug>`, `lot:<id>`, `role:dev`, `role:testeur`, `role:planificateur`, `type:lot`, `type:ci`,
  `type:test`, `type:revue`, `etat:pret`, `etat:en-cours`, `etat:en-revue`, `etat:a-corriger`, `etat:bloque`,
  `revue:ok`.
