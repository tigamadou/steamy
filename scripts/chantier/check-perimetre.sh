#!/usr/bin/env bash
# Vérifie que les fichiers modifiés par un lot restent dans son périmètre.
# Usage : check-perimetre.sh <lot> <plan> <base>
# Lit la section « ## Fichiers du lot (exclusifs) » du plan : le premier segment entre accents graves
# de chaque puce est un glob (`**` = tout, `*` = sans « / », `?` = un caractère sans « / »).
# Sorties : 0 périmètre respecté · 1 fichiers hors périmètre · 2 erreur d'usage.
set -euo pipefail

usage() { echo "Usage : $0 <lot> <plan> <base>" >&2; exit 2; }
erreur() { echo "Erreur : $*" >&2; exit 2; }

[ $# -eq 3 ] || usage
lot=$1
plan=$2
base=$3
[ -n "$lot" ] && [ -n "$plan" ] && [ -n "$base" ] || usage
[ -r "$plan" ] || erreur "plan illisible : $plan"
git rev-parse --verify -q "${base}^{commit}" >/dev/null || erreur "base introuvable : $base"

# Glob → regex ancrée (le reste est échappé).
glob_vers_regex() {
  local g=$1 out="" c i=0 n=${#1}
  while [ "$i" -lt "$n" ]; do
    c=${g:i:1}
    case $c in
      '*')
        if [ "${g:i+1:1}" = '*' ]; then out+='.*'; i=$((i + 1)); else out+='[^/]*'; fi ;;
      '?') out+='[^/]' ;;
      '.' | '[' | ']' | '(' | ')' | '{' | '}' | '+' | '^' | '$' | '|' | '\') out+="\\$c" ;;
      *) out+=$c ;;
    esac
    i=$((i + 1))
  done
  printf '^%s$' "$out"
}

# Chemin du plan relatif à la racine du dépôt (toujours autorisé).
racine=$(cd "$(git rev-parse --show-toplevel)" && pwd -P)
plan_abs=$(cd "$(dirname "$plan")" && pwd -P)/$(basename "$plan")
plan_rel=${plan_abs#"$racine"/}

# Les globs sont lus depuis la base : un lot ne peut pas élargir son périmètre en éditant son plan.
# Repli sur le fichier courant si le plan n'existe pas dans la base.
if ! contenu_plan=$(git show "${base}:${plan_rel}" 2>/dev/null); then contenu_plan=$(cat "$plan"); fi

# Globs : première séquence entre accents graves de chaque puce de la section.
globs=$(printf '%s\n' "$contenu_plan" | awk '
  /^## / { insec = ($0 ~ /^## Fichiers du lot \(exclusifs\)[[:space:]]*$/); next }
  insec && /^[-*][[:space:]]/ { print }
' | sed -n 's/^[-*][[:space:]]*`\([^`]*\)`.*/\1/p')

[ -n "$globs" ] || erreur "section « Fichiers du lot (exclusifs) » absente ou sans glob dans $plan"

regexes=()
while IFS= read -r g; do
  [ -n "$g" ] && regexes+=("$(glob_vers_regex "$g")")
done <<< "$globs"

total=0
hors=()
while IFS= read -r f; do
  [ -n "$f" ] || continue
  total=$((total + 1))
  [ "$f" = "$plan_rel" ] && continue
  ok=0
  for r in "${regexes[@]}"; do
    if [[ $f =~ $r ]]; then ok=1; break; fi
  done
  [ "$ok" -eq 1 ] || hors+=("$f")
done < <(git -c core.quotePath=false diff --no-renames --name-only "${base}...HEAD")

if [ "${#hors[@]}" -gt 0 ]; then
  for f in "${hors[@]}"; do echo "HORS PÉRIMÈTRE : $f"; done
  echo "Lot $lot : ${#hors[@]} fichier(s) hors périmètre" >&2
  exit 1
fi
echo "Périmètre OK ($total fichiers)"
