# Point d'entrée unique du monorepo. `make help` pour la liste.
COMPOSE := docker compose
API     := $(COMPOSE) run --rm api
WEB     := $(COMPOSE) run --rm --no-deps web sh -c
# Stack des parcours Playwright : projet séparé, sans port publié (cohabite avec `make up`)
E2E     := docker compose -p steamy-e2e -f compose.yml -f compose.e2e.yml

.DEFAULT_GOAL := help
.PHONY: help up down build restart logs ps shell manage migrate makemigrations seed \
        test-api coverage-api lint-api fix-api psql flower clean openapi lint-web typecheck-web \
        test-web coverage-web e2e e2e-down

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

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
	$(API) sh -c "python manage.py loaddata fixtures/admin.json fixtures/mail.json && python manage.py seed_demo"

test-api: ## Lance les tests de l'API
	$(API) pytest

coverage-api: ## Tests de l'API + couverture 100 % exigée sur le code modifié (diff-cover)
	$(API) sh -c "pytest --cov --cov-report=term --cov-report=xml:coverage.xml"
	docker run --rm -v "$(CURDIR):/repo" -w /repo/apps/api python:3.11.13-bookworm sh -c \
	  "git config --global --add safe.directory /repo && pip install -q --root-user-action=ignore diff-cover==10.6.0 \
	   && diff-cover coverage.xml --compare-branch=origin/development --fail-under=100"

lint-api: ## Lint et format de l'API (vérification seule)
	$(API) sh -c "ruff check . && ruff format --check ."

fix-api: ## Corrige automatiquement le lint et formate l'API
	$(API) sh -c "ruff check --fix . && ruff format ."

# --- Contrat front/back -----------------------------------------------------
openapi: ## Régénère openapi.yaml + les types TS du client (à committer)
	$(API) python manage.py spectacular --file openapi.yaml --validate --fail-on-warn
	$(WEB) "corepack enable && pnpm api-client:generate"

# --- Front Next.js ------------------------------------------------------------
lint-web: ## Lint du front
	$(WEB) "corepack enable && pnpm lint"

typecheck-web: ## Vérification TypeScript (web + api-client)
	$(WEB) "corepack enable && pnpm typecheck"

test-web: ## Tests de composants du front (Vitest)
	$(WEB) "corepack enable && pnpm test"

coverage-web: ## Tests du front + couverture 100 % exigée sur le code modifié (diff-cover)
	$(WEB) "corepack enable && pnpm --filter @steamy/web test:coverage"
	docker run --rm -v "$(CURDIR):/repo" -w /repo python:3.11.13-bookworm sh -c \
	  "git config --global --add safe.directory /repo && pip install -q --root-user-action=ignore diff-cover==10.6.0 \
	   && diff-cover apps/web/coverage/cobertura-coverage.xml --compare-branch=origin/development --fail-under=100"

e2e: ## Parcours Playwright sur la stack Docker (web en image prod, worker pour les emails, données rechargées)
	$(E2E) up -d --build --wait web worker
	$(MAKE) migrate seed COMPOSE="$(E2E)"
	@# Tous les parcours partent d'une même IP : plafonds quotidiens d'OTP relevés (D24, testés côté API)
	$(E2E) run --rm api python manage.py shell -c "from apps.core.models import PlatformSettings as P; \
	  P.objects.filter(pk=P.load().pk).update(otp_daily_limit_per_phone=50, otp_daily_limit_per_ip=5000)"
	$(E2E) run --rm playwright

e2e-down: ## Arrête la stack e2e et supprime ses données
	$(E2E) --profile e2e down -v

psql: ## Console PostgreSQL
	$(COMPOSE) exec postgres psql -U steamy steamy
