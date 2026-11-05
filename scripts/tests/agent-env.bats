#!/usr/bin/env bats
load helpers

setup() { setup_env; }

AE() { "$SCRIPTS/agent-env.sh" "$@"; }

# --- A : validation des arguments ------------------------------------------------------------------------------

@test "A1 sans argument ou sous-commande inconnue : usage, code 2" {
  run AE
  [ "$status" -eq 2 ]
  run AE nimporte
  [ "$status" -eq 2 ]
  run AE up lot1 web
  [ "$status" -eq 2 ]
  run AE down
  [ "$status" -eq 2 ]
}

@test "A2 lots invalides refusés avant tout appel docker (injection comprise)" {
  for lot in "Lot1" "lot-1" "lot_1" "a;b" '$(touch pwned)' "a'b" 'a`b`' "a b" "$(printf 'a%.0s' $(seq 1 47))"; do
    run AE up "$lot" web feature/base
    [ "$status" -eq 1 ]
    assert_output_contains "lot invalide"
  done
  refute_call '^docker'
  [ ! -e pwned ]
}

@test "A2b un lot de 46 caractères (maximum) passe la validation" {
  lot="$(printf 'a%.0s' $(seq 1 46))"
  run AE up "$lot" web feature/base
  case "$output" in *"lot invalide"*) false ;; esac
}

@test "A3 lots réservés test et e2e refusés" {
  for lot in test e2e; do
    run AE up "$lot" web feature/base
    [ "$status" -eq 1 ]
    assert_output_contains "lot réservé"
  done
}

@test "A4 profil inconnu refusé" {
  run AE up lot1 gros feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "profil inconnu"
  refute_call '^docker'
}

@test "A5 BASE inexistante refusée, rien n'est créé" {
  run AE up lot1 web branche/inconnue
  [ "$status" -eq 1 ]
  assert_output_contains "introuvable"
  refute_call 'worktree add'
}

@test "A5b BASE commençant par un tiret refusée" {
  run AE up lot1 web -x
  [ "$status" -eq 1 ]
  assert_output_contains "base invalide"
  refute_call '^docker'
}

@test "A5c la base est vérifiée avec --end-of-options" {
  run AE up lot1 web feature/base
  assert_call 'rev-parse --verify --quiet --end-of-options feature/base\^\{commit\}'
}

@test "A6 BASE sans compose.agent.yml refusée, rien n'est créé" {
  : >"$FIX/no_compose_agent"
  run AE up lot1 web feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "compose.agent.yml"
  refute_call 'worktree add'
}

# --- B0 : préambule ---------------------------------------------------------------------------------------------

@test "B0 stack principale absente : refus nommant le service" {
  rm "$FIX/ps/steamy.redis"
  run AE up lot1 web feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "service redis absent"
  refute_call 'worktree add'
}

@test "B0b démon Docker muet : refus" {
  FAKE_DOCKER_INFO_RC=1 run AE up lot1 web feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "démon Docker"
}

@test "B0c réseau d'infrastructure absent : refus" {
  FAKE_NETWORK_RC=1 run AE up lot1 web feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "steamy-infra absent"
}

@test "B0d image steamy-api absente : refus" {
  FAKE_IMAGE_MISSING="steamy-api" run AE up lot1 web feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "image steamy-api absente"
}

@test "B0e stack principale lancée depuis un autre dossier que le dépôt principal : avertissement" {
  FAKE_PG_WORKDIR="$ROOT/steamy-wt-ailleurs" run AE up lot1 web feature/base
  assert_output_contains "avertissement"
  assert_output_contains "$ROOT/steamy-wt-ailleurs"
  # Un avertissement, pas un refus : le lot est créé
  [ "$status" -eq 0 ]
}

@test "B0f stack principale lancée depuis le dépôt principal : pas d'avertissement" {
  run AE up lot1 web feature/base
  [ "$status" -eq 0 ]
  case "$output" in *avertissement*) false ;; esac
}

@test "B0g lot déjà actif refusé" {
  lot_conteneurs lot1
  run AE up lot1 web feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "déjà actif"
}

@test "B0h branche existante sans worktree, ou dossier sur une autre branche : refus" {
  echo "feature/base-lot1" >"$FIX/branches"
  run AE up lot1 web feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "existe déjà sans worktree"
  : >"$FIX/branches"
  mkdir -p "$(wt_of lot2)"
  lot_branche lot2 autre
  run AE up lot2 web feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "autre branche"
}

# --- B1-B3 : numéros Redis --------------------------------------------------------------------------------------

@test "B1 premier lot : paire 2,3 ; deuxième : 4,5 ; un trou est comblé" {
  run AE up lot1 web feature/base
  [ "$status" -eq 0 ]
  [ "$(env_value lot1 REDIS_DB_CACHE)" = 2 ]
  [ "$(env_value lot1 REDIS_DB_BROKER)" = 3 ]
  run AE up lot2 api feature/base
  [ "$status" -eq 0 ]
  [ "$(env_value lot2 REDIS_DB_CACHE)" = 4 ]
  [ "$(env_value lot2 REDIS_DB_BROKER)" = 5 ]
  lot_env trou a 2 3 1
  rm -rf "$(wt_of lot1)"
  run AE up lot3 api feature/base
  [ "$(env_value lot3 REDIS_DB_CACHE)" = 6 ]
}

@test "B1b les sept paires prises : plus de numéro libre, code 75, rien créé" {
  n=2
  for l in a b c d e f g; do lot_env "$l" api "$n" $((n + 1)) 1; n=$((n + 2)); done
  FAKE_MEM_MO=99999 run AE up lot1 api feature/base
  [ "$status" -eq 75 ]
  assert_output_contains "plus de numéro de base Redis libre"
  refute_call 'worktree add'
}

@test "B2 (critique) reprise d'un lot dont la paire a été prise par un autre lot actif : réattribution annoncée" {
  # lot1 arrêté (AGENT_ACTIF=0) garde 2,3 ; lot2 actif a pris 2,3 entre-temps
  lot_env lot1 api 2 3 0
  lot_branche lot1 feature/base-lot1
  lot_env lot2 api 2 3 1
  run AE up lot1 api feature/base
  [ "$status" -eq 0 ]
  [ "$(env_value lot1 REDIS_DB_CACHE)" = 4 ]
  [ "$(env_value lot1 REDIS_DB_BROKER)" = 5 ]
  assert_output_contains "réattribu"
  # lot2 n'est pas touché
  [ "$(env_value lot2 REDIS_DB_CACHE)" = 2 ]
}

@test "B2b reprise sans conflit : mêmes numéros, aucune réattribution" {
  lot_env lot1 api 6 7 0
  lot_branche lot1 feature/base-lot1
  lot_env lot2 api 2 3 1
  run AE up lot1 api feature/base
  [ "$status" -eq 0 ]
  [ "$(env_value lot1 REDIS_DB_CACHE)" = 6 ]
  [ "$(env_value lot1 REDIS_DB_BROKER)" = 7 ]
  case "$output" in *réattribu*) false ;; esac
}

@test "B2c reprise : un seul numéro de la paire pris (chevauchement) : réattribution" {
  lot_env lot1 api 6 7 0
  lot_branche lot1 feature/base-lot1
  lot_env lot2 api 7 8 1
  run AE up lot1 api feature/base
  [ "$status" -eq 0 ]
  [ "$(env_value lot1 REDIS_DB_CACHE)" = 2 ]
}

@test "B2d reprise avec des numéros corrompus : réattribution" {
  lot_env lot1 api 0 abc 0
  lot_branche lot1 feature/base-lot1
  run AE up lot1 api feature/base
  [ "$status" -eq 0 ]
  [ "$(env_value lot1 REDIS_DB_CACHE)" = 2 ]
}

@test "B3 les numéros d'un lot arrêté sont réattribuables à un nouveau lot" {
  lot_env vieux api 2 3 0
  run AE up lot1 api feature/base
  [ "$status" -eq 0 ]
  [ "$(env_value lot1 REDIS_DB_CACHE)" = 2 ]
}

# --- B4-B5 : verrou et échecs -------------------------------------------------------------------------------------

@test "B4 verrou tenu : abandon après le délai, verrou d'autrui conservé, rien de destructif" {
  mkdir -p "$FAKE_GIT_COMMON/agent-env.lock"
  run AE up lot1 web feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "verrou"
  [ -d "$FAKE_GIT_COMMON/agent-env.lock" ]
  refute_destructif
  refute_call 'worktree add'
}

@test "B5 conteneurs non sains : code non nul, rappel de reprise, verrou libéré, rien de supprimé" {
  FAKE_COMPOSE_UP_RC=1 run AE up lot1 web feature/base
  [ "$status" -ne 0 ]
  assert_output_contains "Reprise : scripts/agent-env.sh up lot1 web feature/base"
  [ ! -d "$FAKE_GIT_COMMON/agent-env.lock" ]
  refute_destructif
}

@test "up nominal : worktree sur <base>-<lot>, bases, buckets, .agent.env, conteneurs du profil" {
  run AE up lot1 complet feature/base
  [ "$status" -eq 0 ]
  assert_call "git worktree add -q -b feature/base-lot1 $ROOT/steamy-wt-lot1 feature/base"
  assert_call 'CREATE DATABASE "steamy_lot1"'
  assert_call 'up -d --wait api worker web'
  [ "$(env_value lot1 AGENT_ACTIF)" = 1 ]
  [ "$(env_value lot1 POSTGRES_DB)" = steamy_lot1 ]
  [ ! -d "$FAKE_GIT_COMMON/agent-env.lock" ]
}

@test "up profil api : api et worker seulement ; profil web : web seulement" {
  run AE up lot1 api feature/base
  assert_call 'up -d --wait api worker$'
  run AE up lot2 web feature/base
  assert_call 'up -d --wait web$'
}

# --- C : budget mémoire ------------------------------------------------------------------------------------------

@test "C1 MemTotal 13958 Mo : budget 9910 Mo" {
  run AE budget
  [ "$status" -eq 0 ]
  [ "$output" = "budget_mo=9910 utilise_mo=0 libre_mo=9910" ]
}

@test "C2 complet + web accepté (9900 <= 9910)" {
  lot_env lot1 complet 2 3 1
  run AE up lot2 web feature/base
  [ "$status" -eq 0 ]
}

@test "C3 complet + complet refusé : code 75, message chiffré, sans git worktree add" {
  lot_env lot1 complet 2 3 1
  run AE up lot2 complet feature/base
  [ "$status" -eq 75 ]
  assert_output_contains "budget mémoire dépassé"
  assert_output_contains "6500"
  refute_call 'worktree add'
  [ ! -e "$(wt_of lot2)" ]
  [ ! -d "$FAKE_GIT_COMMON/agent-env.lock" ]
}

@test "C3b un lot arrêté (AGENT_ACTIF=0) n'est pas compté" {
  lot_env lot1 complet 2 3 0
  run AE up lot2 complet feature/base
  [ "$status" -eq 0 ]
  run AE budget
  [ "$output" = "budget_mo=9910 utilise_mo=6500 libre_mo=3410" ]
}

@test "C3c la reprise d'un lot ne compte pas son propre coût" {
  lot_env lot1 complet 2 3 1
  lot_branche lot1 feature/base-lot1
  run AE up lot1 complet feature/base
  [ "$status" -eq 0 ]
}

@test "C4 profil inconnu chez un tiers : compté au pire coût (complet) avec avertissement, sans planter" {
  lot_env lot1 mystere 2 3 1
  run AE budget
  [ "$status" -eq 0 ]
  assert_output_contains "utilise_mo=6500"
  assert_output_contains "profil inconnu"
}

# --- D : down ---------------------------------------------------------------------------------------------------

lot_pret() { lot_env lot1 api 2 3 1; lot_conteneurs lot1; }

@test "D1 down n'agit que sur le projet du lot, jamais -p steamy ni steamy-e2e sans lot" {
  lot_pret
  run AE down lot1
  [ "$status" -eq 0 ]
  assert_call 'compose -p steamy-ag-lot1 .*--profile fixtures down -v --remove-orphans'
  refute_call '-p steamy( |$)'
  refute_call '-p steamy-e2e( |$)'
}

@test "D2 down vide exactement les deux numéros du lot, jamais FLUSHALL ni -n 0 / -n 1" {
  lot_pret
  run AE down lot1
  assert_call 'redis-cli -n 2 FLUSHDB'
  assert_call 'redis-cli -n 3 FLUSHDB'
  refute_call 'FLUSHALL'
  refute_call 'redis-cli -n [01] '
}

@test "D3 .agent.env corrompu (numéro 0, 1, 16, texte, vide) : refus avant tout FLUSHDB et tout arrêt" {
  for v in 0 1 16 abc ""; do
    lot_env lot1 api "$v" 3 1
    : >"$CALLS_LOG"
    run AE down lot1
    [ "$status" -eq 1 ]
    assert_output_contains "corrompu"
    refute_call 'FLUSHDB'
    refute_call 'compose'
  done
  lot_env lot1 api 2 99 1
  run AE down lot1
  [ "$status" -eq 1 ]
}

@test "D3b .agent.env d'un autre lot que celui demandé : refus" {
  lot_env lot1 api 2 3 1
  sed -i.bak 's/AGENT_LOT=lot1/AGENT_LOT=lotx/' "$(wt_of lot1)/.agent.env"
  run AE down lot1
  [ "$status" -eq 1 ]
  refute_call 'FLUSHDB'
}

@test "D4 lot inconnu : refus" {
  run AE down inconnu
  [ "$status" -eq 1 ]
  assert_output_contains "inconnu"
}

@test "D5 Redis absent : toléré, « Redis non vidé », AGENT_ACTIF=0" {
  lot_pret
  rm "$FIX/ps/steamy.redis"
  run AE down lot1
  [ "$status" -eq 0 ]
  assert_output_contains "Redis non vidé"
  refute_call 'FLUSHDB'
  [ "$(env_value lot1 AGENT_ACTIF)" = 0 ]
}

@test "D6 FLUSHDB en échec : avertissement et AGENT_ACTIF=0 quand même" {
  lot_pret
  FAKE_REDIS_RC=1 run AE down lot1
  [ "$status" -eq 0 ]
  assert_output_contains "avertissement"
  [ "$(env_value lot1 AGENT_ACTIF)" = 0 ]
}

@test "D7 down conserve worktree, branche et bases : rien de destructif exécuté, .agent.env gardé" {
  lot_pret
  run AE down lot1
  refute_destructif
  [ -f "$(wt_of lot1)/.agent.env" ]
  [ "$(env_value lot1 REDIS_DB_CACHE)" = 2 ]
  assert_output_contains "Conservés"
}

@test "D7b arrêt des conteneurs en échec : code non nul, le lot reste réservé" {
  lot_pret
  FAKE_COMPOSE_DOWN_RC=1 run AE down lot1
  [ "$status" -ne 0 ]
  [ "$(env_value lot1 AGENT_ACTIF)" = 1 ]
}

@test "D8 down rend le jeton e2e du lot (même sans stack e2e), pas celui d'un autre" {
  lot_pret
  mkdir -p "$FAKE_GIT_COMMON/e2e.lock"
  echo "steamy-e2e-lot1" >"$FAKE_GIT_COMMON/e2e.lock/projet"
  run AE down lot1
  [ "$status" -eq 0 ]
  [ ! -e "$FAKE_GIT_COMMON/e2e.lock" ]
  lot_pret
  mkdir -p "$FAKE_GIT_COMMON/e2e.lock"
  echo "steamy-e2e-lot2" >"$FAKE_GIT_COMMON/e2e.lock/projet"
  run AE down lot1
  [ -d "$FAKE_GIT_COMMON/e2e.lock" ]
}

@test "D8b stack e2e du lot présente : make e2e-down lancé avec AGENT_LOT du lot" {
  lot_pret
  echo "c9" >"$FIX/ps/steamy-e2e-lot1"
  run AE down lot1
  assert_call 'make e2e-down \[AGENT_LOT=lot1\]'
}

# --- E : status -----------------------------------------------------------------------------------------------

@test "E1 status sans environnement : message et budget" {
  run AE status
  [ "$status" -eq 0 ]
  assert_output_contains "Aucun environnement d'agent."
  assert_output_contains "budget_mo=9910"
}

@test "E2 status : lot actif avec sa mémoire, lot réservé, lot arrêté omis" {
  lot_env lot1 api 2 3 1
  lot_conteneurs lot1
  lot_env lot2 web 4 5 1
  lot_env lot3 web 6 7 0
  FAKE_STATS="1.5GiB / 4GiB" run AE status
  [ "$status" -eq 0 ]
  assert_output_contains "lot=lot1 profil=api actif, 1536 Mo"
  assert_output_contains "lot=lot2 profil=web réservé, conteneurs arrêtés"
  case "$output" in *lot=lot3*) false ;; esac
  assert_output_contains "utilise_mo=4600"
}
