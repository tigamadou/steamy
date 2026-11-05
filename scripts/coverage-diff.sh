#!/usr/bin/env bash
# Couverture à 100 % du code modifié, comparé à la base donnée (méthode des chantiers, docs/infra/agents.md).
#   scripts/coverage-diff.sh <base>      (lancé par `make coverage-diff BASE=<branche>`)
#
# Le diff est calculé SUR L'HÔTE (le `.git` d'un worktree pointe vers un chemin hôte, illisible en conteneur) et
# inclut les modifications non commitées et les fichiers neufs (les fichiers supprimés ne sont pas rejoués). Seuls les
# tests des apps Django et des fichiers du front touchés par le diff sont rejoués avec couverture, puis diff-cover
# (en conteneur) compare au diff.
#
# Codes de sortie : 0 tout est couvert · 1 tests en échec, ligne non couverte ou aucun rapport · 2 usage ou base
# inconnue · 3 une moitié du diff relève de l'autre profil et n'a pas été vérifiée (COVERAGE_IGNORE_AUTRE_PROFIL=1
# pour l'accepter) · autre : code de diff-cover.
set -euo pipefail

BASE="${1:-}"
[ -n "$BASE" ] || { echo "Usage : make coverage-diff BASE=<branche>   (ex. BASE=feature/mon-chantier)" >&2; exit 2; }
case "$BASE" in -*) echo "coverage-diff : base invalide « $BASE »" >&2; exit 2 ;; esac

COMPOSE="${COMPOSE:-docker compose}"
PROFIL="${AGENT_PROFIL:-principal}"
# Parallélisme et arguments de pytest (make : PYTEST_XDIST, PYTEST_ARGS), découpés en mots
read -r -a PYTEST_EXTRA <<<"${PYTEST_XDIST:-} ${PYTEST_ARGS:-}"
PNPM_INSTALL="corepack enable && pnpm install --frozen-lockfile --store-dir /pnpm-store --config.confirm-modules-purge=false"

if git rev-parse --verify --quiet --end-of-options "$BASE^{commit}" >/dev/null; then
  REF="$BASE"
elif git rev-parse --verify --quiet --end-of-options "origin/$BASE^{commit}" >/dev/null; then
  REF="origin/$BASE"
else
  echo "coverage-diff : base « $BASE » introuvable (ni en local ni sur origin)" >&2
  exit 2
fi
MB="$(git merge-base "$REF" HEAD)"

# Rapports d'un run précédent : supprimés d'abord, sinon diff-cover jugerait un ancien rapport
rm -f apps/api/coverage.xml apps/web/coverage/cobertura-coverage.xml

mkdir -p .agent
DIFF_API=.agent/coverage-api.diff
DIFF_WEB=.agent/coverage-web.diff
# Diff complet (suivis + neufs), puis découpé par moitié avec des chemins relatifs à apps/api et apps/web
# (ce sont ceux des rapports de couverture). Préfixes a/ b/ forcés et pas de programme de diff externe : la découpe
# en dépend, quelle que soit la configuration git de l'utilisateur.
FULL=.agent/coverage-full.diff
DIFF_OPTS=(--src-prefix=a/ --dst-prefix=b/ --no-ext-diff)
git diff "${DIFF_OPTS[@]}" "$MB" >"$FULL"
UNTRACKED="$(git ls-files --others --exclude-standard)"
if [ -n "$UNTRACKED" ]; then
  while IFS= read -r f; do
    git diff --no-index "${DIFF_OPTS[@]}" -- /dev/null "$f" >>"$FULL" || true
  done <<<"$UNTRACKED"
fi
CHANGED="$( { git diff --name-only --no-ext-diff --diff-filter=d "$MB"; printf '%s\n' "$UNTRACKED"; } | sed '/^$/d' | sort -u)"

# Découpe : ne garde que les blocs `diff --git a/<sous-arbre>/…` ; le préfixe du sous-arbre n'est retiré que des
# en-têtes (jamais du contenu des lignes)
decouper() { # <sous-arbre> <sortie>
  awk -v pre="$1/" '
    /^diff --git / {
      inhunk = 0
      keep = (index($0, "diff --git a/" pre) == 1)
      if (keep) { sub("^diff --git a/" pre, "diff --git a/"); sub(" b/" pre, " b/") }
    }
    !inhunk && /^--- a\// { if (keep) sub("^--- a/" pre, "--- a/") }
    !inhunk && /^\+\+\+ b\// { if (keep) sub("^\\+\\+\\+ b/" pre, "+++ b/") }
    /^@@/ { inhunk = 1 }
    keep { print }
  ' "$FULL" >"$2"
}
decouper apps/api "$DIFF_API"
decouper apps/web "$DIFF_WEB"

# Nombre de lignes ajoutées dans du code mesurable (hors tests, conftest, migrations et .d.ts, omis de la couverture)
lignes_code() { # <diff> <regex d'extension>
  awk -v ext="$2" '
    /^diff --git / { inhunk = 0; code = 0 }
    !inhunk && /^\+\+\+ b\// {
      f = substr($0, 7)
      code = (f ~ ext) && (f !~ /(^|\/)(tests?|__tests__|migrations)\//) && (f !~ /(^|\/)(conftest|tests)\.py$/) \
        && (f !~ /(^|\/)test_[^\/]*\.py$/) && (f !~ /\.(test|spec)\.tsx?$/) && (f !~ /\.d\.ts$/)
    }
    /^@@/ { inhunk = 1; next }
    inhunk && /^\+/ { if (code) n++ }
    END { print n + 0 }
  ' "$1"
}

API_FILES="$(printf '%s\n' "$CHANGED" | grep -E '^apps/api/.*\.py$' || true)"
WEB_FILES="$(printf '%s\n' "$CHANGED" | grep -E '^apps/web/(src/.*\.(ts|tsx)|e2e/fausse-api/.*\.ts)$' | grep -vE '\.d\.ts$' || true)"

# COVERAGE_PARTIE=api|web (coverage-api, coverage-web) : n'examine que cette moitié du diff
case "${COVERAGE_PARTIE:-}" in
  api) WEB_FILES="" ;;
  web) API_FILES="" ;;
esac

rc=0
pire() { if [ "$1" -gt "$rc" ]; then rc="$1"; fi; }

# diff-cover exige git (absent de l'image steamy-api) : image Python officielle, dépôt vide (le diff est fourni),
# cache pip dans un volume nommé partagé (jamais supprimé par agent-down)
diff_cover() { # <diff> <rapport>
  docker run --rm -v steamy_pip_cache:/root/.cache/pip -v "$PWD/.agent:/work/.agent:ro" -v "$PWD/$2:/work/rapport.xml:ro" \
    -w /work python:3.11.13-bookworm sh -c "git init -q . && pip install -q --root-user-action=ignore diff-cover==10.6.0 \
    && diff-cover rapport.xml --diff-file /work/$1 --fail-under=100"
}

# Vérifie un rapport : présent (sinon aucun test n'a tourné : pas de faux vert), puis diff-cover, puis le cas
# « No lines with coverage information » qui n'est acceptable que si le diff n'ajoute aucun code mesurable
verifier() { # <diff> <rapport> <regex d'extension>
  local out code=0 n
  if [ ! -f "$2" ]; then
    echo "coverage-diff : aucun rapport de couverture produit ($2) : aucun test lié aux fichiers touchés ?" >&2
    pire 1
    return 0
  fi
  out="$(diff_cover "$1" "$2" 2>&1)" || code=$?
  printf '%s\n' "$out"
  if [ "$code" -ne 0 ]; then
    pire "$code"
    return 0
  fi
  case "$out" in
    *"No lines with coverage information"*)
      n="$(lignes_code "$1" "$3")"
      if [ "$n" -gt 0 ]; then
        echo "coverage-diff : diff-cover ne trouve aucune ligne couverte alors que le diff ajoute $n ligne(s) de code (fichier hors du périmètre de couverture ou rapport vide) : la couverture n'est pas prouvée" >&2
        pire 1
      fi
      ;;
  esac
}

# Moitié du diff relevant de l'autre profil : non vérifiée, donc code 3 (sauf demande explicite)
autre_profil() { # <profil de l'agent> <partie> <fichiers>
  echo "coverage-diff : profil $1, le diff touche $2 (non vérifié, relève d'un lot $2) :" >&2
  printf '  %s\n' "$3" >&2
  if [ "${COVERAGE_IGNORE_AUTRE_PROFIL:-}" = 1 ]; then
    echo "coverage-diff : ignoré (COVERAGE_IGNORE_AUTRE_PROFIL=1)" >&2
  else
    echo "coverage-diff : code 3, COVERAGE_IGNORE_AUTRE_PROFIL=1 pour l'accepter" >&2
    pire 3
  fi
}

# --- API ----------------------------------------------------------------------------------------------------------
if [ -n "$API_FILES" ]; then
  if [ "$PROFIL" = web ]; then
    autre_profil web "l'API" "$API_FILES"
  else
    cibles=()
    while IFS= read -r a; do cibles+=("$a"); done < <(printf '%s\n' "$API_FILES" | sed -nE 's#^apps/api/(apps/[^/]+)/.*#\1#p' | sort -u)
    hors_app="$(printf '%s\n' "$API_FILES" | grep -vE '^apps/api/apps/[^/]+/' || true)"
    if [ -n "$hors_app" ]; then
      # Un fichier hors app absent du rapport serait ignoré par diff-cover (faux vert) : suite complète
      echo "coverage-diff : fichier API hors app touché, suite API complète" >&2
      cibles=()
    fi
    echo "coverage-diff : API, tests rejoués : ${cibles[*]:-suite complète}"
    if $COMPOSE run --rm --no-deps -e DJANGO_ENV=test -e DEFAULT_FILE_STORAGE=django.core.files.storage.FileSystemStorage api pytest ${cibles[@]+"${cibles[@]}"} --cov --cov-report=xml:coverage.xml --cov-report=term:skip-covered -q -p no:cacheprovider ${PYTEST_EXTRA[@]+"${PYTEST_EXTRA[@]}"}; then
      verifier "$DIFF_API" apps/api/coverage.xml '\.py$'
    else
      echo "coverage-diff : les tests de l'API échouent" >&2
      pire 1
    fi
  fi
fi

# --- Front --------------------------------------------------------------------------------------------------------
if [ -n "$WEB_FILES" ]; then
  if [ "$PROFIL" = api ]; then
    autre_profil api "le front" "$WEB_FILES"
  else
    rel=()
    while IFS= read -r w; do rel+=("${w#apps/web/}"); done <<<"$WEB_FILES"
    echo "coverage-diff : front, fichiers liés rejoués : ${rel[*]}"
    # Les fichiers sont des arguments de sh (`"$@"`), jamais interpolés dans le script
    if $COMPOSE run --rm --no-deps web sh -c "$PNPM_INSTALL && pnpm --filter @steamy/web exec vitest related --run --passWithNoTests --coverage \"\$@\"" sh "${rel[@]}"; then
      verifier "$DIFF_WEB" apps/web/coverage/cobertura-coverage.xml '\.tsx?$'
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
