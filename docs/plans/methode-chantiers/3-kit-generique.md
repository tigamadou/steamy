# Kit générique de la méthode chantier — Plan d'implémentation

> **Pour les agents d'exécution** : sous-compétence requise : `superpowers:executing-plans` (exécution en session). Les étapes utilisent la syntaxe à cases `- [ ]`.

**Objectif** : livrer le kit générique de la méthode « chantier » (skill, contrat, gabarits, sept agents), l'adaptateur Steamy (`CLAUDE.md` racine, `.claude/chantier.projet.md`, scripts `scripts/chantier/` testés, cibles `make`) et la mention dans `docs/plans/README.md`.

**Architecture** : le kit (`.claude/skills/chantier/`, `.claude/agents/chantier-*.md`) ne nomme jamais Steamy ; toute valeur projet est lue dans `.claude/chantier.projet.md`. Les deux scripts shell sont écrits tests d'abord (bats lancé en conteneur Docker). Les cibles `make` vivent dans `make/chantier.mk`, inclus par le `Makefile` en toute dernière tâche pour limiter le conflit avec le lot 1.

**Stack** : Markdown, bash, bats (conteneur Docker), `gh`, `git`, `make`.

**Spec** : `docs/adr/0007-methode-chantiers-paralleles.md` (§ 1, 2, 3, 4, 5, 7, 9, 10 ; elle fait autorité). Plan du chantier `methode-chantiers`, lot 3 sur 4.

## Exécution

- **Chantier** : `methode-chantiers` · **Issue** : aucune (exécution en session, l'orchestrateur n'existe pas encore).
- **Branche** : `feature/methode-chantiers-3` · **Base** : `feature/methode-chantiers` · **Profil** : aucun (documents et scripts shell ; seuls `docker`, `make`, `git`, `gh` sont lancés sur l'hôte).
- **Dépendances** : aucune (indépendant des plans 1 et 2 ; exécutable en parallèle du plan 1). Les contrats du plan 1 sont seulement **référencés** (voir « Contrats consommés »).
- Toutes les commandes `make` se lancent dans le worktree du lot.
- Exécution en session : un commit par tâche est autorisé sur la branche du lot ; message d'une ligne, Conventional Commits en français (`docs: …`, `chore: …`, `test: …`), sans numéro d'issue, sans trailer, **jamais de mention de co-auteur IA**. Jamais de commit sur `main`/`development`, jamais de `--force` ni `--no-verify`.
- Le plan peut aussi être exécuté plus tard par l'orchestrateur ; les règles ci-dessus restent valables.

## Contrats consommés (produits par le plan 1, référencés, jamais implémentés ici)

`make agent-up LOT= PROFIL=web|api|complet BASE=`, `make agent-down LOT=`, `make agent-status`, `make test-cible T=`, `make coverage-diff BASE=`, `make lint`, `make typecheck`, `make generate`, `make check-generated`, `make migrations-check`, `make e2e-fixtures`, `make e2e` ; worktree `../steamy-wt-<lot>`, projet Compose `steamy-ag-<lot>`, variable `AGENT_LOT` ; profils et budget mesurés dans `docs/infra/agents.md` (créé par le plan 1). `.claude/chantier.projet.md` **renvoie** à ce document et ne copie aucune valeur mesurée.

## Avancement

Statut : 🟡 en cours · Prochaine tâche : 6

- [x] **Tâche 1** Script de périmètre et ses tests · `feature/methode-chantiers-3`
  - [x] Tests bats écrits et rouges
  - [x] `scripts/chantier/check-perimetre.sh` vert
- [x] **Tâche 2** Script des labels, cibles `make/chantier.mk` et exécuteur de tests
  - [x] Tests bats écrits et rouges
  - [x] `labels.sh` et `make/chantier.mk` verts
- [x] **Tâche 3** Contrat et gabarit de plan du kit
- [x] **Tâche 4** Les sept agents `chantier-*`
- [x] **Tâche 5** Gabarit du superviseur
- [ ] **Tâche 6** Skill `chantier` (SKILL.md)
- [ ] **Tâche 7** Adaptateur : `CLAUDE.md` racine, `.claude/chantier.projet.md`, `docs/plans/README.md`
- [ ] **Tâche 8** Ligne `include` dans le `Makefile` (point de fusion avec le lot 1)
- [ ] **Tâche 9** Vérification du lot

> Reprise : (vide)

## Fichiers du lot (exclusifs)

- `.claude/skills/chantier/SKILL.md` [nouveau]
- `.claude/skills/chantier/contrat.md` [nouveau]
- `.claude/skills/chantier/plan-template.md` [nouveau]
- `.claude/skills/chantier/superviseur-template.md` [nouveau]
- `.claude/agents/chantier-*.md` [nouveau]
- `.claude/chantier.projet.md` [nouveau]
- `CLAUDE.md` [nouveau]
- `scripts/chantier/**` [nouveau]
- `make/chantier.mk` [nouveau]
- `Makefile` (une seule ligne `include`, tâche 8 uniquement)
- `docs/plans/README.md` (section sur la méthode des chantiers uniquement)
- `docs/plans/methode-chantiers/3-kit-generique.md` (ce plan : Avancement)

## Fichiers en lecture seule

`docs/adr/0007-methode-chantiers-paralleles.md`, `CONTRIBUTING.md`, `Makefile` (hors ligne `include`), `docs/plans/methode-chantiers/README.md` et les plans 1, 2, 4, `docs/infra/agents.md` (plan 1), `compose*.yml`, Dockerfile, `.github/**`, `apps/**`, `packages/**`, `.gitignore`.
Besoin d'y toucher → **s'arrêter et le signaler** (jamais de modification de ces fichiers depuis ce lot).

**Dépendance à signaler au plan 1** : l'ajout de `.superpowers/` au `.gitignore` est à sa charge (ce lot ne touche pas `.gitignore`).

## Global Constraints

- **Règles de test (ADR § 8)** : aucun mock de la base ni de l'ORM ; jamais de modification du code de production pour faire passer un test (s'arrêter et signaler) ; pas de `retry` ni `force: true` pour masquer une instabilité. Ce lot n'écrit pas de code applicatif : ses tests sont ceux des scripts shell, avec des dépôts git temporaires réels (pas de simulation de `git`) ; seul `gh` est remplacé par un faux exécutable (service externe).
- **Tout dans Docker** : sur l'hôte, uniquement `docker`, `make`, `git`, `gh`. Les tests bats s'exécutent en conteneur ; jamais `bats`, `node`, `python`, `pnpm` sur l'hôte.
- **Le kit ne nomme jamais Steamy** : aucun fichier de `.claude/skills/chantier/` ni `.claude/agents/chantier-*.md` ne contient la chaîne `steamy` (insensible à la casse), ni de valeur propre au projet (`development`, `ci-ok`, `pnpm`, `Django`…) hors exemples explicitement marqués génériques. Les valeurs sont lues dans `.claude/chantier.projet.md`.
- **Langue** : français avec accents dans tous les documents ; code, identifiants et noms de fichiers en anglais ou ASCII selon l'existant ; commits ASCII.
- **Valeurs exactes de la spec** : tâche planifiée `*/15 * * * *` ; verrou `run.lock`, battement 5 min, périmé après 30 min ; agent bloqué après 20 min sans progrès, 2 relances puis `etat:bloque` ; même échec 3 fois de suite → `etat:bloque` ; aucun plafond fixe de lots : le nombre de lots actifs est borné par le budget mémoire (coûts des profils lus dans `docs/infra/agents.md`), file d'attente au-delà ; jeton e2e N=1 par défaut ; labels de l'ADR § 7.
- **Gabarits** : le format de `docs/plans/README.md` de ce dépôt (« Avancement », ⬜ 🟡 ✅, « Prochaine tâche », `> Reprise :`) est conservé.
- **Conflit avec le lot 1** : le `Makefile` n'est touché qu'à la tâche 8 (une ligne) ; ne pas toucher `.gitignore`.

## Review Focus

1. **Globs du plan** : `check-perimetre.sh` doit gérer `**`, `*`, fichiers à la racine, chemins avec espaces ou accents, mentions `[nouveau]` et commentaires entre parenthèses après le glob ; un glob mal lu laisserait passer un fichier hors périmètre (faux négatif, le plus grave).
2. **Diff vide ou base inconnue** : diff vide → code 0 ; base introuvable → code 2 avec message, jamais « OK » silencieux.
3. **Idempotence des labels** : `labels.sh` relancé 2 fois ne produit aucune erreur ; un échec de `gh` fait échouer le script (pas de succès silencieux).
4. **Fuite de nom de projet** dans le kit (grep insensible à la casse) et valeurs mesurées recopiées dans `chantier.projet.md` au lieu d'un renvoi vers `docs/infra/agents.md`.
5. **Rôle sans pouvoir** : un agent qui peut coder alors qu'il ne devrait pas (surveillant, lead QA, relecteur, planificateur) ; sous-agent censé lancer un autre agent (impossible : seul le superviseur lance) ; testeur autorisé à modifier le code de production.

---

### Tâche 1 : `check-perimetre.sh` et ses tests (bats)

**Fichiers :**
- Créer : `scripts/chantier/tests/check-perimetre.bats`, `scripts/chantier/tests/helpers.bash`, `scripts/chantier/check-perimetre.sh`
- Test : le fichier bats ci-dessus

**Interfaces :**
- Produit : `scripts/chantier/check-perimetre.sh <lot> <plan> <base>` — lit dans `<plan>` la section `## Fichiers du lot (exclusifs)` (jusqu'au prochain `## `), extrait de chaque puce le **premier segment entre accents graves** comme glob, compare `git diff --name-only <base>...HEAD` ; le fichier du plan lui-même est toujours autorisé. Sorties : `0` périmètre respecté (« Périmètre OK (<n> fichiers) ») ; `1` fichiers hors périmètre, liste un par ligne préfixée `HORS PÉRIMÈTRE : ` ; `2` erreur d'usage (argument manquant, plan illisible, section absente ou vide, base introuvable).
- Produit : `helpers.bash` avec `make_repo` (dépôt git temporaire réel, branche `base` puis branche de lot) et `write_plan <globs…>` utilisés par la tâche 2.
- Consomme : rien.

- [ ] **Étape 1 : écrire les tests rouges** dans `check-perimetre.bats`, sur de vrais dépôts git temporaires (`BATS_TEST_TMPDIR`) :
  - `fichier dans le périmètre → 0` ; `fichier hors périmètre → 1 et nom listé` ; `plusieurs fichiers hors périmètre → tous listés` ;
  - `glob ** couvre les sous-dossiers` (`src/**` accepte `src/a/b/c.ts`, refuse `lib/a.ts`) ; `glob * ne traverse pas les dossiers` (`src/*.ts` refuse `src/a/b.ts`) ;
  - `fichier racine exact` (`CLAUDE.md`) ; `chemin avec espace et accent` ; `puce avec [nouveau] ou (une seule ligne…) après le glob` ;
  - `le fichier du plan est toujours autorisé` ;
  - `diff vide → 0` ; `base inconnue → 2` ; `section absente → 2` ; `section vide → 2` ; `argument manquant → 2` ;
  - `la section « lecture seule » n'est pas lue comme périmètre` (un glob placé après le `## ` suivant ne compte pas).
- [ ] **Étape 2 : lancer les tests, vérifier qu'ils échouent** — commande de la tâche 2 (`make chantier-test`) n'existe pas encore : utiliser `docker run --rm -v "$PWD":/repo -w /repo alpine:3.20 sh -c 'apk add --no-cache bash git bats >/dev/null && bats scripts/chantier/tests'`. Attendu : échec (script absent).
- [ ] **Étape 3 : implémenter `check-perimetre.sh`** en bash (`set -euo pipefail`) : conversion glob → regex ancrée (`**` → `.*`, `*` → `[^/]*`, `?` → `[^/]`, le reste échappé) ; lecture de la section avec `awk` ; compatible `sh` busybox non requis (shebang `#!/usr/bin/env bash`).
- [ ] **Étape 4 : relancer** la commande de l'étape 2. Attendu : tous les tests verts.
- [ ] **Étape 5 : cocher la tâche 1 dans l'Avancement, commit** `test: script de verification du perimetre d'un lot`

---

### Tâche 2 : `labels.sh`, `make/chantier.mk` et exécuteur de tests

**Fichiers :**
- Créer : `scripts/chantier/labels.sh`, `scripts/chantier/tests/labels.bats`, `make/chantier.mk`
- Modifier : `scripts/chantier/tests/helpers.bash` (ajout de `fake_gh`)

**Interfaces :**
- Consomme : `helpers.bash` de la tâche 1.
- Produit : `scripts/chantier/labels.sh <slug>` — crée via `gh label create <nom> --force [--color … --description …]` : `chantier:<slug>` ; `lot:<id>` n'est **pas** créé ici (un lot = un label créé à la création des issues, voir SKILL.md) ; fixes : `role:dev`, `role:testeur`, `role:planificateur`, `type:lot`, `type:ci`, `type:test`, `type:revue`, `etat:pret`, `etat:en-cours`, `etat:en-revue`, `etat:a-corriger`, `etat:bloque`, `revue:ok`. Variante `labels.sh <slug> <lot>…` crée aussi `lot:<id>` pour chaque lot passé. Code non nul dès qu'un appel `gh` échoue ; slug absent → code 2.
- Produit : `fake_gh` (helper) : exécutable `gh` factice en tête du `PATH` qui journalise ses arguments dans `$BATS_TEST_TMPDIR/gh.log` et échoue si `FAKE_GH_FAIL=<sous-chaîne>` figure dans les arguments.
- Produit : `make/chantier.mk` avec les cibles `chantier-labels` (`SLUG=<slug> [LOTS="a b"]`), `chantier-perimetre` (`LOT= PLAN= BASE=`) et `chantier-test` (tests bats en conteneur, commande de la tâche 1 étape 2), toutes `.PHONY`, avec ligne `## …` d'aide et message d'erreur explicite si une variable manque.

- [ ] **Étape 1 : écrire les tests rouges** (`labels.bats`) : `crée les 13 labels fixes plus chantier:<slug>` (compter les appels `gh label create` journalisés) ; `chaque appel porte --force` ; `deuxième exécution identique, code 0` ; `lots passés → lot:<id> créés` ; `échec gh → code non nul` ; `slug absent → 2`.
- [ ] **Étape 2 : vérifier l'échec** (même commande qu'à la tâche 1). Attendu : échec.
- [ ] **Étape 3 : implémenter `labels.sh`** (tableau nom/couleur/description ; un label de chaque famille avec une couleur distincte). Ajouter `fake_gh` aux helpers.
- [ ] **Étape 4 : écrire `make/chantier.mk`** (les trois cibles) et vérifier `make -f make/chantier.mk chantier-test` : tous les tests des tâches 1 et 2 verts, sortie en conteneur uniquement. Vérifier que `make -f make/chantier.mk chantier-perimetre` sans variable échoue avec un message clair.
- [ ] **Étape 5 : cocher, commit** `feat(chantier): script des labels et cibles make du chantier`

---

### Tâche 3 : `contrat.md` et `plan-template.md`

**Fichiers :**
- Créer : `.claude/skills/chantier/contrat.md`, `.claude/skills/chantier/plan-template.md`

**Interfaces :**
- Produit : `contrat.md` — les **9 points du contrat** (ADR § 2) dans l'ordre, chacun avec : énoncé, **comment le vérifier** (commande ou lecture exacte, résultat attendu), **réponse attendue dans `.claude/chantier.projet.md`** (clé nommée : `docker`, `agent_env`, `isolation`, `cibles`, `branches`, `ci`, `budget`, `generes_migrations`, `taches_planifiees`). Règle d'en-tête : le skill refuse de démarrer si un point manque et dit lequel.
- Produit : `plan-template.md` — squelette du plan au format de l'ADR § 4, avec marqueurs `{{…}}` : en-tête **Exécution** (issue, branche, base, profil, dépendances, « toutes les commandes `make` dans le worktree », phrase des commits automatisés avec « une ligne », « Conventional Commits », « jamais de mention de co-auteur IA »), **Avancement** (format de ce dépôt : statut ⬜/🟡/✅, « Prochaine tâche », cases, `> Reprise :`), **Fichiers du lot (exclusifs)** (une puce = un glob entre accents graves ; format lu par le script de périmètre), **Fichiers en lecture seule** + « besoin d'y toucher → s'arrêter et le signaler dans l'issue », **Contraintes globales** (renvoi aux règles de test lues dans le fichier projet), **Points de revue**, UI (e2e + contrôle à 360, 1024 et 1280 px), tâches dépendantes avec Fichiers/Interfaces/étapes, dernière tâche **« vérification du lot »** (lint, typecheck, tests ciblés, `coverage-diff BASE=<branche du chantier>`, `check-generated`, `migrations-check`, e2e du lot, périmètre), consigne « deux sous-ensembles indépendants → le signaler pour scinder le lot ».

- [ ] **Étape 1 : rédiger les deux documents** selon les contenus ci-dessus (références aux cibles par leur nom générique du contrat, jamais de valeur projet).
- [ ] **Étape 2 : vérification par relecture contre l'ADR** — critères : (a) `grep -c '^### ' contrat.md` ou numérotation = 9 points, dans l'ordre de l'ADR § 2 ; (b) chaque point a une commande/lecture de vérification **et** une clé ; (c) `plan-template.md` contient chacun des 9 éléments listés de l'ADR § 4 (grep des intitulés) ; (d) `grep -ni steamy` sur les deux fichiers : aucune occurrence.
- [ ] **Étape 3 : cocher, commit** `docs: contrat de prerequis et gabarit de plan du kit chantier`

---

### Tâche 4 : agents `chantier-*`

**Fichiers :**
- Créer : `.claude/agents/chantier-surveillant.md`, `chantier-lead-dev.md`, `chantier-lead-qa.md`, `chantier-planificateur.md`, `chantier-developpeur.md`, `chantier-testeur.md`, `chantier-relecteur.md`

**Interfaces :**
- Consomme : `contrat.md` et `plan-template.md` (tâche 3) ; noms de labels (tâche 2).
- Produit : sept fichiers au frontmatter Claude Code `---` `name:` (identique au nom de fichier sans extension), `description:` (une phrase : rôle + « quand le superviseur te lance »), `tools:` (liste séparée par des virgules), `model: sonnet` `---`, puis le corps. **Étape préalable** : vérifier la syntaxe du frontmatter sur un exemple réel (`/Users/amadou/.claude/plugins/marketplaces/claude-plugins-official/plugins/hookify/agents/conversation-analyzer.md`) ou la documentation officielle des sous-agents ; si le champ `tools` ou `model` diffère, suivre l'exemple et le noter dans le rapport.
- Outils par rôle : surveillant `Read, Grep, Glob, Bash, TaskStop` ; lead dev, lead QA `Read, Grep, Glob, Bash, Write` (Write pour rapports sous `.superpowers/sdd/` seulement) ; planificateur `Read, Grep, Glob, Bash, Write` (écrit uniquement son plan) ; développeur et testeur `Read, Grep, Glob, Bash, Edit, Write` ; relecteur `Read, Grep, Glob, Bash`. Aucun rôle n'a l'outil `Agent`. Si `TaskStop` n'est pas disponible à un sous-agent, le surveillant liste dans son rapport les identifiants à arrêter et le superviseur exécute.
- Corps commun à chaque agent : (1) lire d'abord `.claude/chantier.projet.md` et `CLAUDE.md` ; (2) toutes les commandes via `make` dans le worktree de l'issue (hôte : `docker`, `make`, `git`, `gh` seulement) ; (3) **journal de progrès** `.superpowers/sdd/<slug>/agents/<issue>.md` : une ligne datée à chaque tâche commencée ou finie et à chaque commande longue lancée ; (4) **format de rapport** final court : `Statut: DONE|PARTIAL|BLOCKED`, tâches faites, commits (hashes), commandes lancées avec résultat, points à signaler ; (5) **reprise après relance** (ADR § 9) : lire l'Avancement du plan, la note `> Reprise :`, `git log` et son journal, **inspecter d'abord le travail non commité**, continuer à la première tâche non cochée ; (6) interdits communs : sortir des fichiers exclusifs (→ stop et signalement dans l'issue), `--force`, `--no-verify`, commit sur `development`/`main` (noms lus dans le fichier projet), mention de co-auteur IA, action à risque (→ `etat:bloque`), laisser un moniteur de fond.
- Corps spécifique : **surveillant** — « bloqué » = aucun progrès (journal, commits, fichiers du worktree) depuis 20 min, ou commande au-delà de son délai, ou conteneurs de l'agent arrêtés/en boucle ; actions préconisées (arrêt, arrêt forcé de ses conteneurs seuls, jamais les services partagés, relance) ; agent d'une session disparue (verrou périmé) = bloqué ; 2 relances sans progrès → `etat:bloque` ; ne code pas, ne décide pas du contenu. **Lead dev** — CI de chaque PR de lot et de la finale, issue `role:dev` par échec (logs, cause probable, fichiers), arbitrages de contrat, fusion des PR de lot (merge commit) seulement si CI verte + `revue:ok` + aucun fil Critique/Important ouvert + périmètre OK (commande de périmètre du fichier projet) + pas de conflit ; conflit → issue « mettre à jour depuis la branche du chantier » (merge, jamais rebase ni force push) ; après fusion : régénération des fichiers générés et contrôle des migrations ; défauts jumeaux ; ouverture de la PR finale quand toutes les issues de lot sont closes ; plafond de 3 échecs identiques ; ne code pas, ne fusionne jamais la PR finale. **Lead QA** — qualité des tests de chaque PR de lot (couverture 100 % du code modifié, vraie base, fabriques, aucun mock de la base ni de l'ORM, scénarios cités), issue `role:testeur` par manque ; ne modifie pas de code. **Planificateur** — rédige un plan à partir de `plan-template.md` avec `superpowers:writing-plans`, ne touche pas au code, signale un lot à scinder. **Développeur** — TDD dans son worktree, un commit par tâche (une ligne, Conventional Commits en français, le fichier projet donne la convention), coche l'Avancement après tests verts, push, PR de lot, répond aux fils de revue (corrige, pousse, cite le commit), commente l'issue en fin. **Testeur** — tests e2e et scénarios, tests manquants ; **ne modifie jamais le code de production** (s'arrête et signale) ; respecte le jeton e2e transmis par le superviseur. **Relecteur** — lecture seule, deux passes (conformité spec/plan, puis qualité et sécurité), **un fil de commentaire en ligne par constat** classé Critique/Important/Mineur avec `fichier:ligne`, verdict = revue « commentaire » + label `revue:ok` (pas d'approbation GitHub), résout les fils corrigés.

- [ ] **Étape 1 : vérifier la syntaxe du frontmatter** (exemple réel ci-dessus) et consigner le format retenu.
- [ ] **Étape 2 : rédiger les sept fichiers** selon le corps commun et le corps spécifique.
- [ ] **Étape 3 : vérification par relecture** — critères : (a) chaque fichier a `name` = nom de fichier, `model: sonnet`, `tools` conforme à la liste ci-dessus (`grep '^tools:'`) ; (b) aucun fichier ne liste `Agent` ni, hors développeur/testeur, `Edit` ; (c) chaque fichier contient les six rubriques communes (grep : « journal », « Reprise », « Statut: », « interdit ») ; (d) le testeur contient « ne modifie jamais le code de production » ; (e) `grep -il steamy .claude/agents/chantier-*.md` ne retourne rien.
- [ ] **Étape 4 : cocher, commit** `docs: agents du kit chantier (surveillant, leads, planificateur, developpeur, testeur, relecteur)`

---

### Tâche 5 : `superviseur-template.md`

**Fichiers :**
- Créer : `.claude/skills/chantier/superviseur-template.md`

**Interfaces :**
- Consomme : noms des agents (tâche 4), labels (tâche 2), clés du fichier projet (tâche 3).
- Produit : prompt de la tâche planifiée, avec marqueurs `{{slug}}`, `{{titre}}`, `{{branche}}`, `{{base}}`, `{{spec}}`, `{{plans}}`, `{{lots}}`, `{{ordre_graphe}}`, `{{depot}}`, `{{exceptions_risque}}`.

- [ ] **Étape 1 : rédiger le gabarit** avec, dans cet ordre : *Contexte* (lecture de `.claude/chantier.projet.md`, `CLAUDE.md`, SKILL.md, spec « Organisation du travail », plans) ; **1. Verrou** (`.superpowers/sdd/{{slug}}/run.lock`, battement `touch` toutes les 5 min par une boucle d'arrière-plan arrêtée par `stop-heartbeat`, verrou de plus de 30 min = périmé, `state.md` contenant `DONE` → stop) ; **2. Préalables** (contrat vérifié, stack principale en marche, arbre propre sur `{{branche}}`) ; **3. Ordre d'un passage** : surveillant → lead dev → lead QA → relecteurs (un par PR prête) → exécution des décisions des leads (issues, labels, fusions) → lancement des agents prêts (issue `etat:pret` dont les dépendances sont closes) sous trois conditions : **budget mémoire** (somme des profils actifs sous le budget lu dans `docs/infra/agents.md` via le fichier projet), **jeton e2e** (fichier de verrou, N max e2e complets simultanés), un seul agent par issue ; sinon **file d'attente** (pas de vagues fixes) ; **4. Agents** (lancés en arrière-plan, un journal par agent, identifiant noté dans le journal, `TaskStop` dès le rapport final) ; **5. PR finale et CI** (le lead dev l'ouvre quand toutes les issues de lot sont closes ; relecteur final ; surveillance jusqu'au check requis vert avec issues de correctif ; puis `DONE` dans `state.md`, désactivation de la tâche par `update_scheduled_task` `enabled:false`, notification avec le lien) ; **Ce que le superviseur ne fait pas** (écrire du code, décider du contenu technique, fusionner la PR finale, déployer, `--force`, commit hors branches `feature/<slug>`, `feature/<slug>-<lot>`, `fix/<slug>-<sujet>`, action à risque sans accord) ; **Pièges** (ADR § 10 : charge machine et `uptime` élevé → rejouer avant de conclure ; serveur de dev du front qui perd ses routes → redémarrer le conteneur web de l'agent ; worker de tâches qui ne recharge pas → le redémarrer après fusion ; sous-agents qui renvoient leur rapport en boucle → `TaskStop` ; revues de lot aveugles aux autres lots → défauts jumeaux par le lead dev) ; **Règles** (plafond de 3 échecs identiques → `etat:bloque`, ligne dans l'état, notification ; message de commit sans mention d'IA ; blocage réel → ligne dans `state.md`, notifier, libérer le verrou).
- [ ] **Étape 2 : vérification par relecture contre l'ADR § 5, § 6, § 7, § 9, § 10** — critères : (a) l'ordre d'un passage est exactement surveillant → lead dev → lead QA → relecteurs → lancement ; (b) valeurs `run.lock`, 5 min, 30 min, `*/15`, N=1 par défaut présentes ; (c) « Ce que le superviseur ne fait pas » contient les six interdits ; (d) cinq pièges de l'ADR § 10 présents ; (e) aucune occurrence de `steamy` ; marqueurs `{{…}}` tous listés dans le skill (tâche 6).
- [ ] **Étape 3 : cocher, commit** `docs: gabarit du superviseur du kit chantier`

---

### Tâche 6 : `SKILL.md`

**Fichiers :**
- Créer : `.claude/skills/chantier/SKILL.md`

**Interfaces :**
- Consomme : `contrat.md`, `plan-template.md`, `superviseur-template.md`, agents (tâches 3 à 5), `scripts/chantier/labels.sh` référencé via le fichier projet.
- Produit : skill de frontmatter `name: chantier`, `description` générique (organiser un chantier non trivial : découpage en graphe de lots à fichiers exclusifs, plans rédigés en parallèle, exécution orchestrée par tâche planifiée).

- [ ] **Étape 1 : rédiger le skill** avec les sections : **0. Contrat** (lire `contrat.md`, vérifier les 9 points, **refuser de démarrer** en nommant l'élément manquant ; demander en une question le slug et le titre manquants) ; **1. Spec validée** (sinon `superpowers:brainstorming` d'abord) ; **2. Découpage en graphe de lots** (règle centrale : **un lot = une chaîne de tâches dépendantes**, deux tâches indépendantes → deux lots ; lots pouvant dépendre d'autres lots ; socle = lot amont petit ; globs exclusifs + lecture seule, aucun fichier modifiable dans deux lots actifs ensemble, document partagé découpé en sections ; profil par lot ; branches `feature/<slug>-<lot>` ; règles propres au projet lues dans le fichier projet ; **table de contrôle** : une ligne par paire de lots partageant fichier ou interface, producteur/consommateur/verdict ; fichier partagé non résolu → remonte dans un lot amont ; spec complétée d'une section « Organisation du travail ») ; **3. Plans en parallèle** (un planificateur Sonnet par lot, tous lancés dans le même message, brief auto-suffisant : spec, section d'organisation, globs, contrats des lots amont, `plan-template.md`, fichier projet ; emplacement et README du chantier selon le fichier projet) ; **4. Relecture croisée** (contrats entre lots, listes exclusives sans recouvrement, tâches contradictoires, lots à scinder signalés par les planificateurs ; arbitrages journalisés dans la spec) ; **5. Validation utilisateur** (présenter graphe, plans, fichiers, ce que la tâche fera seule ; **accord explicite** requis) ; **6. Issues et labels** (labels du chantier via la commande du fichier projet ; une issue de lot par lot avec lien du plan, `Dépend de #…`, profil, fichiers exclusifs, labels `chantier:`, `lot:`, `role:`, `type:lot`, `etat:pret` si sans dépendance) ; **7. Tâche planifiée** (`create_scheduled_task`, `*/15 * * * *`, prompt = `superviseur-template.md` rempli, tous les `{{…}}` listés ; indiquer nom, emplacement de l'état `.superpowers/sdd/<slug>/state.md`, conditions : Claude Desktop ouvert, machine éveillée, Docker lancé) ; **8. Rappel des rôles** (tableau des sept agents, « seul le superviseur lance des agents »).
- [ ] **Étape 2 : vérification par relecture contre l'ADR § 2, 3, 5, 7** — critères : (a) la phrase de refus de démarrer et le renvoi à `contrat.md` ; (b) la règle « un lot = une chaîne de tâches dépendantes » en toutes lettres ; (c) `*/15 * * * *` et `create_scheduled_task` ; (d) tous les marqueurs de `superviseur-template.md` apparaissent dans la liste de remplissage ; (e) tous les labels de l'ADR § 7 cités ; (f) `grep -ri steamy .claude/skills/chantier .claude/agents/chantier-*.md` : aucune occurrence.
- [ ] **Étape 3 : cocher, commit** `docs: skill chantier generique`

---

### Tâche 7 : adaptateur — `CLAUDE.md`, `.claude/chantier.projet.md`, `docs/plans/README.md`

**Fichiers :**
- Créer : `CLAUDE.md`, `.claude/chantier.projet.md`
- Modifier : `docs/plans/README.md` (ajout d'une section en fin de fichier, rien d'autre)

**Interfaces :**
- Consomme : clés de `contrat.md` (tâche 3), cibles `make` du plan 1 (lues dans « Contrats consommés »), scripts de la tâche 2.
- Produit : `CLAUDE.md` racine : stack (Django + DRF, PostgreSQL, Celery/Redis, Next.js 16, pnpm, OpenAPI généré), sources de vérité (ADR, `docs/plans/`, `docs/tests/`, `SPEC-TECHNIQUE.md`, code fait foi), **règles de test (ADR § 8)** reprises telles quelles (base `test_steamy…`, pas de mock de la base ni de l'ORM, factory_boy, ne jamais modifier le code de prod pour un test, 100 % du code modifié via diff-cover, e2e), **Git** (gitflow de `CONTRIBUTING.md`, `feature/` et `fix/`, jamais de commit direct sur `main`/`development`, Conventional Commits d'une ligne en français, aucune mention d'IA, pas de commit sans demande sauf exécution automatisée), tout en Docker (hôte : `docker`, `make`, `git`, `gh`), actions à risque (reset de base, suppression de volumes, `.env`, compose/Dockerfile/Makefile hors plan, release, production, SSH → demander), renvoi au skill `chantier` pour tout chantier non trivial. Lien relatif vers `CONTRIBUTING.md`, pas de recopie du gitflow.
- Produit : `.claude/chantier.projet.md` : une section par clé du contrat. Valeurs : `docker` → toutes les commandes via `make` ; `agent_env` → `make agent-up LOT= PROFIL=web|api|complet BASE=`, `agent-down LOT=`, `agent-status`, worktree `../steamy-wt-<lot>`, projet `steamy-ag-<lot>`, `AGENT_LOT` ; `isolation` → bases `steamy_<lot>`, `test_steamy_<lot>[_gwN]`, garde-fou de `apps/api/conftest.py` ; `cibles` → les neuf cibles du contrat 4 ; `branches` → intégration `development`, protégées `main` et `development`, `feature/<slug>`, `feature/<slug>-<lot>`, `fix/<slug>-<sujet>`, merge commit pour les lots, PR finale vers `development`, jamais fusionnée par un agent ; `ci` → check requis `ci-ok`, déclenché sur toute PR, `gh` authentifié (`gh auth status`) ; `budget` → **renvoi à `docs/infra/agents.md`** (profils, mémoire mesurée, budget) sans recopier de chiffre ; jeton e2e : 1 ; `generes_migrations` → `apps/api/openapi.yaml` et `packages/api-client/src/schema.d.ts` jamais fusionnés à la main (conflit : un côté puis `make generate`, puis `make check-generated`), migrations d'une app à un seul lot actif, `make migrations-check` à chaque fusion ; `taches_planifiees` → Claude Desktop ouvert, machine éveillée, Docker lancé ; commande de labels `make chantier-labels SLUG= [LOTS=]` ; commande de périmètre `make chantier-perimetre LOT= PLAN= BASE=` ; emplacement des plans `docs/plans/<slug>/<n>-<lot>.md` + `README.md` du chantier ; convention de commit ; liste des labels de l'ADR § 7.
- Produit : section de `docs/plans/README.md` « Chantiers (méthode ADR 0007) » : les nouveaux chantiers suivent l'ADR 0007 et le skill `chantier` ; plans dans `docs/plans/<slug>/` ; les plans existants (`LOT-*`, `PLAN-API`, `docs/tests/plans/`) restent au format actuel.

- [ ] **Étape 1 : rédiger les trois contenus** ci-dessus.
- [ ] **Étape 2 : vérification par relecture** — critères : (a) `chantier.projet.md` répond aux **9 clés** de `contrat.md` (grep des clés) ; (b) aucun chiffre de mémoire ou de budget dans le fichier (`grep -E '[0-9]+ ?(Go|GiB|Mo)'` : aucun résultat) ; (c) les neuf cibles du contrat 4 y figurent, orthographiées comme dans « Contrats consommés » ; (d) `CLAUDE.md` reprend les 8 règles de l'ADR § 8 et renvoie à `CONTRIBUTING.md` et au skill `chantier` ; (e) `git diff docs/plans/README.md` n'ajoute que la nouvelle section.
- [ ] **Étape 3 : cocher, commit** `docs: CLAUDE.md racine, adaptateur du kit chantier et mention dans les plans`

---

### Tâche 8 : ligne `include` dans le `Makefile` (point de fusion avec le lot 1)

**Fichiers :**
- Modifier : `Makefile` (une ligne `-include make/chantier.mk` ajoutée en fin de fichier ; aucun autre changement)

**Interfaces :**
- Consomme : `make/chantier.mk` (tâche 2).
- Produit : cibles `chantier-labels`, `chantier-perimetre`, `chantier-test` disponibles depuis le `Makefile`.

- [ ] **Étape 1 : ajouter la ligne** `-include make/chantier.mk` en toute fin du `Makefile` (le tiret évite l'échec si le fichier manque).
- [ ] **Étape 2 : vérifier** : `make chantier-test` vert ; `make help` fonctionne ; `git diff --stat Makefile` montre exactement `1 insertion`. Si le `Makefile` a divergé de la base (lot 1 déjà fusionné), rebaser **la ligne** seulement, sans toucher au reste ; tout conflit autre → s'arrêter et le signaler.
- [ ] **Étape 3 : cocher, commit** `chore: inclusion des cibles make du chantier`
- Signaler dans le rapport : point de fusion avec le lot 1 (ligne `include` du `Makefile`) ; `.gitignore` (`.superpowers/`) à la charge du plan 1.

---

### Tâche 9 : vérification du lot

**Fichiers :** aucun nouveau (corrections éventuelles dans les fichiers du lot).

- [ ] **Étape 1 : tests des scripts** : `make chantier-test` — attendu : tous les tests bats verts (tâches 1 et 2), exécutés en conteneur.
- [ ] **Étape 2 : périmètre sur la branche du lot elle-même** : `make chantier-perimetre LOT=3 PLAN=docs/plans/methode-chantiers/3-kit-generique.md BASE=feature/methode-chantiers` — attendu : « Périmètre OK », code 0 ; toute ligne `HORS PÉRIMÈTRE` est corrigée ou signalée (jamais le plan modifié pour la faire disparaître).
- [ ] **Étape 3 : kit sans nom de projet** : `grep -ril steamy .claude/skills/chantier .claude/agents/chantier-*.md` — attendu : aucune sortie.
- [ ] **Étape 4 : relecture croisée kit ↔ ADR 0007, point par point**, résultat noté dans l'Avancement :
  - § 1 : emplacements des deux couches conformes au tableau ; `CLAUDE.md` racine créé ; skills BMAD intacts (`git status` ne montre aucune modification sous `.claude/skills/bmad-*`) ;
  - § 2 : neuf points, refus de démarrer, réponse de chaque point dans le fichier projet ;
  - § 3 : règle « un lot = une chaîne de tâches dépendantes », dépendances entre lots, table de contrôle, branches `feature/<slug>-<lot>`, deux règles propres au projet (migrations, OpenAPI) dans le fichier projet ;
  - § 4 : les neuf éléments obligatoires du plan dans `plan-template.md` ;
  - § 5 : sept agents, interdits par rôle, seul le superviseur lance des agents ;
  - § 7 : labels (13 fixes + `chantier:` + `lot:`), cycle issue/PR/fusion/PR finale ;
  - § 9 : verrou, périmètre, plafond de tentatives, git, actions à risque, hôte, fin d'agent, agents bloqués, défauts jumeaux ;
  - § 10 : cinq pièges dans le gabarit du superviseur.
- [ ] **Étape 5 : cohérence des marqueurs et des noms** : tous les `{{…}}` des gabarits listés dans le skill ; noms d'agents et de labels identiques dans tous les fichiers (`grep -rhoE 'chantier-[a-z-]+' | sort -u` ne contient que les sept agents).
- [ ] **Étape 6 : rapport** (pas de commit sauf correctifs `docs: correctifs de verification du kit chantier`) : points de fusion avec le lot 1 (`Makefile`, `.gitignore`), écarts de syntaxe de frontmatter constatés, tout besoin de toucher un fichier en lecture seule.
