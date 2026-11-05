#!/usr/bin/env bats
load helpers

setup() {
  setup_env
  mkdir -p apps/api/apps/core apps/web/src/lib packages/api-client
  : >apps/web/src/lib/a.test.ts
}

CI() { "$SCRIPTS/cibles.sh" "$@"; }

# --- G1 : garde par profil ----------------------------------------------------------------------------------------

@test "G1 profil web : lint front seulement ; typecheck permis ; API, generate et e2e refusés avant tout conteneur" {
  AGENT_PROFIL=web run CI lint
  [ "$status" -eq 0 ]
  assert_call 'pnpm lint'
  refute_call 'ruff'
  AGENT_PROFIL=web run CI typecheck
  [ "$status" -eq 0 ]
  : >"$CALLS_LOG"
  for c in generate check-generated migrations-check; do
    AGENT_PROFIL=web run CI "$c"
    [ "$status" -eq 1 ]
  done
  AGENT_PROFIL=web run CI e2e-garde steamy-e2e-x
  [ "$status" -eq 1 ]
  refute_call 'compose'
}

@test "G1b profil api : lint ruff seulement ; typecheck refusé ; generate permis" {
  AGENT_PROFIL=api run CI lint
  [ "$status" -eq 0 ]
  assert_call 'ruff check'
  refute_call 'pnpm'
  AGENT_PROFIL=api run CI typecheck
  [ "$status" -eq 1 ]
  AGENT_PROFIL=api run CI migrations-check
  [ "$status" -eq 0 ]
  assert_call 'makemigrations --check --dry-run'
  AGENT_PROFIL=api run CI generate
  [ "$status" -eq 0 ]
  AGENT_PROFIL=api run CI e2e-garde steamy-e2e-x
  [ "$status" -eq 1 ]
}

@test "G1c profil complet et stack principale : tout est permis" {
  for p in complet ""; do
    AGENT_PROFIL="$p" run CI lint
    [ "$status" -eq 0 ]
    AGENT_PROFIL="$p" run CI typecheck
    [ "$status" -eq 0 ]
    AGENT_PROFIL="$p" run CI generate
    [ "$status" -eq 0 ]
  done
  assert_call 'ruff check'
  assert_call 'pnpm lint'
}

@test "G1d cible inconnue ou absente : refus" {
  run CI
  [ "$status" -eq 1 ]
  run CI nimporte
  [ "$status" -eq 1 ]
}

@test "G1e le pire code de sortie gagne (lint : API ok, front en échec)" {
  FAKE_RUN_RC=3 run CI lint
  [ "$status" -eq 3 ]
}

@test "G1f environnement arrêté (AGENT_ACTIF=0) : toute cible refusée, sauf le rendu du jeton" {
  AGENT_ACTIF=0 AGENT_PROFIL=complet run CI lint
  [ "$status" -eq 1 ]
  assert_output_contains "arrêté"
  refute_call 'compose'
  AGENT_ACTIF=0 run CI e2e-jeton-rendre steamy-e2e-x
  [ "$status" -eq 0 ]
}

# --- G2 : test-cible -------------------------------------------------------------------------------------------------

@test "G2 test-cible sans chemin, hors périmètre, avec .., inexistant ou avec espace : refus" {
  run CI test-cible
  [ "$status" -eq 1 ]
  run CI test-cible etc/passwd
  [ "$status" -eq 1 ]
  run CI test-cible apps/api/../../secret
  [ "$status" -eq 1 ]
  run CI test-cible apps/api/apps/absent
  [ "$status" -eq 1 ]
  run CI test-cible "apps/api/apps/core x"
  [ "$status" -eq 1 ]
  refute_call 'compose'
}

@test "G2b test-cible : chemins API et front passés en arguments distincts" {
  run CI test-cible apps/api/apps/core apps/web/src/lib/a.test.ts packages/api-client
  [ "$status" -eq 0 ]
  assert_call 'pytest apps/core'
  assert_call 'vitest run "\$@" sh src/lib/a.test.ts ../../packages/api-client'
}

@test "G2c test-cible : un chemin hostile est une donnée, jamais du shell" {
  d='apps/web/src/a$(touch${IFS}pwned)'
  mkdir -p "$d"
  run CI test-cible "$d"
  [ "$status" -eq 0 ]
  grep -qF 'sh src/a$(touch${IFS}pwned)' "$CALLS_LOG"
  [ ! -e pwned ]
}

@test "G2d test-cible refuse selon le profil" {
  AGENT_PROFIL=web run CI test-cible apps/api/apps/core
  [ "$status" -eq 1 ]
  AGENT_PROFIL=api run CI test-cible apps/web/src/lib
  [ "$status" -eq 1 ]
  refute_call 'compose'
}

# --- G3 : jeton e2e -----------------------------------------------------------------------------------------------

jeton() { echo "$FAKE_GIT_COMMON/e2e.lock"; }

@test "G3 jeton libre : pris, au nom du projet ; idempotent pour le même projet" {
  run CI e2e-garde steamy-e2e-a
  [ "$status" -eq 0 ]
  [ "$(cat "$(jeton)/projet")" = steamy-e2e-a ]
  run CI e2e-garde steamy-e2e-a
  [ "$status" -eq 0 ]
}

@test "G3b jeton occupé par un autre projet : refus nommant le titulaire" {
  run CI e2e-garde steamy-e2e-a
  run CI e2e-garde steamy-e2e-b
  [ "$status" -eq 1 ]
  assert_output_contains "steamy-e2e-a"
  [ "$(cat "$(jeton)/projet")" = steamy-e2e-a ]
}

@test "G3c jeton périmé (plus de 30 min) sans conteneur : repris" {
  run CI e2e-garde steamy-e2e-a
  touch -t 202001010000 "$(jeton)"
  run CI e2e-garde steamy-e2e-b
  [ "$status" -eq 0 ]
  [ "$(cat "$(jeton)/projet")" = steamy-e2e-b ]
  ls "$FAKE_GIT_COMMON" | grep -qv perime || true
  [ -z "$(ls -d "$FAKE_GIT_COMMON"/e2e.lock.* 2>/dev/null)" ]
}

@test "G3d jeton périmé mais conteneurs encore présents, ou jeton récent : refus" {
  run CI e2e-garde steamy-e2e-a
  touch -t 202001010000 "$(jeton)"
  echo c1 >"$FIX/ps/steamy-e2e-a"
  run CI e2e-garde steamy-e2e-b
  [ "$status" -eq 1 ]
  rm "$FIX/ps/steamy-e2e-a"
  touch "$(jeton)"
  run CI e2e-garde steamy-e2e-b
  [ "$status" -eq 1 ]
}

@test "G3e reprise concurrente d'un jeton périmé : un seul gagnant" {
  run CI e2e-garde steamy-e2e-a
  touch -t 202001010000 "$(jeton)"
  for p in b c d e f g; do
    ( "$SCRIPTS/cibles.sh" e2e-garde "steamy-e2e-$p" >/dev/null 2>&1; echo $? >"$BATS_TEST_TMPDIR/rc.$p" ) &
  done
  wait
  gagnants="$(grep -lx 0 "$BATS_TEST_TMPDIR"/rc.* | wc -l)"
  [ "$gagnants" -eq 1 ]
  titulaire="$(cat "$(jeton)/projet")"
  [ -f "$BATS_TEST_TMPDIR/rc.${titulaire##*-}" ]
}

# --- G4 : rendu du jeton --------------------------------------------------------------------------------------------

@test "G4 le jeton n'est rendu que par son titulaire" {
  run CI e2e-garde steamy-e2e-a
  run CI e2e-jeton-rendre steamy-e2e-b
  [ "$status" -eq 0 ]
  [ -d "$(jeton)" ]
  run CI e2e-jeton-rendre steamy-e2e-a
  [ "$status" -eq 0 ]
  [ ! -e "$(jeton)" ]
}

@test "G4b rendre un jeton absent : sans erreur ; sans projet : refus" {
  run CI e2e-jeton-rendre steamy-e2e-a
  [ "$status" -eq 0 ]
  run CI e2e-jeton-rendre
  [ "$status" -ne 0 ]
}

@test "G2d test-cible : PYTEST_XDIST et PYTEST_ARGS sont ajoutés à pytest, découpés en mots, pas au front" {
  PYTEST_XDIST="-n auto" PYTEST_ARGS="--maxfail=0 -q" run CI test-cible apps/api/apps/core apps/web/src/lib/a.test.ts
  [ "$status" -eq 0 ]
  assert_call 'pytest apps/core -n auto --maxfail=0 -q'
  refute_call 'vitest run .*-n auto'
}

@test "G2e test-cible : sans variable, pytest n'a que les chemins" {
  run CI test-cible apps/api/apps/core
  [ "$status" -eq 0 ]
  assert_call 'pytest apps/core$'
}
