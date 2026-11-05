# ADR 0007 · Méthode des chantiers parallèles (agents, Docker, GitHub)

- **Statut** : accepté
- **Date** : 5 novembre 2026
- **Origine** : méthode « chantier » du projet Badge (skill `chantier`, orchestrateur planifié, stacks d'agents),
  transposée à Steamy et rendue réutilisable dans d'autres projets.

## Contexte

Steamy avance par plans (`docs/plans/`, `docs/tests/plans/`) exécutés à la main, une étape = une branche = une PR.
Le prochain gros volume (≈ 3 500 scénarios du cahier, ≈ 245 jours-personne estimés) et les chantiers à venir
demandent d'exécuter les plans **en automatique et en parallèle**, par des agents, sans perdre en sûreté.

Badge a éprouvé une méthode : spec validée → socle → lots parallèles à fichiers exclusifs dans des worktrees →
fusion → PR, pilotée par une tâche planifiée toutes les 15 minutes. Steamy diffère par sa stack (Django + DRF,
PostgreSQL, Celery/Redis, Next.js 16, pnpm, contrat OpenAPI généré, `compose.yml` + `compose.e2e.yml`) et par son
workflow (gitflow, `ci-ok` requis, couverture 100 % du code modifié via diff-cover). La méthode est donc
**transposée**, pas copiée.

## Objectifs

1. **Paralléliser au maximum, de la façon la plus efficiente** : le parallélisme se décide **à la rédaction des
   plans**, et l'exécution remplit la machine sans la saturer.
2. **Gardes-fous solides** : périmètre de fichiers vérifié, bases de test imposées, verrous, plafonds de tentatives,
   aucune action irréversible sans l'utilisateur.
3. **Tests couverts à 100 % du code modifié**, et rapides.
4. **Tout dans Docker** : l'hôte n'exécute que `docker`, `make`, `git` et `gh`. Jamais `pnpm`, `node`, `python`,
   `pytest`, `playwright` sur l'hôte.
5. **Portable** : la méthode est un kit générique ; Steamy n'en est qu'un adaptateur.

### Non-objectifs

- Fusionner la PR finale vers `development` : toujours l'utilisateur.
- Déployer, publier une release, toucher la production (aucun plan ne déploie).
- Exécuter la suite complète des tests pendant le développement : c'est le rôle de la CI.

### Anti-objectifs (échec même si « ça marche »)

- Un agent qui modifie un fichier hors de son lot sans s'arrêter.
- Un test qui passe grâce à une modification du code de production, ou à un mock de la base ou de l'ORM.
- Une commande qui tourne sur l'hôte hors `docker`/`make`/`git`/`gh`.
- Une machine saturée (OOM, timeouts) parce que trop d'environnements ont été lancés.
- Une PR finale ouverte avec des fichiers générés (OpenAPI) ou des migrations incohérents.

## Décision

### 1. Deux couches : kit générique + adaptateur projet

| Couche | Contenu | Emplacement dans Steamy |
| --- | --- | --- |
| **Kit générique** | Méthode, format des plans, rôles d'agents, prompt du superviseur, **contrat de prérequis** | `.claude/skills/chantier/` (SKILL.md, `contrat.md`, `plan-template.md`, `superviseur-template.md`) et `.claude/agents/chantier-*.md` |
| **Adaptateur projet** | Façon dont le projet remplit le contrat : valeurs, cibles `make`, script d'environnement d'agent, fichiers compose | `.claude/chantier.projet.md` (valeurs), `Makefile` (cibles `agent-*` et standard), `scripts/agent-env.sh`, `compose.agent.yml`, `scripts/chantier/` |

Le kit vit d'abord dans Steamy, dans des fichiers qui ne nomment jamais Steamy (toute valeur projet est lue dans
`.claude/chantier.projet.md`). Il sera extrait en plugin Claude Code quand un deuxième projet l'adoptera.

Un `CLAUDE.md` racine est créé dans Steamy (il n'existe pas) : règles projet, règles de test, renvoi au skill
`chantier` pour tout chantier non trivial. Les skills BMAD existants ne sont ni utilisés par la méthode ni supprimés.

### 2. Contrat de prérequis

Le skill `chantier` commence par vérifier le contrat et **refuse de démarrer** s'il manque un élément (il dit
lequel). Un projet doit fournir :

1. **Docker uniquement** : toutes les commandes de build, test, lint, génération passent par des cibles `make` qui
   lancent des conteneurs.
2. **Environnement d'agent** : `make agent-up LOT=<lot> PROFIL=<profil> BASE=<branche>`,
   `make agent-down LOT=<lot>`, `make agent-status`. Un environnement = un worktree `../<projet>-wt-<lot>` sur la
   branche du lot + ses conteneurs applicatifs ; les services d'infrastructure sont partagés (une base, un bucket,
   un espace de cache par agent, jamais un service dupliqué). Chaque profil déclare son coût mémoire mesuré.
3. **Isolation des données** par agent (base, base de test, cache, files de tâches, stockage, emails) et un
   **garde-fou** qui refuse de lancer les tests sur une base qui n'est pas une base de test de l'agent.
4. **Cibles standard**, toutes lancées depuis le worktree :
   `make test-cible T=<chemins>` (tests ciblés API et/ou web), `make coverage-diff BASE=<branche>`,
   `make lint`, `make typecheck`, `make generate` (fichiers générés), `make check-generated`,
   `make migrations-check`, `make e2e-fixtures`, `make e2e`.
5. **Modèle de branches** : branche principale d'intégration, branches protégées, convention de nommage.
6. **CI** avec un check requis unique, déclenchée sur toutes les branches et PR ; `gh` authentifié.
7. **Budget machine** : mémoire Docker allouable aux agents, nombre max d'e2e complets simultanés.
8. **Fichiers jamais fusionnés à la main** (générés) et **règle des migrations**.
9. **Tâches planifiées** disponibles (Claude Desktop ouvert, machine éveillée, Docker lancé).

`.claude/chantier.projet.md` répond à chaque point pour le projet.

### 3. Découpage d'un chantier : un graphe de lots

- Un **chantier** part de la branche d'intégration du projet (`development`) sur une branche
  `feature/<slug>` (ex. chantier « optimisationRequetes » → `feature/optimisation-requetes`).
- Un **lot** = une **chaîne de tâches dépendantes** (chaque tâche a besoin de la précédente). Deux tâches
  indépendantes vont dans **deux lots**. C'est la règle centrale : maximiser le nombre de lots indépendants.
- Un lot peut **dépendre d'autres lots** : il démarre quand ils sont fusionnés dans la branche du chantier. Le
  chantier est un **graphe de dépendances** ; le « socle » n'est qu'un lot dont les autres dépendent, et doit
  rester petit pour que la file démarre vite.
- Chaque lot a une liste de **fichiers exclusifs** (globs) et une liste **en lecture seule**. Aucun fichier
  modifiable dans deux lots **actifs en même temps**. Un document partagé est découpé en sections attribuées.
- Chaque lot déclare son **profil** d'environnement (voir § 6) ; c'est ce qui fixe son coût.
- Branches de lot : `feature/<slug>-<lot>`, parties de `feature/<slug>` (le tiret est imposé par Git, qui
  interdit `feature/<slug>` et `feature/<slug>/<lot>` ensemble).
- La spec du chantier contient une section **« Organisation du travail »** : le graphe, les lots, leurs fichiers,
  leurs profils, et une **table de contrôle** (une ligne par paire de lots partageant un fichier ou une interface :
  producteur / consommateur / verdict). Un fichier partagé non résolu remonte dans un lot amont.

**Règles propres à Steamy** :
- **Migrations Django** : les modèles et migrations d'une app appartiennent à un seul lot actif ; un modèle
  partagé remonte dans un lot amont. `make migrations-check` à chaque fusion.
- **Contrat OpenAPI** (`apps/api/openapi.yaml`, `packages/api-client/src/schema.d.ts`) : jamais fusionné à la
  main. En conflit, on prend n'importe quel côté puis `make generate` ; après chaque fusion, `make check-generated`.

### 4. Format des plans

Un plan par lot, dans `docs/plans/<slug>/<n>-<lot>.md` (+ `README.md` du chantier : graphe, tableau de bord). Il
est rédigé par un planificateur à partir de `plan-template.md` et contient obligatoirement :

- en-tête **Exécution** : issue GitHub du lot, branche, base, profil, dépendances, « toutes les commandes `make`
  dans le worktree », « en exécution automatisée, un commit par tâche est autorisé sur la branche du lot (message
  d'une ligne, Conventional Commits, § 9) ; sinon aucun commit sans demande ; jamais de mention de co-auteur IA » ;
- **Avancement** : une case par tâche vérifiable (format de `docs/plans/README.md`, conservé), cochée par l'agent
  après tests verts ; note `> Reprise :` en cas d'interruption ;
- **Fichiers du lot (exclusifs)** et **lecture seule**, avec « besoin d'y toucher → s'arrêter et le signaler dans
  l'issue » ;
- **Contraintes globales** reprenant les règles de test (§ 8) ;
- **Points de revue** (Review Focus) ; pour toute UI : e2e et contrôle à 360, 1024 et 1280 px ;
- une dernière tâche **« vérification du lot »** : `make lint typecheck`, tests ciblés, `make coverage-diff
  BASE=feature/<slug>`, `make check-generated`, `make migrations-check`, e2e du lot.

Les tâches d'un plan sont **dépendantes par construction** ; un planificateur qui trouve deux sous-ensembles
indépendants le signale pour que le lot soit scindé.

### 5. Équipe d'agents

Dans Claude Code, un sous-agent ne peut pas lancer d'autres agents : **le superviseur est le seul à lancer des
agents**. Les chefs d'équipe décident et écrivent le travail (issues, commentaires, labels) ; le superviseur
l'exécute. Les **issues et PR GitHub** sont le support durable de la coordination.

| Rôle | Fichier | Modèle | Responsabilités | Interdits |
| --- | --- | --- | --- | --- |
| **Superviseur** (chef de chantier) | prompt de la tâche planifiée | celui de la session | Verrou et état ; à chaque passage, appelle les leads puis lance les agents sur les issues prêtes selon dépendances et budget ; notifie | Écrire du code ; décider du contenu technique |
| **Surveillant** | `chantier-surveillant.md` | Sonnet | À chaque passage, contrôle chaque agent actif (voir § 9 « Agents bloqués ») : progrès récent, conteneurs vivants, commandes figées. Agent bloqué ou muet → arrêt (`TaskStop`), arrêt forcé de ses processus et conteneurs figés, puis demande de relance au superviseur, qui reprend là où l'agent en était | Coder ; décider du contenu |
| **Lead dev** | `chantier-lead-dev.md` | Sonnet | Santé de la branche du chantier : CI de chaque PR de lot et de la PR finale ; issue `role:dev` par échec (logs, cause probable, fichiers) ; arbitrages de contrat entre lots ; **fusion des PR de lot** (merge commit) quand les conditions sont réunies ; régénération OpenAPI et contrôle des migrations après fusion ; ouverture de la PR finale | Coder un correctif lui-même ; fusionner la PR finale |
| **Lead QA** | `chantier-lead-qa.md` | Sonnet | Qualité des tests de chaque PR de lot : 100 % du code modifié, vraie base, fabriques, aucun mock de l'ORM, scénarios `REC-…` ; issue `role:testeur` par manque | Modifier du code |
| **Planificateur** | `chantier-planificateur.md` | Sonnet | Rédige le plan d'un lot au format imposé ; signale un lot à scinder | Toucher au code |
| **Développeur** | `chantier-developpeur.md` | Sonnet | Prend une issue `role:dev` : TDD dans son worktree, un commit par tâche, push, PR de lot ; répond aux fils de revue (corrige, pousse, cite le commit) ; commente l'issue en fin | Sortir de ses fichiers exclusifs ; force push |
| **Testeur** | `chantier-testeur.md` | Sonnet | Prend une issue `role:testeur` : tests e2e, scénarios `REC-…`, tests manquants | Modifier le code de production (s'arrêter et signaler) |
| **Relecteur** | `chantier-relecteur.md` | Sonnet | Lecture seule ; deux passes (conformité spec/plan, puis qualité et sécurité) ; **un fil de commentaire en ligne par constat** (Critique / Important / Mineur) ; verdict par une revue « commentaire » + label `revue:ok` ; résout les fils corrigés | Modifier le code ; approuver (impossible avec le même compte) |

**Dimensionnement** : le superviseur adapte l'équipe au graphe (un développeur par lot actif, testeurs selon les
lots de test, un relecteur par PR prête). Un chantier qui n'écrit que des tests n'a pas de développeurs.

### 6. Environnements d'agent et budget

- `scripts/agent-env.sh up|down|status` (via `make agent-*`) crée le worktree `../steamy-wt-<lot>` sur
  `feature/<slug>-<lot>` et un projet Compose `steamy-ag-<lot>`.
- **Principe (générique)** : les services d'infrastructure (base de données, stockage S3, cache, capture
  d'emails) **ne sont jamais dupliqués** par agent ; ils sont partagés avec la stack principale (qui doit
  tourner), et l'agent n'y reçoit que **ses propres données**. Seuls les conteneurs applicatifs (API, worker,
  front) sont propres à l'agent.
- **Dans Steamy** : PostgreSQL partagé → bases `steamy_<lot>` et `test_steamy_<lot>[_gwN]` ; RustFS partagé →
  buckets `steamy-<lot>` et `steamy-<lot>-test` ; Redis partagé → numéros de base dédiés au lot (cache et broker
  Celery), attribués par le script ; Mailpit partagé (les tests pytest utilisent la boîte mémoire de Django ; les
  e2e sur la vraie stack ont leur propre stack, ci-dessous). La variable `AGENT_LOT` est posée dans tous les
  conteneurs de l'agent.
- **E2E sur la vraie stack** d'un agent : projet Compose propre `steamy-e2e-<lot>` (motif actuel de
  `compose.e2e.yml`, sa propre base jetable), soumis au jeton e2e ci-dessous.
- **Aucun port publié** pour les environnements d'agent : tout se joue dans le réseau Docker (Playwright en
  conteneur).
- **Profils** (le coût mémoire de chacun est **mesuré** dans le premier plan et inscrit dans
  `.claude/chantier.projet.md`) :
  - `web` : front seul (Vitest, build, e2e sur fausse API) — sans API ni base ;
  - `api` : API et worker (pytest) — sans front ;
  - `complet` : API, worker, front, e2e sur la vraie stack.
- **Budget** : le superviseur ne lance un lot que si la somme des profils actifs reste sous le budget mémoire
  déclaré. Machine cible unique : le Mac de l'utilisateur (10 cœurs, 24 Go, 14,6 Go alloués à Docker) ; le budget
  agents = mémoire Docker − stack principale mesurée − marge de 2 Go, valeur inscrite par le plan 1. Plus de lots prêts que de place → **file d'attente** ; dès qu'une place se libère, le prochain lot prêt
  démarre (pas de vagues fixes).
- **Jeton e2e** : au plus N e2e sur la vraie stack simultanés (N déclaré, 1 par défaut) ; fichier de verrou tenu
  par le superviseur.
- Fin de lot fusionné : `make agent-down` (worktree, branche et bases conservés jusqu'au nettoyage final).

### 7. Cycle de vie GitHub

- **Labels** : `chantier:<slug>`, `lot:<id>`, `role:dev|testeur|planificateur`, `type:lot|ci|test|revue`,
  `etat:pret|en-cours|en-revue|a-corriger|bloque`, `revue:ok`.
- **Issue de lot** (créée au lancement du chantier) : lien vers le plan, dépendances (`Dépend de #…`), profil,
  fichiers exclusifs. Prête quand ses dépendances sont fermées.
- **PR de lot** : `feature/<slug>-<lot>` → `feature/<slug>`. La CI y tourne. Fusion par le lead dev quand :
  CI verte, `revue:ok`, aucun fil Critique ou Important ouvert, périmètre vérifié (§ 9), pas de conflit.
  Conflit avec la branche du chantier → issue `role:dev` « mettre à jour depuis la branche du chantier »
  (merge, jamais rebase ni force push).
- **Issue de correctif** (`type:ci` ou `type:test`) : créée par un lead, prise par le développeur ou testeur
  sur une branche **`fix/<slug>-<sujet>`** partie de la branche visée (branche de lot ou du chantier), fusionnée
  par une PR vers elle ; close par le lead quand la CI repasse au vert.
- **PR finale** : `feature/<slug>` → `development`, ouverte par le lead dev quand toutes les issues de lot sont
  closes. Revue finale par un relecteur. Le lead dev surveille la CI et crée les issues de correctif jusqu'à
  `ci-ok` vert. Alors : `DONE` dans l'état, tâche planifiée désactivée, notification avec le lien. **Jamais de
  fusion de la PR finale.**

### 8. Règles de test (tous les tests, présents et futurs)

- **API** : pytest-django, base de test créée par Django (`test_…`), jamais une base de dev ; garde-fou dans
  `apps/api/conftest.py` : avec `AGENT_LOT` posé, la base doit être `test_steamy_<lot>[_gwN]` ; sans, `test_steamy[_gwN]`. **Aucun mock de la base ni de l'ORM** ;
  seuls les services externes se simulent (faux SMS, faux paiement, Vimeo, DGI, SMTP réel).
- **Fabriques** factory_boy + Faker (`apps/<app>/tests/factories.py`) ; un lot qui a besoin d'une fabrique
  nouvelle l'écrit dans un fichier de son périmètre.
- **Front** : Vitest (données en mémoire) ; e2e sur fixtures contre la fausse API typée depuis `openapi.yaml` ;
  parcours de bout en bout sur la vraie stack.
- **Ne jamais modifier le code de production pour faire passer un test** : s'arrêter et le signaler dans l'issue.
- **Couverture** : 100 % du code modifié (diff-cover), comparé à la **base de la PR** (branche du chantier pour un
  lot, `development` pour la PR finale). Pendant le développement : tests ciblés + `coverage-diff` seulement ; la
  suite complète tourne en CI. `make coverage-diff BASE=…` rejoue avec couverture les tests des **apps Django et
  dossiers du front touchés par le diff** (pas toute la suite), puis applique diff-cover contre `BASE`. En CI,
  diff-cover compare à la base de la PR (aujourd'hui `origin/development` en dur : à paramétrer).
- **Rapidité** : pytest parallélisé (pytest-xdist, une base par processus) ; Playwright en workers ; e2e sur la
  vraie stack en shards en CI.
- **Tout en Docker**, y compris les e2e sur fixtures (aujourd'hui lancés par `pnpm` sur l'hôte et en CI) ; la CI
  appelle les mêmes cibles `make` que les agents.
- Pas de `retry` ni de `force: true` comme correctif d'instabilité ; cause racine. Sous forte charge, rejouer le
  fichier seul avant de conclure à un bug.

### 9. Gardes-fous

- **Verrou** du superviseur (`run.lock` + battement toutes les 5 min ; verrou de plus de 30 min = périmé) ;
  état dans `.superpowers/sdd/<slug>/state.md` (phase, journal daté).
- **Périmètre vérifié** : `scripts/chantier/check-perimetre.sh <lot>` compare `git diff --name-only` aux globs du
  plan ; bloquant avant toute fusion de lot.
- **Plafond de tentatives** : même échec de CI ou de revue 3 fois de suite après correctif → `etat:bloque`, ligne
  dans l'état, notification, on n'insiste pas.
- **Git** : commits seulement sur `feature/<slug>`, `feature/<slug>-<lot>` et `fix/<slug>-<sujet>`, un par tâche.
  **Message** : une seule ligne en français au format Conventional Commits de `CONTRIBUTING.md`
  (`feat(web): …`, `fix(api): …`, `test(api): …`, `docs: …`), décrivant ce qui a été fait comme l'écrirait un
  humain ; pas de numéro d'issue ni de trailer, **aucune mention de co-auteur IA**. Branches de correctif : `fix/…`. Jamais de commit ni de push sur `development` ou
  `main`, jamais de `--force`, jamais de `--no-verify`, jamais de fusion de la PR finale.
- **Actions à risque** (reset de base, suppression de volumes, modification de `.env`/compose/Dockerfile hors plan
  validé, release, production, SSH) : l'agent s'arrête, l'issue passe `etat:bloque`, notification.
- **Hôte** : un agent qui aurait besoin d'une commande hors `docker`/`make`/`git`/`gh` s'arrête : il manque une
  cible `make`.
- **Fin d'agent** : `TaskStop` dès le rapport final reçu, aucun moniteur de fond laissé en vie.
- **Agents bloqués** (rôle Surveillant) :
  - chaque agent tient un **journal de progrès** `.superpowers/sdd/<slug>/agents/<issue>.md` (une ligne datée à
    chaque tâche commencée ou finie, chaque commande longue lancée) ; le superviseur y note l'identifiant de
    l'agent lancé ;
  - **bloqué** = aucun progrès (journal, commits, fichiers du worktree) depuis 20 min, ou une même commande qui
    tourne au-delà de son délai, ou des conteneurs de l'agent arrêtés ou en boucle de redémarrage ;
  - action : `TaskStop` de l'agent, arrêt forcé des processus et conteneurs figés de son environnement (jamais
    des services partagés), redémarrage de ses conteneurs, puis **relance** d'un nouvel agent du même rôle sur la
    même issue avec consigne de reprise : lire l'Avancement du plan, la note `> Reprise :`, `git log` et son
    journal, puis continuer à la première tâche non cochée (travail non commité conservé et inspecté d'abord) ;
  - un agent lancé par un passage précédent du superviseur dont la session a disparu (verrou périmé) est traité
    comme bloqué : son issue est relancée au passage suivant ;
  - **2 relances** sans progrès sur la même issue → `etat:bloque`, notification.
- **Défauts jumeaux** : un défaut trouvé dans un lot → le lead dev cherche le même dans les autres lots actifs.

### 10. Pièges connus (repris de Badge, à adapter)

- Charge machine : mesurer les profils, ne pas dépasser le budget ; `uptime` élevé → rejouer avant de conclure.
- Next en mode dev qui perd des routes : redémarrer le conteneur web de l'agent.
- Worker Celery qui ne recharge pas le code : le redémarrer après une fusion qui touche du code exécuté par lui.
- Sous-agents qui renvoient leur rapport en boucle : `TaskStop`.
- Les revues de lot ne voient pas les autres lots : le lead dev vérifie les défauts transverses.

## Organisation de la mise en place

La mise en place est elle-même découpée en plans (rédigés après validation de cette ADR), sans pouvoir encore
utiliser l'orchestrateur : ils s'exécutent en session, dans l'ordre du graphe ci-dessous.

1. **Environnement Docker des agents** : réseau partagé, `compose.agent.yml`, `scripts/agent-env.sh`, profils
   mesurés, cibles `agent-*` et standard, e2e sur fixtures en Docker, `coverage-diff` paramétré par la base.
2. **Tests plus rapides** : pytest-xdist, garde-fou de base, CI alignée sur les cibles `make` (dépend de 1).
3. **Kit générique** : skill `chantier`, `contrat.md`, `plan-template.md`, `superviseur-template.md`, agents
   `chantier-*`, `CLAUDE.md` racine, `.claude/chantier.projet.md`, `scripts/chantier/` (labels, périmètre)
   (indépendant de 1 et 2 sauf les valeurs mesurées).
4. **Chantier pilote** : un petit chantier réel exécuté de bout en bout par la tâche planifiée, pour valider la
   méthode et corriger le kit (dépend de 1, 2, 3).

## Précisions

- La CI se déclenche déjà sur toute `pull_request`, donc sur les PR de lot vers `feature/<slug>`. Les branches
  `feature/*` ne sont pas protégées : c'est le lead dev qui exige `ci-ok` vert avant de fusionner un lot.
- L'état et le verrou (`.superpowers/sdd/<slug>/`) vivent dans le dépôt principal, ignorés par git ; le superviseur
  tourne toujours dans le dépôt principal, jamais dans un worktree de lot.
- La fausse API des e2e sur fixtures existe déjà (`apps/web/e2e/fausse-api/`) : le plan 1 la met en conteneur, il
  ne la construit pas.
- La validation de cette ADR vaut autorisation, pour la méthode, de créer labels, issues et PR via `gh` sur le
  dépôt du projet.
- Elle vaut aussi autorisation, pour les plans de mise en place, de modifier `compose.yml`, `compose.e2e.yml`, les
  Dockerfile, le `Makefile` et `.github/workflows/ci.yml` dans le périmètre décrit par chaque plan (ex. réseau
  partagé, services en conteneur). Hors de ces plans, ces fichiers restent des actions à risque.

## Laissé au constructeur

- Noms exacts des cibles `make` au-delà du contrat, structure interne des scripts.
- Mécanisme de partage des services (réseau Docker externe ou `host.docker.internal`), tant qu'aucun port
  d'agent n'est publié.
- Nombre de processus xdist par profil.
- Format exact des corps d'issue et des commentaires, tant qu'ils portent les informations listées.

## Conséquences

- Les plans existants (`docs/plans/LOT-*.md`, `docs/tests/plans/*.md`) ne sont pas réécrits ; tout **nouveau**
  chantier suit cette méthode. Les plans de couverture des scénarios seront re-découpés en lots au format
  ci-dessus quand ils seront lancés.
- La CI tourne sur chaque PR de lot : plus de minutes GitHub Actions consommées.
- La relecture n'est pas une approbation GitHub : `revue:ok` est un label ; la protection de `development`
  (check `ci-ok`) reste le garde-fou de la PR finale.
