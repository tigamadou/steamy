# Steamy

Monorepo de Steamy, plateforme e-learning de robotique/STEM pour les 10–17 ans en Afrique francophone.

## Structure

| Dossier | Contenu |
| --- | --- |
| `apps/api/` | API Django + DRF (PostgreSQL, Celery, Redis, stockage S3 RustFS) |
| `apps/web/` | Front Next.js 16 (App Router, TypeScript, Tailwind 4 + tokens du DS) |
| `packages/api-client/` | Client d'API typé, généré depuis `apps/api/openapi.yaml` |
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
| Front | http://localhost:3000 |
| API | http://localhost:8000/api/ — docs : `/api/docs/` |
| Admin Django | http://localhost:8000/admin/ |
| Console RustFS (S3) | http://localhost:9001 — `rustfsadmin` / `rustfsadmin` |
| Mailpit (e-mails capturés) | http://localhost:8025 |
| PostgreSQL | `localhost:5432` — `steamy` / `steamy` |

Le code est monté dans les conteneurs : Django et Next rechargent à chaud.
Après une modification de `requirements.txt`, lancer `make build`.

### Contrat front/back

`apps/api/openapi.yaml` (généré par Django) est la source de vérité des types du front.
Après toute modification d'un serializer ou d'une vue : `make openapi`, puis committer
`openapi.yaml` et `packages/api-client/src/schema.d.ts`. La CI vérifie qu'ils sont à jour.

## Déploiement

| Déclencheur GitHub | Environnement |
| --- | --- |
| Publication d'une **pre-release** | staging |
| Publication d'une **release** | production |
