#!/usr/bin/env bash
# Environnement d'agent (méthode des chantiers, ADR 0007, docs/infra/agents.md).
#
#   scripts/agent-env.sh up <lot> <profil> <base>   worktree ../steamy-wt-<lot> + conteneurs applicatifs
#   scripts/agent-env.sh down <lot>                 arrête les conteneurs et volumes DE L'AGENT, conserve le reste
#   scripts/agent-env.sh status                     environnements, mémoire, budget
#   scripts/agent-env.sh budget                     budget_mo=<n> utilise_mo=<n> libre_mo=<n>
#
# Lancé par `make agent-up|agent-down|agent-status`, depuis le dépôt principal ou un worktree.
# L'infrastructure (PostgreSQL, Redis, RustFS, Mailpit) est celle de la stack principale (`make up`),
# jointe par le réseau `steamy-infra` : l'agent n'y reçoit que ses données (bases, buckets, numéros Redis).
# Compatible bash 3.2 (macOS).
set -euo pipefail

# --- Valeurs déclarées (mesurées : docs/infra/agents.md § « Valeurs déclarées ») -------------------------------
MAIN_STACK_MO=0   # mémoire de la stack principale en régime établi
MARGE_MO=2048     # marge laissée à la machine
COUT_MO_web=0
COUT_MO_api=0
COUT_MO_complet=0
# ---------------------------------------------------------------------------------------------------------------

INFRA_NETWORK="${INFRA_NETWORK:-steamy-infra}"
MAIN_PROJECT="steamy"
AWS_CLI_IMAGE="amazon/aws-cli:2.22.0"
NODE_IMAGE="node:24.18.0-alpine"
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.64.1-noble"

HINT=""
LOCK_HELD=0
die() { echo "agent-env : $*" >&2; exit 1; }
# Libère le verrou et, après un échec, rappelle les commandes de reprise (rien n'est supprimé automatiquement)
on_exit() {
  local rc=$?
  [ "$LOCK_HELD" = 1 ] && rmdir "$LOCK_DIR" 2>/dev/null
  if [ "$rc" -ne 0 ] && [ -n "$HINT" ]; then echo "$HINT" >&2; fi
  return 0
}
trap on_exit EXIT
info() { echo "agent-env : $*"; }

usage() {
  cat >&2 <<'EOF'
Usage :
  scripts/agent-env.sh up <lot> <profil> <base>   (profil : web | api | complet)
  scripts/agent-env.sh down <lot>
  scripts/agent-env.sh status
  scripts/agent-env.sh budget
EOF
  exit 2
}

GIT_COMMON="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || die "à lancer dans le dépôt Steamy"
MAIN_REPO="$(dirname "$GIT_COMMON")"
PARENT_DIR="$(dirname "$MAIN_REPO")"
LOCK_DIR="$GIT_COMMON/agent-env.lock"

check_lot() {
  local lot="$1"
  [[ "$lot" =~ ^[a-z0-9]+$ ]] || die "lot invalide « $lot » (attendu : lettres minuscules et chiffres, sans tiret)"
  case "$lot" in
    test | e2e) die "lot réservé « $lot » (noms réservés : test, e2e)" ;;
  esac
}

check_profil() {
  case "$1" in
    web | api | complet) ;;
    *) die "profil inconnu « $1 » (web|api|complet)" ;;
  esac
}

cout_profil() {
  case "$1" in
    web) echo "$COUT_MO_web" ;;
    api) echo "$COUT_MO_api" ;;
    complet) echo "$COUT_MO_complet" ;;
  esac
}

wt_dir() { echo "$PARENT_DIR/steamy-wt-$1"; }

# Lit VAR dans un fichier .agent.env (syntaxe `export VAR=valeur`) ; vide si absent
env_get() { sed -n "s/^export $2=//p" "$1" 2>/dev/null | head -1; }

compose_agent() { # <lot> <worktree> <args…> : docker compose du projet de l'agent, variables de .agent.env posées
  local lot="$1" wt="$2"
  shift 2
  (
    set -a
    # shellcheck disable=SC1091
    . "$wt/.agent.env"
    set +a
    cd "$wt"
    docker compose -p "steamy-ag-$lot" -f compose.yml -f compose.agent.yml "$@"
  )
}

main_container() { # <service> : conteneur de la stack principale
  docker ps --filter "label=com.docker.compose.project=$MAIN_PROJECT" \
    --filter "label=com.docker.compose.service=$1" --filter status=running --format '{{.Names}}' | head -1
}

projet_actif() { # <lot> : des conteneurs tournent-ils ?
  [ -n "$(docker ps -q --filter "label=com.docker.compose.project=steamy-ag-$1")" ]
}

docker_mem_mo() {
  local octets
  octets="$(docker info --format '{{.MemTotal}}')"
  echo $((octets / 1048576))
}

# Somme des coûts des lots réservés (flag AGENT_ACTIF=1), hors le lot passé en argument
utilise_mo() {
  local total=0 f profil actif
  for f in "$PARENT_DIR"/steamy-wt-*/.agent.env; do
    [ -f "$f" ] || continue
    [ "$(env_get "$f" AGENT_LOT)" = "${1:-}" ] && continue
    actif="$(env_get "$f" AGENT_ACTIF)"
    [ "$actif" = "1" ] || continue
    profil="$(env_get "$f" AGENT_PROFIL)"
    total=$((total + $(cout_profil "$profil")))
  done
  echo "$total"
}

budget_mo() { echo $(($(docker_mem_mo) - MAIN_STACK_MO - MARGE_MO)); }

cmd_budget() {
  local budget utilise
  budget="$(budget_mo)"
  utilise="$(utilise_mo "")"
  echo "budget_mo=$budget utilise_mo=$utilise libre_mo=$((budget - utilise))"
}

acquire_lock() {
  local i=0
  until mkdir "$LOCK_DIR" 2>/dev/null; do
    i=$((i + 1))
    [ "$i" -le 30 ] || die "verrou $LOCK_DIR toujours tenu après 30 s (un autre agent-up ? sinon rmdir le dossier)"
    sleep 1
  done
  LOCK_HELD=1
}

release_lock() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
  LOCK_HELD=0
}

# Première paire (c, c+1) de numéros Redis libre dans 2..15, d'après les environnements réservés
alloc_redis() {
  local c used f
  used=" "
  for f in "$PARENT_DIR"/steamy-wt-*/.agent.env; do
    [ -f "$f" ] || continue
    [ "$(env_get "$f" AGENT_ACTIF)" = "1" ] || continue
    used="$used$(env_get "$f" REDIS_DB_CACHE) $(env_get "$f" REDIS_DB_BROKER) "
  done
  c=2
  while [ "$c" -le 14 ]; do
    case "$used" in
      *" $c "* | *" $((c + 1)) "*) ;;
      *)
        echo "$c $((c + 1))"
        return 0
        ;;
    esac
    c=$((c + 2))
  done
  return 1
}

preambule() { # <profil> <base>
  local profil="$1" base="$2" svc
  command -v docker >/dev/null || die "docker introuvable"
  docker info >/dev/null 2>&1 || die "le démon Docker ne répond pas"
  for svc in postgres redis rustfs mailpit; do
    [ -n "$(main_container "$svc")" ] || die "la stack principale ne tourne pas (service $svc absent) : lancer « make up »"
  done
  docker network inspect "$INFRA_NETWORK" >/dev/null 2>&1 || die "réseau $INFRA_NETWORK absent : lancer « make up »"
  docker image inspect steamy-api >/dev/null 2>&1 || die "image steamy-api absente : lancer « make up » (construit les images)"
  docker image inspect "$AWS_CLI_IMAGE" >/dev/null 2>&1 || docker pull -q "$AWS_CLI_IMAGE" >/dev/null
  case "$profil" in
    web | complet) docker image inspect "$NODE_IMAGE" >/dev/null 2>&1 || docker pull -q "$NODE_IMAGE" >/dev/null ;;
  esac
  case "$profil" in
    complet) docker image inspect "$PLAYWRIGHT_IMAGE" >/dev/null 2>&1 || docker pull -q "$PLAYWRIGHT_IMAGE" >/dev/null ;;
  esac
  git rev-parse --verify --quiet "$base^{commit}" >/dev/null || die "branche de base « $base » introuvable"
}

ecrire_env() { # <fichier> <lot> <profil> <cache> <broker> <actif>
  cat >"$1" <<EOF
export AGENT_LOT=$2
export AGENT_PROFIL=$3
export AGENT_ACTIF=$6
export REDIS_DB_CACHE=$4
export REDIS_DB_BROKER=$5
export POSTGRES_DB=steamy_$2
export AWS_STORAGE_BUCKET_NAME=steamy-$2
export AWS_STORAGE_BUCKET_NAME_TEST=steamy-$2-test
EOF
}

creer_base() { # <nom>
  local pg
  pg="$(main_container postgres)"
  if [ "$(docker exec "$pg" psql -U steamy -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$1'")" != "1" ]; then
    docker exec "$pg" psql -U steamy -d postgres -qc "CREATE DATABASE \"$1\"" >/dev/null
    info "base $1 créée"
  else
    info "base $1 déjà présente (réutilisée)"
  fi
}

creer_bucket() { # <nom>
  local aws=(docker run --rm --network "$INFRA_NETWORK" -e AWS_ACCESS_KEY_ID=rustfsadmin -e AWS_SECRET_ACCESS_KEY=rustfsadmin
    -e AWS_DEFAULT_REGION=us-east-1 "$AWS_CLI_IMAGE" --endpoint-url http://rustfs:9000)
  if "${aws[@]}" s3api head-bucket --bucket "$1" >/dev/null 2>&1; then
    info "bucket $1 déjà présent (réutilisé)"
  else
    "${aws[@]}" s3 mb "s3://$1" >/dev/null
    info "bucket $1 créé"
  fi
}

cmd_up() {
  [ $# -eq 3 ] || usage
  local lot="$1" profil="$2" base="$3"
  check_lot "$lot"
  check_profil "$profil"
  local wt branch
  wt="$(wt_dir "$lot")"
  branch="$base-$lot"

  preambule "$profil" "$base"
  if projet_actif "$lot"; then
    die "lot « $lot » déjà actif (projet steamy-ag-$lot) : « make agent-down LOT=$lot » pour l'arrêter"
  fi

  # Worktree : créé, ou repris s'il est déjà sur la branche attendue
  local reprise=0
  if [ -d "$wt" ]; then
    if [ "$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null || true)" = "$branch" ]; then
      reprise=1
    else
      die "le dossier $wt existe déjà sur une autre branche : l'examiner, puis « git worktree remove $wt » si c'est un reste"
    fi
  elif git show-ref --verify --quiet "refs/heads/$branch"; then
    die "la branche $branch existe déjà sans worktree : « git worktree add $wt $branch » pour la reprendre, ou « git branch -d $branch » si c'est un reste"
  else
    git worktree add -q -b "$branch" "$wt" "$base"
    info "worktree $wt créé sur $branch"
  fi
  [ -f "$wt/compose.agent.yml" ] || die "$base ne contient pas compose.agent.yml (la base du chantier doit contenir le plan 1)"

  HINT="agent-env : échec. Reprise : scripts/agent-env.sh up $lot $profil $base (idempotent). Nettoyage : scripts/agent-env.sh down $lot puis git worktree remove --force $wt && git branch -D $branch (rien n'a été supprimé automatiquement)."

  # Réservation (verrou) : numéros Redis, budget, .agent.env
  local cache broker pair
  acquire_lock
  if [ -f "$wt/.agent.env" ]; then
    cache="$(env_get "$wt/.agent.env" REDIS_DB_CACHE)"
    broker="$(env_get "$wt/.agent.env" REDIS_DB_BROKER)"
  else
    pair="$(alloc_redis)" || die "plus de numéro de base Redis libre"
    cache="${pair% *}"
    broker="${pair#* }"
  fi
  local budget utilise cout
  budget="$(budget_mo)"
  utilise="$(utilise_mo "$lot")"
  cout="$(cout_profil "$profil")"
  if [ $((utilise + cout)) -gt "$budget" ]; then
    die "budget mémoire dépassé : profil $profil = $cout Mo, déjà utilisés $utilise Mo, budget $budget Mo (libre $((budget - utilise)) Mo). Attendre la fin d'un lot (« make agent-status »)"
  fi
  ecrire_env "$wt/.agent.env" "$lot" "$profil" "$cache" "$broker" 1
  release_lock

  creer_base "steamy_$lot"
  creer_bucket "steamy-$lot"
  creer_bucket "steamy-$lot-test"

  local services
  case "$profil" in
    api) services="api worker" ;;
    web) services="web" ;;
    complet) services="api worker web" ;;
  esac
  info "démarrage des conteneurs ($services)"
  # shellcheck disable=SC2086
  if ! compose_agent "$lot" "$wt" up -d --wait $services; then
    compose_agent "$lot" "$wt" logs --tail 50 $services >&2 || true
    die "les conteneurs de l'agent ne sont pas sains (logs ci-dessus)"
  fi

  HINT=""
  cat <<EOF

Environnement d'agent prêt
  lot        $lot (profil $profil, coût déclaré $cout Mo)
  worktree   $wt
  branche    $branch$([ "$reprise" = 1 ] && echo " (reprise)")
  projet     steamy-ag-$lot
  bases      steamy_$lot, test_steamy_$lot (créée par Django au premier test)
  buckets    steamy-$lot, steamy-$lot-test
  Redis      cache $cache, broker $broker
  ensuite    cd $wt && make test-cible T=… | make coverage-diff BASE=…
EOF
}

cmd_down() {
  [ $# -eq 1 ] || usage
  local lot="$1"
  check_lot "$lot"
  local wt
  wt="$(wt_dir "$lot")"
  [ -f "$wt/.agent.env" ] || die "lot « $lot » inconnu (pas de $wt/.agent.env) : rien à arrêter"
  local cache broker redis
  cache="$(env_get "$wt/.agent.env" REDIS_DB_CACHE)"
  broker="$(env_get "$wt/.agent.env" REDIS_DB_BROKER)"

  # Stack e2e du lot, si elle existe (projet propre, jamais celui d'un autre lot)
  if [ -n "$(docker ps -aq --filter "label=com.docker.compose.project=steamy-e2e-$lot")" ]; then
    (cd "$wt" && AGENT_LOT="$lot" make e2e-down) || info "arrêt de la stack e2e du lot en échec (voir « make e2e-down » dans le worktree)"
  fi
  compose_agent "$lot" "$wt" down -v --remove-orphans
  redis="$(main_container redis)"
  if [ -n "$redis" ]; then
    docker exec "$redis" redis-cli -n "$cache" FLUSHDB >/dev/null
    docker exec "$redis" redis-cli -n "$broker" FLUSHDB >/dev/null
  fi
  sed -i.bak 's/^export AGENT_ACTIF=1$/export AGENT_ACTIF=0/' "$wt/.agent.env" && rm -f "$wt/.agent.env.bak"

  cat <<EOF

Lot $lot arrêté. Conservés : worktree $wt, branche, bases steamy_$lot et test_steamy_$lot*, buckets steamy-$lot et steamy-$lot-test, .agent.env (mêmes numéros Redis à la reprise).
Nettoyage final (à lancer à la main, une fois le lot fusionné) :
  git worktree remove --force $wt && git branch -d <branche-du-lot>
  docker exec \$(docker ps -q --filter label=com.docker.compose.project=$MAIN_PROJECT --filter label=com.docker.compose.service=postgres) \\
    sh -c 'for d in steamy_$lot test_steamy_$lot; do dropdb -U steamy --if-exists "\$d"; done'
  (bases xdist : test_steamy_${lot}_gwN ; buckets : aws s3 rb s3://steamy-$lot s3://steamy-$lot-test --force sur $INFRA_NETWORK)
EOF
}

mem_projet_mo() { # <projet> : mémoire courante en Mo
  local ids
  ids="$(docker ps -q --filter "label=com.docker.compose.project=$1")"
  [ -n "$ids" ] || { echo 0; return 0; }
  # shellcheck disable=SC2086
  docker stats --no-stream --format '{{.MemUsage}}' $ids 2>/dev/null |
    awk '{ v=$1; if (v ~ /GiB$/) { sub(/GiB/,"",v); s+=v*1024 } else if (v ~ /MiB$/) { sub(/MiB/,"",v); s+=v } else if (v ~ /KiB$/) { sub(/KiB/,"",v); s+=v/1024 } } END { printf "%d", s }'
}

cmd_status() {
  local f lot n=0 etat profil
  for f in "$PARENT_DIR"/steamy-wt-*/.agent.env; do
    [ -f "$f" ] || continue
    lot="$(env_get "$f" AGENT_LOT)"
    profil="$(env_get "$f" AGENT_PROFIL)"
    if projet_actif "$lot"; then
      etat="actif, $(mem_projet_mo "steamy-ag-$lot") Mo"
    elif [ "$(env_get "$f" AGENT_ACTIF)" = "1" ]; then
      etat="réservé, conteneurs arrêtés"
    else
      continue
    fi
    n=$((n + 1))
    echo "lot=$lot profil=$profil $etat worktree=$(dirname "$f") bases=steamy_$lot,test_steamy_$lot redis=$(env_get "$f" REDIS_DB_CACHE),$(env_get "$f" REDIS_DB_BROKER)"
  done
  [ "$n" -gt 0 ] || echo "Aucun environnement d'agent."
  cmd_budget
}

[ $# -ge 1 ] || usage
sub="$1"
shift
case "$sub" in
  up) cmd_up "$@" ;;
  down) cmd_down "$@" ;;
  status) cmd_status ;;
  budget) cmd_budget ;;
  *) usage ;;
esac
