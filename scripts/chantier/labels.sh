#!/usr/bin/env bash
# Crée (ou met à jour) les labels GitHub d'un chantier. Idempotent (`--force`).
# Usage : labels.sh <slug> [lot…]
# Crée chantier:<slug>, les 13 labels fixes de la méthode et, si des lots sont passés, lot:<id> pour chacun.
set -euo pipefail

[ $# -ge 1 ] && [ -n "$1" ] || { echo "Usage : $0 <slug> [lot…]" >&2; exit 2; }
slug=$1
shift

# nom|couleur|description
labels=(
  "role:dev|1d76db|Issue pour un développeur"
  "role:testeur|1d76db|Issue pour un testeur"
  "role:planificateur|1d76db|Issue pour un planificateur"
  "type:lot|5319e7|Issue de lot"
  "type:ci|d93f0b|Correctif d'un échec de CI"
  "type:test|fbca04|Test manquant ou à corriger"
  "type:revue|0e8a16|Suite de revue"
  "etat:pret|c2e0c6|Prête : dépendances closes"
  "etat:en-cours|fef2c0|Un agent travaille dessus"
  "etat:en-revue|bfd4f2|PR en revue"
  "etat:a-corriger|f9d0c4|Revue ou CI à corriger"
  "etat:bloque|b60205|Bloquée : intervention de l'utilisateur"
  "revue:ok|0e8a16|Revue sans constat Critique ni Important ouvert"
)

creer() {
  gh label create "$1" --force --color "$2" --description "$3"
}

creer "chantier:$slug" "ededed" "Chantier $slug"
for entree in "${labels[@]}"; do
  IFS='|' read -r nom couleur description <<< "$entree"
  creer "$nom" "$couleur" "$description"
done
for lot in "$@"; do
  creer "lot:$lot" "c5def5" "Lot $lot du chantier"
done
