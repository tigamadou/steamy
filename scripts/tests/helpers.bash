# Aides communes des tests bats des scripts d'environnement d'agent.
# Dépôt factice dans $BATS_TEST_TMPDIR : main/.git et steamy-wt-<lot>/.agent.env ; faux docker, git et make
# (scripts/tests/fakes) placés en tête du PATH, qui journalisent dans $CALLS_LOG.

SCRIPTS="$(cd "$BATS_TEST_DIRNAME/.." && pwd)"

setup_env() {
  ROOT="$BATS_TEST_TMPDIR/root"
  MAIN="$ROOT/main"
  FIX="$BATS_TEST_TMPDIR/fix"
  CALLS_LOG="$BATS_TEST_TMPDIR/calls.log"
  FAKE_GIT_COMMON="$MAIN/.git"
  mkdir -p "$MAIN/.git" "$FIX/ps" "$FIX/head"
  : >"$CALLS_LOG"
  : >"$FIX/branches"
  printf 'main\nfeature/base\n' >"$FIX/refs"
  for s in postgres redis rustfs mailpit; do echo "steamy-$s-1" >"$FIX/ps/steamy.$s"; done
  export ROOT MAIN FIX CALLS_LOG FAKE_GIT_COMMON
  export PATH="$BATS_TEST_DIRNAME/fakes:$PATH"
  # Délais des scripts ramenés à presque rien
  export AGENT_LOCK_TIMEOUT=2 AGENT_LOCK_SLEEP=0
  cd "$MAIN"
}

wt_of() { echo "$ROOT/steamy-wt-$1"; }

# lot_env <lot> <profil> <cache> <broker> <actif> : écrit un .agent.env de lot déjà existant
lot_env() {
  local wt
  wt="$(wt_of "$1")"
  mkdir -p "$wt"
  cat >"$wt/.agent.env" <<EOT
export AGENT_LOT=$1
export AGENT_PROFIL=$2
export AGENT_ACTIF=$5
export REDIS_DB_CACHE=$3
export REDIS_DB_BROKER=$4
export POSTGRES_DB=steamy_$1
export AWS_STORAGE_BUCKET_NAME=steamy-$1
export AWS_STORAGE_BUCKET_NAME_TEST=steamy-$1-test
EOT
}

# lot_conteneurs <lot> : des conteneurs tournent pour le projet steamy-ag-<lot>
lot_conteneurs() { echo "c1" >"$FIX/ps/steamy-ag-$1"; }

# lot_branche <lot> <branche> : le worktree du lot est sur cette branche
lot_branche() { echo "$2" >"$FIX/head/steamy-wt-$1"; }

env_value() { sed -n "s/^export $2=//p" "$(wt_of "$1")/.agent.env"; }

assert_call() { grep -qE -- "$1" "$CALLS_LOG" || { echo "appel attendu absent : $1"; cat "$CALLS_LOG"; return 1; }; }
refute_call() { if grep -qE -- "$1" "$CALLS_LOG"; then echo "appel interdit présent : $1"; cat "$CALLS_LOG"; return 1; fi; }

# Aucune commande destructive (rien n'est supprimé automatiquement)
refute_destructif() {
  refute_call 'worktree remove'
  refute_call 'branch -[dD]'
  refute_call 'dropdb|DROP DATABASE'
  refute_call 'FLUSHALL'
}

assert_output_contains() { case "$output" in *"$1"*) ;; *) echo "sortie sans « $1 » :"; echo "$output"; return 1 ;; esac; }
