# Steamy — instructions pour les outils IA

Plateforme e-learning de robotique et STEM pour les 10–17 ans en Afrique francophone. Monorepo : voir
[README.md](README.md).

## Stack

| Couche | Technologie |
| --- | --- |
| API | Django + DRF, PostgreSQL, Celery + Redis, stockage S3 (RustFS) |
| Front | Next.js 16 (App Router), TypeScript, Tailwind 4 |
| Contrat | OpenAPI **généré** (`apps/api/openapi.yaml`) et client typé `packages/api-client` |
| Gestionnaire de paquets | pnpm (dans les conteneurs) |
| Exécution | Docker Compose, tout passe par `make` |

## Sources de vérité

1. **Le code fait foi** : en cas de conflit doc ↔ code, corriger la doc dans le même changement.
2. Décisions : `docs/adr/` (méthode des chantiers : [ADR 0007](docs/adr/0007-methode-chantiers-paralleles.md)).
3. Spécification : `docs/SPEC-TECHNIQUE.md` (modèle, invariants, API) et les specs d'écrans de `docs/`.
4. Plans : `docs/plans/` ; tests et cahier de recette : `docs/tests/`.
5. Infrastructure : `docs/infra/`.

## Règles de test (ADR 0007, § 8)

Elles s'appliquent à **tout test**, présent et futur.

- **API** : pytest-django, base de test créée par Django (`test_…`), jamais une base de dev. Garde-fou dans
  `apps/api/conftest.py` : avec `AGENT_LOT` posé, la base doit être `test_steamy_<lot>[_gwN]` ; sans,
  `test_steamy[_gwN]`.
- **Aucun mock de la base ni de l'ORM** ; seuls les services externes se simulent (faux SMS, faux paiement, Vimeo,
  DGI, SMTP réel).
- **Fabriques** factory_boy + Faker (`apps/<app>/tests/factories.py`) ; ajouter une fabrique plutôt que dupliquer des
  créations dans les tests.
- **Front** : Vitest (données en mémoire) ; e2e sur fixtures contre la fausse API typée depuis `openapi.yaml` ;
  parcours de bout en bout sur la vraie stack.
- **Ne jamais modifier le code de production pour faire passer un test** : s'arrêter et le signaler.
- **Couverture** : 100 % du code modifié (diff-cover), comparé à la base de la PR. Pendant le développement : tests
  ciblés et `coverage-diff` ; la suite complète tourne en CI.
- **Rapidité** : pytest parallélisé (xdist, une base par processus) ; Playwright en workers.
- **Tout en Docker**, y compris les e2e ; pas de `retry` ni de `force: true` pour masquer une instabilité (cause
  racine).

## Git

- Gitflow décrit dans [CONTRIBUTING.md](CONTRIBUTING.md) (ne pas le recopier) : branches `feature/` et `fix/`,
  **jamais de commit direct sur `main` ni `development`**, tout passe par une PR avec `ci-ok` vert.
- Commits : **une ligne**, Conventional Commits, en français ; **aucune mention d'IA ni trailer de co-auteur**.
- Pas de commit sans demande explicite, sauf exécution automatisée d'un plan (un commit par tâche sur la branche du
  lot). Jamais `--force`, jamais `--no-verify`.

## Tout en Docker

Sur l'hôte, **uniquement `docker`, `make`, `git` et `gh`**. Jamais `pnpm`, `node`, `python`, `pytest` ni `playwright`
sur l'hôte : s'il manque une cible `make`, le signaler.

## Actions à risque : toujours demander avant

Reset de base ou de volumes, modification de `.env`, de `compose*.yml`, des Dockerfile ou du `Makefile` hors d'un
plan validé, release ou déploiement, toute opération sur la production, toute connexion SSH à un serveur.

## Chantiers

Tout chantier non trivial (plusieurs zones du code ou plus d'une session) suit le skill **`chantier`**
(`.claude/skills/chantier/`), qui lit les valeurs du projet dans `.claude/chantier.projet.md`.
