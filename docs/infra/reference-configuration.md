# Référence de configuration

## Variables de l'API (Django)

Elles sont lues dans [`apps/api/project/settings.py`](../../apps/api/project/settings.py).
En staging et en prod, le chart les injecte dans api, worker, beat et migrate.

| Variable | Obligatoire | Local | Staging / prod (source) | Rôle |
| --- | --- | --- | --- | --- |
| `DJANGO_ENV` | oui | `dev` | `staging` / `production` (values) | Active le mode déployé : `DEBUG` désactivé, cookies sécurisés, base par `DATABASE_URL` |
| `SECRET_KEY` | **oui** en déployé | factice | secret GitHub `SECRET_KEY` | Signature des sessions, des jetons, du CSRF |
| `ALLOWED_HOSTS` | **oui** en déployé | `localhost,127.0.0.1,api` | `<hosts.api>,steamy-api,localhost` (chart) | Domaines acceptés |
| `WEB_URL` | non | `http://localhost:3000` | `https://<hosts.web>` (chart) | Liens dans les e-mails. Valeur par défaut du CORS et du CSRF |
| `CORS_ALLOWED_ORIGINS` | non | = `WEB_URL` | = `WEB_URL` | Origines autorisées à appeler l'API **avec cookies** (liste séparée par des virgules) |
| `CSRF_TRUSTED_ORIGINS` | non | = `WEB_URL` | `https://<web>,https://<api>` (chart) | Origines autorisées pour les requêtes protégées par CSRF |
| `COOKIE_DOMAIN` | non | — | `<hosts.cookieDomain>` (values) | Domaine parent des cookies `sessionid` et `csrftoken` |
| `SECURE_HSTS_SECONDS` | non | — | `0` | En-tête HSTS. À activer une fois le TLS éprouvé |
| `DATABASE_URL` | oui en déployé | — | Secret `steamy-db-app` (généré par CloudNativePG) | Connexion PostgreSQL, TLS exigé |
| `POSTGRES_DB/USER/PASSWORD/HOST` | oui en local | `steamy`… | — | Connexion PostgreSQL locale |
| `REDIS_URL` | oui | `redis://redis:6379/1` | `redis://steamy-redis:6379/1` | Cache (dont celui des sessions, stockées en base : `cached_db`) |
| `CELERY_BROKER_URL` | oui | `…/0` | `…/0` | File de tâches Celery |
| `AWS_S3_ENDPOINT_URL` | oui | `http://rustfs:9000` | `http://steamy-rustfs:9000` | Stockage des médias |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | oui | factices | secrets `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` | Identifiants RustFS |
| `AWS_STORAGE_BUCKET_NAME` | oui | `steamy-media` | `steamy-media` | Bucket des médias |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USE_TLS` | non | Mailpit | values `email.*` | SMTP |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | non | factices | secrets du même nom | Identifiants SMTP |
| `DEFAULT_FROM_EMAIL` | non | `no-reply@steamy.local` | values `email.from` | Expéditeur |
| `PAYMENTS_KKIAPAY_SECRET` / `PAYMENTS_FEDAPAY_SECRET` | non | — | secrets du même nom | Vérification des webhooks de paiement |
| `SMS_PROVIDER` | non | `fake` | `twilio` (values `sms.provider`) | Fournisseur SMS ([ADR 0002](../adr/0002-fournisseur-sms.md)). `fake` envoie chaque SMS comme e-mail à `<e164>@sms.test` (Mailpit) et **refuse de fonctionner** en staging et en prod. Défaut : `fake` en local et CI, `twilio` en déployé |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | oui si `twilio` | — | secrets du même nom | Identifiants de l'API Twilio. **Jamais dans le dépôt**. En staging : identifiants de test Twilio (aucun SMS réel, numéros magiques) ou sous-compte plafonné |
| `TWILIO_SENDER` | non | — | values `sms.sender` (`STEAMY`) | Expéditeur : identifiant alphanumérique enregistré chez Twilio, ou numéro Twilio |
| `TWILIO_STATUS_CALLBACK_URL` | non | — | `https://<hosts.api>/api/notifications/sms/status/` (chart) | Webhook des accusés de réception, signé par Twilio (`X-Twilio-Signature`). Vide : pas d'accusés |
| `ALLOW_API_DOCS` | non | `true` | — (désactivé) | Expose `/api/docs/` et `/api/redoc/` |
| `GUNICORN_WORKERS` | non | — | values `api.gunicornWorkers` | Processus gunicorn par pod |
| `GUNICORN_TIMEOUT` | non | — | `60` | Délai max d'une requête (s) |

D'autres variables existent dans `settings.py` sans être utilisées par l'infra : `BUCKETEER_*`, `SMTP_*`,
`LOG_*`, `CELERY_TASK_*`. Ce sont des héritages de l'ancien hébergement.

## Variables du front (Next.js)

| Variable | Local | Staging / prod | Rôle |
| --- | --- | --- | --- |
| `API_URL` | `http://api:8000` | `http://steamy-api` | Appels **serveur** → API (réseau interne) |
| `PUBLIC_API_URL` | `http://localhost:8000` | `https://<hosts.api>` | Appels **navigateur** → API, servis au client par `/runtime-config` |

Les deux sont lues **à l'exécution**, jamais au build : la même image est promue de staging à prod.
N'utiliser `NEXT_PUBLIC_*` que pour des valeurs identiques dans tous les environnements.

## GitHub (par environnement)

Les secrets et variables sont décrits dans [Mise en place](mise-en-place.md#7-github). Correspondance avec ce
que reçoit le serveur :

| GitHub | Transmis au serveur sous le nom | Utilisé par |
| --- | --- | --- |
| `SECRET_KEY` | `SECRET_KEY` | API |
| `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | API, RustFS, sauvegarde des médias |
| `WASABI_ACCESS_KEY_ID` / `WASABI_SECRET_ACCESS_KEY` | idem | Sauvegardes PostgreSQL et médias |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | idem | API (optionnel) |
| `PAYMENTS_*` | idem | API (optionnel) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | idem | API : envoi des SMS (OTP, liens de consentement et de paiement). Sans eux, aucun SMS ne part |
| `GHCR_PULL_USER` (variable) / `GHCR_PULL_TOKEN` | idem | Serveur : téléchargement des images et charts. **Non transmis à l'application** |
| `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_HOST` | — | CI uniquement (connexion SSH) |
| `API_URL` (variable) | — | CI : contrôle de santé après déploiement |
| `APP_URL` (variable) | — | Lien affiché dans GitHub sur le déploiement |

Sur le serveur, ces secrets deviennent le Secret Kubernetes `steamy-secrets` (et `ghcr-pull` pour GHCR).
Il est recréé à chaque déploiement.

## Valeurs Helm

### `steamy`

| Clé | Défaut | Rôle |
| --- | --- | --- |
| `environment` | `staging` | `DJANGO_ENV`, libellés |
| `image.registry` | `ghcr.io/tigamadou` | Registre des images |
| `image.tag` | — (**obligatoire**) | Version déployée, fournie par `steamy-deploy` |
| `hosts.web` / `hosts.api` / `hosts.cookieDomain` | — (**obligatoires**) | Domaines (values-<env>) |
| `secretsChecksum` | — | Empreinte des secrets, calculée par `steamy-deploy` |
| `ingress.className` / `ingress.clusterIssuer` | `traefik` / `letsencrypt` | Ingress et TLS |
| `platform.databaseSecret` | `steamy-db-app` | Secret CNPG contenant l'URI de la base |
| `platform.redisHost` | `steamy-redis` | Hôte Redis |
| `platform.s3Endpoint` / `platform.s3Bucket` | `http://steamy-rustfs:9000` / `steamy-media` | Stockage |
| `email.host` / `port` / `useTls` / `from` | `""` / `587` / `true` / `no-reply@steamy.example` | SMTP |
| `api.replicas` / `api.gunicornWorkers` / `api.resources` | 1 / 2 / voir [Kubernetes](kubernetes.md) | — |
| `web.replicas` / `web.resources` | 1 | — |
| `worker.replicas` / `worker.concurrency` / `worker.resources` | 1 / 2 | — |
| `beat.resources` | — | Toujours 1 réplique |
| `migrate.activeDeadlineSeconds` | 600 | Durée max des migrations |

### `steamy-platform`

| Clé | Défaut | Rôle |
| --- | --- | --- |
| `environment` | `staging` | Préfixe des sauvegardes dans Wasabi |
| `postgres.image` / `instances` / `storage` / `resources` | `postgresql:17` / 1 / 10 Gi | PostgreSQL |
| `postgres.serverName` | `steamy-db` | Dossier des sauvegardes dans Wasabi. Ne change qu'après une reconstruction |
| `postgres.restore.enabled` | `false` | Reconstruit la base depuis Wasabi **à sa création** (sans effet sur une base existante) |
| `postgres.restore.fromServerName` | `steamy-db` | Dossier de sauvegarde à relire. Doit différer de `serverName` |
| `postgres.restore.targetTime` | `""` | Instant de restauration (vide = dernier état archivé) |
| `redis.image` / `storage` | `redis:7.4.9` / 1 Gi | Redis |
| `rustfs.image` / `storage` / `bucket` | `rustfs:1.0.1` / 20 Gi / `steamy-media` | RustFS |
| `secretsChecksum` | — | Empreinte des identifiants RustFS, calculée par `steamy-deploy` |
| `backups.wasabi.region` / `endpoint` / `bucket` | `eu-west-2` / … / `steamy-backups` | **À remplacer** |
| `backups.postgresRetention` | `90d` | Rétention des sauvegardes PostgreSQL |
| `backups.postgresSchedule` | `0 0 2 * * *` | Sauvegarde complète (format cron à 6 champs, avec les secondes) |
| `backups.mediaSchedule` | `0 3 * * *` | Copie des médias (cron standard) |
| `backups.rcloneImage` | `rclone/rclone:1.75.2` | Image rclone |

## Fichiers sur le serveur

| Chemin | Contenu |
| --- | --- |
| `/etc/rancher/k3s/k3s.yaml` | kubeconfig administrateur (root) |
| `/home/deploy/.kube/config` | kubeconfig du compte `deploy` |
| `/home/deploy/.ssh/authorized_keys` | Clé CI avec commande forcée (géré par Ansible) |
| `/usr/local/bin/steamy-deploy` | Script de déploiement |
| `/etc/steamy/deploy.env` | `STEAMY_ENV`, `GHCR_OWNER`, `NAMESPACE` |
| `/var/lock/steamy-deploy.lock` | Verrou de déploiement |
| `/var/lib/rancher/k3s/storage/` | **Volumes de données** (PostgreSQL, Redis, RustFS) |
