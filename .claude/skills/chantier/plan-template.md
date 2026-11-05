# {{titre}} — Plan d'implémentation

> **Pour les agents d'exécution** : exécuter tâche par tâche, tests d'abord. Les étapes utilisent la syntaxe à cases
> `- [ ]`.

**Objectif** : {{objectif}}

**Architecture** : {{architecture}}

**Stack** : {{stack}}

**Spec** : {{spec}} (section « Organisation du travail » ; elle fait autorité). Plan du chantier `{{slug}}`,
lot {{lot}} sur {{nombre_de_lots}}.

## Exécution

- **Chantier** : `{{slug}}` · **Issue** : {{issue}}
- **Branche** : `{{branche_lot}}` · **Base** : `{{branche_chantier}}` · **Profil** : {{profil}}
- **Dépendances** : {{dependances}} (lots qui doivent être fusionnés dans la base avant de démarrer).
- Toutes les commandes `make` se lancent dans le worktree du lot.
- En exécution automatisée, un commit par tâche est autorisé sur la branche du lot ; message d'une ligne, au format
  Conventional Commits de la convention du projet, sans numéro d'issue, sans trailer, **jamais de mention de
  co-auteur IA**. Sinon, aucun commit sans demande explicite. Jamais de commit sur la branche d'intégration ni sur une
  branche protégée, jamais de `--force`, jamais de `--no-verify`.

## Avancement

Statut : ⬜ à faire · Prochaine tâche : 1

- [ ] **Tâche 1** {{intitule_tache_1}} · `{{branche_lot}}`
  - [ ] {{sous_tache}}
  - [ ] {{sous_tache}}
- [ ] **Tâche N** Vérification du lot

> Reprise : (vide)

Statuts : ⬜ à faire · 🟡 en cours · ✅ terminé. Cocher une case **seulement après tests verts**. Interruption en cours
de tâche : cocher ce qui est fini et noter ici `> Reprise :` l'étape en cours, les fichiers touchés et la prochaine
étape.

## Fichiers du lot (exclusifs)

Une puce = **un glob entre accents graves** (premier segment entre accents graves de la puce : c'est ce que lit le
script de périmètre). Le reste de la ligne (`[nouveau]`, commentaire) est libre. Syntaxe des globs : `**` = tout, y
compris les sous-dossiers (un dossier entier s'écrit `dossier/**`) ; `*` = sans `/` ; `?` = un caractère sans `/` ;
un fichier s'écrit par son chemin exact. Les globs sont lus **depuis la base** : les modifier dans la branche du lot
ne change rien.

- `{{glob}}` [nouveau]
- `{{glob}}` (commentaire éventuel)
- `{{chemin_du_plan}}` (ce plan : Avancement)

## Fichiers en lecture seule

{{liste_lecture_seule}}

Besoin d'y toucher → **s'arrêter et le signaler dans l'issue** (jamais de modification de ces fichiers depuis ce
lot).

## Contraintes globales

Reprendre les règles de test lues dans `.claude/chantier.projet.md` et `CLAUDE.md` : {{regles_de_test}}. Au minimum :
aucun mock de la base ni de l'ORM ; fabriques pour les données ; ne jamais modifier le code de production pour faire
passer un test (s'arrêter et le signaler) ; couverture de 100 % du code modifié ; pas de `retry` ni de contournement
pour masquer une instabilité ; toutes les commandes passent par `make`.

## Points de revue

1. {{point_de_revue}}
2. {{point_de_revue}}

Pour toute UI : un test e2e **et** un contrôle visuel à 360, 1024 et 1280 px.

---

### Tâche 1 : {{intitule_tache_1}}

**Fichiers :**
- Créer : {{fichiers_crees}}
- Modifier : {{fichiers_modifies}}
- Test : {{fichiers_de_test}}

**Interfaces :**
- Consomme : {{ce_que_la_tache_consomme}}
- Produit : {{ce_que_la_tache_produit}}

- [ ] **Étape 1** : écrire le test, le voir échouer.
- [ ] **Étape 2** : implémenter.
- [ ] **Étape 3** : relancer, tout vert ; cocher l'Avancement ; commit d'une ligne.

*(Les tâches d'un plan sont **dépendantes par construction** : chacune a besoin de la précédente. Un planificateur
qui trouve **deux sous-ensembles indépendants** le signale pour que le lot soit scindé en deux lots.)*

---

### Tâche N : vérification du lot

**Fichiers :** aucun nouveau (corrections éventuelles dans les fichiers du lot).

- [ ] `make lint` et `make typecheck` verts.
- [ ] Tests ciblés du lot : `make test-cible T=<chemins du lot>`.
- [ ] `make coverage-diff BASE={{branche_chantier}}` : 100 % du code modifié.
- [ ] `make check-generated` et `make migrations-check` (ou « sans objet »).
- [ ] e2e du lot (`make e2e-fixtures` et/ou `make e2e` selon le profil), avec le jeton e2e du superviseur.
- [ ] Périmètre : commande de périmètre du fichier projet, avec `BASE={{branche_chantier}}` ; attendu : « Périmètre
  OK » (une ligne `HORS PÉRIMÈTRE` est corrigée ou signalée, jamais le plan modifié pour la faire disparaître).
- [ ] Rapport final : `Statut: DONE|PARTIAL|BLOCKED`, tâches, commits, commandes et résultats, points à signaler.
