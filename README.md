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
make up      # démarre la stack (premier build : quelques minutes)
make seed    # charge le compte admin et les gabarits d'e-mails
make help    # liste toutes les commandes
```

| Service | URL |
| --- | --- |
| API | http://localhost:8000/api/ — docs : `/api/docs/` |
| Admin Django | http://localhost:8000/admin/ |
| Console RustFS (S3) | http://localhost:9001 — `rustfsadmin` / `rustfsadmin` |
| Mailpit (e-mails capturés) | http://localhost:8025 |
| PostgreSQL | `localhost:5432` — `steamy` / `steamy` |

Le code de `apps/api` est monté dans les conteneurs : le serveur Django recharge à chaud.
Après une modification de `requirements.txt`, lancer `make build`.

## Déploiement

| Déclencheur GitHub | Environnement |
| --- | --- |
| Publication d'une **pre-release** | staging |
| Publication d'une **release** | production |
