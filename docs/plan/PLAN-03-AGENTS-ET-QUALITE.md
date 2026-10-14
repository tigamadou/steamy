# PLAN-03 — Outillage agentique, qualité, livraison, roadmap

**Couvre les lots 5 et 6 du [plan directeur](PLAN-00-DIRECTEUR.md).**
C'est ce qui transforme une documentation en **machine à produire du code**.

| Lot | Sortie | Jalon |
| --- | --- | --- |
| 5a | Contexte hiérarchique `CLAUDE.md` | **J5** |
| 5b | Skills, subagents, slash commands | J5 |
| 6a | Qualité et jeu de données | — |
| 6b | Livraison et exploitation | — |
| 6c | Roadmap : 15 epics de développement | — |

---

## 1. Lot 5a — Contexte hiérarchique pour les agents

### 1.1 Principe

Claude Code charge automatiquement le `CLAUDE.md` racine, puis les `CLAUDE.md` des dossiers qu'il touche. On exploite ça pour donner **le bon contexte au bon moment** plutôt qu'un pavé unique de 2 000 lignes qui sature la fenêtre.

```
CLAUDE.md                              ← toujours chargé. 200 lignes MAX.
src/components/ui/CLAUDE.md            ← chargé quand on touche au design system
src/components/shells/CLAUDE.md
src/features/auth/CLAUDE.md            ← chargé quand on touche à l'auth
src/features/catalogue/CLAUDE.md
src/features/achat/CLAUDE.md
src/features/pedagogie/CLAUDE.md
src/features/parent/CLAUDE.md
src/features/enseignant/CLAUDE.md
src/features/boutique/CLAUDE.md
src/features/admin/CLAUDE.md
src/features/public/CLAUDE.md
src/server/CLAUDE.md                   ← règles serveur, validation, RBAC
src/db/CLAUDE.md                       ← schéma, migrations, conventions SQL
docs/CLAUDE.md                         ← comment écrire de la doc conforme
```

### 1.2 Le `CLAUDE.md` racine — contenu imposé

**200 lignes maximum.** Il ne contient que ce qui est vrai partout. Tout le reste est délégué par renvoi.

| Section | Contenu | Lignes |
| --- | --- | ---: |
| Le projet en 5 lignes | Plateforme e-learning robotique/STEM, 10-17 ans, Afrique de l'Ouest francophone, Next.js + MySQL, 172 écrans, 4 personas. | 5 |
| **Règles absolues** | 10 règles non négociables, en impératif, sans nuance. Voir §1.3. | 25 |
| Où trouver quoi | Table à 3 colonnes : « pour faire X → lis Y ». ~15 lignes. Renvoie à `docs/00-INDEX.md` pour le détail. | 20 |
| Commandes | `pnpm dev`, `pnpm test`, `pnpm db:migrate`, `pnpm lint`, `pnpm openapi:lint`. | 15 |
| Architecture en 20 lignes | Route groups par persona, couches, où va quoi. Renvoie à `docs/02-architecture/arborescence-du-code.md`. | 25 |
| Vocabulaire | Les 10 termes qu'on ne peut pas confondre : Parcours ≠ Projet ≠ Niveau ≠ Mission ; formative ≠ sommative ; Kit ≠ Kit Code. Renvoie au glossaire. | 20 |
| Workflow | Avant d'implémenter un écran : lire sa fiche. Avant d'ajouter un endpoint : lire `04-api/conventions.md`. Après un changement : `/maj-doc`. | 20 |
| Pièges | Les 6 pièges réels du projet. Voir §1.4. | 30 |
| Ce qu'il ne faut pas faire | Ne pas lire `docs/_sources/` comme référence. Ne pas inventer une règle métier. Ne pas coder une couleur en dur. Ne pas écrire en anglais dans l'UI. | 15 |

### 1.3 Les 10 règles absolues (à écrire telles quelles)

Ce sont les règles qu'un agent viole le plus facilement et le plus coûteusement.

1. **Français intégral dans l'UI.** Aucune chaîne anglaise, y compris les messages d'erreur et les libellés de boutons. Les chaînes vivent dans le catalogue de messages, jamais en dur dans un composant.
2. **Tutoiement apprenant et enseignant, vouvoiement parent, neutre admin.** Vérifier le persona de l'écran avant d'écrire une phrase.
3. **Aucune couleur en dur.** Tout passe par les tokens. La primaire est le magenta `#9E1B9A` (ADR-0003). Le back-office est monochrome `--ink-*`, la famille `--primary-*` y est interdite.
4. **Le serveur fait foi.** Toute règle métier est validée côté serveur. La validation client est un confort, jamais la garantie.
5. **Tout apprenant est un sous-compte rattaché à un parent, quel que soit son âge.** L'apprenant se connecte par identifiant + mot de passe, jamais par téléphone.
6. **Mobile Money uniquement.** Aucun champ de carte bancaire, nulle part. Le formulaire est Pays + Réseau + Numéro. Devise FCFA.
7. **Toute liste a un état vide actionnable.** Jamais « aucun résultat » nu. Tout appel a un état de chargement et un état d'erreur. Aucun spinner nu.
8. **Accessibilité AA dès la première ligne.** Tout élément cliquable est focusable et a un rôle. Pas de `<div onClick>`.
9. **Ne jamais inventer une règle métier.** Si elle n'est pas dans `docs/01-produit/regles-metier.md`, marquer `[À CONCEVOIR]` et remonter.
10. **`docs/_sources/` est une archive.** Contient des affirmations périmées. Ne jamais la citer comme référence.

### 1.4 Les 6 pièges réels

Tirés des sources et des ADR — ce sont des erreurs déjà commises.

| Piège | Ce qui se passe |
| --- | --- |
| **Le violet fantôme** | `#5B3FE0` traîne encore dans 5 endroits (ombres, sidebar active, welcome-card, projet courant, keyframes pulse). Ce n'est **plus** la primaire, c'est `--cat-robotique`. |
| **Les IDs collisionnés** | L'admin utilisait `WA`, déjà pris par l'achat. Renommé `WAD`. Tout document ancien parlant de `WA01`-`WA15` pour l'admin parle en réalité de `WAD01`-`WAD15`. |
| **Le mobile diverge du modèle** | Le mobile applique « parent obligatoire si < 16 ans ». Le web pose « parent obligatoire toujours ». C'est le web qui a raison. |
| **Les référentiels dupliqués** | Objectifs (9 vs 10), avatars (9 vs 10), réseaux Mobile Money, indicatifs : dupliqués en dur dans chaque plateforme. Ils viennent du serveur (ADR-0007). |
| **Les artefacts de canvas** | `onWheel stopPropagation`, `position:absolute` sur les modales, `opacity:.55`, `blur(1px)`, `title="Bientôt"`, timer `00:42`, badge `2` : mise en scène du prototype, pas du produit. |
| **Le seuil en dur** | `WJ08` code « seuil 70 % » en dur alors qu'il sert aussi pour la sommative à 80 %. Le seuil est une donnée du quiz. |

### 1.5 Les `CLAUDE.md` de dossier — contenu type

| Fichier | Contenu (~80-120 lignes) |
| --- | --- |
| `src/components/ui/CLAUDE.md` | Renvoi aux 3 fichiers du design system. Règle : un composant du DS ne connaît aucune règle métier et n'appelle aucun endpoint. Comment ajouter une variante. Où sont les tokens. Checklist a11y. |
| `src/components/shells/CLAUDE.md` | Les 6 shells, leurs props, la règle « une sous-route garde l'`active` du parent », la nav à 6 entrées. |
| `src/features/<zone>/CLAUDE.md` | Les écrans de la zone (table ID → composant → fiche). Les règles `RM-xx` propres à la zone. Les endpoints de la zone. Les pièges de la zone. Les `[À CONCEVOIR]` en cours. |
| `src/server/CLAUDE.md` | Ordre canonique d'un handler : auth → RBAC → validation → règle métier → effet → audit → réponse. Catalogue d'erreurs. Idempotence. Ce qui doit être transactionnel. |
| `src/db/CLAUDE.md` | Conventions de nommage, collations MySQL (accents français), index obligatoires, procédure de migration, données de référence vs données métier. |
| `docs/CLAUDE.md` | Les 9 principes de rédaction. Les gabarits. Le système d'ID. Comment mettre à jour un front-matter sans casser les liens. |

### 1.6 Critères d'acceptation

- [ ] `CLAUDE.md` racine ≤ 200 lignes
- [ ] Les 10 règles absolues y figurent en impératif, sans nuance
- [ ] Aucun `CLAUDE.md` de dossier ne dépasse 120 lignes
- [ ] Aucun `CLAUDE.md` ne duplique une règle métier : il la **référence** par ID
- [ ] Un agent neuf, avec seulement `CLAUDE.md` + la fiche `WD07`, produit un composant conforme sans poser de question **(test de J5)**

---

## 2. Lot 5b — Skills, subagents, slash commands

### 2.1 Les 6 skills projet

Une skill est chargée à la demande quand la tâche correspond. Elle contient la **procédure**, pas le contexte.

| Skill | Se déclenche sur | Contenu |
| --- | --- | --- |
| **`ecran-steamy`** | « implémente l'écran », « code WD07 », « porte la zone » | Procédure en 9 étapes : lire la fiche → vérifier les endpoints → vérifier les composants DS disponibles → créer le fichier au bon endroit → implémenter les 4 états → brancher les données → appliquer les validations → a11y → tests. Plus la checklist de fin. Référence : `references/checklist-ecran.md`, `references/etats-obligatoires.md`. |
| **`endpoint-steamy`** | « ajoute l'endpoint », « crée l'API pour » | Ordre canonique d'un handler. Schéma de validation. RBAC. Codes d'erreur. Mise à jour d'`openapi.yaml`. Test de contrat. Effets de bord (notification, audit). Idempotence si écriture. |
| **`composant-ds`** | « ajoute un composant », « modifie le Button » | Où va le composant (atome / composé / layout). Contrat de props. Les 6 états. Tokens uniquement. a11y obligatoire. Story/exemple. Mise à jour de la doc du DS. Règle : un composant DS ne connaît aucune règle métier. |
| **`regle-metier`** | « applique la règle », « le consentement doit… » | Comment encoder une `RM-xx` : d'abord serveur (validation + test), ensuite interface (feedback). Où placer la vérification. Comment tester qu'elle est incontournable. Comment ajouter une nouvelle règle (jamais sans ADR). |
| **`recette-steamy`** | « recette la zone », « vérifie que » | La checklist de recette exécutable, zone par zone : rendu conforme à l'artboard · 4 états présents · aucune couleur en dur · aucune chaîne anglaise · registre de langue correct · enchaînements conformes au parcours · règles appliquées côté serveur · clavier complet · contrastes AA · `aria-live`. |
| **`redaction-doc`** | « documente », « mets à jour la doc » | Les 9 principes. Les 3 gabarits. Le système d'ID. Comment ne pas casser les liens croisés. Quand créer une ADR plutôt qu'écrire dans un document de référence. |

**Structure d'une skill** :

```
.claude/skills/ecran-steamy/
├── SKILL.md                       ← nom, description (déclenchement), procédure
└── references/
    ├── checklist-ecran.md
    ├── etats-obligatoires.md
    └── exemple-complet.md         ← un écran implémenté de bout en bout
```

> La `description` du front-matter est ce qui déclenche la skill. Elle doit contenir les formulations réelles de l'utilisateur, pas une définition abstraite. C'est la leçon des 45 skills BMAD retirées : une mauvaise description déclenche la mauvaise skill.

### 2.2 Les 5 subagents

| Subagent | Rôle | Outils | Quand l'appeler |
| --- | --- | --- | --- |
| **`porteur-d-ecran`** | Implémente un écran de bout en bout depuis sa fiche. Contexte isolé : ne charge que la fiche, le shell, les composants DS nécessaires, les endpoints. | lecture, écriture, bash | Sur chaque écran. C'est le cheval de trait. |
| **`architecte-api`** | Crée ou modifie un endpoint : handler, validation, RBAC, erreurs, `openapi.yaml`, test de contrat. | lecture, écriture, bash | Avant d'implémenter les écrans qui en dépendent. |
| **`gardien-des-regles`** | **Lecture seule.** Prend un diff et vérifie : règles `RM-xx` respectées · ADR respectées · aucune couleur en dur · aucune chaîne anglaise · registre de langue · a11y · pas d'artefact de canvas. Rend un verdict et une liste de violations. | lecture, grep | Avant chaque merge. C'est le filet de sécurité. |
| **`auditeur-accessibilite`** | **Lecture seule.** Audite une zone : focusabilité, ordre de tabulation, rôles, `aria-live`, contrastes, gestion du focus dans les modales, `Escape`. | lecture, bash (axe) | À la recette de chaque zone. |
| **`redacteur-doc`** | Met la doc à jour après un changement de code : fiche écran, `openapi.yaml`, `regles-metier.md`, index. Détecte les liens morts. | lecture, écriture | Dans la définition de fini de chaque story. C'est la parade au risque R4. |

### 2.3 Les 6 slash commands

| Commande | Argument | Effet |
| --- | --- | --- |
| `/nouvel-ecran` | ID d'écran (`WD07`) | Lit la fiche, lance `porteur-d-ecran`, puis `gardien-des-regles`. |
| `/porter-zone` | Préfixe (`WC`) | Boucle sur les écrans de la zone, dans l'ordre des dépendances. Rapport de fin. |
| `/recette-zone` | Préfixe (`WJ`) | Lance `recette-steamy` + `auditeur-accessibilite`. Produit un rapport avec les écarts. |
| `/nouvelle-adr` | Titre | Crée une ADR au statut `propose` depuis le gabarit, pré-remplit contexte et options. |
| `/verifier-regles` | — (ou une plage de commits) | Lance `gardien-des-regles` sur le diff courant. |
| `/maj-doc` | — | Lance `redacteur-doc` : synchronise la doc avec le code modifié, signale les liens morts. |

### 2.4 Fiches contexte par écran — le format machine

Le front-matter défini au lot 0 est ce que les agents consomment. Trois usages :

| Usage | Comment |
| --- | --- |
| **Chargement ciblé** | `/nouvel-ecran WD07` lit `docs/06-ecrans/WD/WD07.md`, extrait `composants`, `endpoints`, `regles`, `shell`, et ne charge **que** les fichiers correspondants. Une fiche de 200 lignes + 4 renvois, au lieu de 34 Ko de spec. |
| **Vérification croisée** | Un script valide que chaque `endpoints:` existe dans `openapi.yaml`, chaque `regles:` dans `regles-metier.md`, chaque `composants:` dans le design system. |
| **Génération d'index** | `06-ecrans/INDEX.md`, la couverture par epic, la liste des `[À CONCEVOIR]`. |

### 2.5 Critères d'acceptation

- [ ] Les 6 skills ont une `description` contenant des formulations réelles d'utilisateur
- [ ] Chaque skill a au moins un fichier de référence et un exemple complet
- [ ] Les 5 subagents ont un périmètre d'outils **minimal** (les auditeurs sont en lecture seule)
- [ ] Les 6 commandes fonctionnent sur un cas réel testé
- [ ] `/nouvel-ecran WD07` produit un composant conforme sans intervention **(test de J5)**
- [ ] `gardien-des-regles` détecte les 3 violations témoins qu'on lui soumet volontairement (couleur en dur, chaîne anglaise, `<div onClick>`)

### 2.6 Prompt d'exécution du lot 5

```
Tu exécutes le Lot 5 du plan de documentation Steamy : l'outillage agentique.

Prérequis : docs/01- à docs/06- sont écrits.

Lis : docs/plan/PLAN-03-AGENTS-ET-QUALITE.md §1 et §2, docs/00-INDEX.md,
docs/01-produit/regles-metier.md, docs/02-architecture/arborescence-du-code.md
et conventions-de-code.md, docs/06-ecrans/_modele-fiche-ecran.md.

Écris :
1. CLAUDE.md à la racine — 200 lignes MAXIMUM. Sections imposées : PLAN-03 §1.2.
   Les 10 règles absolues (§1.3) et les 6 pièges (§1.4) sont repris TELS QUELS.
2. Les 13 CLAUDE.md de dossier listés en §1.1, selon les contenus types de §1.5.
   ≤120 lignes chacun. Ils RÉFÉRENCENT les règles par ID, ils ne les dupliquent pas.
3. Les 6 skills de §2.1 dans .claude/skills/, avec references/ et un exemple complet.
4. Les 5 subagents de §2.2 dans .claude/agents/, avec un périmètre d'outils minimal.
5. Les 6 commandes de §2.3 dans .claude/commands/.

Règle de conception : le CLAUDE.md racine porte ce qui est vrai PARTOUT.
Tout le reste est délégué à un CLAUDE.md de dossier ou à une skill. Si tu hésites,
délègue — un contexte racine trop gros dégrade toutes les tâches.

Pour les descriptions de skills : écris les formulations que l'utilisateur emploierait
vraiment ("implémente l'écran WD07", "ajoute un endpoint pour les badges"),
pas des définitions abstraites.

Teste ensuite /nouvel-ecran sur WD07 et rapporte le résultat.
```

---

## 3. Lot 6a — Qualité

### 3.1 Livrables

| Fichier | Contenu | Points d'attention | Lignes |
| --- | --- | --- | ---: |
| `07-qualite/strategie-de-test.md` | Pyramide : unitaire (règles métier, calculs de score, validation de Kit Code) · composants (design system, états) · intégration (endpoints + base) · E2E (les 8 parcours critiques) · contrat (`openapi.yaml`). Outils, seuils de couverture par couche, ce qu'on ne teste pas. | Les 8 parcours E2E = les 8 flux de `parcours-utilisateurs.md`. | 250 |
| `07-qualite/jeu-de-donnees-demo.md` | **LE** jeu de données unique et cohérent. Corrige les 5 incohérences du §8.8 des sources : un seul effectif d'apprenants, un seul kit robot avec un seul prix, un seul e-mail pour Léa, une seule classe, une devise normalisée FCFA. Personas nommés, parcours complets, commandes, événements, KPI. Livré comme script de seed. | C'est aussi le jeu de démonstration commerciale. Il doit être crédible : noms béninois, localités réelles, prix réalistes en FCFA. | 300 |
| `07-qualite/recette-par-zone.md` | La checklist reproductible, en 10 points (celle des sources §recette, enrichie). Format cochable. Une section par zone avec ses spécificités. | C'est le contenu de la skill `recette-steamy`. Source unique. | 250 |
| `07-qualite/criteres-accessibilite.md` | Les critères AA applicables, traduits en vérifications concrètes. Outils (axe, lecteur d'écran). Cas particuliers du produit : `OTPInput`, `Quiz`, `Modal`, `DataTable`, la mascotte (décorative → `aria-hidden`). | Rappeler que les utilisateurs en situation de handicap sont **explicitement modélisés** dans le profil apprenant. | 250 |
| `07-qualite/definition-de-fini.md` | 3 DoD : un écran est fini quand… · une fonctionnalité est finie quand… · un epic est fini quand… Chacune inclut `/maj-doc`. | Sans le point « doc à jour », le risque R4 se réalise en deux semaines. | 150 |

---

## 4. Lot 6b — Livraison et exploitation

| Fichier | Contenu | Lignes |
| --- | --- | ---: |
| `08-livraison/demarrage-local.md` | De zéro à l'app qui tourne en 10 minutes : prérequis, clonage, variables d'environnement, MySQL local, migrations, seed, `pnpm dev`. Plus la table de diagnostic des erreurs de démarrage courantes. | 200 |
| `08-livraison/environnements-et-secrets.md` | Local / préproduction / production. Table des variables d'environnement : nom, obligatoire, exemple, où l'obtenir. Gestion des secrets. Clés Mobile Money et SMS. | 200 |
| `08-livraison/migrations-bdd.md` | Procédure de migration, migrations réversibles, données de référence (ADR-0007) vs schéma, migration de production sans coupure, sauvegardes. | 200 |
| `08-livraison/ci-cd.md` | Pipeline : lint, typecheck, tests, validation `openapi.yaml`, build, migrations, déploiement. Gates de qualité. Environnements de prévisualisation. | 200 |
| `08-livraison/runbook.md` | Incidents courants et procédure : paiement bloqué en `pending`, webhook Mobile Money non reçu, SMS de consentement non délivré, Kit Code contesté, compte enfant orphelin, pic de charge lors d'un Steamy Event, rollback. | 250 |

---

## 5. Lot 6c — Roadmap : les 15 epics

### 5.1 Principe d'ordonnancement

Repris du §9 des sources : **l'ordre est dicté par les dépendances techniques, pas par la valeur produit**. Une zone qui fournit un shell ou des composants partagés passe avant ses consommateurs.

### 5.2 Les 15 epics

| Epic | Nom | Contenu | Dépend de | Écrans |
| --- | --- | --- | --- | ---: |
| **EP-00** | Fondations | Projet Next.js, TypeScript, MySQL, ORM, migrations, tokens portés, Nunito auto-hébergée, catalogue de messages, enveloppes `WX`, CI. | — | 3 |
| **EP-01** | Design system | 15 atomes, 17 composés, 6 data-viz, 30 icônes, Zeti, a11y dès la primitive, paramétrage de ce qui était en dur. | EP-00 | — |
| **EP-02** | Couche partagée & shells | Les 6 shells, les 18 composants partagés, **cassage des 2 cycles**. À faire **avant** le moindre écran. | EP-01 | — |
| **EP-03** | Socle serveur | Auth des 4 personas, sessions, RBAC, validation, catalogue d'erreurs, audit, notifications, tables de référence. | EP-00 | — |
| **EP-04** | Auth & consentement | `W` (17) + `WP` (12). Le flux de consentement complet, SMS, polling, refus motivé. | EP-02, EP-03 | 29 |
| **EP-05** | Dashboard apprenant | `WD` (22). Fournit 6 composants partagés. | EP-04 | 22 |
| **EP-06** | Catalogue | `WC` (8) + `WW` (3). Premier test réel de la couche partagée. | EP-05 | 11 |
| **EP-07** | Achat & paiement | `WA` (7). Kit Code, Mobile Money, détour parent, webhooks, réconciliation. | EP-06 | 7 |
| **EP-08** | Déroulement pédagogique | `WJ` (11) + les 2 écrans [À CONCEVOIR]. Cœur produit : seuils, remédiation, badges, certification PDF, ticket. | EP-07 | 13 |
| **EP-09** | Dashboard parent | `WPD` (14) + reset du mot de passe enfant. | EP-05 | 15 |
| **EP-10** | Boutique de kits | `WK` (11). Réutilise le paiement d'EP-07. | EP-07 | 11 |
| **EP-11** | Dashboard enseignant | `WT` (12) + import par lot avec erreurs. | EP-09 | 13 |
| **EP-12** | Site public | `WL` (21). **Parallélisable dès EP-02** — indépendant de l'app. SEO, contenu, légal, B2B. | EP-02 | 21 |
| **EP-13** | Back-office & Impact Tracker | `WAD` (15). Data-viz, 30 KPI, RBAC réel, export. Interne, donc tardif. | EP-11 | 15 |
| **EP-14** | Écrans à concevoir & parité mobile | Badges, fiche événement, changement de parent, mode hors ligne, création de classe… puis **les 156 écrans mobile non conçus**. | EP-13 | 156+ |

### 5.3 Gabarit d'epic

```markdown
---
id: EP-07
nom: Achat & paiement
statut: a-faire            # a-faire | en-cours | fait
depend_de: [EP-06]
bloque: [EP-08, EP-10]
ecrans: [WA01, WA02, WA03, WA04, WA05, WA06, WA07]
fonctionnalites: [F-19, F-20, F-21, F-22, F-23, F-24]
regles: [RM-14, RM-15, RM-16, RM-17, RM-21]
adr: [ADR-0006, ADR-0007]
---

# EP-07 · Achat & paiement

## Objectif
## Périmètre (dedans / dehors)
## Découpage en stories
Table : ID, titre, écrans, estimation, dépendance.
## Risques
## Définition de fini
Renvoi à docs/07-qualite/definition-de-fini.md + spécificités de l'epic.
```

### 5.4 Autres livrables du 6c

| Fichier | Contenu |
| --- | --- |
| `09-roadmap/plan-d-implementation.md` | Le graphe des 15 epics (Mermaid), le chemin critique, les parallélisations possibles, l'estimation par epic, et le **chemin court** de PLAN-00 §10.3 si on veut coder tôt. |
| `09-roadmap/journal-des-decisions.md` | Chronologie datée. Remplace le `Steamy_Design_steps.md` (le SDS) qui est hors dépôt. Une ligne par décision, avec renvoi à l'ADR. |

### 5.5 Scripts livrés au lot 6

| Script | Rôle |
| --- | --- |
| `scripts/verifier-doc.mjs` | Liens morts · IDs orphelins · front-matter invalide · `endpoints:` absents d'`openapi.yaml` · `regles:` absentes de `regles-metier.md` · `composants:` absents du DS. **À brancher en CI.** |
| `scripts/generer-index-ecrans.mjs` | Régénère `06-ecrans/INDEX.md` depuis les front-matters. |
| `scripts/couverture.mjs` | Rapport : écrans sans fonctionnalité, règles sans écran, endpoints sans appelant, `[À CONCEVOIR]` en cours. |

### 5.6 Prompt d'exécution du lot 6

```
Tu exécutes le Lot 6 du plan de documentation Steamy : qualité, livraison, roadmap.

Prérequis : docs/01- à docs/06- et l'outillage .claude/ sont écrits.

Lis : PLAN-03 §3, §4, §5 ; docs/01-produit/parcours-utilisateurs.md ;
docs/_sources/SPEC-TECHNIQUE.md §8.8 (données mock incohérentes) et §9 (ordre de portage) ;
docs/06-ecrans/INDEX.md.

Écris :
1. Les 5 fichiers de docs/07-qualite/. Priorité à jeu-de-donnees-demo.md : c'est LE
   jeu unique qui corrige les 5 incohérences du §8.8. Noms béninois crédibles,
   localités réelles, prix réalistes en FCFA. Livre-le aussi comme script de seed.
2. Les 5 fichiers de docs/08-livraison/.
3. Les 15 epics de docs/09-roadmap/epics/ selon le tableau §5.2 et le gabarit §5.3,
   plus plan-d-implementation.md (avec le graphe Mermaid des dépendances et le
   chemin court) et journal-des-decisions.md.
4. Les 3 scripts de §5.5, et branche verifier-doc.mjs en CI.

Lance ensuite scripts/verifier-doc.mjs et scripts/couverture.mjs, et rapporte :
- les liens morts et IDs orphelins restants
- les écrans sans fonctionnalité, les règles sans écran, les endpoints sans appelant
- la liste complète des [À CONCEVOIR]

Ce rapport final est le vrai livrable du lot : il dit si la documentation tient debout.
```

---

## 6. Récapitulatif du plan 03

| Lot | Fichiers | Jalon | Effort agent estimé |
| --- | ---: | --- | --- |
| 5a · Contexte hiérarchique | 14 | **J5** | 1 session |
| 5b · Skills, agents, commandes | 17 | J5 | 2 sessions |
| 6a · Qualité | 5 | — | 1 session |
| 6b · Livraison | 5 | — | 1 session |
| 6c · Roadmap + scripts | 20 | — | 2 sessions |
| **Total** | **~61 fichiers** | | **~7 sessions** |

---

## 7. Vue d'ensemble des trois plans

| Plan | Lots | Fichiers | Sessions |
| --- | --- | ---: | ---: |
| PLAN-01 · Socle | 0, 1, 2 | 42 | ~8 |
| PLAN-02 · Spécifications | 3, 4 | ~248 | ~22 |
| PLAN-03 · Agents & qualité | 5, 6 | ~61 | ~7 |
| **Total** | **7 lots** | **~350** | **~37** |

**Le chemin critique est court** : Lot 0 → ADR → architecture → design system + API. Une fois ces quatre étapes franchies (≈ 42 + 24 = 66 fichiers, ~13 sessions), les 172 fiches écran sont un travail parallélisable et mécanique, et le code peut commencer sur la première zone.

**Retour au** [plan directeur](PLAN-00-DIRECTEUR.md).
