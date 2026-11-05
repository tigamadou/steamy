# 4 · Chantier pilote — Plan d'implémentation

> **Exécution :** en session, dans le dépôt principal, après fusion de `feature/methode-chantiers` dans
> `development`. Le pilote lui-même est exécuté **par la tâche planifiée** (c'est ce qu'on valide). Corrections du
> kit découvertes pendant le pilote : branche `fix/methode-chantiers-<sujet>` partie de `development`, PR vers
> `development`. Commits : un par tâche, Conventional Commits d'une ligne en français, aucune mention de co-auteur
> IA ; aucun commit sans demande hors exécution automatisée.

**Goal :** exécuter un vrai petit chantier de bout en bout avec la méthode de l'ADR 0007, mesurer le parallélisme
obtenu et corriger le kit avant de l'utiliser sur de gros chantiers.

**Architecture :** on choisit un chantier réel de 3 à 5 lots dont au moins 2 indépendants et de profils différents
(`web` et `api`), on le prépare avec le skill `chantier`, puis la tâche planifiée l'exécute jusqu'à la PR finale et
`ci-ok` vert. Une rétrospective chiffrée alimente les correctifs du kit.

**Spec :** [ADR 0007](../../adr/0007-methode-chantiers-paralleles.md).

## Avancement

Statut : ⬜ à faire · Prochaine tâche : 4.1

- [ ] **4.1** Choix du chantier pilote avec l'utilisateur
- [ ] **4.2** Préparation par le skill `chantier` (contrat, spec, graphe, plans, issues, labels)
- [ ] **4.3** Exécution par la tâche planifiée jusqu'à `ci-ok` vert sur la PR finale
- [ ] **4.4** Rétrospective chiffrée et correctifs du kit

## Fichiers du lot

Exclusifs : ceux du chantier pilote (fixés par sa spec), `docs/plans/methode-chantiers/retrospective-pilote.md`
[nouveau]. Correctifs du kit (`.claude/skills/chantier/**`, `.claude/agents/chantier-*.md`,
`.claude/chantier.projet.md`, `scripts/agent-env.sh`, `scripts/chantier/**`, `docs/infra/agents.md`) : seulement
en 4.4, sur des branches `fix/…`. Besoin de toucher autre chose → s'arrêter et le signaler.

## Global Constraints

- Règles de test de l'ADR § 8 (base `test_steamy_<lot>`, aucun mock de la base ni de l'ORM, fabriques, jamais de
  code de production modifié pour un test, 100 % du code modifié).
- Tout en Docker : rien sur l'hôte hors `docker`, `make`, `git`, `gh`.
- La PR finale du pilote n'est **jamais** fusionnée par un agent.

## Review Focus

- Deux lots actifs qui écrivent le même fichier malgré les listes exclusives (le contrôle de périmètre doit
  bloquer la fusion).
- Agent relancé par le surveillant qui refait une tâche déjà commitée au lieu de reprendre à la suivante.
- Budget mémoire dépassé quand un lot `complet` démarre alors que des lots `web` tournent.
- Fichiers générés (OpenAPI) ou migrations incohérents après fusion de deux lots.
- Superviseur qui ne voit pas qu'une session précédente a disparu (verrou périmé) et laisse une issue « en cours ».

---

### Task 4.1 : Choix du chantier pilote

- [ ] Proposer à l'utilisateur 2 ou 3 candidats réels, par exemple une tranche d'un plan de
  [`docs/tests/plans/`](../../tests/plans/) (tests sur fixtures, profil `web`) combinée à des tests pytest
  (profil `api`), ou une petite fonctionnalité en attente. Critères : 3 à 5 lots, au moins 2 indépendants, au
  moins un lot `web` et un lot `api`, livrable utile en lui-même.
- [ ] Noter le choix et le slug du chantier en tête de ce plan.

### Task 4.2 : Préparation par le skill `chantier`

- [ ] Lancer le skill `chantier` : il doit vérifier le contrat (§ 2) et ne relever aucun manque ; noter tout
  manque comme correctif du kit (4.4) et le corriger avant de continuer.
- [ ] Spec du pilote avec la section « Organisation du travail » (graphe, lots, profils, fichiers exclusifs,
  table de contrôle), validée par l'utilisateur.
- [ ] Plans rédigés en parallèle par les planificateurs, relus en croisé ; issues et labels créés
  (`make chantier-labels`) ; branche `feature/<slug>` créée depuis `development`.
- [ ] Accord explicite de l'utilisateur, puis création de la tâche planifiée (`*/15 * * * *`).

### Task 4.3 : Exécution par la tâche planifiée

- [ ] Suivre `.superpowers/sdd/<slug>/state.md` et les issues ; ne pas intervenir sauf blocage notifié.
- [ ] Relever pour la rétrospective : nombre maximal de lots simultanés, mémoire Docker de pointe
  (`docker stats`), relances du surveillant, échecs de CI et tentatives, fils de revue ouverts/résolus, durée
  totale, temps d'attente en file.
- [ ] Critère de fin : PR finale ouverte vers `development`, `ci-ok` vert, état `DONE`, tâche désactivée.

### Task 4.4 : Rétrospective et correctifs du kit

- [ ] Écrire `docs/plans/methode-chantiers/retrospective-pilote.md` : mesures de 4.3, ce qui a bloqué, écarts
  avec l'ADR 0007.
- [ ] Un correctif du kit par problème, sur `fix/methode-chantiers-<sujet>`, avec PR vers `development`.
  Un changement de décision de l'ADR → nouvelle ADR qui la remplace (règle de `docs/adr/README.md`).
- [ ] Mettre à jour [`README.md`](README.md) du chantier : statut ✅.
