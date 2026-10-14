# Steamy

Monorepo de Steamy, plateforme e-learning de robotique/STEM pour les 10–17 ans en Afrique francophone.

## Structure

| Dossier | Contenu |
| --- | --- |
| `apps/api/` | API Django + DRF (PostgreSQL, Celery, Redis, stockage S3 RustFS) |
| `apps/web/` | Front Next.js *(à venir)* |
| `packages/` | Code partagé, dont le client d'API typé généré depuis l'OpenAPI *(à venir)* |
| `design/` | Prototype de design (canvas React statique, 172 écrans) — référence visuelle |
| `docs/` | Spécifications et plans |
| `infra/` | Docker Compose, configuration de déploiement *(à venir)* |

## Démarrage local

Tous les services tournent dans Docker. Prérequis : Docker Desktop et `make`.

```bash
make up      # démarre la stack
make down    # l'arrête
make help    # liste toutes les commandes
```

*(Les cibles `make` arrivent avec l'intégration Docker de l'étape suivante.)*

## Déploiement

| Déclencheur GitHub | Environnement |
| --- | --- |
| Publication d'une **pre-release** | staging |
| Publication d'une **release** | production |
