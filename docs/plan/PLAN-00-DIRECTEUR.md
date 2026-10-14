# Plan directeur — Réécriture de la documentation Steamy

> ⚠️ **Document historique (août 2026), non maintenu.** Ce plan de réécriture de la documentation date d'avant le
> choix de l'architecture réelle. Il prévoit une stack « Next.js + MySQL/Prisma » qui a été abandonnée au profit de
> Next.js (front) + API Django/PostgreSQL. Ses « lots 0-6 » sont des lots de *documentation*, sans rapport avec les lots
> d'implémentation des écrans.
> Documents à jour :
> - [alignement des specs](../alignement/ARBITRAGES.md) ;
> - [spec technique](../SPEC-TECHNIQUE.md) ;
> - [infrastructure](../infra/README.md) ;
> - plans d'implémentation par lot dans `docs/plans/`.

**Version** : 1.0 · 20 août 2026
**Auteur** : plan de travail destiné à être exécuté par des agents IA (Claude) sous supervision humaine
**Périmètre** : remplacer les 4 documents actuels de `docs/` par une documentation complète, exécutable, et outillée pour l'agentique.

---

## Sommaire

1. [Ce qu'on a, ce qu'on veut](#1-ce-quon-a-ce-quon-veut)
2. [Décisions cadres](#2-décisions-cadres)
3. [Principes de rédaction](#3-principes-de-rédaction)
4. [Arborescence cible](#4-arborescence-cible)
5. [Les 7 lots](#5-les-7-lots)
6. [Traçabilité et identifiants](#6-traçabilité-et-identifiants)
7. [Répartition humain / agent](#7-répartition-humain--agent)
8. [Critères d'acceptation globaux](#8-critères-dacceptation-globaux)
9. [Risques](#9-risques)
10. [Comment exécuter ce plan](#10-comment-exécuter-ce-plan)

---

## 1. Ce qu'on a, ce qu'on veut

### 1.1 État des lieux

`docs/` contient aujourd'hui 4 fichiers issus d'une rétro-ingénierie du canvas de design (`template/`, 32 292 lignes) :

| Fichier | Taille | Contenu | Verdict |
| --- | ---: | --- | --- |
| `SPEC-TECHNIQUE.md` | 50 Ko / 890 l. | Architecture du template, contrats DS, modèle de données déduit, invariants métier, surface d'API proposée, 16 anomalies, plan d'implémentation | **Mine d'or** — à découper, pas à jeter |
| `SPEC-ECRANS-1-public-auth.md` | 34 Ko | 66 écrans (`WL`, `W`, `WP`, mobile `01`-`16`) | Base des fiches écran |
| `SPEC-ECRANS-2-apprenant.md` | 32 Ko | 51 écrans (`WD`, `WC`, `WW`, `WA`, `WJ`) | Base des fiches écran |
| `SPEC-ECRANS-3-parent-teacher-admin.md` | 36 Ko | 55 écrans (`WPD`, `WT`, `WK`, `WAD`, `WX`) | Base des fiches écran |
| `INVENTAIRE-ECRANS.md` | 12 Ko | Table des 172 IDs | Devient un index généré |

Trois documents de `template/` portent aussi du contexte : `CLAUDE.md` (257 l.), `README.md` (598 l.), `HANDOFF.md` (515 l.). Ils décrivent le **canvas de design**, pas l'application à construire, et contiennent des affirmations désormais fausses (identité chromatique, nombre de shells, en-têtes de fichiers). Ils sont des **sources**, pas des cibles.

### 1.2 Les 5 limites à corriger

| # | Limite actuelle | Correction attendue |
| --- | --- | --- |
| L1 | La doc décrit un **canvas React/Babel sans build**, pas l'application cible. Aucune stack nommée. | Documenter l'application **Next.js + MySQL** : arborescence, conventions, schéma, endpoints réels. |
| L2 | Les 16 anomalies du §8 sont **listées mais non tranchées**. Un agent qui les lit reste bloqué. | Chaque anomalie devient une **ADR datée et tranchée**. Zéro question ouverte dans la doc de référence. |
| L3 | Les 172 écrans sont dans 3 gros fichiers **non adressables** : un agent doit charger 34 Ko pour un écran. | **Une fiche par écran** (ou par groupe cohérent), avec front-matter YAML machine-lisible. |
| L4 | Rien pour les agents IA : pas de `CLAUDE.md` projet, pas de skills, pas de commandes. | Un **outillage agentique complet** : contexte hiérarchique, skills, subagents, slash commands. |
| L5 | Le « plan d'implémentation » du §9 est un ordre de portage, pas un **backlog exécutable**. | Des **epics et lots numérotés** avec critères d'acceptation, dépendances, et définition de fini. |

### 1.3 Ce qu'on veut, en une phrase

> Une documentation où **un agent IA peut prendre n'importe quel écran ou n'importe quelle fonctionnalité, charger 3 à 5 fichiers ciblés, et produire du code Next.js correct du premier coup**, sans avoir à interroger l'humain sur une règle métier.

---

## 2. Décisions cadres

Prises avec Amadou le 20 août 2026. Elles ne se rediscutent pas dans les lots.

| Sujet | Décision |
| --- | --- |
| **Stack** | **Next.js + MySQL**. Détails (App Router, TypeScript, ORM, auth, hébergement) à figer en ADR-0001 dès le lot 1. |
| **Langue** | **Français intégral** — noms de fichiers, titres, contenu, front-matter, commentaires de code dans la doc. |
| **Méthode** | **Arborescence `docs/` sur mesure**. **BMAD est retiré du projet** (voir §5, Lot 0). |
| **Outillage agents** | Les 4 briques : `CLAUDE.md` racine + par dossier · skills projet · subagents + slash commands · fiches contexte par écran. |

### 2.1 Retrait de BMAD — ce que ça implique

`_bmad/` (56 fichiers), `_bmad-output/` (vide) et les **45 skills `bmad-*`** de `.claude/skills/` sortent du projet. Trois raisons :

1. Ils n'ont produit **aucun artefact** (`_bmad-output/` est vide).
2. Ils sont configurés en **anglais** (`document_output_language = "English"`), en contradiction avec la décision langue.
3. 45 skills dans `.claude/skills/` **polluent la sélection de skills** de l'agent : chaque description est chargée en contexte à chaque tour, et une skill BMAD peut se déclencher à la place d'une skill projet.

> ⚠️ Le retrait est **destructif**. Il se fait en lot 0, sur une branche Git dédiée, après commit de l'état actuel. Les bonnes idées de BMAD (gabarits de story, checklist de readiness) sont **réabsorbées** dans les skills projet du lot 5 — on ne perd rien d'utile.

---

## 3. Principes de rédaction

Ces 9 principes s'appliquent à **tous** les fichiers produits. Ils sont repris tels quels dans le `CLAUDE.md` racine pour que l'agent les respecte en écrivant.

| # | Principe | Ce que ça veut dire concrètement |
| --- | --- | --- |
| P1 | **Source unique** | Une règle métier est écrite **une seule fois**, dans `docs/01-produit/regles-metier.md`. Partout ailleurs on référence `[RM-12]`. Jamais de copier-coller de règle. |
| P2 | **Zéro question ouverte** | Un document de référence n'a pas de « à trancher ». Si c'est ouvert, ça vit dans une ADR au statut `proposé`, et le document de référence n'en parle pas encore. |
| P3 | **Adressable** | Un fichier = un sujet, ≤ 400 lignes. Un agent doit pouvoir répondre à une question en chargeant ≤ 5 fichiers. |
| P4 | **Machine-lisible d'abord** | Toute fiche (écran, fonctionnalité, ADR) commence par un front-matter YAML : identifiants, statut, dépendances, liens. Le corps est pour l'humain, le front-matter pour l'agent. |
| P5 | **Traçable** | Chaque exigence porte un ID stable (`RM-xx`, `F-xx`, `EP-xx`, `WD01`…). Chaque écran cite les règles et endpoints qu'il consomme. Chaque endpoint cite les écrans qui l'appellent. |
| P6 | **Testable** | Toute fonctionnalité et tout écran finit par des **critères d'acceptation** en Gherkin français (`Étant donné / Quand / Alors`). Pas de « doit bien fonctionner ». |
| P7 | **Distinguer intention et existant** | On conserve la convention **[I]** implémenté / **[D]** déclaré / **[S]** statique des specs actuelles, mais on ajoute **[À CONCEVOIR]** pour les trous. Un agent doit savoir quand il invente. |
| P8 | **Le serveur fait foi** | Toute règle métier est documentée comme un invariant **serveur**. L'interface est un rappel, jamais la garantie. Chaque fiche écran liste les validations serveur correspondantes. |
| P9 | **Pas de prose décorative** | Tableaux > listes > paragraphes. Un diagramme Mermaid vaut mieux qu'un paragraphe d'enchaînements. Pas d'introduction qui répète le titre. |

---

## 4. Arborescence cible

### 4.1 Documentation

```
docs/
├── 00-INDEX.md                          ← carte de la doc : « je veux faire X, je lis Y »
├── 00-CONVENTIONS-DOC.md                ← les 9 principes + gabarits + nommage des IDs
│
├── 01-produit/
│   ├── vision-et-personas.md            ← 4 personas (apprenant, parent, enseignant, admin)
│   ├── piliers-produit.md               ← parcours · kits · events · dashboards
│   ├── regles-metier.md                 ← RM-01…RM-nn — LA source unique des invariants
│   ├── parcours-utilisateurs.md         ← 8 flux end-to-end en Mermaid
│   ├── glossaire.md                     ← Parcours/Projet/Niveau/Mission/Kit Code/FCFA…
│   ├── ton-et-copie.md                  ← tutoiement/vouvoiement, micro-copie, Zeti
│   └── perimetre-et-trous.md            ← ce qui n'est pas conçu, et qui doit le concevoir
│
├── 02-architecture/
│   ├── vue-d-ensemble.md                ← diagramme de contexte + conteneurs (C4 niveaux 1-2)
│   ├── stack.md                         ← Next.js/MySQL : versions, libs, justifications
│   ├── arborescence-du-code.md          ← src/ commenté dossier par dossier
│   ├── conventions-de-code.md           ← nommage, imports, RSC vs client, erreurs, i18n
│   ├── modele-de-donnees.md             ← schéma complet + diagramme ER Mermaid
│   ├── authentification-et-sessions.md  ← 4 modes de login, sessions, mots de passe
│   ├── autorisation-et-rbac.md          ← matrice rôle × ressource × action
│   ├── paiement-mobile-money.md         ← intents, webhooks, idempotence, réconciliation
│   ├── consentement-parental.md         ← machine à états + SMS + polling
│   ├── medias-et-fichiers.md            ← vidéos, images, PDF de certification
│   ├── notifications.md                 ← in-app, SMS, e-mail, préférences
│   ├── performance-et-connectivite.md   ← contrainte Afrique de l'Ouest, offline, budgets
│   ├── securite.md                      ← menaces, mineurs, RGPD-like, anti-fraude Kit Code
│   ├── observabilite.md                 ← logs, métriques, traçage de l'Impact Tracker
│   └── adr/
│       ├── 0000-modele-adr.md
│       ├── 0001-stack-nextjs-mysql.md
│       ├── 0002-orm-et-migrations.md
│       ├── 0003-identite-chromatique.md        ← tranche §8.1
│       ├── 0004-authentification-apprenant.md  ← tranche §8.2
│       ├── 0005-politique-refus-consentement.md ← tranche §8.4
│       ├── 0006-format-du-kit-code.md          ← tranche §8.5
│       ├── 0007-referentiels-serveur.md        ← tranche §8.6, §8.12, §8.14
│       ├── 0008-bandes-de-score-quiz.md        ← tranche §8.7
│       ├── 0009-champs-impact-tracker.md       ← tranche §8.3
│       ├── 0010-strategie-de-rendu.md          ← RSC / SSR / ISR par zone
│       ├── 0011-strategie-de-test.md
│       └── 0012-i18n-et-formats.md             ← FCFA, dates, téléphones
│
├── 03-design-system/
│   ├── principes-visuels.md             ← esthétique candy, élévation, mouvement
│   ├── tokens.md                        ← tables complètes + mapping vers la stack
│   ├── atomes.md                        ← 11 composants : props, états, a11y, exemples
│   ├── composes.md                      ← 9 + les 12 promus depuis les écrans
│   ├── data-viz.md                      ← 6 primitives back-office
│   ├── layouts-et-shells.md             ← 6 shells + règles de navigation
│   ├── icones-et-mascotte.md            ← 30 icônes, 6 poses de Zeti, logos
│   ├── accessibilite.md                 ← critères AA, focus, aria, clavier
│   └── mapping-template-vers-code.md    ← table : composant du canvas → composant cible
│
├── 04-api/
│   ├── conventions.md                   ← URLs, verbes, codes d'erreur, pagination, idempotence
│   ├── openapi.yaml                     ← contrat machine-lisible complet
│   ├── erreurs.md                       ← catalogue des codes (ERR-xxx) et messages FR
│   └── domaines/
│       ├── auth.md · inscription-consentement.md · catalogue.md · achat.md
│       ├── pedagogie.md · boutique.md · parent.md · enseignant.md
│       ├── evenements.md · admin.md · transverse.md
│
├── 05-fonctionnalites/                  ← F-01 … F-nn, une fiche par fonctionnalité
│   ├── INDEX.md                         ← table : ID, nom, persona, écrans, endpoints, lot
│   ├── _modele-fiche-fonctionnalite.md
│   └── F-01-…md … F-nn-…md              ← ~45 fiches estimées
│
├── 06-ecrans/
│   ├── INDEX.md                         ← les 172 écrans (généré depuis les front-matters)
│   ├── _modele-fiche-ecran.md
│   ├── etats-transversaux.md            ← WX01-WX03 comme enveloppe
│   ├── WL/ (21) · W/ (17) · WP/ (12) · MOB/ (16)
│   ├── WD/ (22) · WC/ (8) · WW/ (3) · WA/ (7) · WJ/ (11)
│   └── WPD/ (14) · WT/ (12) · WK/ (11) · WAD/ (15)
│
├── 07-qualite/
│   ├── strategie-de-test.md             ← pyramide, outils, seuils
│   ├── jeu-de-donnees-demo.md           ← LE seed unique et cohérent (corrige §8.8)
│   ├── recette-par-zone.md              ← checklist reproductible
│   ├── criteres-accessibilite.md
│   └── definition-de-fini.md            ← DoD d'un écran, d'une fonctionnalité, d'un lot
│
├── 08-livraison/
│   ├── demarrage-local.md               ← de zéro à l'app qui tourne, en 10 minutes
│   ├── environnements-et-secrets.md
│   ├── migrations-bdd.md
│   ├── ci-cd.md
│   └── runbook.md                       ← incidents courants, paiements bloqués, rollback
│
└── 09-roadmap/
    ├── plan-d-implementation.md         ← les lots de dev EP-00 … EP-14, ordonnés
    ├── epics/EP-xx-….md                 ← une fiche par epic
    └── journal-des-decisions.md         ← chronologie, remplace le SDS
```

### 4.2 Outillage agent

```
CLAUDE.md                                ← contexte racine : le projet en 200 lignes max
.claude/
├── agents/
│   ├── porteur-d-ecran.md               ← implémente un écran depuis sa fiche
│   ├── architecte-api.md                ← crée/modifie un endpoint + OpenAPI + tests
│   ├── gardien-des-regles.md            ← vérifie qu'un diff respecte les RM et les ADR
│   ├── auditeur-accessibilite.md
│   └── redacteur-doc.md                 ← maintient la doc à jour après un changement
├── commands/
│   ├── nouvel-ecran.md      · /nouvel-ecran WD07
│   ├── porter-zone.md       · /porter-zone WC
│   ├── recette-zone.md      · /recette-zone WJ
│   ├── nouvelle-adr.md      · /nouvelle-adr "titre"
│   ├── verifier-regles.md   · /verifier-regles
│   └── maj-doc.md           · /maj-doc
├── skills/
│   ├── ecran-steamy/        ← comment implémenter un écran (contrat, états, a11y, tests)
│   ├── endpoint-steamy/     ← comment ajouter un endpoint (validation, erreurs, RBAC)
│   ├── composant-ds/        ← comment ajouter/modifier un composant du design system
│   ├── regle-metier/        ← comment encoder une RM côté serveur ET interface
│   ├── recette-steamy/      ← la checklist de recette, exécutable
│   └── redaction-doc/       ← les 9 principes + gabarits, pour écrire de la doc conforme
└── settings.json

src/**/CLAUDE.md                         ← contexte local par dossier (voir Lot 5)
```

---

## 5. Les 7 lots

Ordre imposé par les dépendances : on ne documente pas une fonctionnalité avant d'avoir tranché la règle métier qu'elle applique, ni un écran avant d'avoir figé le design system.

```
Lot 0  Nettoyage & socle          ──┐
Lot 1  Décisions (ADR) & produit  ──┼─→ bloquants, séquentiels
Lot 2  Architecture technique     ──┘
                                     │
Lot 3  Design system + API        ───┼─→ parallélisables entre eux
Lot 4  Fonctionnalités + 172 écrans ─┘   (4 dépend de 3)
                                     │
Lot 5  Outillage agents IA        ───┤
Lot 6  Qualité, livraison, roadmap ──┘
```

| Lot | Nom | Livrables | Volume | Dépend de | Plan détaillé |
| --- | --- | --- | ---: | --- | --- |
| **0** | Nettoyage & socle documentaire | Retrait BMAD, archivage des 4 docs, `00-INDEX.md`, `00-CONVENTIONS-DOC.md`, gabarits | 6 fichiers | — | PLAN-01 §1 |
| **1** | Décisions & socle produit | 13 ADR tranchées + 7 fichiers `01-produit/` dont `regles-metier.md` | 20 fichiers | Lot 0 | PLAN-01 §2-3 |
| **2** | Architecture technique | 15 fichiers `02-architecture/` : stack, arborescence, modèle de données, auth, paiement, sécurité | 15 fichiers | Lot 1 | PLAN-01 §4 |
| **3** | Design system & contrat d'API | 9 fichiers `03-design-system/` + `openapi.yaml` + 14 fichiers `04-api/` | 24 fichiers | Lot 2 | PLAN-02 §1-2 |
| **4** | Fonctionnalités & écrans | ~45 fiches `F-xx` + **172 fiches écran** + 2 index | ~220 fichiers | Lot 3 | PLAN-02 §3-4 |
| **5** | Outillage agents IA | `CLAUDE.md` racine + ~12 `CLAUDE.md` locaux + 5 subagents + 6 commandes + 6 skills | ~30 fichiers | Lot 4 | PLAN-03 §1-2 |
| **6** | Qualité, livraison, roadmap | 5 fichiers `07-qualite/` + 5 `08-livraison/` + 15 epics `09-roadmap/` | ~25 fichiers | Lot 4 | PLAN-03 §3-4 |

**Total estimé : ~340 fichiers.** Le gros du volume (Lot 4) est mécanisable : les 172 fiches écran sont générées par zone à partir des specs existantes, avec un gabarit fixe.

### 5.1 Jalons de validation humaine

Cinq points d'arrêt où Amadou valide avant que l'agent continue. Rien d'autre ne demande d'arbitrage.

| Jalon | Après | Ce qui est validé | Enjeu si on se trompe |
| --- | --- | --- | --- |
| **J1** | Lot 0 | Arborescence cible + gabarits | Tout est à refaire |
| **J2** | Lot 1 | **Les 13 ADR** | Le modèle de données et les écrans partent faux |
| **J3** | Lot 2 | Modèle de données + arborescence du code | Les endpoints et le schéma SQL partent faux |
| **J4** | Lot 3 | `openapi.yaml` + contrats du design system | Les 172 fiches écran citent de faux endpoints |
| **J5** | Lot 5 | `CLAUDE.md` racine + 1 skill témoin | Les agents travaillent avec un mauvais contexte |

---

## 6. Traçabilité et identifiants

Le système d'ID est ce qui rend la doc navigable par un agent. Il se met en place au Lot 0 et ne bouge plus.

| Préfixe | Objet | Exemple | Défini dans |
| --- | --- | --- | --- |
| `RM-xx` | Règle métier | `RM-04` Tout apprenant est un sous-compte parent | `01-produit/regles-metier.md` |
| `ADR-xxxx` | Décision d'architecture | `ADR-0005` Politique de refus | `02-architecture/adr/` |
| `F-xx` | Fonctionnalité | `F-07` Achat d'un parcours payant | `05-fonctionnalites/` |
| `EP-xx` | Epic de développement | `EP-04` Zone catalogue | `09-roadmap/epics/` |
| `ERR-xxx` | Code d'erreur API | `ERR-409-KIT-CODE-USED` | `04-api/erreurs.md` |
| `CA-xx` | Critère d'acceptation | local à une fiche | fiche `F-` ou écran |
| ID écran | 172 IDs existants | `WD07`, `WJ11`, `MOB05` | `06-ecrans/` |

> **Renommage mobile** : les IDs mobile actuels (`01`-`16`) sont des nombres nus — inutilisables comme identifiants dans une doc où `01` peut désigner mille choses. Ils deviennent **`MOB01`-`MOB16`**. Une table de correspondance est écrite dans `06-ecrans/INDEX.md`.

### 6.1 Règle de liaison croisée

Chaque fiche écran cite : ses `RM-xx`, ses endpoints, sa `F-xx`, son `EP-xx`.
Chaque fiche fonctionnalité cite : ses écrans, ses `RM-xx`, ses endpoints.
Chaque `RM-xx` cite : les écrans et endpoints qui l'appliquent.

Ces liens sont dans le **front-matter YAML**, donc vérifiables par script. Le Lot 6 livre un script de vérification des liens morts.

---

## 7. Répartition humain / agent

| Rôle | Qui | Fait quoi |
| --- | --- | --- |
| **Arbitre** | Amadou | Tranche les 13 ADR (J2), valide le modèle de données (J3) et l'API (J4). ~4 h de travail réel, réparties. |
| **Rédacteur** | Agent Claude | Écrit 100 % des fichiers. Ne tranche jamais une ADR seul : il **propose** une option recommandée argumentée, l'humain confirme. |
| **Relecteur** | Agent Claude (subagent distinct) | Passe après chaque lot : liens morts, IDs orphelins, contradictions avec les RM, anglicismes. |
| **Recetteur** | Amadou | Valide aux 5 jalons. |

> **Anti-pattern à éviter** : laisser l'agent inventer une règle métier absente. Le principe P7 impose de marquer **[À CONCEVOIR]** et de remonter au jalon suivant. Un `perimetre-et-trous.md` centralise ces remontées.

---

## 8. Critères d'acceptation globaux

La documentation est finie quand **tous** ces points sont vrais :

- [ ] Les **172 écrans** ont une fiche, avec front-matter complet et au moins un critère d'acceptation.
- [ ] Les **16 anomalies** du `SPEC-TECHNIQUE.md` §8 sont chacune tranchées par une ADR au statut `accepté`.
- [ ] Les **14 zones** (11 web app + public + mobile + états) ont un epic dans `09-roadmap/`.
- [ ] Les **4 piliers produit** sont couverts par des fiches `F-xx` sans trou.
- [ ] `openapi.yaml` **valide** (spectral/redocly) et couvre tous les endpoints cités dans les fiches écran.
- [ ] Aucun lien mort, aucun ID orphelin (script du Lot 6).
- [ ] Aucune occurrence de « à trancher », « à définir », « TODO » dans `01-` à `04-` (autorisé uniquement dans `perimetre-et-trous.md` et les ADR `proposé`).
- [ ] Aucune chaîne en anglais dans les contenus destinés à l'UI cités par la doc.
- [ ] Un agent neuf, à qui on donne `CLAUDE.md` + une fiche écran, produit un composant Next.js conforme **sans poser de question**. Testé sur 3 écrans témoins : `WD07`, `WJ08`, `WAD02`.
- [ ] `_bmad/`, `_bmad-output/` et les 45 skills `bmad-*` ont disparu du dépôt.

---

## 9. Risques

| # | Risque | Probabilité | Impact | Parade |
| --- | --- | --- | --- | --- |
| R1 | **Les 8 diagrammes `user flows/*.mmd` restent introuvables.** Ce sont les seules sources des enchaînements. | Élevée (ils sont gitignorés et hors dépôt) | Élevé | Le Lot 1 reconstruit les 8 flux en Mermaid **depuis les fiches écran** et les fait valider en J2. C'est plus long mais ça débloque. |
| R2 | Les ADR ne sont pas tranchées en temps voulu → tout le pipeline bloque en J2. | Moyenne | Élevé | Chaque ADR est rédigée avec une **option recommandée** et une conséquence chiffrée. Amadou valide par exception, pas par rédaction. |
| R3 | 172 fiches écran → dérive de qualité sur la fin. | Élevée | Moyen | Gabarit strict + génération **par zone** (14 lots de 3 à 22) + passe de relecture automatisée par zone. |
| R4 | La doc diverge du code dès la première semaine de dev. | Élevée | Élevé | Lot 5 : subagent `redacteur-doc` + commande `/maj-doc`, appelés dans la définition de fini de chaque story. |
| R5 | Le retrait de BMAD casse quelque chose d'utilisé. | Faible | Faible | Branche dédiée + `_bmad-output/` est vide → aucun artefact perdu. |
| R6 | Sur-documentation : 340 fichiers que personne ne lit. | Moyenne | Moyen | `00-INDEX.md` orienté tâche (« je veux faire X → je lis Y »), et P3 (≤ 400 lignes). Le test de J5 mesure l'utilité réelle. |

---

## 10. Comment exécuter ce plan

### 10.1 Les trois plans détaillés

| Plan | Couvre | Lots |
| --- | --- | --- |
| **PLAN-01-SOCLE.md** | Nettoyage, ADR, produit, architecture | 0, 1, 2 |
| **PLAN-02-SPECIFICATIONS.md** | Design system, API, fonctionnalités, 172 écrans | 3, 4 |
| **PLAN-03-AGENTS-ET-QUALITE.md** | Outillage agentique, qualité, livraison, roadmap | 5, 6 |

Chaque plan détaille, lot par lot : les **entrées** (quoi lire), les **livrables fichier par fichier**, les **gabarits**, les **critères d'acceptation**, et un **prompt prêt à coller** pour lancer l'agent.

### 10.2 Boucle d'exécution

```
Pour chaque lot :
  1. Ouvrir une branche  docs/lot-N-<nom>
  2. Coller le prompt du plan détaillé dans une session Claude neuve
  3. L'agent lit ses entrées, écrit ses livrables
  4. Lancer le subagent relecteur (à partir du lot 5 ; avant, relecture manuelle)
  5. Vérifier les critères d'acceptation du lot
  6. Si jalon → validation d'Amadou
  7. Merge, puis lot suivant
```

### 10.3 Ordre recommandé si le temps manque

Si l'objectif est de **commencer à coder au plus vite** plutôt que de tout documenter :

```
Lot 0 → Lot 1 (ADR seulement) → Lot 2 (stack + arborescence + modèle de données)
     → Lot 5 (CLAUDE.md racine + skill « ecran-steamy »)
     → Lot 3 (design system + API de la zone visée)
     → Lot 4 restreint à UNE zone (auth W+WP, 29 écrans)
     → coder la zone → puis dérouler zone par zone
```

Ce chemin livre du code après ~35 % de la doc, et documente les zones restantes **juste avant** de les coder. Il est plus risqué (le modèle de données peut bouger) mais plus court. À arbitrer en J1.

---

**Fichiers liés** : [PLAN-01-SOCLE.md](PLAN-01-SOCLE.md) · [PLAN-02-SPECIFICATIONS.md](PLAN-02-SPECIFICATIONS.md) · [PLAN-03-AGENTS-ET-QUALITE.md](PLAN-03-AGENTS-ET-QUALITE.md)
