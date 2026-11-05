#!/usr/bin/env bash
# Cibles standard de la méthode des chantiers, toutes exécutées en conteneur (docs/infra/agents.md).
# Lancé par le Makefile, qui fournit COMPOSE (stack principale ou projet de l'agent) et, dans le worktree d'un
# agent, AGENT_PROFIL (via .agent.env). Aucune commande n'est lancée sur l'hôte hors `docker`.
#
#   scripts/cibles.sh lint | typecheck | generate | check-generated | migrations-check
#   scripts/cibles.sh test-cible <chemins…>   (apps/api/…, apps/web/…, packages/…)
#
# Garde par profil : web = front seulement ; api = API + generate/check-generated ; complet et stack principale = tout.
set -euo pipefail

COMPOSE="${COMPOSE:-docker compose}"
PROFIL="${AGENT_PROFIL:-principal}"
PNPM_INSTALL="corepack enable && pnpm install --frozen-lockfile --store-dir /pnpm-store --config.confirm-modules-purge=false"

die() { echo "cibles : $*" >&2; exit 1; }

# $1 = api | web | generate : la cible est-elle permise dans ce profil ?
garde() {
  case "$PROFIL:$1" in
    web:api) die "profil web : pas de cible API (relève d'un lot API)" ;;
    web:generate) die "profil web : pas de génération du contrat (relève d'un lot API)" ;;
    api:web) die "profil api : pas de cible front (relève d'un lot web)" ;;
  esac
}

run_api() { $COMPOSE run --rm --no-deps api "$@"; }
# Les tests tournent comme en CI (DJANGO_ENV=test) : l'environnement de dev (api.env) change des pages testées
run_api_test() { $COMPOSE run --rm --no-deps -e DJANGO_ENV=test api "$@"; }
run_web() { $COMPOSE run --rm --no-deps web sh -c "$PNPM_INSTALL && $1"; }

# Combine les codes de sortie : le pire gagne
rc=0
pire() { if [ "$1" -ne 0 ]; then rc="$1"; fi; }

cible="${1:-}"
[ -n "$cible" ] || die "usage : cibles.sh lint|typecheck|generate|check-generated|migrations-check|test-cible"
shift

case "$cible" in
  lint)
    if [ "$PROFIL" != web ]; then run_api sh -c "ruff check . && ruff format --check ." || pire $?; fi
    if [ "$PROFIL" != api ]; then run_web "pnpm lint" || pire $?; fi
    ;;
  typecheck)
    garde web
    run_web "pnpm typecheck" || pire $?
    ;;
  migrations-check)
    garde api
    run_api python manage.py makemigrations --check --dry-run || pire $?
    ;;
  generate)
    garde generate
    run_api python manage.py spectacular --file openapi.yaml --validate --fail-on-warn || exit $?
    run_web "pnpm api-client:generate" || pire $?
    ;;
  check-generated)
    garde generate
    if ! run_api sh -c "python manage.py spectacular --file /tmp/openapi.yaml --validate --fail-on-warn && diff -u openapi.yaml /tmp/openapi.yaml"; then
      die "apps/api/openapi.yaml n'est pas à jour : lancer « make generate » et le committer"
    fi
    # Types du client régénérés depuis l'openapi.yaml versionné, comparés à l'existant puis restaurés
    if ! run_web "cd packages/api-client && cp src/schema.d.ts /tmp/schema.avant && pnpm generate >/dev/null && diff -u /tmp/schema.avant src/schema.d.ts; r=\$?; cp /tmp/schema.avant src/schema.d.ts; exit \$r"; then
      die "packages/api-client/src/schema.d.ts n'est pas à jour : lancer « make generate » et le committer"
    fi
    ;;
  test-cible)
    [ $# -gt 0 ] || die "usage : make test-cible T=\"apps/api/apps/core apps/web/src/...\""
    api_paths=""
    web_paths=""
    for p in "$@"; do
      p="${p%/}"
      case "$p" in
        *" "*) die "chemin avec espace non supporté : $p" ;;
        apps/api/*) rel="${p#apps/api/}"; [ -e "$p" ] || die "chemin inexistant : $p"; api_paths="$api_paths $rel" ;;
        apps/web/*) rel="${p#apps/web/}"; [ -e "$p" ] || die "chemin inexistant : $p"; web_paths="$web_paths $rel" ;;
        packages/*) [ -e "$p" ] || die "chemin inexistant : $p"; web_paths="$web_paths ../../$p" ;;
        *) die "chemin hors apps/api, apps/web et packages : $p" ;;
      esac
    done
    [ -z "$api_paths" ] || garde api
    [ -z "$web_paths" ] || garde web
    # shellcheck disable=SC2086
    if [ -n "$api_paths" ]; then run_api_test pytest $api_paths || pire $?; fi
    # shellcheck disable=SC2086
    if [ -n "$web_paths" ]; then run_web "pnpm --filter @steamy/web exec vitest run $web_paths" || pire $?; fi
    ;;
  *) die "cible inconnue : $cible" ;;
esac
exit "$rc"
