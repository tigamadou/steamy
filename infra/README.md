# Infrastructure Steamy

## Vue d'ensemble

```
GitHub Release ──▶ deploy.yml ──▶ images + charts sur GHCR
                        │
                        └─ ssh deploy@vps "deploy 1.4.0" < secrets   (commande forcée)
                                    │
             ┌──────────────────────┴───────── VPS (k3s mono-nœud) ─────────────────┐
             │  Traefik + cert-manager (TLS Let's Encrypt)                          │
             │  chart steamy           : web · api · worker · beat · Job migrate    │
             │  chart steamy-platform  : PostgreSQL (CloudNativePG) · RustFS · Redis│
             └──────────────────────────────┬───────────────────────────────────────┘
                                            └─▶ Wasabi : WAL en continu + base quotidienne
                                                         + copie quotidienne des médias
```

| Déclencheur | Environnement | Images |
| --- | --- | --- |
| **Pre-release** publiée (`v1.4.0-rc.1`) | staging (VPS 1) | construites et poussées |
| **Release** publiée (`v1.4.0`) | production (VPS 2), après approbation | **promues** depuis la pre-release du même commit, jamais reconstruites |

Une release dont le commit n'est pas passé par une pre-release est refusée.

| Dossier | Rôle |
| --- | --- |
| `ansible/` | Préparation d'un VPS de zéro : durcissement, k3s, cert-manager, CloudNativePG, compte `deploy` |
| `helm/steamy-platform/` | Services d'état et sauvegardes |
| `helm/steamy/` | Application |
| `deploy/steamy-deploy.sh` | Script exécuté sur le serveur par la CI (seule commande autorisée à sa clé SSH) |
| `dev/` | Configuration de la stack Docker locale |

---

## Mise en place initiale (une fois par environnement)

### 1. Serveurs et DNS

- VPS Ubuntu 24.04 ou Debian 12 : **≥ 4 Go de RAM pour staging, ≥ 8 Go pour la prod**, avec un compte sudo joignable en SSH par clé.
- Enregistrements DNS `A` vers l'IP du VPS, pour les domaines de `helm/steamy/values-<env>.yaml` (`hosts.web`, `hosts.api`).

### 2. Wasabi

- Un bucket (ex : `steamy-backups`) ; les sauvegardes sont rangées sous `staging/` et `production/`.
- Une clé d'accès **limitée à ce bucket**.
- Renseigner `backups.wasabi.bucket`, `region` et `endpoint` dans `helm/steamy-platform/values.yaml`.
- Rétention à 90 jours : Wasabi facture de toute façon 90 jours minimum par objet.

### 3. Clés SSH de la CI (une par environnement)

```bash
ssh-keygen -t ed25519 -N "" -C steamy-ci-staging    -f steamy-ci-staging
ssh-keygen -t ed25519 -N "" -C steamy-ci-production -f steamy-ci-production
```

La clé publique va dans `ansible/inventory.yml`, la clé privée dans le secret GitHub `DEPLOY_SSH_KEY` (étape 5).
Sur le serveur, cette clé ne peut **que** lancer `steamy-deploy <version>` : pas de shell, pas de tunnel.

### 4. Ansible

```bash
cd infra/ansible
cp inventory.example.yml inventory.yml       # IP, utilisateur, clé CI (gitignoré)
# group_vars/all.yml : admin_users (vos clés), letsencrypt_email
ansible-galaxy collection install -r requirements.yml
ansible-playbook site.yml --limit staging     # puis --limit production
```

Le playbook est idempotent : le rejouer applique les montées de version épinglées dans `group_vars/all.yml`.
⚠️ Il désactive la connexion root et par mot de passe : vérifier que votre clé est dans `admin_users` **avant** de le lancer.

### 5. GitHub

**Environments** (Settings → Environments) : `staging` et `production`.
Sur `production` : *Required reviewers* et *Deployment branches and tags* limités aux tags `v*`.

| Secret (par environnement) | Contenu |
| --- | --- |
| `DEPLOY_SSH_KEY` | Clé privée CI de l'environnement |
| `DEPLOY_KNOWN_HOSTS` | Sortie de `ssh-keyscan -t ed25519 <ip-du-vps>` (empêche l'usurpation du serveur) |
| `SECRET_KEY` | Clé Django : `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` | Identifiants du stockage RustFS (à inventer, longs et aléatoires) |
| `WASABI_ACCESS_KEY_ID` / `WASABI_SECRET_ACCESS_KEY` | Clé Wasabi de l'étape 2 |
| `GHCR_PULL_TOKEN` | Token GitHub `read:packages` (le serveur tire les images et charts) |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | SMTP (optionnel) |
| `PAYMENTS_KKIAPAY_SECRET` / `PAYMENTS_FEDAPAY_SECRET` | Paiements (sandbox en staging) |

| Variable (par environnement) | Exemple |
| --- | --- |
| `DEPLOY_HOST` | IP ou nom du VPS |
| `APP_URL` | `https://staging.steamy.example` |
| `API_URL` | `https://api.staging.steamy.example` |
| `GHCR_PULL_USER` | Compte GitHub propriétaire du token |

**Protection de `main`** (Settings → Branches) : PR obligatoire, check requis **`ci-ok`**.

---

## Publier une version

1. Sur GitHub → Releases → *Draft a new release*, tag `v1.4.0-rc.1`, cocher **Set as a pre-release** → déploiement en **staging**.
2. Recetter en staging. Correction nécessaire ? Nouveau commit, `v1.4.0-rc.2`.
3. Nouvelle release `v1.4.0` **sur le même commit** que la rc validée, *sans* cocher pre-release → approbation demandée → **production**.

Chaque déploiement : secrets mis à jour → plateforme → migrations (Job) → rolling update de l'application → contrôle `/api/health/`.
Si les migrations ou les pods échouent, Helm **revient automatiquement** à la version précédente.

⚠️ Pendant le rolling update, l'ancienne et la nouvelle version tournent ensemble : une migration ne doit pas
casser la version N-1 (ex : supprimer une colonne se fait en deux releases).

---

## Exploitation

Depuis un compte administrateur sur le VPS :

```bash
sudo k3s kubectl -n steamy get pods
sudo k3s kubectl -n steamy logs deploy/steamy-api -f
sudo helm -n steamy history steamy --kubeconfig /etc/rancher/k3s/k3s.yaml
sudo helm -n steamy rollback steamy <révision> --kubeconfig /etc/rancher/k3s/k3s.yaml
sudo k3s kubectl -n steamy get backups                  # sauvegardes PostgreSQL
```

**Restaurer PostgreSQL** : CloudNativePG restaure dans un **nouveau** cluster depuis l'ObjectStore `wasabi`,
à un instant précis si besoin (`bootstrap.recovery` + `recoveryTarget.targetTime`).
Voir la doc du plugin Barman Cloud, section *Restoring a Cluster*. **À tester en staging avant d'en avoir besoin.**

**Faire tourner un secret** : mettre à jour le secret GitHub, puis redéployer la version courante
(*Re-run jobs* sur le dernier workflow Deploy).

---

## Validé par un test d'intégration (k3s dans Docker)

Installation des deux charts avec les versions épinglées : migrations, démarrage des 4 composants,
front → API → PostgreSQL/Redis à travers Traefik, archivage WAL et sauvegarde complète, copie des médias,
mise à jour, et **retour automatique** à la version précédente sur un déploiement volontairement cassé.

Non couvert par ce test : TLS Let's Encrypt (domaine réel requis), Wasabi réel, playbook Ansible sur un vrai VPS.
