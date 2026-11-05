#!/usr/bin/env bats
load helpers

setup() { setup_env; }

CD() { "$SCRIPTS/coverage-diff.sh" "$@"; }

# changes <chemin…> : fichiers suivis modifiés, avec 3 lignes ajoutées chacun dans le diff complet
changes() {
  : >"$FIX/names"
  : >"$FIX/full.diff"
  for p in "$@"; do
    echo "$p" >>"$FIX/names"
    printf 'diff --git a/%s b/%s\n--- a/%s\n+++ b/%s\n@@ -1,1 +1,4 @@\n x\n+a\n+b\n+c\n' "$p" "$p" "$p" "$p" >>"$FIX/full.diff"
  done
}

@test "F0 sans base, base inconnue ou base commençant par un tiret : code 2" {
  run CD
  [ "$status" -eq 2 ]
  run CD inconnue
  [ "$status" -eq 2 ]
  run CD -x
  [ "$status" -eq 2 ]
  refute_call 'compose'
}

@test "F1 routage : seules les apps Django touchées sont rejouées, avec couverture" {
  changes apps/api/apps/core/models.py apps/api/apps/billing/views.py
  run CD feature/base
  [ "$status" -eq 0 ]
  assert_call 'pytest apps/billing apps/core --cov --cov-report=xml:coverage.xml'
  assert_call 'diff-cover rapport.xml --diff-file /work/.agent/coverage-api.diff --fail-under=100'
}

@test "F2 fichier API hors app : suite API complète" {
  changes apps/api/project/settings.py
  run CD feature/base
  [ "$status" -eq 0 ]
  assert_output_contains "suite API complète"
  assert_call 'pytest --cov'
}

@test "F3 front : vitest related sur les fichiers touchés, passés en arguments (pas dans sh -c)" {
  changes apps/web/src/lib/a.ts apps/web/src/b.tsx
  run CD feature/base
  [ "$status" -eq 0 ]
  assert_call 'vitest related --run --passWithNoTests --coverage "\$@" sh src/b.tsx src/lib/a.ts'
}

@test "F4 .d.ts et parcours e2e hors fausse-api ne déclenchent rien" {
  changes apps/web/src/types.d.ts apps/web/e2e/parcours/x.spec.ts README.md
  run CD feature/base
  [ "$status" -eq 0 ]
  assert_output_contains "rien à vérifier"
  refute_call 'compose'
}

@test "F4b la fausse API de l'e2e est comptée comme du code front" {
  changes apps/web/e2e/fausse-api/serveur.ts
  run CD feature/base
  assert_call 'vitest related'
}

@test "F5 fichier neuf (non suivi) pris en compte, avec le diff --no-index" {
  : >"$FIX/names"
  echo "apps/api/apps/core/neuf.py" >"$FIX/untracked"
  printf 'diff --git a/apps/api/apps/core/neuf.py b/apps/api/apps/core/neuf.py\n--- /dev/null\n+++ b/apps/api/apps/core/neuf.py\n@@ -0,0 +1 @@\n+x\n' >"$FIX/untracked.diff"
  run CD feature/base
  [ "$status" -eq 0 ]
  assert_call 'diff --no-index --src-prefix=a/ --dst-prefix=b/ --no-ext-diff'
  assert_call 'pytest apps/core '
}

@test "F6 fichiers supprimés exclus de la liste (--diff-filter=d)" {
  changes apps/api/apps/core/models.py
  run CD feature/base
  assert_call 'diff --name-only --no-ext-diff --diff-filter=d MERGEBASE'
}

@test "F7 profil web et diff API : code 3 avec message ; COVERAGE_IGNORE_AUTRE_PROFIL=1 l'accepte" {
  changes apps/api/apps/core/models.py
  AGENT_PROFIL=web run CD feature/base
  [ "$status" -eq 3 ]
  assert_output_contains "profil web"
  assert_output_contains "apps/api/apps/core/models.py"
  refute_call 'compose'
  AGENT_PROFIL=web COVERAGE_IGNORE_AUTRE_PROFIL=1 run CD feature/base
  [ "$status" -eq 0 ]
}

@test "F7b profil api et diff front : code 3 ; la moitié du bon profil est quand même vérifiée" {
  changes apps/web/src/a.ts apps/api/apps/core/models.py
  AGENT_PROFIL=api run CD feature/base
  [ "$status" -eq 3 ]
  assert_call 'pytest apps/core'
  refute_call 'vitest'
}

@test "F8 diff vide : rien à vérifier, code 0" {
  changes
  run CD feature/base
  [ "$status" -eq 0 ]
  assert_output_contains "rien à vérifier"
}

@test "F9 tests API en échec : code 1, diff-cover non lancé" {
  changes apps/api/apps/core/models.py
  FAKE_RUN_RC=1 run CD feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "les tests de l'API échouent"
  refute_call 'diff-cover'
}

@test "F9b tests front en échec : code 1" {
  changes apps/web/src/a.ts
  FAKE_RUN_RC=1 run CD feature/base
  [ "$status" -eq 1 ]
  assert_output_contains "les tests du front échouent"
}

@test "F9c ligne non couverte (diff-cover code 1) : code non nul" {
  changes apps/api/apps/core/models.py
  FAKE_DIFFCOVER_RC=1 FAKE_DIFFCOVER_OUT="Diff coverage 50%" run CD feature/base
  [ "$status" -eq 1 ]
}

@test "F10 « No lines with coverage information » avec du code modifié : échec explicite" {
  changes apps/api/apps/core/models.py
  FAKE_DIFFCOVER_OUT="No lines with coverage information in this diff." run CD feature/base
  [ "$status" -ne 0 ]
  assert_output_contains "aucune ligne couverte"
}

@test "F10b idem côté front" {
  changes apps/web/src/a.ts
  FAKE_DIFFCOVER_OUT="No lines with coverage information in this diff." run CD feature/base
  [ "$status" -ne 0 ]
}

@test "F10c « No lines » acceptable quand le diff n'ajoute que des tests ou des migrations" {
  changes apps/api/apps/core/tests/test_x.py apps/api/apps/core/migrations/0002_x.py apps/api/conftest.py
  FAKE_DIFFCOVER_OUT="No lines with coverage information in this diff." run CD feature/base
  [ "$status" -eq 0 ]
}

@test "F10d « No lines » acceptable quand le fichier de code n'a que des suppressions" {
  : >"$FIX/names"
  echo apps/api/apps/core/models.py >"$FIX/names"
  printf 'diff --git a/apps/api/apps/core/models.py b/apps/api/apps/core/models.py\n--- a/apps/api/apps/core/models.py\n+++ b/apps/api/apps/core/models.py\n@@ -1,2 +1 @@\n x\n-y\n' >"$FIX/full.diff"
  FAKE_DIFFCOVER_OUT="No lines with coverage information in this diff." run CD feature/base
  [ "$status" -eq 0 ]
}

@test "F11 rapports préexistants supprimés avant le run" {
  changes apps/api/apps/core/models.py
  mkdir -p apps/api
  : >apps/api/coverage.xml
  FAKE_RUN_SEES_REPORT=1 run CD feature/base
  [ "$status" -eq 0 ]
  refute_call 'RAPPORT_API_PRESENT'
}

@test "F11a idem côté front" {
  changes apps/web/src/a.ts
  mkdir -p apps/web/coverage
  : >apps/web/coverage/cobertura-coverage.xml
  FAKE_RUN_SEES_REPORT=1 run CD feature/base
  [ "$status" -eq 0 ]
  refute_call 'RAPPORT_WEB_PRESENT'
}

@test "F11b tests réussis mais aucun rapport produit (aucun test lié) : échec explicite, pas de faux vert" {
  changes apps/web/src/a.ts
  mkdir -p apps/web/coverage
  : >apps/web/coverage/cobertura-coverage.xml
  FAKE_NO_REPORT=1 run CD feature/base
  [ "$status" -ne 0 ]
  assert_output_contains "aucun test lié"
  refute_call 'diff-cover'
}

@test "F11c idem côté API" {
  changes apps/api/apps/core/models.py
  FAKE_NO_REPORT=1 run CD feature/base
  [ "$status" -ne 0 ]
  assert_output_contains "aucun rapport"
}

@test "F12 diff calculé avec des préfixes forcés et sans programme externe" {
  changes apps/api/apps/core/models.py
  run CD feature/base
  assert_call 'diff --src-prefix=a/ --dst-prefix=b/ --no-ext-diff MERGEBASE'
}

@test "F13 découpe : préfixe du sous-arbre retiré dans les en-têtes seulement, chaque moitié séparée" {
  : >"$FIX/names"
  {
    printf 'diff --git a/apps/api/apps/core/m.py b/apps/api/apps/core/m.py\n--- a/apps/api/apps/core/m.py\n+++ b/apps/api/apps/core/m.py\n@@ -1 +1,2 @@\n x = "a/apps/api/y"\n+z = "b/apps/api/w"\n'
    printf 'diff --git a/apps/web/src/a.ts b/apps/web/src/a.ts\n--- a/apps/web/src/a.ts\n+++ b/apps/web/src/a.ts\n@@ -1 +1,2 @@\n+q\n'
  } >"$FIX/full.diff"
  run CD feature/base
  grep -q '^--- a/apps/core/m.py$' .agent/coverage-api.diff
  grep -q '^+z = "b/apps/api/w"$' .agent/coverage-api.diff
  grep -q ' x = "a/apps/api/y"$\|^ x = "a/apps/api/y"$' .agent/coverage-api.diff
  grep -q '^--- a/src/a.ts$' .agent/coverage-web.diff
  ! grep -q 'apps/web' .agent/coverage-api.diff
}

@test "F14 COVERAGE_PARTIE=api n'examine pas le front" {
  changes apps/api/apps/core/models.py apps/web/src/a.ts
  COVERAGE_PARTIE=api run CD feature/base
  [ "$status" -eq 0 ]
  assert_call 'pytest'
  refute_call 'vitest'
}
