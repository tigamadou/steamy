# Données et sauvegardes

## Où sont les données

| Donnée | Stockage | Sauvegarde | Perte maximale |
| --- | --- | --- | --- |
| Base (comptes, cours, progression, paiements…) | PostgreSQL `steamy-db` | WAL en continu + sauvegarde complète quotidienne vers Wasabi | **Quelques minutes** (dernier WAL archivé) |
| Médias (vidéos, PDF, avatars, certificats) | RustFS, bucket `steamy-media` | Copie quotidienne vers Wasabi | **24 h** (copie de 03:00) |
| Cache, files Celery, sessions | Redis | Aucune (données reconstructibles) | Les utilisateurs doivent se reconnecter ; les tâches en file sont perdues |

> Les sessions sont stockées dans le cache Redis (`SESSION_ENGINE = cache`) : vider ou perdre Redis
> déconnecte tout le monde, sans autre conséquence.

## Organisation dans Wasabi

```
<bucket>/                         ex : steamy-backups
├── staging/
│   ├── postgres/steamy-db/        <serverName>/ : sauvegardes complètes (base/) et WAL (wals/), gzip
│   └── media/                     copie du bucket steamy-media
└── production/
    ├── postgres/steamy-db/
    └── media/
```

## PostgreSQL

Les sauvegardes sont gérées par CloudNativePG et le plugin Barman Cloud (ressource `ObjectStore` nommée `wasabi`).

| Mécanisme | Fréquence | Réglage |
| --- | --- | --- |
| Archivage des WAL (journal des transactions) | En continu, à chaque segment de WAL rempli ou au plus tard toutes les 5 minutes | `isWALArchiver: true` |
| Sauvegarde complète (base backup) | Tous les jours à 02:00 UTC, plus une au premier déploiement | `backups.postgresSchedule` |
| Rétention | 90 jours | `backups.postgresRetention` |

Cette combinaison permet une **restauration à n'importe quel instant** des 90 derniers jours.

Pourquoi 90 jours : Wasabi facture chaque objet au moins 90 jours, donc une rétention plus courte
ne ferait rien économiser.

### Vérifier les sauvegardes

```bash
alias k='sudo k3s kubectl -n steamy'
k get backups                                   # liste, avec phase "completed"
k get scheduledbackup steamy-db-daily
k get cluster steamy-db -o jsonpath='{.status.conditions}' | jq '.[] | select(.type=="ContinuousArchiving")'
```

`ContinuousArchiving` doit être à `True`. Sinon, les WAL ne partent plus et la restauration à un instant
précis n'est plus possible : c'est **l'alerte la plus importante** à surveiller.

Lancer une sauvegarde complète à la main, par exemple avant une migration risquée :

```bash
cat <<'YAML' | k apply -f -
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: steamy-db-manuel-20261014
spec:
  cluster: { name: steamy-db }
  method: plugin
  pluginConfiguration: { name: barman-cloud.cloudnative-pg.io }
YAML
```

### Restaurer PostgreSQL

Deux situations, deux procédures :

| Situation | Procédure |
| --- | --- |
| La base tourne, mais des données ont été perdues ou abîmées (suppression, migration ratée) | [Restaurer à côté, puis recopier](#restaurer-à-côté-puis-recopier) : la base en service n'est jamais touchée avant vérification |
| La base n'existe plus (VPS perdu, volume détruit) | [Reconstruire depuis Wasabi](#reconstruire-depuis-wasabi-serveur-perdu) : option `postgres.restore` du chart |

> ✅ Les deux procédures ont été déroulées telles qu'écrites dans un k3s de test : restauration au dernier état
> et à un instant précis, avec un faux Wasabi (RustFS). À répéter **en staging sur le vrai Wasabi**
> dès la mise en place, puis tous les 6 mois.

Dans les deux cas, CloudNativePG ne restaure jamais par-dessus une base existante : il **crée** un cluster à
partir d'une sauvegarde complète, puis rejoue les WAL jusqu'à l'instant voulu.

Le **dossier de sauvegarde** à relire est le `serverName` en vigueur : la valeur `postgres.serverName` de
`infra/helm/steamy-platform/values-<env>.yaml`, ou `steamy-db` par défaut. Pour le retrouver :
`k get cluster steamy-db -o jsonpath='{.spec.plugins[0].parameters.serverName}'`.

#### Restaurer à côté, puis recopier

**1. Créer un cluster restauré à côté de la base actuelle**

```bash
cat <<'YAML' | k apply -f -
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: steamy-db-restore
spec:
  instances: 1
  imageName: ghcr.io/cloudnative-pg/postgresql:17
  storage: { size: 20Gi }
  bootstrap:
    recovery:
      source: origine
      # Facultatif : sans recoveryTarget, restauration jusqu'au dernier WAL archivé
      recoveryTarget:
        targetTime: "2026-10-14 09:30:00+00"
  externalClusters:
    - name: origine
      plugin:
        name: barman-cloud.cloudnative-pg.io
        parameters:
          barmanObjectName: wasabi
          serverName: steamy-db      # dossier de sauvegarde en vigueur (voir plus haut)
YAML
k wait cluster/steamy-db-restore --for=condition=Ready --timeout=30m
```

Ce cluster n'archive pas ses WAL : il ne risque donc pas d'écraser les sauvegardes existantes.

**2. Vérifier les données restaurées**

```bash
k exec -it steamy-db-restore-1 -c postgres -- psql -U postgres app -c 'SELECT count(*) FROM user_user;'
```

**3. Remettre les données en service**

- **Récupérer quelques lignes** (suppression accidentelle) : les exporter depuis `steamy-db-restore` avec
  `pg_dump --table=… --data-only`, puis les réimporter dans `steamy-db`.
- **Remplacer toute la base** :

  ```bash
  # 1. Couper l'application (plus aucune écriture)
  k scale deploy steamy-web steamy-api steamy-worker steamy-beat --replicas=0
  # 2. Copier la base restaurée dans la base de production
  k exec steamy-db-restore-1 -c postgres -- pg_dump -U postgres -Fc app > /tmp/app.dump
  k exec -i steamy-db-1 -c postgres -- pg_restore -U postgres -d app --clean --if-exists --no-owner --role=app < /tmp/app.dump
  rm /tmp/app.dump
  # 3. Relancer : un redéploiement de la version courante remet les bons nombres de répliques
  ```

  Pour relancer, refaire *Re-run all jobs* sur le dernier workflow Deploy (voir [Exploitation](exploitation.md)).
  `pg_restore` doit se terminer sans erreur. C'est le cas tant que toutes les tables appartiennent à `app`,
  ce qui est garanti puisque ce sont les migrations Django, exécutées en tant que `app`, qui les créent.

**4. Supprimer le cluster de restauration** : `k delete cluster steamy-db-restore`.

#### Reconstruire depuis Wasabi (serveur perdu)

Sur un serveur neuf, ou après la perte du volume, un déploiement normal recréerait une base **vide**.
L'archivage refuserait alors d'écrire dans le dossier existant, ce qui protège les anciennes sauvegardes,
mais ne reconstruit pas la base. L'option `postgres.restore` du chart `steamy-platform` reconstruit la base à
sa création depuis Wasabi.

1. **Préparer le serveur** avec Ansible ([Mise en place](mise-en-place.md), étapes 1, 2, 6 et 7).
   Le DNS doit pointer vers la nouvelle IP, et `DEPLOY_HOST` et `DEPLOY_KNOWN_HOSTS` doivent être mis à jour.
2. **Activer la reconstruction** dans `infra/helm/steamy-platform/values-<env>.yaml` :

   ```yaml
   postgres:
     serverName: steamy-db-2          # NOUVEAU dossier : la base reconstruite archive à partir de zéro
     restore:
       enabled: true
       fromServerName: steamy-db      # dossier de sauvegarde à relire (l'ancien serverName)
       targetTime: ""                 # vide = dernier état archivé ; sinon "2026-10-14 09:30:00+00"
   ```

   Le chart refuse un `serverName` identique à `fromServerName`.
3. **Publier une version** contenant ce changement : pre-release, puis release pour la prod. Le déploiement
   crée la base à partir de la sauvegarde. Compter quelques minutes, plus le temps de télécharger la base depuis Wasabi.
4. **Vérifier** : `k get cluster steamy-db` doit indiquer `ContinuousArchiving=True`, et l'application doit
   afficher les données attendues.
5. **Restaurer les médias** ([plus bas](#restaurer-les-médias)).
6. **À la release suivante**, repasser `restore.enabled: false`, mais **garder le nouveau `serverName`**.

Laisser l'option activée ou la désactiver est sans effet sur une base existante (vérifié) : elle n'agit qu'à la
création du cluster. Il faut quand même la désactiver, sinon une future perte de la base relancerait une reconstruction
depuis l'ancien dossier.

**Perte de données maximale** : ce qui a été écrit depuis le dernier WAL archivé, soit au plus environ
5 minutes (l'archivage se déclenche au plus tard toutes les 5 minutes).

## Médias (RustFS)

Le CronJob `steamy-media-backup` lance chaque jour à 03:00 UTC un `rclone copy` de `rustfs:steamy-media`
vers `wasabi:<bucket>/<env>/media`. Les fichiers sont vérifiés par somme de contrôle.

On utilise `copy` et non `sync` : un fichier supprimé dans RustFS **reste** dans la sauvegarde. Cela protège
contre une suppression accidentelle ou malveillante. En contrepartie, la sauvegarde ne fait que grossir.

```bash
k get cronjob steamy-media-backup
k get jobs                                                    # derniers passages
k create job --from=cronjob/steamy-media-backup media-backup-manuel   # copie immédiate
k logs job/media-backup-manuel
```

### Restaurer les médias

Même conteneur rclone, sens inverse. Remplacer `<bucket>`, `<env>`, `<region>` et `<endpoint>` par les valeurs de
`infra/helm/steamy-platform/values.yaml` :

```bash
cat <<'YAML' | k apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: media-restore
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      securityContext: { runAsNonRoot: true, runAsUser: 65534 }
      containers:
        - name: rclone
          image: rclone/rclone:1.75.2
          args: [copy, "wasabi:<bucket>/<env>/media", "rustfs:steamy-media", --checksum, -v]
          env:
            - { name: RCLONE_CONFIG_DIR, value: /tmp }
            - { name: RCLONE_CONFIG_RUSTFS_TYPE, value: s3 }
            - { name: RCLONE_CONFIG_RUSTFS_PROVIDER, value: Other }
            - { name: RCLONE_CONFIG_RUSTFS_ENDPOINT, value: "http://steamy-rustfs:9000" }
            - { name: RCLONE_CONFIG_RUSTFS_ACCESS_KEY_ID, valueFrom: { secretKeyRef: { name: steamy-secrets, key: AWS_ACCESS_KEY_ID } } }
            - { name: RCLONE_CONFIG_RUSTFS_SECRET_ACCESS_KEY, valueFrom: { secretKeyRef: { name: steamy-secrets, key: AWS_SECRET_ACCESS_KEY } } }
            - { name: RCLONE_CONFIG_WASABI_TYPE, value: s3 }
            - { name: RCLONE_CONFIG_WASABI_PROVIDER, value: Wasabi }
            - { name: RCLONE_CONFIG_WASABI_REGION, value: "<region>" }
            - { name: RCLONE_CONFIG_WASABI_ENDPOINT, value: "<endpoint>" }
            - { name: RCLONE_CONFIG_WASABI_ACCESS_KEY_ID, valueFrom: { secretKeyRef: { name: steamy-secrets, key: WASABI_ACCESS_KEY_ID } } }
            - { name: RCLONE_CONFIG_WASABI_SECRET_ACCESS_KEY, valueFrom: { secretKeyRef: { name: steamy-secrets, key: WASABI_SECRET_ACCESS_KEY } } }
YAML
k logs -f job/media-restore
k delete job media-restore
```

`copy` n'écrase que les fichiers différents et ne supprime rien. Pour restaurer un seul dossier, ajouter
son chemin aux deux côtés (`wasabi:…/media/attachments`, `rustfs:steamy-media/attachments`).

## Redis

Redis est persisté en AOF sur son volume, pour survivre à un redémarrage du pod. Il n'est pas sauvegardé :
en cas de perte, il redémarre vide sans intervention.
