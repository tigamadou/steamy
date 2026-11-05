#!/usr/bin/env bash
# Couverture à 100 % du code modifié, comparé à la base donnée (méthode des chantiers, docs/infra/agents.md).
#   scripts/coverage-diff.sh <base>      (lancé par `make coverage-diff BASE=<branche>`)
#
# Le diff est calculé SUR L'HÔTE (le `.git` d'un worktree pointe vers un chemin hôte, illisible en conteneur) et
# inclut les modifications non commitées et les fichiers neufs. Seuls les tests des apps Django et des fichiers
# du front touchés par le diff sont rejoués avec couverture, puis diff-cover (en conteneur) compare au diff.
# Code de sortie ≠ 0 si une ligne modifiée n'est pas couverte.
set -euo pipefail

BASE="${1:-}"
[ -n "$BASE" ] || { echo "Usage : make coverage-diff BASE=<branche>   (ex. BASE=feature/mon-chantier)" >&2; exit 2; }

COMPOSE="${COMPOSE:-docker compose}"
PROFIL="${AGENT_PROFIL:-principal}"
PNPM_INSTALL="corepack enable && pnpm install --frozen-lockfile --store-dir /pnpm-store --config.confirm-modules-purge=false"

if git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null; then
  REF="$BASE"
elif git rev-parse --verify --quiet "origin/$BASE^{commit}" >/dev/null; then
  REF="origin/$BASE"
else
  echo "coverage-diff : base « $BASE » introuvable (ni en local ni sur origin)" >&2
  exit 2
fi
MB="$(git merge-base "$REF" HEAD)"

mkdir -p .agent
DIFF_API=.agent/coverage-api.diff
DIFF_WEB=.agent/coverage-web.diff
# Diff complet (suivis + neufs), puis découpé par moitié avec des chemins relatifs à apps/api et apps/web
# (ce sont ceux des rapports de couverture).
FULL=.agent/coverage-full.diff
git diff "$MB" >"$FULL"
UNTRACKED="$(git ls-files --others --exclude-standard)"
if [ -n "$UNTRACKED" ]; then
  while IFS= read -r f; do
    git diff --no-index -- /dev/null "$f" >>"$FULL" || true
  done <<<"$UNTRACKED"
fi
CHANGED="$( { git diff --name-only "$MB"; printf '%s\n' "$UNTRACKED"; } | sed '/^$/d' | sort -u)"

# Découpe : ne garde que les blocs `diff --git a/<sous-arbre>/…` et retire le préfixe du sous-arbre
decouper() { # <sous-arbre> <sortie>
  awk -v pre="$1/" '
    /^diff --git / { keep = (index($0, " a/" pre) > 0) }
    keep { gsub("a/" pre, "a/"); gsub("b/" pre, "b/"); print }
  ' "$FULL" >"$2"
}
decouper apps/api "$DIFF_API"
decouper apps/web "$DIFF_WEB"

API_FILES="$(printf '%s\n' "$CHANGED" | grep -E '^apps/api/.*\.py$' || true)"
WEB_FILES="$(printf '%s\n' "$CHANGED" | grep -E '^apps/web/(src/.*\.(ts|tsx)|e2e/fausse-api/.*\.ts)$' | grep -vE '\.d\.ts$' || true)"

# COVERAGE_PARTIE=api|web (coverage-api, coverage-web) : n'examine que cette moitié du diff
case "${COVERAGE_PARTIE:-}" in
  api) WEB_FILES="" ;;
  web) API_FILES="" ;;
esac

rc=0
pire() { if [ "$1" -ne 0 ]; then rc="$1"; fi; }

# diff-cover exige git (absent de l'image steamy-api) : image Python officielle, dépôt vide (le diff est fourni),
# cache pip dans un volume nommé partagé (jamais supprimé par agent-down)
diff_cover() { # <diff> <rapport>
  docker run --rm -v steamy_pip_cache:/root/.cache/pip -v "$PWD/.agent:/work/.agent:ro" -v "$PWD/$2:/work/rapport.xml:ro" \
    -w /work python:3.11.13-bookworm sh -c "git init -q . && pip install -q --root-user-action=ignore diff-cover==10.6.0 \
    && diff-cover rapport.xml --diff-file /work/$1 --fail-under=100"
}

# --- API ----------------------------------------------------------------------------------------------------------
if [ -n "$API_FILES" ]; then
  if [ "$PROFIL" = web ]; then
    echo "coverage-diff : profil web, le diff touche l'API (ignoré, relève d'un lot API) :" >&2
    printf '  %s\n' "$API_FILES" >&2
  else
    apps="$(printf '%s\n' "$API_FILES" | sed -nE 's#^apps/api/(apps/[^/]+)/.*#\1#p' | sort -u)"
    hors_app="$(printf '%s\n' "$API_FILES" | grep -vE '^apps/api/apps/[^/]+/' || true)"
    if [ -n "$hors_app" ]; then
      # Un fichier hors app absent du rapport serait ignoré par diff-cover (faux vert) : suite complète
      echo "coverage-diff : fichier API hors app touché, suite API complète" >&2
      cibles=""
    else
      cibles="$apps"
    fi
    echo "coverage-diff : API, tests rejoués : ${cibles:-suite complète}"
    # shellcheck disable=SC2086
    if $COMPOSE run --rm --no-deps -e DJANGO_ENV=test api pytest $cibles --cov --cov-report=xml:coverage.xml --cov-report=term:skip-covered -q -p no:cacheprovider; then
      diff_cover "$DIFF_API" apps/api/coverage.xml || pire $?
    else
      echo "coverage-diff : les tests de l'API échouent" >&2
      pire 1
    fi
  fi
fi

# --- Front --------------------------------------------------------------------------------------------------------
if [ -n "$WEB_FILES" ]; then
  if [ "$PROFIL" = api ]; then
    echo "coverage-diff : profil api, le diff touche le front (ignoré, relève d'un lot web) :" >&2
    printf '  %s\n' "$WEB_FILES" >&2
  else
    rel="$(printf '%s\n' "$WEB_FILES" | sed 's#^apps/web/##' | tr '\n' ' ')"
    echo "coverage-diff : front, fichiers liés rejoués : $rel"
    # shellcheck disable=SC2086
    if $COMPOSE run --rm --no-deps web sh -c "$PNPM_INSTALL && pnpm --filter @steamy/web exec vitest related --run --passWithNoTests --coverage $rel"; then
      diff_cover "$DIFF_WEB" apps/web/coverage/cobertura-coverage.xml || pire $?
    else
      echo "coverage-diff : les tests du front échouent" >&2
      pire 1
    fi
  fi
fi

if [ -z "$API_FILES" ] && [ -z "$WEB_FILES" ]; then
  echo "coverage-diff : aucun fichier de code API ou front modifié par rapport à $REF : rien à vérifier."
fi
exit "$rc"
