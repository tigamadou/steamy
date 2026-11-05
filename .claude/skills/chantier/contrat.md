# Contrat de prérequis du skill `chantier`

Le skill `chantier` **refuse de démarrer** s'il manque un seul de ces neuf points, et **dit lequel**. Pour chaque
point, il applique la vérification décrite ici, puis lit la réponse du projet dans `.claude/chantier.projet.md`
(une section par clé). Une clé absente, vide ou contredite par la vérification = point manquant.

Les noms de cibles `make` ci-dessous sont ceux du contrat ; le fichier projet dit comment le projet les remplit.

### 1. Docker uniquement

- **Énoncé** : toutes les commandes de build, test, lint et génération passent par des cibles `make` qui lancent des
  conteneurs. L'hôte n'exécute que `docker`, `make`, `git` et `gh`.
- **Vérification** : `make help` liste les cibles du point 4 ; le fichier projet ne cite aucune commande hôte
  (gestionnaire de paquets, interpréteur, lanceur de tests) hors `docker`, `make`, `git`, `gh`. Attendu : aucune.
- **Clé du fichier projet** : `docker`

### 2. Environnement d'agent

- **Énoncé** : `make agent-up LOT=<lot> PROFIL=<profil> BASE=<branche>`, `make agent-down LOT=<lot>` et
  `make agent-status`. Un environnement = un worktree `../<projet>-wt-<lot>` sur la branche du lot + ses conteneurs
  applicatifs ; les services d'infrastructure sont partagés (une base, un bucket, un espace de cache par agent,
  jamais un service dupliqué). Chaque profil déclare son coût mémoire mesuré.
- **Vérification** : `make -n agent-up LOT=x PROFIL=web BASE=y`, `make -n agent-down LOT=x` et `make -n agent-status`
  s'exécutent à blanc sans erreur « No rule » ; le document des profils cité par le fichier projet existe et donne un
  coût mémoire par profil.
- **Clé du fichier projet** : `agent_env`

### 3. Isolation des données

- **Énoncé** : chaque agent a ses propres données (base, base de test, cache, files de tâches, stockage, emails) et un
  **garde-fou** refuse de lancer les tests sur une base qui n'est pas une base de test de l'agent.
- **Vérification** : le fichier projet nomme les ressources isolées et le fichier qui porte le garde-fou ; ce fichier
  existe (lecture). Attendu : toutes les ressources de la liste sont couvertes.
- **Clé du fichier projet** : `isolation`

### 4. Cibles standard

- **Énoncé** : toutes lancées depuis le worktree de l'agent : `make test-cible T=<chemins>`,
  `make coverage-diff BASE=<branche>`, `make lint`, `make typecheck`, `make generate`, `make check-generated`,
  `make migrations-check`, `make e2e-fixtures`, `make e2e`.
- **Vérification** : pour chacune, `make -n <cible>` (variables factices au besoin) ne répond pas « No rule to make
  target ». Attendu : neuf cibles trouvées. Un projet sans fichiers générés ou sans migrations déclare la cible comme
  sans objet dans le fichier projet, avec la raison.
- **Clé du fichier projet** : `cibles`

### 5. Modèle de branches

- **Énoncé** : une branche principale d'intégration, des branches protégées et une convention de nommage couvrant
  `feature/<slug>`, `feature/<slug>-<lot>` et `fix/<slug>-<sujet>`.
- **Vérification** : `git branch -a` contient la branche d'intégration nommée dans le fichier projet ; la convention de
  commit y est décrite.
- **Clé du fichier projet** : `branches`

### 6. CI et GitHub

- **Énoncé** : une CI avec un **check requis unique**, déclenchée sur toutes les branches et toutes les PR ; `gh`
  authentifié.
- **Vérification** : `gh auth status` réussit ; le fichier projet nomme le check requis.
- **Clé du fichier projet** : `ci`

### 7. Budget machine

- **Énoncé** : mémoire Docker allouable aux agents, coût de chaque profil, nombre maximal d'e2e complets
  simultanés (jeton e2e, 1 par défaut).
- **Vérification** : le fichier projet renvoie à un document de profils et de budget qui existe, et donne la valeur du
  jeton e2e. Les chiffres vivent dans ce document, jamais recopiés ailleurs.
- **Clé du fichier projet** : `budget`

### 8. Fichiers générés et migrations

- **Énoncé** : la liste des fichiers **jamais fusionnés à la main** (générés), la façon de résoudre un conflit sur
  eux, et la règle des migrations (un seul lot actif par modèle ou schéma).
- **Vérification** : lecture du fichier projet ; chaque fichier généré cité existe dans le dépôt, sauf déclaration
  « sans objet ».
- **Clé du fichier projet** : `generes_migrations`

### 9. Tâches planifiées

- **Énoncé** : l'outil de tâches planifiées de la session est disponible, et l'environnement qui le fait tourner
  l'est aussi (application de bureau ouverte, machine éveillée, Docker lancé).
- **Vérification** : l'outil `create_scheduled_task` est présent dans la session ; `docker info` répond.
- **Clé du fichier projet** : `taches_planifiees`

## Valeurs complémentaires lues dans le fichier projet

En plus des neuf clés, le fichier projet donne : la commande des labels (`SLUG`, `LOTS`), la commande de périmètre
(`LOT`, `PLAN`, `BASE`), l'emplacement des plans, la convention de commit et la liste des labels.
