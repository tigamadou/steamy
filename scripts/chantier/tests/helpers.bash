# Aides communes aux tests bats des scripts du chantier.

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Dépôt git temporaire réel : branche `base` (un commit) puis branche de lot.
make_repo() {
  REPO="$BATS_TEST_TMPDIR/repo"
  mkdir -p "$REPO"
  cd "$REPO"
  git init -q -b base .
  git config user.email "test@example.com"
  git config user.name "Test"
  git config commit.gpgsign false
  echo init > README.md
  git add -A
  git commit -q -m "init"
  git checkout -q -b lot
}

# Ajoute et commit des fichiers (chemins en arguments) sur la branche courante.
commit_files() {
  local f
  for f in "$@"; do
    mkdir -p "$(dirname "$f")"
    echo "contenu" > "$f"
  done
  git add -A
  git commit -q -m "ajout"
}

# Écrit $PLAN avec la section exclusifs (une puce par argument, tel quel) puis une section lecture seule.
write_plan() {
  PLAN="$BATS_TEST_TMPDIR/plan.md"
  {
    echo "# Plan"
    echo
    echo "## Fichiers du lot (exclusifs)"
    echo
    local g
    for g in "$@"; do
      echo "- $g"
    done
    echo
    echo "## Fichiers en lecture seule"
    echo
    echo '- `secret/**`'
  } > "$PLAN"
}

# `gh` factice en tête du PATH : journalise les arguments, échoue si FAKE_GH_FAIL figure dans les arguments.
fake_gh() {
  FAKE_BIN="$BATS_TEST_TMPDIR/bin"
  mkdir -p "$FAKE_BIN"
  export GH_LOG="$BATS_TEST_TMPDIR/gh.log"
  : > "$GH_LOG"
  cat > "$FAKE_BIN/gh" <<'SH'
#!/usr/bin/env bash
echo "$*" >> "$GH_LOG"
if [ -n "${FAKE_GH_FAIL:-}" ] && [[ "$*" == *"$FAKE_GH_FAIL"* ]]; then
  echo "gh: échec simulé" >&2
  exit 1
fi
exit 0
SH
  chmod +x "$FAKE_BIN/gh"
  export PATH="$FAKE_BIN:$PATH"
}
