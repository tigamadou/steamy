#!/usr/bin/env bats

load helpers

setup() {
  fake_gh
  SCRIPT="$SCRIPTS_DIR/labels.sh"
}

creations() { grep -c '^label create ' "$GH_LOG"; }

@test "crée les 13 labels fixes plus chantier:<slug>" {
  run "$SCRIPT" mon-chantier
  [ "$status" -eq 0 ]
  [ "$(creations)" -eq 14 ]
  grep -q '^label create chantier:mon-chantier ' "$GH_LOG"
  for l in role:dev role:testeur role:planificateur type:lot type:ci type:test type:revue \
           etat:pret etat:en-cours etat:en-revue etat:a-corriger etat:bloque revue:ok; do
    grep -q "^label create $l " "$GH_LOG"
  done
}

@test "chaque appel porte --force" {
  run "$SCRIPT" mon-chantier
  [ "$status" -eq 0 ]
  [ "$(grep -c -- '--force' "$GH_LOG")" -eq 14 ]
}

@test "deuxième exécution identique, code 0" {
  run "$SCRIPT" mon-chantier
  [ "$status" -eq 0 ]
  cp "$GH_LOG" "$BATS_TEST_TMPDIR/premier.log"
  : > "$GH_LOG"
  run "$SCRIPT" mon-chantier
  [ "$status" -eq 0 ]
  diff "$GH_LOG" "$BATS_TEST_TMPDIR/premier.log"
}

@test "lots passés → lot:<id> créés" {
  run "$SCRIPT" mon-chantier 1 2b
  [ "$status" -eq 0 ]
  [ "$(creations)" -eq 16 ]
  grep -q '^label create lot:1 ' "$GH_LOG"
  grep -q '^label create lot:2b ' "$GH_LOG"
}

@test "les labels portent couleur et description" {
  run "$SCRIPT" mon-chantier
  [ "$status" -eq 0 ]
  [ "$(grep -c -- '--color ' "$GH_LOG")" -eq 14 ]
  [ "$(grep -c -- '--description ' "$GH_LOG")" -eq 14 ]
}

@test "échec gh → code non nul" {
  FAKE_GH_FAIL="etat:bloque" run "$SCRIPT" mon-chantier
  [ "$status" -ne 0 ]
}

@test "échec gh sur un label de lot → code non nul" {
  FAKE_GH_FAIL="lot:2b" run "$SCRIPT" mon-chantier 1 2b
  [ "$status" -ne 0 ]
}

@test "slug absent → 2" {
  run "$SCRIPT"
  [ "$status" -eq 2 ]
  [ "$(creations)" -eq 0 ]
}
