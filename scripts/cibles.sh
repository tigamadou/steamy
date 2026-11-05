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

# Un environnement d'agent arrêté (agent-down) n'a plus de conteneurs ni de numéros Redis réservés : rien ne doit s'y lancer.
# Seul le rendu du jeton e2e reste permis (agent-down le rend).
if [ "${AGENT_ACTIF:-1}" = 0 ] && [ "${1:-}" != e2e-jeton-rendre ]; then
  die "environnement d'agent arrêté (AGENT_ACTIF=0) : « make agent-up » pour le reprendre"
fi

# Reprise d'un jeton e2e périmé après ce délai, en minutes (paramétrable pour les tests)
E2E_JETON_PERIME_MIN="${E2E_JETON_PERIME_MIN:-30}"

# $1 = api | web | generate : la cible est-elle permise dans ce profil ?
garde() {
  case "$PROFIL:$1" in
    web:api) die "profil web : pas de cible API (relève d'un lot API)" ;;
    web:generate) die "profil web : pas de génération du contrat (relève d'un lot API)" ;;
    api:web) die "profil api : pas de cible front (relève d'un lot web)" ;;
    web:e2e | api:e2e) die "profil $PROFIL : « make e2e » (vraie stack) exige le profil complet" ;;
  esac
}

# Parallélisme et arguments de pytest (make : PYTEST_XDIST, PYTEST_ARGS), découpés en mots
read -r -a PYTEST_EXTRA <<<"${PYTEST_XDIST:-} ${PYTEST_ARGS:-}"

run_api() { $COMPOSE run --rm --no-deps api "$@"; }
# Les tests tournent comme en CI (DJANGO_ENV=test) : l'environnement de dev (api.env) change des pages testées
run_api_test() { $COMPOSE run --rm --no-deps -e DJANGO_ENV=test -e DEFAULT_FILE_STORAGE=django.core.files.storage.FileSystemStorage api "$@"; }
# run_web <script> [args…] : les arguments sont passés à sh ($1…), jamais interpolés dans le script
run_web() { local s="$1"; shift; $COMPOSE run --rm --no-deps web sh -c "$PNPM_INSTALL && $s" sh "$@"; }

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
    api_paths=()
    web_paths=()
    for p in "$@"; do
      p="${p%/}"
      case "$p" in
        *" "*) die "chemin avec espace non supporté : $p" ;;
        *..*) die "chemin avec « .. » refusé : $p" ;;
        apps/api/*) [ -e "$p" ] || die "chemin inexistant : $p"; api_paths+=("${p#apps/api/}") ;;
        apps/web/*) [ -e "$p" ] || die "chemin inexistant : $p"; web_paths+=("${p#apps/web/}") ;;
        packages/*) [ -e "$p" ] || die "chemin inexistant : $p"; web_paths+=("../../$p") ;;
        *) die "chemin hors apps/api, apps/web et packages : $p" ;;
      esac
    done
    [ "${#api_paths[@]}" -eq 0 ] || garde api
    [ "${#web_paths[@]}" -eq 0 ] || garde web
    # Les chemins sont des arguments (jamais du shell)
    if [ "${#api_paths[@]}" -gt 0 ]; then run_api_test pytest "${api_paths[@]}" ${PYTEST_EXTRA[@]+"${PYTEST_EXTRA[@]}"} || pire $?; fi
    if [ "${#web_paths[@]}" -gt 0 ]; then run_web 'pnpm --filter @steamy/web exec vitest run "$@"' "${web_paths[@]}" || pire $?; fi
    ;;
  e2e-garde)
    # $1 = projet Compose de la stack e2e du lot. Jeton e2e : au plus une stack e2e simultanée (N = 1), tenu par un
    # verrou dans le dépôt git commun (pris AVANT la construction de l'image, rendu en fin de `make e2e` ou `e2e-down`).
    garde e2e
    projet="${1:?projet e2e requis}"
    jeton="$(git rev-parse --path-format=absolute --git-common-dir)/e2e.lock"
    if ! mkdir "$jeton" 2>/dev/null; then
      titulaire="$(cat "$jeton/projet" 2>/dev/null || true)"
      if [ "$titulaire" != "$projet" ]; then
        occupe="jeton e2e occupé par « ${titulaire:-inconnu} » (une seule stack e2e à la fois) : attendre sa fin, ou « make e2e-down » dans son worktree"
        if { [ -z "$titulaire" ] || [ -z "$(docker ps -aq --filter "label=com.docker.compose.project=$titulaire")" ]; } \
          && [ -n "$(find "$jeton" -maxdepth 0 -mmin "+$E2E_JETON_PERIME_MIN" 2>/dev/null)" ]; then
          # Reprise d'un jeton périmé : le déplacement (rename) est atomique, un seul candidat le réussit ;
          # les autres échouent (source disparue) et se déclarent perdants.
          perime="$jeton.perime.$$"
          mv "$jeton" "$perime" 2>/dev/null || die "$occupe"
          if [ "$(cat "$perime/projet" 2>/dev/null || true)" = "$titulaire" ] \
            && [ -n "$(find "$perime" -maxdepth 0 -mmin "+$E2E_JETON_PERIME_MIN")" ]; then
            rm -rf "$perime"
            mkdir "$jeton" 2>/dev/null || die "$occupe"
          else
            # Un jeton frais a été pris entre-temps : on le remet en place (rename) et on s'incline
            mv "$perime" "$jeton" 2>/dev/null || true
            die "$occupe"
          fi
        else
          die "$occupe"
        fi
      fi
    fi
    echo "$projet" >"$jeton/projet"
    ;;
  e2e-jeton-rendre)
    jeton="$(git rev-parse --path-format=absolute --git-common-dir)/e2e.lock"
    if [ "$(cat "$jeton/projet" 2>/dev/null || true)" = "${1:?projet e2e requis}" ]; then rm -rf "$jeton"; fi
    ;;
  e2e-fixtures-garde)
    garde web
    ;;
  *) die "cible inconnue : $cible" ;;
esac
exit "$rc"
