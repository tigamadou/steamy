# Cibles de la méthode des chantiers (ADR 0007). Inclus par le Makefile racine.
.PHONY: chantier-labels chantier-perimetre chantier-test

chantier-labels: ## Crée les labels GitHub d'un chantier (SLUG=<slug> [LOTS="a b"])
	@test -n "$(SLUG)" || { echo "Variable SLUG manquante (ex : make chantier-labels SLUG=mon-chantier LOTS=\"1 2\")" >&2; exit 2; }
	@scripts/chantier/labels.sh "$(SLUG)" $(LOTS)

chantier-perimetre: ## Vérifie le périmètre d'un lot (LOT= PLAN= BASE=)
	@test -n "$(LOT)" -a -n "$(PLAN)" -a -n "$(BASE)" || { echo "Variables LOT, PLAN et BASE requises (ex : make chantier-perimetre LOT=3 PLAN=docs/plans/x/3-lot.md BASE=feature/x)" >&2; exit 2; }
	@scripts/chantier/check-perimetre.sh "$(LOT)" "$(PLAN)" "$(BASE)"

chantier-test: ## Lance les tests des scripts du chantier (bats, en conteneur)
	docker run --rm -v "$(CURDIR)":/repo -w /repo alpine:3.20 sh -c 'apk add --no-cache bash git bats >/dev/null && bats scripts/chantier/tests'
