# Plans d'implémentation

Plans pour implémenter les écrans de Steamy, lot par lot, et l'API qui les sert. Ils s'appuient sur les documents
alignés, qui font foi :

| Document | Contenu |
| --- | --- |
| [ARBITRAGES](../alignement/ARBITRAGES.md) | Décisions |
| [CONVENTIONS](../alignement/CONVENTIONS.md) | Conventions transverses |
| [SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) | Modèle §3, invariants §4, API §7 |
| Specs d'écrans | Lots [1-2](../SPEC-ECRANS-1-public-auth.md), [3](../SPEC-ECRANS-2-apprenant.md), [3 (WK), 4, 5, 6](../SPEC-ECRANS-3-parent-teacher-admin.md) |
| [INVENTAIRE](../INVENTAIRE-ECRANS.md) | Inventaire des écrans |

| Plan | Contenu |
| --- | --- |
| [PLAN-API](PLAN-API.md) | Correctifs de sécurité, socle, puis une étape d'API par lot |
| [LOT-1-PUBLIC](LOT-1-PUBLIC.md) | Socle front (design system, layouts, enveloppes) + site public |
| [LOT-2-AUTH](LOT-2-AUTH.md) | Inscription apprenant et parent, consentement, connexion, mot de passe oublié |
| [LOT-3-APPRENANT](LOT-3-APPRENANT.md) | Shell, tableau de bord, catalogue, souhaits, pédagogie, achat, boutique |
| [LOT-4-PARENT](LOT-4-PARENT.md) | Espace parent, demandes à valider, paiement |
| [LOT-5-ENSEIGNANT](LOT-5-ENSEIGNANT.md) | Classes, invitations, suivi |
| [LOT-6-ADMIN](LOT-6-ADMIN.md) | Back-office hybride : Next.js et admin Django |

## Étapes de l'API (identifiants communs)

Les plans de lot renvoient à ces identifiants. Le détail de chaque étape est dans [PLAN-API](PLAN-API.md).

| ID | Contenu | Requise avant |
| --- | --- | --- |
| `API-0` | Correctifs de sécurité S1-S9, fermeture des endpoints inutiles, throttling, locale `fr`, codes d'erreur, nettoyage (routes de messagerie, login token, `api_root`) | Tout déploiement |
| `API-1` | Socle : remise à zéro des migrations, nouveau modèle d'identité et rôles, conventions d'URL (`/api/<domaine>/`), domaine `auth` (session), référentiels, renommage `TrackingEvent`, notifications extraites, messagerie supprimée (tag `archive/messaging`, C15), sessions `cached_db` (C20) | Lot 1 |
| `API-L1` | Catalogue public (Course/Project/Level/Mission en lecture, catégories, publication), Steamy Events en lecture, formulaires publics (devis, contact, leads), kits en lecture | Lot 1 |
| `API-L2` | Inscriptions apprenant et parent, consentement, OTP SMS (interface + faux fournisseur, comparaison des fournisseurs), connexion multi-identifiants, mot de passe oublié, activation enseignant | Lot 2 |
| `API-L3a` | Pédagogie : arbre, progression séquentielle, quiz et tentatives, badges, points, rang, certificats, Vimeo, wishlist, tableau de bord, préférences de notification | Lot 3 (dashboard, catalogue, WJ) |
| `API-L3b` | Commerce : commandes typées, paiements (interface + prestataire choisi après comparaison), webhook durci, Kit Codes, demandes de paiement, boutique (kits, panier, stock, livraison), inscriptions aux événements | Lot 3 (WA, WK) |
| `API-L4` | Parent : enfants, demandes à valider, accord sur les événements, rapport hebdomadaire, suppression | Lot 4 |
| `API-L5` | Écoles, classes, invitations et import, évaluations, commentaires, décrochage, propositions d'événements | Lot 5 (et étape 4.10 du lot 4) |
| `API-L6` | Back-office : RBAC (groupes), 2FA, admin Django enregistré et thémé, KPI et rapports d'impact, réglages | Lot 6 |

## Ordre de travail

```
API-0 ──► API-1 ──► API-L1 ──► API-L2 ──► API-L3a ──► API-L3b ──► API-L4 ──► API-L5 ──► API-L6
             │          │          │           │            │           │          │          │
             └──► Lot 1 ┘──► Lot 2 ┘──► Lot 3 ─┴────────────┘──► Lot 4 ┘──► Lot 5 ┘──► Lot 6 ┘
```

- **API et front en parallèle** : chaque étape d'API précède le lot front qui la consomme, et l'API d'un lot peut
  avancer pendant que le front du lot précédent se termine.
- **Comparaisons de prestataires** : celle du SMS se fait avant `API-L2`, celle du paiement avant `API-L3b` (S9,
  S10).
- **Étape 4.10** (consentement d'origine enseignant, `WPD05`) dépend d'`API-L5` : elle est **livrée avec le lot 5**,
  après `API-L5` et avant l'étape 5.9 (parcours de bout en bout). Le lot 4 est terminé sans elle.
- **Maquettes à concevoir** (C18) : WL22-WL24 (étape 1.2), WD23 (3.3a), WPD15 (4.0), WT13 (5.2) sont dessinées dans
  `design/`, dans un nouveau fichier `screens-<espace>-a-concevoir-web.jsx`, et validées avant leur développement.

## Tableau de bord

À mettre à jour dans chaque PR qui change le statut d'un plan. Le détail est dans la section « Avancement » de chaque
plan.

| Plan | Statut | Avancement | Prochaine tâche |
| --- | --- | --- | --- |
| [PLAN-API](PLAN-API.md) | 🟡 en cours | API-0 ✅ (PR #5 à #9) · API-1 ✅ (PR #12, #15, #17, #21 à #25) · API-L1 ✅ (PR #33, #37, #40, #41, #43) · API-L2 : L2.0b à L2.7 (PR #29, #32, #34, #39, #42, #44 à #46) ; parcours Playwright avec le lot 2 · API-L3a : L3a.1 à L3a.6 (PR #64, #66, #68 à #71) · API-L6 : L6.1 (PR #38), L6.2 comptes (PR #61), L6.3 (PR #63), L6.4 KPI et rapports (PR #65, #67) · API-L3b : L3b.0b à L3b.6 et critères de fin (PR #73, #76, #82, #83, #85, #87, #89 à #91) ; format légal des factures en attente (P1, P2) · API-L4 ✅ (PR #75, #77 à #80, #102, #104, #107) | API-L3b |
| [LOT-1-PUBLIC](LOT-1-PUBLIC.md) | ✅ terminé | 1.0 à 1.6 fusionnées (PR #18, #19, #30, #36, #47 à #50, #58) · critères de fin et validation C18 (PR #59) | — |
| [LOT-2-AUTH](LOT-2-AUTH.md) | 🟡 en cours | 2.0 (PR #31) · 2.1 (PR #35) · 2.2 à 2.8 (PR #51 à #57) | Critères de fin du lot (CI, correctifs API signalés) |
| [LOT-3-APPRENANT](LOT-3-APPRENANT.md) | 🟡 en cours | 3.0 shell (PR #92) · 3.1 accueil, notifications, aide (PR #101) · 3.2 catalogue et souhaits (PR #98) · 3.3a mes parcours et missions (PR #94) · 3.3b quiz et badges (PR #95) · 3.3c certification (PR #96) · 3.4 tentatives et progression (PR #97) · 3.5 profil WD13, WD17, WD18 (PR #99), WD19, WD22, WD15 (PR #118) · 3.6 déblocage WA01, WA02, WA06, WD14 (PR #119) · 3.7a boutique, fiche et panier (PR #117) · 3.8 Steamy Events (PR #116) | 3.7b, 3.7c |
| [LOT-4-PARENT](LOT-4-PARENT.md) | 🟡 en cours | 4.0 maquette de WPD15 et des états manquants dessinée (PR #72), validation C18 en attente · 4.1 socle, accueil et notifications (PR #122) | 4.2 à 4.9 ; validation C18 de WPD15 avant 4.4 |
| [LOT-5-ENSEIGNANT](LOT-5-ENSEIGNANT.md) | ⬜ à faire | — | 5.1 (après API-L5) |
| [LOT-6-ADMIN](LOT-6-ADMIN.md) | 🟡 en cours | 6.1 (PR #38) · 6.6 (PR #62) · 6.7 (PR #93) · 6.8 (PR #100) · 6.9 (PR #106, exports PR #111) · 6.3 (PR #113) · 6.4 (PR #114) · 6.5 (PR #115) | 6.2 après API-L5 ; critères de fin |

## Suivi d'exécution

Chaque plan commence par une section **« Avancement »** : la liste à cocher de toutes ses étapes et sous-tâches. C'est
**la source de vérité** de l'état d'exécution du plan. Le reste du document décrit le *comment*.

### Format

```markdown
## Avancement

Statut : 🟡 en cours · Prochaine tâche : API-1.2

### API-1 · Socle — 🟡 en cours
- [x] **API-1.1** Remise à zéro des migrations · `feature/api-1-migrations` · PR #12
  - [x] Supprimer les migrations et recréer `0001_initial` par app
  - [x] CI verte sur une base vide
- [ ] **API-1.2** Nouveau modèle `User` · `feature/api-1-identite`
  - [ ] Modèle et `IdentifierBackend` (C7)
  - [ ] Tests d'unicité conditionnelle et de connexion par persona
- [ ] **Critères de fin d'API-1**
  - [ ] …
```

- **Une case par tâche vérifiable**, assez fine pour qu'une case non cochée dise précisément ce qui reste à faire :
  écran, endpoint, migration, test, critère de recette.
- **Une étape** = une branche + une PR. Sa ligne porte le nom de la branche et, une fois ouverte, le numéro de la PR.
- **Statut d'un bloc** : ⬜ à faire · 🟡 en cours · ✅ terminé. Le statut du plan et la « prochaine tâche » sont tenus à
  jour en tête de section.

### Règles

1. **Cocher dans la même PR que le travail** : la PR qui réalise une tâche coche sa case dans le plan, et met à jour
   le tableau de bord si le statut ou la prochaine tâche du plan changent. Ainsi, une fois fusionnée dans
   `development`, la liste reflète exactement ce qui est livré.
2. **Ne cocher que ce qui est vérifié** (tests passants, CI verte). Une tâche abandonnée ou reportée n'est pas cochée :
   elle est barrée (`~~…~~`) avec la raison et la décision correspondante.
3. **Une tâche découverte en cours de route** est ajoutée à la liste à sa place, plutôt que faite « en passant ».
4. **Une étape partiellement faite à la fin d'une session** : cocher les sous-tâches terminées, pousser la branche, et
   noter sous l'étape `> Reprise : …` (ce qui est commencé, ce qui reste, les pièges rencontrés).

### Reprendre l'exécution dans une nouvelle session

1. Se placer sur `development` à jour (`git switch development && git pull`).
2. Lire le **tableau de bord** ci-dessus, puis ouvrir le plan concerné et lire **Avancement** : la « prochaine tâche » et la première case non cochée indiquent où
   reprendre. Lire la note `> Reprise :` si elle existe.
3. Vérifier qu'aucune branche ni PR n'est déjà en cours pour cette tâche (`git branch -r`, `gh pr list`). Si c'est le
   cas, repartir de cette branche.
4. Relire la section détaillée de l'étape dans le plan, et les décisions qu'elle cite.

## Règles communes à tous les plans

- **Gitflow.** Chaque étape d'un plan correspond à une branche `feature/<lot>-<sujet>` créée depuis `development`
  (`<lot>` ∈ `api`, `lot1` … `lot6` ; `<sujet>` en kebab-case, par exemple `feature/lot3-quiz`,
  `feature/api-l2-4-decision-parent`), et à une PR vers `development` avec une CI verte (`ci-ok`). Aucun commit direct sur `main` ni sur `development`. Une étape doit être
  livrable seule et ne casse rien.
- **Contrat front/API.** Toute modification d'API passe par `make openapi`. Le front n'appelle l'API qu'à travers le
  client généré (`getServerApi`, `getBrowserApi`).
- **Tests.**

  | Couche | Outils |
  | --- | --- |
  | API | pytest. Chaque invariant (§4) et chaque permission sont testés, y compris les refus |
  | Front, composants | Vitest + Testing Library |
  | Front, parcours | Playwright sur la stack Docker, un parcours par flux critique (inscription, consentement, paiement…) |

  L'outillage de test du front est mis en place à l'étape 1.0 du lot 1.
- **Couverture : 100 % exigée.**

  | Tests | Exigence | Contrôle |
  | --- | --- | --- |
  | Unitaires (API et front) | **100 % des lignes et des branches du code ajouté ou modifié** par la PR (le seuil global monte au fil de la refonte) | `diff-cover` en CI ; en local `make coverage-api` (et l'équivalent front livré à l'étape 1.0a) |
  | E2E | **100 % des écrans v1** : tout écran livré a au moins un test Playwright, cité dans la [matrice écran → test](../tests/MATRICE-E2E.md) avec les parcours qu'il vérifie | Job CI `e2e-matrice` (`python3 scripts/e2e_matrix.py --check`) |

  Un écran est **livré** dès qu'une case de réalisation qui le cite est cochée dans la section « Avancement » de son plan
  (les cases de conception de maquette ne comptent pas) : la même PR doit donc
  remplir sa ligne de la matrice. Une exclusion de couverture (`# pragma: no cover`, `/* v8 ignore */`) n'est admise
  que pour du code réellement inatteignable, avec un commentaire qui le justifie.
- **Définition de « terminé »** (pour chaque écran) :
  - conforme à la spec alignée, la maquette servant de référence visuelle ;
  - responsive, du mobile (360 px) au bureau ;
  - 100 % en français, dans le bon registre (tutoiement apprenant, vouvoiement parent, enseignant et personnel) ;
  - accessible : navigation au clavier, focus visible, libellés, contrastes AA ;
  - tous les états gérés : chargement, vide, erreur, hors ligne ;
  - aucune donnée de démonstration codée en dur ;
  - tests passants, couverture unitaire à 100 % sur le code modifié, et ligne de la matrice e2e remplie.
- **Données de démonstration** : un jeu unique (D2), chargé par une commande Django (`make seed`), sert au
  développement, aux tests de parcours et à la recette.

## Routes du front (App Router)

Les URL sont en français, avec un *route group* et un layout par espace :

| Espace | Groupe | Préfixe d'URL | Exemples |
| --- | --- | --- | --- |
| Public | `(public)` | `/` | `/parcours`, `/parcours/[slug]` (WL22), `/boutique`, `/boutique/[slug]`, `/evenements`, `/evenements/[slug]` (WL23), `/ecoles`, `/a-propos`, `/blog`, `/blog/[slug]`, `/guides`, `/categories`, `/legal/[doc]`, `/aide` (WL24) |
| Authentification | `(auth)` | `/` | `/connexion`, `/inscription`, `/inscription/apprenant/…`, `/inscription/parent/…`, `/mot-de-passe-oublie/…`, `/activation/[token]` |
| Apprenant | `(apprenant)` | `/apprenant` | `/apprenant` (WD01), `/apprenant/parcours`, `/apprenant/catalogue`, `/apprenant/parcours/[slug]/…`, `/apprenant/souhaits`, `/apprenant/boutique/…`, `/apprenant/profil/…` |
| Parent | `(parent)` | `/parent` | `/parent`, `/parent/enfants/[id]`, `/parent/consentements/[id]` (WPD05), `/parent/demandes/[id]` (WPD15), `/parent/evenements`, `/parent/commandes`, `/parent/boutique/…` |
| Enseignant | `(enseignant)` | `/enseignant` | `/enseignant`, `/enseignant/classes/[id]`, `/enseignant/eleves/[id]` |
| Back-office | `(backoffice)` | `/backoffice` | `/backoffice` (WAD01), `/backoffice/impact/…` (WAD02-WAD05) |

- **Pas de `/admin` côté front.** L'admin Django est servi par l'API sur son propre domaine (`api.<domaine>/admin/`).
- **Contrôle du rôle.** Le layout de chaque espace vérifie le rôle côté serveur (session) et redirige vers
  `/connexion?next=<chemin>` si l'utilisateur n'a pas accès.
- **Retour après connexion.** Un seul paramètre, `?next=`, partout (`/connexion?next=…`, `/inscription?next=…`) :
  chemin interne uniquement, validé par `safeNext()` (lot 2). L'admin Django (WAD15) accepte `next` vers
  `<WEB_URL>/backoffice` seulement.
- **Paramètres d'URL partagés.** WL24 : `/aide?sujet=<sujet>#contact` (`question`, `paiement`, `livraison`,
  `changement-parent`, `candidature`, `autre`) ; « Rejoindre l'équipe » → `/aide?sujet=candidature#contact`.
- **Pages publiques en cache.** Elles utilisent un client API anonyme, ce qui permet de les mettre en cache.
