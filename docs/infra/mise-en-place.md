# Mise en place d'un environnement

À faire **une fois par environnement** (staging, puis production). Compter environ une heure,
plus le temps de propagation DNS.

## Checklist

- [ ] 1. VPS commandé
- [ ] 2. DNS configuré
- [ ] 3. Bucket et clé Wasabi créés
- [ ] 4. Valeurs d'exemple remplacées dans le dépôt
- [ ] 5. Clé SSH de la CI générée
- [ ] 6. Playbook Ansible exécuté
- [ ] 7. Environnement GitHub et secrets configurés
- [ ] 8. Premier déploiement réussi
- [ ] 9. Restauration de sauvegarde testée (staging)

---

## 1. VPS

| | Staging | Production |
| --- | --- | --- |
| Système | Ubuntu 24.04 ou Debian 12 | idem |
| RAM | ≥ 4 Go | ≥ 8 Go |
| Disque | ≥ 40 Go SSD | ≥ 100 Go SSD |
| Accès initial | Un compte avec sudo, joignable en SSH **par clé** | idem |

Le disque doit contenir la base (5 Go en staging, 20 Go en prod), les médias (10 Go en staging, 50 Go en prod),
les images et les journaux. Ces tailles se règlent dans `infra/helm/steamy-platform/values-<env>.yaml`.

## 2. DNS

Deux enregistrements `A` vers l'IP du VPS, par environnement :

| Staging | Production |
| --- | --- |
| `staging.<domaine>` | `<domaine>` |
| `api.staging.<domaine>` | `api.<domaine>` |

Le front et l'API **doivent partager un domaine parent** : le cookie de session y est posé
(`cookieDomain`, par exemple `.<domaine>`).

## 3. Wasabi

1. Créer **un** bucket, par exemple `steamy-backups`, dans la région choisie. Les environnements y sont rangés
   sous `staging/` et `production/`.
2. Créer une **politique limitée à ce bucket** et un utilisateur dédié, puis générer sa clé d'accès.
3. Ne pas activer de règle de cycle de vie : CloudNativePG gère lui-même la rétention de 90 jours.

> Une clé par environnement, chacune limitée à son préfixe, serait plus stricte. C'est une amélioration possible.

## 4. Valeurs à remplacer dans le dépôt

| Fichier | Clés | Exemple actuel |
| --- | --- | --- |
| `infra/helm/steamy/values-staging.yaml` | `hosts.web`, `hosts.api`, `hosts.cookieDomain` | `staging.steamy.example` |
| `infra/helm/steamy/values-production.yaml` | idem | `steamy.example` |
| `infra/helm/steamy/values.yaml` | `email.from`, `image.registry` | `no-reply@steamy.example`, `ghcr.io/tigamadou` |
| `infra/helm/steamy-platform/values.yaml` | `backups.wasabi.region`, `endpoint`, `bucket` | `eu-west-2`, `steamy-backups` |
| `infra/ansible/group_vars/all.yml` | `admin_users`, `letsencrypt_email`, `ghcr_owner` | — |

Committer ces changements avant le premier déploiement : les charts publiés en dépendent.

## 5. Clé SSH de la CI

Une paire de clés par environnement, générée sur votre poste :

```bash
ssh-keygen -t ed25519 -N "" -C steamy-ci-staging -f steamy-ci-staging
```

- La clé **publique** (`.pub`) va dans `inventory.yml` (étape 6).
- La clé **privée** va dans le secret GitHub `DEPLOY_SSH_KEY` (étape 7), puis on supprime les fichiers locaux.

## 6. Ansible

Depuis votre poste, avec Ansible ≥ 2.16 :

```bash
cd infra/ansible
cp inventory.example.yml inventory.yml     # gitignoré : IP, utilisateur, clé publique CI
ansible-galaxy collection install -r requirements.yml
ansible-playbook site.yml --limit staging
```

> ⚠️ Le playbook **désactive la connexion root et par mot de passe**. Vérifier que votre clé publique figure
> dans `admin_users` (`group_vars/all.yml`) **avant** de le lancer, sinon vous perdrez l'accès.

Le playbook vérifie d'abord que les variables obligatoires sont renseignées. Le détail de ce qu'il installe
est dans [Serveurs](serveurs.md).

Récupérer ensuite l'empreinte SSH du serveur pour l'étape 7 :

```bash
ssh-keyscan -t ed25519 <ip-du-vps>
```

## 7. GitHub

### Environnements

Dans **Settings → Environments**, créer `staging` et `production`. Sur `production`, configurer :

- **Required reviewers** : les personnes autorisées à approuver une mise en production ;
- **Deployment branches and tags** : *Selected*, règle de tag `v*`.

### Secrets (par environnement)

| Secret | Contenu |
| --- | --- |
| `DEPLOY_SSH_KEY` | Clé privée générée à l'étape 5 |
| `DEPLOY_KNOWN_HOSTS` | Sortie de `ssh-keyscan` (étape 6) |
| `SECRET_KEY` | `python3 -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` | Identifiants du stockage des médias, à inventer : longs et aléatoires |
| `WASABI_ACCESS_KEY_ID` / `WASABI_SECRET_ACCESS_KEY` | Clé Wasabi de l'étape 3 |
| `GHCR_PULL_TOKEN` | Token GitHub (classic) avec le seul scope `read:packages` |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | SMTP (optionnel) |
| `PAYMENTS_KKIAPAY_SECRET` / `PAYMENTS_FEDAPAY_SECRET` | Paiements, en sandbox pour staging (optionnel) |

> ⚠️ Changer `RUSTFS_*` après le premier déploiement redémarre RustFS avec les nouveaux identifiants
> d'administration. Ce cas n'a pas été testé : le faire d'abord en staging et vérifier que les médias restent lisibles.

### Variables (par environnement)

| Variable | Exemple |
| --- | --- |
| `DEPLOY_HOST` | IP ou nom du VPS |
| `APP_URL` | `https://staging.<domaine>` |
| `API_URL` | `https://api.staging.<domaine>` |
| `GHCR_PULL_USER` | Compte GitHub propriétaire du token |

### Protection de branche

Le dépôt suit gitflow ([`CONTRIBUTING.md`](../../CONTRIBUTING.md)). Dans **Settings → Rules → Rulesets**
(ou *Settings → Branches*), protéger **`main` et `development`** :

- PR obligatoire (pas de push direct) ;
- check obligatoire : **`ci-ok`** ;
- force-push et suppression interdits.

## 8. Premier déploiement

Publier une pre-release `v0.1.0-rc.1` (voir [CI/CD](ci-cd.md#publier-une-version)). Au premier passage :

- cert-manager obtient les certificats Let's Encrypt. Cela prend jusqu'à quelques minutes et demande que le DNS soit propagé ;
- CloudNativePG crée la base et lance une première sauvegarde complète ;
- le Job crée le bucket des médias.

Vérifier que tout s'est bien passé :

```bash
curl https://api.staging.<domaine>/api/health/      # {"status":"ok",…}
sudo k3s kubectl -n steamy get pods,certificate,backup
```

Créer ensuite le premier administrateur :

```bash
sudo k3s kubectl -n steamy exec -it deploy/steamy-api -- python manage.py createsuperuser
```

## 9. Tester la restauration (staging)

Une sauvegarde jamais restaurée n'est pas une sauvegarde. Suivre la procédure
[Restaurer PostgreSQL](donnees-et-sauvegardes.md#restaurer-postgresql) en staging, et noter le temps qu'elle prend.
