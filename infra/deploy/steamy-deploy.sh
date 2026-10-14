#!/usr/bin/env bash
# Déploiement de Steamy sur le cluster k3s local.
#
# Installé par Ansible dans /usr/local/bin/steamy-deploy et utilisé comme COMMANDE
# FORCÉE de la clé SSH de la CI (authorized_keys : command="…",restrict).
# La CI ne peut donc exécuter QUE ceci :
#
#   ssh deploy@serveur "deploy 1.4.0" < secrets.env
#
# - la version doit être un semver strict (pas de shell, pas d'autre commande) ;
# - stdin contient les secrets KEY=VALUE issus du GitHub Environment ;
# - les charts et images sont tirés de GHCR à cette version exacte.
set -euo pipefail
umask 077

CONFIG=/etc/steamy/deploy.env   # STEAMY_ENV, GHCR_OWNER, NAMESPACE (écrit par Ansible)
# shellcheck source=/dev/null
source "$CONFIG"
: "${STEAMY_ENV:?}" "${GHCR_OWNER:?}" "${NAMESPACE:?}"

log() { printf '[steamy-deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }
die() { log "ERREUR : $*"; exit 1; }

# --- 1. Commande autorisée -----------------------------------------------------
semver='^deploy v?([0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?)$'
[[ "${SSH_ORIGINAL_COMMAND:-}" =~ $semver ]] || die "commande refusée. Usage : deploy <version>"
version="${BASH_REMATCH[1]}"

if [[ "$STEAMY_ENV" == production && "$version" == *-* ]]; then
  die "une pre-release ($version) ne peut pas être déployée en production"
fi

# Un seul déploiement à la fois
exec 9>/var/lock/steamy-deploy.lock
flock -n 9 || die "un déploiement est déjà en cours"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

# --- 2. Secrets reçus sur stdin --------------------------------------------------
head -c 65536 > "$workdir/all.env"
if grep -Evq '^([A-Z][A-Z0-9_]*=.*)?$' "$workdir/all.env"; then
  die "secrets mal formés (attendu : KEY=VALUE)"
fi
for key in SECRET_KEY AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY \
           WASABI_ACCESS_KEY_ID WASABI_SECRET_ACCESS_KEY GHCR_PULL_USER GHCR_PULL_TOKEN; do
  grep -q "^${key}=." "$workdir/all.env" || die "secret manquant : $key"
done
secret() { grep "^$1=" "$workdir/all.env" | head -n1 | cut -d= -f2-; }

# Les identifiants GHCR ne vont pas dans le Secret de l'application
grep -Ev '^(GHCR_[A-Z_]*=|$)' "$workdir/all.env" > "$workdir/app.env"

log "déploiement de $version sur $STEAMY_ENV (namespace $NAMESPACE)"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

kubectl -n "$NAMESPACE" create secret generic steamy-secrets \
  --from-env-file="$workdir/app.env" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl -n "$NAMESPACE" create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io --docker-username="$(secret GHCR_PULL_USER)" \
  --docker-password="$(secret GHCR_PULL_TOKEN)" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

# --- 3. Charts de la version demandée ---------------------------------------------
export HELM_REGISTRY_CONFIG="$workdir/registry.json"
secret GHCR_PULL_TOKEN | helm registry login ghcr.io -u "$(secret GHCR_PULL_USER)" --password-stdin >/dev/null
for chart in steamy-platform steamy; do
  helm pull "oci://ghcr.io/${GHCR_OWNER}/charts/${chart}" --version "$version" --untar -d "$workdir" >/dev/null \
    || die "chart $chart $version introuvable sur GHCR"
done

# --- 4. Plateforme (PostgreSQL, RustFS, Redis, sauvegardes) -----------------------
# Pas de --atomic ici : un rollback automatique pourrait supprimer des volumes de données.
log "plateforme…"
helm upgrade --install steamy-platform "$workdir/steamy-platform" -n "$NAMESPACE" \
  -f "$workdir/steamy-platform/values-${STEAMY_ENV}.yaml" --wait --timeout 10m
kubectl -n "$NAMESPACE" wait cluster.postgresql.cnpg.io/steamy-db --for=condition=Ready --timeout=10m >/dev/null

# --- 5. Application (migrations en pre-upgrade, rollback automatique si échec) ----
log "application…"
helm upgrade --install steamy "$workdir/steamy" -n "$NAMESPACE" \
  -f "$workdir/steamy/values-${STEAMY_ENV}.yaml" \
  --set image.tag="$version" \
  --atomic --wait --timeout 10m

log "✅ $version déployée sur $STEAMY_ENV"
