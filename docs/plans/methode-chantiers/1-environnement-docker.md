# 1 · Environnement Docker des agents — Plan d'implémentation

> **Pour les agents d'exécution :** sous-skill requis : `superpowers:executing-plans` (ou `superpowers:subagent-driven-development`). Les étapes utilisent des cases à cocher (`- [ ]`).

> **Exécution :**
> - Chantier `methode-chantiers`, lot `1`. Issue GitHub : sans objet (les plans de mise en place s'exécutent en session, l'orchestrateur n'existe pas encore).
> - Branche du lot : `feature/methode-chantiers-1`, créée depuis `feature/methode-chantiers` (elle-même créée depuis `development`). Base de la PR : `feature/methode-chantiers`.
> - Dépendances : aucune. Profil d'environnement : n/a (ce lot construit les profils ; il s'exécute directement avec la stack principale `make up`).
> - Toutes les commandes `make` se lancent **dans le worktree** du lot.
> - Un commit par tâche est autorisé sur la branche du lot : message d'une seule ligne, Conventional Commits, en français (`feat(infra): …`), décrivant ce qui a été fait comme l'écrirait un humain ; pas de numéro d'issue, pas de trailer, **jamais de mention de co-auteur IA**. Jamais de `--force`, de `--no-verify`, ni de commit sur `development`/`main`.

**Objectif :** donner à chaque agent un environnement Docker isolé et peu coûteux (worktree + conteneurs applicatifs propres, infrastructure partagée), et exposer les cibles `make` standard du contrat de l'ADR 0007, toutes exécutées en conteneur.

**Architecture :** les services d'infrastructure de la stack principale (PostgreSQL, Redis, RustFS, Mailpit) rejoignent un réseau Docker nommé `steamy-infra` ; un agent n'y branche que ses conteneurs applicatifs (api, worker, web), via une surcouche `compose.agent.yml` appliquée sous le projet `steamy-ag-<lot>`. Le script `scripts/agent-env.sh` crée worktree, bases, buckets, numéros Redis et contrôle le budget mémoire ; le `Makefile` route les cibles vers les conteneurs de l'agent quand un fichier `.agent.env` est présent dans le worktree.

**Stack :** Docker Compose v2, Make, bash, PostgreSQL 17, Redis 7, RustFS, Django/pytest, Vitest, Playwright 1.64.1, diff-cover 10.6.0 (déjà dans `apps/api/requirements.txt`).

**Spec :** [`docs/adr/0007-methode-chantiers-paralleles.md`](../../adr/0007-methode-chantiers-paralleles.md), § 2 (points 1 à 4 et 7), § 6, § 8, « Précisions ».

## Avancement

Statut : ✅ terminé

- [x] **1.1** Réseau d'infrastructure partagé et nom de projet · `compose.yml`, `compose.e2e.yml`
  - [x] Réseau `steamy-infra`, `name: steamy`, services d'infra attachés
  - [x] Stack e2e isolée (réseau et image web par lot)
- [x] **1.2** Surcouche `compose.agent.yml`
  - [x] Services api, api-migrate, worker, web de l'agent, sans port
  - [x] Variables d'isolation (`AGENT_LOT`, base, Redis, bucket)
- [x] **1.3** Script `scripts/agent-env.sh` et cibles `agent-*`
  - [x] Préalables, lot valide, trap d'échec, worktree
  - [x] Base, buckets, numéros Redis, `.agent.env`
  - [x] Budget mémoire, `down` conservatoire, `status`
- [x] **1.4** Cibles standard : `lint`, `typecheck`, `generate`, `check-generated`, `migrations-check`, `test-cible`
  - [x] `scripts/cibles.sh` (routage et garde par profil)
  - [x] Makefile routé vers l'agent, cibles existantes conservées
- [x] **1.5** `make coverage-diff BASE=…`
  - [x] `scripts/coverage-diff.sh` (tests touchés + diff-cover)
  - [x] `coverage-api`/`coverage-web` paramétrés par `BASE`
- [x] **1.6** `make e2e-fixtures` en conteneur et `make e2e` par lot
- [x] **1.7** Mesures mémoire et `docs/infra/agents.md`
- [x] **1.8** Vérification du lot

> Reprise : (à renseigner si la session est interrompue)

### Arbitrages d'exécution

- **Image Playwright** : Node 26.13 **sans corepack** (le `corepack enable` du service `playwright` existant échouait). `compose.yml` (`playwright-fixtures`) et `compose.e2e.yml` (`playwright`) installent pnpm 10.34.7 par npm. Volumes de dépendances `pw_*` dédiés pour `playwright-fixtures`.
- **Tests API** lancés comme la CI : `DJANGO_ENV=test` et `DEFAULT_FILE_STORAGE` local (`make test-api`, `coverage-api`, `test-cible`, `coverage-diff`) : sous l'env de dev (api.env), un test d'admin et un test d'URL d'image échouent.
- **Jeton e2e** : verrou `e2e.lock` dans le dépôt git commun (pris avant la construction de l'image, rendu en fin de `make e2e` / `e2e-down`), car un contrôle sur les conteneurs laissait passer deux e2e pendant la construction.
- **diff-cover** : image `python:3.11.13-bookworm` (git requis, absent de `steamy-api`), cache pip dans le volume `steamy_pip_cache`, dépôt vide, diff fourni par `--diff-file` découpé par moitié (chemins relatifs à `apps/api` et `apps/web`).
- **Budget** vérifié avant la création du worktree (un refus ne laisse rien derrière). `agent-down` passe `--profile fixtures` pour supprimer aussi les volumes `pw_*` du service `playwright-fixtures`.
- **Mesures** (voir `docs/infra/agents.md` § « Valeurs déclarées ») : MAIN 2 000, web 3 400, api 1 200, complet 6 500, budget 9 910 Mo.
- **e2e complet** (vraie stack, lot `complet`) : 426 passés, 23 en échec (429 sur la connexion), 3 ignorés, en 8 min 30 ; les specs en échec passent seules. Non attribué à l'infrastructure (l'ancien service `playwright` ne démarrait pas sur cette image, pas de base de comparaison).

## Fichiers du lot (exclusifs)

- `compose.yml`, `compose.e2e.yml`, `compose.agent.yml` (nouveau)
- `Makefile`, `.gitignore`
- `scripts/agent-env.sh`, `scripts/cibles.sh`, `scripts/coverage-diff.sh` (nouveaux)
- `infra/dev/*.env` (si une variable d'agent commune y a sa place)
- `apps/web/Dockerfile`, `apps/api/Dockerfile` (seulement si une mesure l'impose ; sinon intacts)
- `docs/infra/agents.md` (nouveau), `docs/infra/README.md` (une ligne dans le tableau), `docs/plans/methode-chantiers/1-environnement-docker.md` (case à cocher)

**Lecture seule :** `.github/workflows/ci.yml` (plan 2), `apps/api/conftest.py`, `apps/api/pytest.ini`, `apps/api/requirements.txt` (plan 2), `.claude/**`, `CLAUDE.md`, `scripts/chantier/**` (plan 3), `apps/web/playwright*.ts`, `apps/web/e2e/**`, tout le code applicatif. **Besoin d'y toucher → s'arrêter et le signaler dans l'issue** (ici : à l'utilisateur).

## Contraintes globales

Reprises de l'ADR 0007 :

- **Tout en Docker** : l'hôte n'exécute que `docker`, `make`, `git` et `gh`. Jamais `pnpm`, `node`, `python`, `pytest`, `playwright`, `psql` sur l'hôte. Un besoin hors de cette liste = il manque une cible `make`.
- **Services d'infrastructure jamais dupliqués** par agent (hors e2e sur la vraie stack, qui a sa propre stack jetable) ; **aucun port publié** par les environnements d'agent.
- **Isolation par agent** : base `steamy_<lot>`, tests `test_steamy_<lot>[_gwN]` (Django préfixe `test_` à `POSTGRES_DB`, pytest-xdist ajoute `_gwN`), buckets `steamy-<lot>` et `steamy-<lot>-test`, numéros de base Redis dédiés. `AGENT_LOT` posé dans **tous** les conteneurs de l'agent.
- **Règles de test** : API pytest-django sur base `test_…` jamais une base de dev ; **aucun mock de la base ni de l'ORM** ; factory_boy + Faker ; **ne jamais modifier le code de production pour faire passer un test** (s'arrêter et signaler) ; 100 % du code modifié (diff-cover) comparé à la **base de la PR**, jamais `origin/development` en dur ; pendant le développement, tests ciblés + `coverage-diff` seulement ; pas de `retry` ni de `force: true` pour masquer une instabilité.
- **Actions à risque** (reset de base, `make clean`, suppression de volumes de la stack principale, `.env`) : jamais sans l'utilisateur. `make agent-down` ne supprime que les conteneurs et volumes **de l'agent**.
- Les cibles existantes (`up`, `down`, `test-api`, `coverage-api`, `lint-api`, `openapi`, `e2e`, …) restent fonctionnelles ; la CI (`ci.yml`, non modifiée ici) continue de passer.

## Points de revue

1. **Résolution DNS ambiguë** : deux agents sur `steamy-infra` exposent chacun un alias `api`. Un agent ne doit jamais adresser un service applicatif par son nom nu mais par `<service>-<lot>`. Test : depuis le `web` d'un agent, `api-<lot>` résout son propre api même si un autre agent tourne.
2. **Collision de lots** : lot déjà actif, worktree ou branche existants, lot nommé `test` ou `e2e`, lot avec majuscules/tirets. Attendu : refus net avec la commande de reprise.
3. **Échec à mi-chemin** (base créée, conteneurs non démarrés) : `up` rejoué doit être idempotent (bases/buckets existants réutilisés), jamais détruire de données.
4. **Allocation Redis concurrente** : deux `agent-up` lancés en même temps ne reçoivent pas les mêmes numéros (verrou).
5. **Stack principale arrêtée ou images absentes** : message explicite (« lancer `make up` »), pas une erreur Docker obscure.
6. **Worktree et `.git`** : dans un conteneur, le `.git` d'un worktree pointe vers un chemin hôte inexistant ; toute commande git (diff-cover, `git diff`) se fait **sur l'hôte**, jamais en conteneur.
7. **Course entre agents sur `steamy-web-e2e`** : l'image e2e doit être taguée par lot.

## Contrats produits (consommés par les plans 2 et 3)

| Contrat | Valeur |
| --- | --- |
| Cibles make d'environnement | `make agent-up LOT=<lot> PROFIL=<web\|api\|complet> BASE=<branche>` · `make agent-down LOT=<lot>` · `make agent-status` |
| Script | `scripts/agent-env.sh up <lot> <profil> <base>` · `down <lot>` · `status` · `budget` (imprime `budget_mo=<n> utilise_mo=<n> libre_mo=<n>`) |
| Worktree, branche, projet | `../steamy-wt-<lot>` · `<BASE>-<lot>` · projet Compose `steamy-ag-<lot>` ; e2e : `steamy-e2e-<lot>` |
| Fichier d'environnement du worktree | `.agent.env` (gitignoré, syntaxe Make et shell) : `AGENT_LOT`, `AGENT_PROFIL`, `REDIS_DB_CACHE`, `REDIS_DB_BROKER`, `POSTGRES_DB`, `AWS_STORAGE_BUCKET_NAME`, `AWS_STORAGE_BUCKET_NAME_TEST` |
| Variables dans les conteneurs de l'agent | `AGENT_LOT`, `POSTGRES_DB=steamy_<lot>`, `REDIS_URL`/`CELERY_BROKER_URL` sur les numéros du lot, `AWS_STORAGE_BUCKET_NAME=steamy-<lot>`, `AWS_STORAGE_BUCKET_NAME_TEST=steamy-<lot>-test` |
| Base de test | `test_steamy_<lot>` (xdist : `test_steamy_<lot>_gwN`) ; sans lot : `test_steamy[_gwN]` — **c'est ce que le garde-fou du plan 2 vérifie** |
| Réseau partagé | `steamy-infra` (alias `postgres`, `redis`, `rustfs`, `mailpit`) ; variable `INFRA_NETWORK` |
| Cibles standard | `make test-cible T="<chemins>"` (`apps/api/…`, `apps/web/…`, `packages/…`) · `make coverage-diff BASE=<branche>` · `make lint` · `make typecheck` · `make generate` · `make check-generated` · `make migrations-check` · `make e2e-fixtures` · `make e2e` |
| Garde par profil | `web` : cibles front seulement ; `api` : cibles API + `generate`/`check-generated` ; `complet` : tout ; sans `.agent.env` (stack principale) : tout |
| Budget | `budget agents = mémoire Docker − MAIN_STACK_MO − 2048 Mo` ; coûts par profil `COUT_MO_web/api/complet` dans `scripts/agent-env.sh` ; jeton e2e `N=1` ; tableau de valeurs dans `docs/infra/agents.md` § « Valeurs déclarées » (source des valeurs de `.claude/chantier.projet.md`) |
| Paramètre de base | `BASE=` (défaut `origin/development` pour la stack principale) ; `coverage-api` / `coverage-web` l'acceptent aussi |

---

### Tâche 1.1 : Réseau d'infrastructure partagé et nom de projet

**Files:**
- Modify: `compose.yml` (réseau, attache des 4 services d'infra, `name: steamy`)
- Modify: `compose.e2e.yml` (réseau et image web paramétrables)
- Modify: `Makefile` (variable `E2E`, `E2E_WEB_IMAGE`)
- Modify: `.gitignore` (`.agent.env`, `.agent/`, `.superpowers/` — état du superviseur, demandé par le plan 3)

**Interfaces:**
- Produces : réseau `steamy-infra` (`name: ${INFRA_NETWORK:-steamy-infra}`) ; alias `postgres`, `redis`, `rustfs`, `mailpit` ; projet principal nommé `steamy` ; image e2e `${E2E_WEB_IMAGE:-steamy-web-e2e}`.

- [ ] **Étape 1 : état de référence.** `docker compose config | head -3` et `docker compose ls` : noter le nom de projet actuel (doit être `steamy`). Si le dossier du dépôt s'appelle autrement, s'arrêter et signaler (fixer `name: steamy` renommerait les volumes de données).
- [ ] **Étape 2 : déclarer le réseau.** Dans `compose.yml` : `name: steamy` en tête ; `networks: infra: { name: "${INFRA_NETWORK:-steamy-infra}" }` ; `networks: [default, infra]` sur `postgres`, `redis`, `rustfs`, `mailpit` (le réseau `default` doit être listé explicitement).
- [ ] **Étape 3 : isoler la stack e2e.** Dans `compose.e2e.yml`, aucun changement de réseau n'est nécessaire si le Makefile pose `INFRA_NETWORK=steamy-e2e<-lot>-infra` pour la stack e2e : la stack e2e (qui a ses propres postgres/redis/rustfs/mailpit) ne doit jamais rejoindre `steamy-infra`. Remplacer `image: steamy-web-e2e` par `image: ${E2E_WEB_IMAGE:-steamy-web-e2e}`.
- [ ] **Étape 4 : Makefile.** `E2E := INFRA_NETWORK=steamy-e2e$(if $(AGENT_LOT),-$(AGENT_LOT))-infra E2E_WEB_IMAGE=steamy-web-e2e$(if $(AGENT_LOT),-$(AGENT_LOT)) docker compose -p steamy-e2e$(if $(AGENT_LOT),-$(AGENT_LOT)) -f compose.yml -f compose.e2e.yml` ; adapter `e2e-down` et l'appel `$(MAKE) migrate seed COMPOSE="$(E2E)"` si besoin. Ajouter `.agent.env`, `.agent/` et `.superpowers/` au `.gitignore`.
- [ ] **Étape 5 : vérifier (sans lancer e2e).**
  - `docker compose config --quiet` → code 0.
  - `INFRA_NETWORK=x E2E_WEB_IMAGE=y docker compose -p steamy-e2e-z -f compose.yml -f compose.e2e.yml config | grep -E 'name: x|image: y'` → les deux lignes présentes.
  - `make up` puis `docker network inspect steamy-infra --format '{{range .Containers}}{{.Name}} {{end}}'` → exactement `postgres`, `redis`, `rustfs`, `mailpit` (noms de conteneurs préfixés `steamy-`).
  - `make ps` → tous les services de la stack principale sains.
- [ ] **Étape 6 : commit** `feat(infra): réseau partagé steamy-infra pour les services d'infrastructure et stack e2e isolée par lot`.

---

### Tâche 1.2 : Surcouche `compose.agent.yml`

**Files:**
- Create: `compose.agent.yml`

**Interfaces:**
- Consumes : réseau `steamy-infra` et alias de 1.1 ; variables d'environnement `AGENT_LOT`, `REDIS_DB_CACHE`, `REDIS_DB_BROKER` fournies par `.agent.env` (1.3).
- Produces : surcouche à appliquer par `docker compose -p steamy-ag-<lot> -f compose.yml -f compose.agent.yml` avec les services `api-migrate`, `api`, `worker`, `web` propres à l'agent.

- [ ] **Étape 1 : écrire la surcouche** (modèle : `docker-compose.agent.yml` de Badge). Décisions :
  - `api-migrate`, `api`, `worker` : `image: steamy-api` (image déjà construite par `make up`), `build: !reset null`, `pull_policy: never` ; `ports: !reset []` ; `depends_on: !override` réduit à `api-migrate` (pour `api` et `worker`) ; l'agent ne démarre pas `rustfs-init` (buckets créés par le script).
  - `postgres`, `redis`, `rustfs`, `rustfs-init`, `mailpit`, `beat`, `flower` : `profiles: ["manuel"]` (non démarrés par l'agent).
  - `networks` : `default` (réseau propre au projet, avec l'alias `<service>-${AGENT_LOT}`, ex. `api-${AGENT_LOT}`) et `infra` (`external: true`, `name: steamy-infra`). **Règle** : dans l'environnement d'agent, `API_URL`, `ALLOWED_HOSTS`, etc. n'emploient que `api-${AGENT_LOT}`, jamais `api` nu (point de revue 1).
  - `environment` commun api/worker/api-migrate : `AGENT_LOT`, `POSTGRES_DB: steamy_${AGENT_LOT}`, `REDIS_URL: redis://redis:6379/${REDIS_DB_CACHE}`, `CELERY_BROKER_URL: redis://redis:6379/${REDIS_DB_BROKER}`, `AWS_STORAGE_BUCKET_NAME: steamy-${AGENT_LOT}`, `AWS_STORAGE_BUCKET_NAME_TEST: steamy-${AGENT_LOT}-test`, `ALLOWED_HOSTS: localhost,127.0.0.1,api,api-${AGENT_LOT}`. Mailpit partagé (`EMAIL_HOST=mailpit` hérité).
  - `web` : `AGENT_LOT`, `API_URL: http://api-${AGENT_LOT}:8000`, `PUBLIC_API_URL` identique, `ports: !reset []`, volumes `node_modules` propres au projet, `pnpm_store` en volume **externe partagé** `steamy_pnpm_store`, `depends_on: !reset {}`, healthcheck (dépendances installées et serveur répondant sur `:3000`).
  - Chaque variable de lot **obligatoire** : `${AGENT_LOT:?AGENT_LOT requis}` pour qu'un oubli échoue au `config`.
- [ ] **Étape 2 : vérifier la composition.**
  - `AGENT_LOT=zz REDIS_DB_CACHE=2 REDIS_DB_BROKER=3 docker compose -p steamy-ag-zz -f compose.yml -f compose.agent.yml config --quiet` → code 0.
  - Même commande sans `AGENT_LOT` → échec avec « AGENT_LOT requis ».
  - `… config | grep -c '^    ports:'` → 0 pour les services applicatifs (aucun port publié) ; `… config --services` contient `api web worker api-migrate`.
- [ ] **Étape 3 : vérifier le démarrage manuel** (la base est créée à la main, le script n'existe pas encore) : `docker compose -p steamy exec postgres createdb -U steamy steamy_zz` ; `AGENT_LOT=zz … run --rm --no-deps api sh -c 'python -c "import os;print(os.environ[\"AGENT_LOT\"],os.environ[\"POSTGRES_DB\"])"'` → `zz steamy_zz` ; `… run --rm --no-deps api python manage.py migrate --noinput` → succès. Nettoyer : `… down -v` puis `dropdb -U steamy steamy_zz` via le conteneur postgres.
- [ ] **Étape 4 : commit** `feat(infra): surcouche compose.agent.yml pour les conteneurs applicatifs d'un agent`.

---

### Tâche 1.3 : Script `scripts/agent-env.sh` et cibles `agent-*`

**Files:**
- Create: `scripts/agent-env.sh` (exécutable)
- Modify: `Makefile` (cibles `agent-up`, `agent-down`, `agent-status`, `.PHONY`, aide)

**Interfaces:**
- Consumes : `compose.agent.yml` (1.2), réseau `steamy-infra` (1.1).
- Produces : `scripts/agent-env.sh up <lot> <profil> <base>`, `down <lot>`, `status`, `budget` ; fichier `<worktree>/.agent.env` (voir Contrats produits) ; constantes `COUT_MO_web`, `COUT_MO_api`, `COUT_MO_complet`, `MAIN_STACK_MO`, `MARGE_MO=2048` (valeurs provisoires `0` jusqu'à 1.7).

Inspiré de `agent-stack.sh` de Badge (préalables, lot valide, `trap ERR` avec commandes de reprise). Les « tests » sont des commandes de vérification.

- [ ] **Étape 1 : vérifications de refus (doivent échouer avant toute implémentation métier).** Écrire le squelette (`set -euo pipefail`, `die`, `check_lot`, `usage`) puis exécuter :
  - `scripts/agent-env.sh up` → usage, code ≠ 0.
  - `make agent-up LOT=Bad-Lot PROFIL=api BASE=feature/methode-chantiers` → « lot invalide » (attendu : `^[a-z0-9]+$`).
  - `make agent-up LOT=test …` et `LOT=e2e` → « lot réservé ».
  - `make agent-up LOT=zz PROFIL=autre …` → « profil inconnu (web|api|complet) ».
- [ ] **Étape 2 : implémenter `up`.** Séquence, chaque étape idempotente :
  1. Préalables : stack principale (postgres, redis, rustfs, mailpit en `running`/healthy → sinon « lancer `make up` »), réseau `steamy-infra`, images `steamy-api` présente (et `node:24.18.0-alpine`, `mcr.microsoft.com/playwright:v1.64.1-noble` tirées si profil `web`/`complet`, sinon `docker pull`), branche de base existante, lot pas déjà actif (`docker compose ls` → projet `steamy-ag-<lot>`), nombre de lots inférieur à ce que permet le budget (étape 4).
  2. Dépôt principal retrouvé par `git rev-parse --git-common-dir` (le script marche lancé depuis le dépôt principal ou un worktree) ; worktree `../steamy-wt-<lot>` créé par `git worktree add -b <base>-<lot> … <base>` (refus si le worktree ou la branche existent déjà, avec la commande de reprise ; si `.agent.env` existe déjà dans un worktree préexistant, reprise sans recréer).
  3. `trap ERR` après création du worktree : afficher la commande de reprise (`scripts/agent-env.sh up …`) et celle de nettoyage (`down`, `git worktree remove --force`, `git branch -D`) — sans rien supprimer automatiquement.
  4. Verrou global (`mkdir "$(git rev-parse --git-common-dir)/agent-env.lock"`, libéré par trap EXIT, attente ≤ 30 s) autour de l'attribution Redis et du contrôle de budget ; numéros Redis = première paire libre `(c, c+1)` dans `2..15` d'après les `.agent.env` des worktrees `../steamy-wt-*` dont le projet est actif.
  5. Création des bases : `docker compose -p steamy -f <principal>/compose.yml exec -T postgres psql -U steamy -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='steamy_<lot>'"` puis `CREATE DATABASE` si absente. (Pas de base de test à créer : Django crée `test_steamy_<lot>`.)
  6. Buckets : `docker run --rm --network steamy-infra -e AWS_ACCESS_KEY_ID=rustfsadmin -e AWS_SECRET_ACCESS_KEY=rustfsadmin -e AWS_DEFAULT_REGION=us-east-1 amazon/aws-cli:2.22.0 --endpoint-url http://rustfs:9000 s3api head-bucket … || s3 mb …` pour `steamy-<lot>` et `steamy-<lot>-test`.
  7. Écriture de `.agent.env` dans le worktree (syntaxe `VAR = valeur` + `export`, voir Contrats).
  8. Démarrage : `docker compose -p steamy-ag-<lot> -f compose.yml -f compose.agent.yml up -d --wait` sur les services du profil : `api` → `api-migrate api worker` ; `web` → `web` ; `complet` → les quatre. Attendre la santé ; échec → logs des 50 dernières lignes puis `die`.
  9. Résumé : worktree, branche, projet, bases, buckets, numéros Redis, coût du profil.
- [ ] **Étape 3 : contrôle du budget (`budget` et dans `up`).** `budget_mo = MemTotal (docker info, en Mo) − MAIN_STACK_MO − MARGE_MO` ; `utilise_mo` = somme des `COUT_MO_<profil>` des projets `steamy-ag-*` actifs (profil lu dans leur `.agent.env`) ; `up` refuse si `utilise + coût du profil demandé > budget` avec un message chiffré. Le script ne contourne pas le refus (pas d'option `--force`).
- [ ] **Étape 4 : implémenter `down <lot>`.** `docker compose -p steamy-ag-<lot> … down -v` (conteneurs et volumes **de l'agent** uniquement, jamais le volume partagé `steamy_pnpm_store`), `FLUSHDB` des deux numéros Redis du lot (via le conteneur redis principal), suppression de `.agent.env` **non** faite (la reprise réutilise les numéros) ; conservation du worktree, de la branche, de `steamy_<lot>`, `test_steamy_<lot>*` et des buckets. Afficher ce qui est conservé et la commande de nettoyage final (`git worktree remove`, `git branch -d`, `DROP DATABASE`, `s3 rb`), sans l'exécuter.
- [ ] **Étape 5 : implémenter `status`.** Une ligne par projet `steamy-ag-*` : lot, profil, worktree, bases, numéros Redis, mémoire courante (`docker stats --no-stream`), plus la ligne `budget`. « Aucun environnement d'agent. » si aucun.
- [ ] **Étape 6 : cibles make.**
  `agent-up: scripts/agent-env.sh up "$(LOT)" "$(PROFIL)" "$(BASE)"` (erreur lisible si une variable manque) ; `agent-down: … down "$(LOT)"` ; `agent-status: … status`.
- [ ] **Étape 7 : vérifier le cycle réel** (profil `api`, `BASE=feature/methode-chantiers`, lot `t1`) :
  - `make agent-up LOT=t1 PROFIL=api BASE=feature/methode-chantiers` → code 0 ; `ls ../steamy-wt-t1/.agent.env` existe.
  - `docker compose -p steamy exec -T postgres psql -U steamy -d postgres -tc "\l" | grep steamy_t1` ; `docker ps --filter label=com.docker.compose.project=steamy-ag-t1 --format '{{.Ports}}'` → aucun port publié.
  - `make agent-status` mentionne `t1`. Relancer `agent-up LOT=t1 …` → refus « lot déjà actif ».
  - `make agent-down LOT=t1` → code 0 ; `docker ps` sans conteneur `steamy-ag-t1` ; worktree, branche et base `steamy_t1` toujours là.
  - Deuxième lot simultané (`t2`) : numéros Redis différents de `t1` dans les deux `.agent.env`.
  - `shellcheck` n'est pas disponible sur l'hôte : exécuter `docker run --rm -v "$PWD:/mnt" koalaman/shellcheck:v0.10.0 scripts/agent-env.sh` → 0 avertissement.
- [ ] **Étape 8 : commit** `feat(infra): script agent-env.sh et cibles agent-up, agent-down, agent-status`.

---

### Tâche 1.4 : Cibles standard, routage et garde par profil

**Files:**
- Create: `scripts/cibles.sh`
- Modify: `Makefile`

**Interfaces:**
- Consumes : `.agent.env` (1.3) ; surcouche (1.2).
- Produces : `scripts/cibles.sh <cible> [args]` avec les cibles `lint`, `typecheck`, `generate`, `check-generated`, `migrations-check`, `test-cible` ; variable Make `COMPOSE` routée (`docker compose` sur la stack principale, `docker compose -p steamy-ag-$(AGENT_LOT) -f compose.yml -f compose.agent.yml` si `.agent.env` est présent : `-include .agent.env` en tête de Makefile).

- [ ] **Étape 1 : vérifications de comportement attendu (avant implémentation).** Depuis le worktree d'un lot `api` (ex. `agent-up LOT=t3 PROFIL=api`) :
  - `make test-cible T=apps/web/src` → refus « profil api : pas de cible front » (code ≠ 0, sans démarrer de conteneur).
  - `make test-cible` (sans `T`) → usage.
  - `make lint` → n'exécute que ruff ; dans un lot `web` → que eslint ; stack principale → les deux.
- [ ] **Étape 2 : Makefile.** `-include .agent.env`, `COMPOSE` conditionnel, `API`/`WEB` inchangés dans leur forme mais fondés sur `COMPOSE`. Les cibles existantes (`lint-api`, `lint-web`, `typecheck-web`, `openapi`, `test-api`, `test-web`, `fix-api`, …) restent, `openapi` devenant un alias de `generate`. Les commandes `web` incluent l'installation des dépendances (`pnpm install --frozen-lockfile --store-dir /pnpm-store --config.confirm-modules-purge=false`) car les volumes d'un agent sont vierges.
- [ ] **Étape 3 : `scripts/cibles.sh`.** Décisions :
  - `lint` = ruff (API) + eslint (web) selon le profil ; `typecheck` = `pnpm typecheck` (web + api-client).
  - `migrations-check` = `python manage.py makemigrations --check --dry-run` (API, sur la base de l'agent).
  - `generate` = `spectacular --file openapi.yaml --validate --fail-on-warn` puis `pnpm api-client:generate` dans un conteneur `run --rm --no-deps web` (installation filtrée `--filter '@steamy/api-client...'`) ; ne requiert pas le front démarré, donc permis en profil `api`.
  - `check-generated` : **dans les conteneurs**, sans `git` : spectacular vers `/tmp/openapi.yaml` puis `diff -u` avec `openapi.yaml` ; `schema.d.ts` régénéré dans le conteneur depuis l'`openapi.yaml` versionné puis `diff` avec l'existant (copie préalable, restauration après). Échec = message « lancer `make generate` et committer ».
  - `test-cible T="…"` : chaque chemin commençant par `apps/api/` est traduit en chemin relatif à `apps/api` et passé à `pytest` (`run --rm --no-deps api pytest <chemins>`) ; chaque chemin `apps/web/…` ou `packages/…` à `vitest run` (relatif à `apps/web`). Mélange accepté (les deux groupes sont lancés, code de sortie = pire des deux) ; chemin inexistant → échec explicite ; profil incompatible → refus avec le message du contrat.
  - Table de garde par profil conforme à « Contrats produits » (`web` : front ; `api` : API + `generate`/`check-generated` ; `complet` et stack principale : tout).
- [ ] **Étape 4 : vérifier.** Dans le worktree du lot `t3` (profil `api`) : `make migrations-check` → `No changes detected` ; `make lint` → ruff OK ; `make test-cible T=apps/api/apps/core` → pytest vert ; `make check-generated` → code 0 ; `make test-cible T=apps/web/src` → refus. Sur un lot `web` (`t4`) : `make typecheck`, `make lint`, `make test-cible T=apps/web/src/<un dossier avec tests>` → verts ; `make test-cible T=apps/api/apps/core` → refus. Sur la stack principale (`make lint`, `make test-api`) : inchangés. Rien ne s'exécute sur l'hôte (`ps` pendant l'exécution : uniquement `docker`/`make`).
- [ ] **Étape 5 : commit** `feat(infra): cibles standard lint, typecheck, generate, check-generated, migrations-check et test-cible routées vers l'environnement d'agent`.

---

### Tâche 1.5 : `make coverage-diff BASE=…`

**Files:**
- Create: `scripts/coverage-diff.sh`
- Modify: `Makefile` (`coverage-diff`, `coverage-api`, `coverage-web`)

**Interfaces:**
- Consumes : routage `COMPOSE` et garde par profil (1.4) ; `diff-cover` présent dans l'image `steamy-api`.
- Produces : `make coverage-diff BASE=<branche>` ; `scripts/coverage-diff.sh <base>`. Code de sortie ≠ 0 si le code modifié n'est pas couvert à 100 %.

- [ ] **Étape 1 : cas d'usage à vérifier (échec attendu avant implémentation).** Sur un worktree de lot, avec un changement d'une ligne **non testée** dans une app Django (changement jetable, annulé ensuite) : `make coverage-diff BASE=feature/methode-chantiers` doit échouer en nommant fichier et ligne ; avec un changement couvert, passer. `make coverage-diff` sans `BASE` → usage.
- [ ] **Étape 2 : implémenter `scripts/coverage-diff.sh`.** Décisions :
  - **Diff sur l'hôte** (point de revue 6) : `git diff <merge-base BASE HEAD>` (ref locale si elle existe, sinon `origin/<BASE>`), **inclut les modifications non commitées** ; écrit `.agent/coverage.diff` et la liste des fichiers.
  - **API** : fichiers sous `apps/api/apps/<app>/` → pytest sur `apps/<app>` pour chaque app touchée avec `--cov --cov-report=xml:coverage.xml` ; un fichier Python modifié hors d'une app (`project/`, `libs/`, `conftest.py`) → suite API complète (arbitrage : un fichier absent du rapport serait ignoré par diff-cover, donc faussement vert). Aucun fichier Python touché → pas de partie API.
  - **Front** : fichiers sous `apps/web/src/**` (ou `e2e/fausse-api/`) → `vitest related --run <fichiers> --coverage` (config existante, rapport cobertura) ; `packages/api-client` touché → pas de couverture (fichier généré).
  - **diff-cover** (10.6.0) lancé en conteneur (`docker run --rm -v …` sur l'image `steamy-api`) avec `--diff-file .agent/coverage.diff --fail-under=100` ; rapports API et web passés ensemble. Garde par profil : un lot `web` ne lance pas la partie API et inversement ; si le diff touche l'autre moitié, avertir et ignorer cette moitié (elle relève d'un autre lot).
- [ ] **Étape 3 : Makefile.** `coverage-diff: scripts/coverage-diff.sh "$(BASE)"` (BASE obligatoire pour les agents) ; `coverage-api` et `coverage-web` conservés avec `BASE ?= origin/development` et délèguent à la même implémentation (plus de `origin/development` en dur ni de `git` en conteneur).
- [ ] **Étape 4 : vérifier.** Les deux cas de l'étape 1 (échec sur ligne non couverte, succès sur ligne couverte) pour un lot `api` et un lot `web` ; `make coverage-api` et `make coverage-web` sur la stack principale, depuis une branche de test, aboutissent comme avant ; temps relevé (doit rester très inférieur à la suite complète) et noté dans `docs/infra/agents.md` (1.7). Annuler les changements jetables.
- [ ] **Étape 5 : commit** `feat(infra): coverage-diff rejoue les tests touchés et compare à la base donnée`.

---

### Tâche 1.6 : `make e2e-fixtures` en conteneur et `make e2e` par lot

**Files:**
- Modify: `compose.yml` (service `playwright-fixtures`)
- Modify: `Makefile` (`e2e-fixtures`, `e2e`, `e2e-down`, garde)
- Modify: `scripts/cibles.sh` si le routage y est centralisé

**Interfaces:**
- Consumes : `apps/web/playwright.fixtures.config.ts` et la fausse API `apps/web/e2e/fausse-api/` (inchangés) ; `COMPOSE` routé (1.4) ; `E2E` par lot (1.1).
- Produces : `make e2e-fixtures` (conteneur, profil `web` ou `complet`) ; `make e2e` (projet `steamy-e2e-<lot>` si `AGENT_LOT`).

- [ ] **Étape 1 : état actuel.** Noter que `pnpm e2e:fixtures` suppose `pnpm build` préalable et que la configuration lance elle-même la fausse API (`node e2e/fausse-api/server.ts`) et `next start` ; vérifier que l'image `mcr.microsoft.com/playwright:v1.64.1-noble` embarque un Node qui exécute du TypeScript natif : `docker run --rm mcr.microsoft.com/playwright:v1.64.1-noble node --version` → ≥ 24 attendu (sinon, signaler : `node e2e/fausse-api/server.ts` ne tournera pas).
- [ ] **Étape 2 : service `playwright-fixtures`** dans `compose.yml` : image Playwright épinglée sur `v1.64.1-noble`, `profiles: ["fixtures"]`, mêmes volumes que `web` (`node_modules`, `web_node_modules`, `api_client_node_modules`, `pnpm_store`, `web_next`), pas de port, `working_dir: /repo`, `CI: ${CI:-}`, aucune dépendance (`depends_on` vide). Commande : installation filtrée `@steamy/web...`, `pnpm --filter @steamy/web build`, puis `pnpm --filter @steamy/web e2e:fixtures ${PW_ARGS:-}`.
- [ ] **Étape 3 : cible** `e2e-fixtures: $(COMPOSE) --profile fixtures run --rm --no-deps playwright-fixtures` ; refusée en profil `api`.
- [ ] **Étape 4 : `make e2e` par lot** : avec `.agent.env`, `E2E` utilise le projet `steamy-e2e-<lot>` (1.1) ; refusé hors profil `complet` ; avant de démarrer, vérifier le **jeton e2e** : refuser si un autre projet `steamy-e2e-*` est déjà actif (N = 1) avec un message nommant le projet occupant ; `e2e-down` arrête le projet du lot (`down -v`, jamais celui d'un autre).
- [ ] **Étape 5 : vérifier.**
  - Stack principale : `make e2e-fixtures` → suite verte (même résultat que `pnpm e2e:fixtures` en CI) ; vérifier qu'aucun port n'est publié : `docker ps --format '{{.Ports}}'` pendant le run.
  - Lot `web` (`agent-up LOT=t4 PROFIL=web …`) : `make e2e-fixtures` vert ; en profil `api` : refus.
  - Lot `complet` : `make e2e PW_ARGS="--grep @smoke"` ou un seul fichier de spec (le plus court) vert ; `docker ps` montre `steamy-e2e-t5-*`, aucune intrusion sur `steamy-infra` (`docker network inspect steamy-infra` inchangé) ; pendant ce run, un second `make e2e` d'un autre lot est refusé (jeton) ; `make e2e-down` nettoie.
  - `make e2e` sur la stack principale : inchangé (à lancer **entièrement** une fois ; si la machine est chargée, rejouer un fichier seul avant de conclure à un bug).
- [ ] **Étape 6 : commit** `feat(infra): e2e sur fixtures en conteneur et e2e de la vraie stack par lot avec jeton`.

---

### Tâche 1.7 : Mesures mémoire et `docs/infra/agents.md`

**Files:**
- Create: `docs/infra/agents.md`
- Modify: `docs/infra/README.md` (une ligne dans le tableau des pages)
- Modify: `scripts/agent-env.sh` (constantes mesurées)

**Interfaces:**
- Produces : section « Valeurs déclarées » de `docs/infra/agents.md` (source des valeurs de `.claude/chantier.projet.md` pour le plan 3) et constantes `MAIN_STACK_MO`, `COUT_MO_*` dans le script.

- [ ] **Étape 1 : mesurer.** Méthode : machine au repos, Docker Desktop à 14,6 Go ; `docker stats --no-stream --format '{{.Name}} {{.MemUsage}}'` (somme par projet) à 30 s de la fin du démarrage puis **pic** relevé toutes les 2 s pendant l'activité typique de chaque profil.
  1. Stack principale seule (`make up`) : régime établi → `MAIN_STACK_MO`.
  2. `api` : idle ; pic pendant `make test-cible T=apps/api/apps/<app moyenne>` et pendant `make coverage-diff` ; pic de `make generate`.
  3. `web` : idle (web dev démarré) ; pic pendant `make test-cible` (vitest), `make typecheck`, `make e2e-fixtures` (build + serveurs + Chromium).
  4. `complet` : idle ; pic de `make e2e` (stack e2e complète : postgres, redis, rustfs, mailpit, api, worker, web prod, Playwright).
  Coût déclaré d'un profil = idle + pic transitoire de sa cible la plus lourde, arrondi au 100 Mo supérieur. Noter aussi le temps d'`agent-up` (premier démarrage, installation pnpm) et le pic CPU.
- [ ] **Étape 2 : renseigner** les constantes du script ; `scripts/agent-env.sh budget` doit afficher `budget_mo = mémoire Docker − MAIN_STACK_MO − 2048` (≈ 14 600 − main − 2 048) ; vérifier le **refus** en lançant des `agent-up` jusqu'au dépassement (le dernier échoue avec un message chiffré, sans rien créer).
- [ ] **Étape 3 : écrire `docs/infra/agents.md`** (français, style des pages voisines) : principe (infra partagée, conteneurs propres), schéma des services et réseaux, tableau des profils et **coûts mesurés** (date, machine : Mac 10 cœurs, 24 Go, Docker 14,6 Go), budget agents et formule, jeton e2e `N=1`, isolation des données (bases, buckets, Redis, mails partagés dans Mailpit : les e2e ont leur propre stack), table des cibles `make` standard avec garde par profil, procédure (`agent-up` → travail → `agent-down` → nettoyage final), conventions (`<service>-<lot>`, aucun port, un lot qui touche `requirements.txt` ou un Dockerfile doit reconstruire l'image : à signaler), dépannage (stack principale arrêtée, lot bloqué, conteneurs figés `docker compose -p steamy-ag-<lot> ps`/`logs`, base à supprimer, `down` après échec, Redis à purger, OOM → relancer le fichier seul), et la section **« Valeurs déclarées »** : mémoire Docker, `MAIN_STACK_MO`, marge 2048, budget agents, coût par profil, N e2e = 1, temps typiques de `coverage-diff` et `agent-up`. Ajouter la ligne `agents.md` dans le tableau de `docs/infra/README.md`.
- [ ] **Étape 4 : vérifier.** Les liens de la doc existent (`grep -o '](\([^)]*\))' docs/infra/agents.md` → chaque cible présente) ; les valeurs du tableau égalent les constantes du script (comparaison à l'œil, notée).
- [ ] **Étape 5 : commit** `docs(infra): page agents avec profils, coûts mémoire mesurés et budget`.

---

### Tâche 1.8 : Vérification du lot

**Files:** aucun nouveau (corrections éventuelles dans les fichiers du lot).

- [ ] **Étape 1 : qualité.** `make lint` et `make typecheck` sur la stack principale → verts ; `docker run --rm -v "$PWD:/mnt" koalaman/shellcheck:v0.10.0 /mnt/scripts/*.sh` → 0 avertissement.
- [ ] **Étape 2 : trois profils réels.** Pour chacun de `web`, `api`, `complet` : `make agent-up LOT=v1 PROFIL=<profil> BASE=feature/methode-chantiers` → ok ; `make agent-status` → ligne du lot et budget ; `make agent-down LOT=v1` → ok, worktree/branche/bases conservés ; puis nettoyage final manuel de `v1` (worktree, branche, base, buckets, Redis) pour laisser la machine propre. Un lot nommé identiquement relancé après `down` repart sur les mêmes numéros Redis.
- [ ] **Étape 3 : cibles standard, depuis un worktree de lot `complet`** : `make test-cible T=apps/api/apps/core`, `make test-cible T=apps/web/src/<dossier>`, `make coverage-diff BASE=feature/methode-chantiers`, `make e2e-fixtures`, `make check-generated`, `make migrations-check`, `make generate` (aucune modification de fichier suivie : `git status --short` vide) → tous code 0.
- [ ] **Étape 4 : non-régression de la stack principale** : `make test-api` sur une app, `make coverage-api`, `make e2e-down` ; `.github/workflows/ci.yml` non modifié (`git diff --stat feature/methode-chantiers -- .github` vide) ; aucun fichier hors « Fichiers du lot » modifié (`git diff --name-only feature/methode-chantiers`).
- [ ] **Étape 5 : état.** Cocher toutes les cases d'**Avancement**, statut ✅. Aucun conteneur d'agent ni worktree de test restant (`make agent-status` → « Aucun environnement d'agent. »). Commit `docs(infra): avancement du plan 1 de la méthode des chantiers`.
