# Point d'entrée unique du monorepo. `make help` pour la liste.
COMPOSE := docker compose
API     := $(COMPOSE) run --rm api

.DEFAULT_GOAL := help
.PHONY: help up down build restart logs ps shell manage migrate makemigrations seed \
        test-api lint-api psql flower clean

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# --- Stack ------------------------------------------------------------------
up: ## Démarre toute la stack en arrière-plan
	$(COMPOSE) up -d --build
	@echo ""
	@echo "  API        http://localhost:8000/api/   (docs : /api/docs/)"
	@echo "  Admin      http://localhost:8000/admin/"
	@echo "  RustFS     http://localhost:9001        (rustfsadmin / rustfsadmin)"
	@echo "  Mailpit    http://localhost:8025"

down: ## Arrête la stack (conserve les données)
	$(COMPOSE) down

build: ## Reconstruit les images (après modif de requirements.txt)
	$(COMPOSE) build

restart: ## Redémarre les services applicatifs
	$(COMPOSE) restart api worker beat

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

seed: ## Charge les fixtures (compte admin, gabarits d'e-mails)
	$(API) python manage.py loaddata fixtures/admin.json fixtures/mail.json

test-api: ## Lance les tests de l'API
	$(API) pytest

lint-api: ## Lint de l'API
	$(API) python -m flake8 --ignore E501,E722,F821,W504 apps/ project/ libs/

psql: ## Console PostgreSQL
	$(COMPOSE) exec postgres psql -U steamy steamy
