# Point d'entrée unique du monorepo. `make help` pour la liste.
# Dans le worktree d'un agent, `.agent.env` (écrit par `make agent-up`) pose AGENT_LOT et les numéros Redis.
-include .agent.env

ifdef AGENT_LOT
COMPOSE := docker compose -p steamy-ag-$(AGENT_LOT) -f compose.yml -f compose.agent.yml
else
COMPOSE := docker compose
endif
API     := $(COMPOSE) run --rm api
# Tests comme en CI : DJANGO_ENV=test (api.env pose dev) et stockage fichiers local (pas de S3 en CI)
# Sans dépendances (ni migrate, ni S3, ni Mailpit : stockage fichier et e-mails en mémoire) : seul Postgres doit tourner
API_TEST := $(COMPOSE) run --rm --no-deps -e DJANGO_ENV=test -e DEFAULT_FILE_STORAGE=django.core.files.storage.FileSystemStorage -e PYTEST_XDIST_AUTO_NUM_WORKERS api
API_NODEPS := $(COMPOSE) run --rm --no-deps api
# Parallélisme pytest : `make test-api` est parallèle par défaut (`-n auto`, une base par worker, nombre de workers décidé
# dans le conteneur par conftest.py ; PYTEST_XDIST_AUTO_NUM_WORKERS le force) ; test-cible, coverage-api et coverage-diff
# restent en série sauf PYTEST_XDIST passé explicitement. PYTEST_ARGS : arguments ajoutés à pytest, séparés par des
# espaces (pas d'argument contenant lui-même un espace).
PYTEST_XDIST ?= -n auto
PYTEST_ARGS ?=
PYTEST_XDIST_EXPLICITE = $(if $(filter command line environment,$(origin PYTEST_XDIST)),$(PYTEST_XDIST))
WEB     := $(COMPOSE) run --rm --no-deps web sh -c
# Stack des parcours Playwright : projet séparé (par lot d'agent), réseau d'infra et image web propres, sans port publié (cohabite avec `make up`)
E2E_P   := steamy-e2e$(if $(AGENT_LOT),-$(AGENT_LOT))
E2E     := INFRA_NETWORK=$(E2E_P)-infra E2E_WEB_IMAGE=steamy-web-e2e$(if $(AGENT_LOT),-$(AGENT_LOT)) docker compose -p $(E2E_P) -f compose.yml -f compose.e2e.yml
# `--no-build` en CI (images déjà construites, avec cache) ; PW_ARGS=--shard=1/4 pour n'en jouer qu'une part
E2E_BUILD ?= --build

.DEFAULT_GOAL := help
.PHONY: help up down build restart logs ps shell manage migrate makemigrations seed \
        test-api coverage-api coverage-api-complet coverage-web-complet lint-api fix-api psql flower clean openapi lint-web typecheck-web \
        test-web coverage-web coverage-diff e2e-fixtures e2e e2e-run e2e-down agent-up agent-down agent-status lint typecheck generate check-generated migrations-check test-cible test-scripts shellcheck

help: ## Affiche cette aide
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# --- Stack ------------------------------------------------------------------
up: ## Démarre toute la stack en arrière-plan
	$(COMPOSE) up -d --build
	@echo ""
	@echo "  Web        http://localhost:3000"
	@echo "  API        http://localhost:8000/api/   (docs : /api/docs/)"
	@echo "  Admin      http://localhost:8000/admin/"
	@echo "  RustFS     http://localhost:9001        (rustfsadmin / rustfsadmin)"
	@echo "  Mailpit    http://localhost:8025"

down: ## Arrête la stack (conserve les données)
	$(COMPOSE) down

build: ## Reconstruit les images (après modif de requirements.txt)
	$(COMPOSE) build

restart: ## Redémarre les services applicatifs
	$(COMPOSE) restart api worker beat web

logs: ## Suit les logs (ex : make logs s=api)
	$(COMPOSE) logs -f $(s)

ps: ## État des services
	$(COMPOSE) ps

flower: ## Lance Flower (supervision Celery) sur http://localhost:5555
	$(COMPOSE) --profile tools up -d flower

clean: ## ⚠️ Arrête la stack ET supprime toutes les données locales
	$(COMPOSE) --profile tools down -v

# --- Cibles standard (routées vers l'environnement d'agent si .agent.env est présent) ---
lint: ## Lint API (ruff) et front (eslint) selon le profil
	@COMPOSE="$(COMPOSE)" scripts/cibles.sh lint

typecheck: ## Vérification TypeScript (profils web, complet et stack principale)
	@COMPOSE="$(COMPOSE)" scripts/cibles.sh typecheck

test-cible: ## Tests ciblés : make test-cible T="apps/api/apps/core apps/web/src/..."
	@COMPOSE="$(COMPOSE)" PYTEST_XDIST="$(PYTEST_XDIST_EXPLICITE)" PYTEST_ARGS="$(PYTEST_ARGS)" scripts/cibles.sh test-cible $(T)

# --- Environnements d'agent (docs/infra/agents.md) --------------------------------
agent-up: ## Environnement d'agent : make agent-up LOT=<lot> PROFIL=<web|api|complet> BASE=<branche>
	@test -n "$(LOT)" -a -n "$(PROFIL)" -a -n "$(BASE)" || { echo "Usage : make agent-up LOT=<lot> PROFIL=<web|api|complet> BASE=<branche>"; exit 2; }
	@scripts/agent-env.sh up "$(LOT)" "$(PROFIL)" "$(BASE)"

agent-down: ## Arrête l'environnement d'un agent (conserve worktree, branche et bases) : make agent-down LOT=<lot>
	@test -n "$(LOT)" || { echo "Usage : make agent-down LOT=<lot>"; exit 2; }
	@scripts/agent-env.sh down "$(LOT)"

agent-status: ## Environnements d'agent actifs, mémoire et budget
	@scripts/agent-env.sh status

test-scripts: ## Tests bats des scripts d'environnement d'agent (faux docker et git, en conteneur)
	docker run --rm -v "$(CURDIR):/work:ro" -w /work alpine:3.20 sh -c 'apk add -q --no-cache bash git bats coreutils && bats scripts/tests/*.bats'

shellcheck: ## shellcheck sur scripts/*.sh (en conteneur)
	docker run --rm -v "$(CURDIR):/mnt:ro" -w /mnt koalaman/shellcheck:v0.10.0 scripts/*.sh

# --- API Django -------------------------------------------------------------
shell: ## Ouvre un shell dans le conteneur API
	$(COMPOSE) exec api bash

manage: ## manage.py arbitraire (ex : make manage c="createsuperuser")
	$(API) python manage.py $(c)

migrate: ## Applique les migrations
	$(API) python manage.py migrate

makemigrations: ## Génère les migrations
	$(API) python manage.py makemigrations

seed: ## Charge les fixtures et le jeu de démonstration (comptes : apps/api/fixtures/README.md)
	$(API) sh -c "python manage.py loaddata fixtures/admin.json fixtures/mail.json && python manage.py seed_demo $(SEED_ARGS)"

test-api: ## Lance les tests de l'API en parallèle (PYTEST_XDIST="" pour la série, PYTEST_ARGS pour ajouter des arguments)
	$(API_TEST) pytest $(PYTEST_XDIST) $(PYTEST_ARGS)

coverage-api: ## Tests des apps touchées + couverture 100 % du code modifié (BASE=origin/development par défaut)
	@COMPOSE="$(COMPOSE)" PYTEST_XDIST="$(PYTEST_XDIST_EXPLICITE)" PYTEST_ARGS="$(PYTEST_ARGS)" COVERAGE_PARTIE=api scripts/coverage-diff.sh "$(or $(BASE),origin/development)"

coverage-api-complet: ## CI : suite API complète avec couverture (une exécution), puis 100 % du code modifié : BASE=<réf> requis
	@test -n "$(BASE)" || { echo "Usage : make coverage-api-complet BASE=<réf>"; exit 2; }
	@COMPOSE="$(COMPOSE)" PYTEST_XDIST="$(PYTEST_XDIST_EXPLICITE)" PYTEST_ARGS="$(PYTEST_ARGS)" COVERAGE_COMPLET=1 COVERAGE_PARTIE=api scripts/coverage-diff.sh "$(BASE)"

lint-api: ## Lint et format de l'API (vérification seule)
	$(API_NODEPS) sh -c "ruff check . && ruff format --check ."

fix-api: ## Corrige automatiquement le lint et formate l'API
	$(API_NODEPS) sh -c "ruff check --fix . && ruff format ."

# --- Contrat front/back -----------------------------------------------------
generate: ## Régénère openapi.yaml + les types TS du client (à committer)
	@COMPOSE="$(COMPOSE)" scripts/cibles.sh generate

openapi: generate ## Alias de generate

check-generated: ## Vérifie que openapi.yaml et schema.d.ts sont à jour (sans git, en conteneur)
	@COMPOSE="$(COMPOSE)" scripts/cibles.sh check-generated

migrations-check: ## Vérifie qu'aucune migration Django n'est à générer
	@COMPOSE="$(COMPOSE)" scripts/cibles.sh migrations-check

# --- Front Next.js ------------------------------------------------------------
lint-web: ## Lint du front
	$(WEB) "corepack enable && pnpm lint"

typecheck-web: ## Vérification TypeScript (web + api-client)
	$(WEB) "corepack enable && pnpm typecheck"

test-web: ## Tests de composants du front (Vitest)
	$(WEB) "corepack enable && pnpm test"

coverage-web: ## Tests liés aux fichiers touchés + couverture 100 % du code modifié (BASE=origin/development par défaut)
	@COMPOSE="$(COMPOSE)" COVERAGE_PARTIE=web scripts/coverage-diff.sh "$(or $(BASE),origin/development)"

coverage-web-complet: ## CI : suite Vitest complète avec couverture (une exécution), puis 100 % du code modifié : BASE=<réf> requis
	@test -n "$(BASE)" || { echo "Usage : make coverage-web-complet BASE=<réf>"; exit 2; }
	@COMPOSE="$(COMPOSE)" COVERAGE_COMPLET=1 COVERAGE_PARTIE=web scripts/coverage-diff.sh "$(BASE)"

coverage-diff: ## Couverture 100 % du code modifié, tests touchés seulement : make coverage-diff BASE=<branche>
	@test -n "$(BASE)" || { echo "Usage : make coverage-diff BASE=<branche>"; exit 2; }
	@COMPOSE="$(COMPOSE)" PYTEST_XDIST="$(PYTEST_XDIST_EXPLICITE)" PYTEST_ARGS="$(PYTEST_ARGS)" scripts/coverage-diff.sh "$(BASE)"

e2e-fixtures: ## Parcours Playwright sur fixtures, en conteneur (front de production + fausse API) ; PW_ARGS pour filtrer
	@COMPOSE="$(COMPOSE)" scripts/cibles.sh e2e-fixtures-garde
	$(COMPOSE) --profile fixtures run --rm --no-deps playwright-fixtures

e2e: ## Parcours Playwright sur la stack Docker (web en image prod, worker pour les emails et PDF, données rechargées avec seed_demo --e2e)
	@COMPOSE="$(COMPOSE)" scripts/cibles.sh e2e-garde "$(E2E_P)"
	@$(MAKE) --no-print-directory e2e-run; rc=$$?; COMPOSE="$(COMPOSE)" scripts/cibles.sh e2e-jeton-rendre "$(E2E_P)"; exit $$rc

e2e-run:
	$(E2E) up -d $(E2E_BUILD) --wait web worker
	$(MAKE) migrate seed COMPOSE="$(E2E)" SEED_ARGS=--e2e
	@# Tous les parcours partent d'une même IP : plafonds quotidiens d'OTP relevés (D24, testés côté API)
	$(E2E) run --rm api python manage.py shell -c "from apps.core.models import PlatformSettings as P; \
	  P.objects.filter(pk=P.load().pk).update(otp_daily_limit_per_phone=50, otp_daily_limit_per_ip=5000)"
	$(E2E) run --rm playwright

e2e-down: ## Arrête la stack e2e et supprime ses données
	$(E2E) --profile e2e down -v
	@COMPOSE="$(COMPOSE)" scripts/cibles.sh e2e-jeton-rendre "$(E2E_P)"

psql: ## Console PostgreSQL
	$(COMPOSE) exec postgres psql -U steamy steamy
-include make/chantier.mk
