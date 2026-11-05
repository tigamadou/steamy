#!/usr/bin/env bats

load helpers

setup() {
  make_repo
  SCRIPT="$SCRIPTS_DIR/check-perimetre.sh"
}

run_check() { run "$SCRIPT" 3 "$PLAN" base; }

@test "fichier dans le périmètre → 0" {
  write_plan '`src/**`'
  commit_files src/a.ts
  run_check
  [ "$status" -eq 0 ]
  [[ "$output" == *"Périmètre OK (1 fichiers)"* ]]
}

@test "fichier hors périmètre → 1 et nom listé" {
  write_plan '`src/**`'
  commit_files lib/a.ts
  run_check
  [ "$status" -eq 1 ]
  [[ "$output" == *"HORS PÉRIMÈTRE : lib/a.ts"* ]]
}

@test "plusieurs fichiers hors périmètre → tous listés" {
  write_plan '`src/**`'
  commit_files src/ok.ts lib/a.ts docs/b.md
  run_check
  [ "$status" -eq 1 ]
  [[ "$output" == *"HORS PÉRIMÈTRE : lib/a.ts"* ]]
  [[ "$output" == *"HORS PÉRIMÈTRE : docs/b.md"* ]]
  [[ "$output" != *"src/ok.ts"* ]]
}

@test "glob ** couvre les sous-dossiers" {
  write_plan '`src/**`'
  commit_files src/a/b/c.ts
  run_check
  [ "$status" -eq 0 ]
}

@test "glob ** refuse un autre dossier" {
  write_plan '`src/**`'
  commit_files lib/a.ts
  run_check
  [ "$status" -eq 1 ]
}

@test "glob * ne traverse pas les dossiers" {
  write_plan '`src/*.ts`'
  commit_files src/a/b.ts
  run_check
  [ "$status" -eq 1 ]
  [[ "$output" == *"HORS PÉRIMÈTRE : src/a/b.ts"* ]]
}

@test "glob * accepte un fichier direct" {
  write_plan '`src/*.ts`'
  commit_files src/a.ts
  run_check
  [ "$status" -eq 0 ]
}

@test "le point du glob est littéral" {
  write_plan '`src/a.ts`'
  commit_files src/aXts
  run_check
  [ "$status" -eq 1 ]
}

@test "fichier racine exact" {
  write_plan '`CLAUDE.md`'
  commit_files CLAUDE.md
  run_check
  [ "$status" -eq 0 ]
}

@test "fichier racine voisin refusé" {
  write_plan '`CLAUDE.md`'
  commit_files CLAUDE.md.bak
  run_check
  [ "$status" -eq 1 ]
}

@test "chemin avec espace et accent" {
  write_plan '`docs/mes notes/**`'
  commit_files "docs/mes notes/été final.md"
  run_check
  [ "$status" -eq 0 ]
}

@test "puce avec [nouveau] après le glob" {
  write_plan '`src/**` [nouveau]'
  commit_files src/a.ts
  run_check
  [ "$status" -eq 0 ]
}

@test "puce avec commentaire entre parenthèses après le glob" {
  write_plan '`Makefile` (une seule ligne `include`, tâche 8 uniquement)'
  commit_files Makefile
  run_check
  [ "$status" -eq 0 ]
}

@test "le premier segment entre accents graves seul est le glob" {
  write_plan '`Makefile` (une seule ligne `include`)'
  commit_files include
  run_check
  [ "$status" -eq 1 ]
}

@test "plusieurs puces" {
  write_plan '`a/**`' '`b.md`'
  commit_files a/x.ts b.md
  run_check
  [ "$status" -eq 0 ]
}

@test "le fichier du plan est toujours autorisé" {
  write_plan '`src/**`'
  mkdir -p "$REPO/docs/plans"
  PLAN="$REPO/docs/plans/plan.md"
  cp "$BATS_TEST_TMPDIR/plan.md" "$PLAN"
  git add -A
  git commit -q -m "plan"
  run "$SCRIPT" 3 docs/plans/plan.md base
  [ "$status" -eq 0 ]
}

@test "diff vide → 0" {
  write_plan '`src/**`'
  run_check
  [ "$status" -eq 0 ]
  [[ "$output" == *"Périmètre OK (0 fichiers)"* ]]
}

@test "base inconnue → 2" {
  write_plan '`src/**`'
  run "$SCRIPT" 3 "$PLAN" nexistepas
  [ "$status" -eq 2 ]
  [[ "$output" == *"base"* ]]
}

@test "section absente → 2" {
  PLAN="$BATS_TEST_TMPDIR/plan.md"
  printf '# Plan\n\n## Autre\n\n- `src/**`\n' > "$PLAN"
  run_check
  [ "$status" -eq 2 ]
}

@test "section vide → 2" {
  write_plan
  run_check
  [ "$status" -eq 2 ]
}

@test "plan illisible → 2" {
  run "$SCRIPT" 3 "$BATS_TEST_TMPDIR/absent.md" base
  [ "$status" -eq 2 ]
}

@test "argument manquant → 2" {
  write_plan '`src/**`'
  run "$SCRIPT" 3 "$PLAN"
  [ "$status" -eq 2 ]
  run "$SCRIPT"
  [ "$status" -eq 2 ]
}

@test "la section lecture seule n'est pas lue comme périmètre" {
  write_plan '`src/**`'
  commit_files secret/x.ts
  run_check
  [ "$status" -eq 1 ]
  [[ "$output" == *"HORS PÉRIMÈTRE : secret/x.ts"* ]]
}

@test "déplacement depuis l'extérieur du périmètre → 1" {
  git checkout -q base
  commit_files secret/x.ts
  git checkout -q -B lot
  write_plan '`src/**`'
  mkdir -p src
  git mv secret/x.ts src/x.ts
  git commit -q -m "deplacement"
  run_check
  [ "$status" -eq 1 ]
  [[ "$output" == *"HORS PÉRIMÈTRE : secret/x.ts"* ]]
}

@test "glob ajouté dans la branche → ignoré (globs lus depuis la base)" {
  git checkout -q base
  mkdir -p docs
  printf '# Plan\n\n## Fichiers du lot (exclusifs)\n\n- `src/**`\n\n## Fichiers en lecture seule\n' > docs/plan.md
  git add -A
  git commit -q -m "plan"
  git checkout -q -B lot
  printf '# Plan\n\n## Fichiers du lot (exclusifs)\n\n- `src/**`\n- `lib/**`\n\n## Fichiers en lecture seule\n' > docs/plan.md
  commit_files lib/a.ts
  run "$SCRIPT" 3 docs/plan.md base
  [ "$status" -eq 1 ]
  [[ "$output" == *"HORS PÉRIMÈTRE : lib/a.ts"* ]]
  [[ "$output" != *"HORS PÉRIMÈTRE : docs/plan.md"* ]]
}

@test "plan absent de la base → globs du fichier courant" {
  mkdir -p docs
  printf '# Plan\n\n## Fichiers du lot (exclusifs)\n\n- `src/**`\n' > docs/plan.md
  commit_files src/a.ts
  run "$SCRIPT" 3 docs/plan.md base
  [ "$status" -eq 0 ]
}
