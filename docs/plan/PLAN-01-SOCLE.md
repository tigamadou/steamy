# PLAN-01 — Socle : nettoyage, décisions, produit, architecture

**Couvre les lots 0, 1 et 2 du [plan directeur](PLAN-00-DIRECTEUR.md).**
Ces trois lots sont **séquentiels et bloquants** : rien du lot 3 ou 4 ne peut commencer avant.

| Lot | Sortie | Jalon |
| --- | --- | --- |
| 0 | Dépôt nettoyé + gabarits de doc | J1 |
| 1 | 13 ADR tranchées + socle produit | **J2 (le plus critique)** |
| 2 | Architecture Next.js/MySQL complète | J3 |

---

## 1. Lot 0 — Nettoyage & socle documentaire

### 1.1 Objectif

Repartir d'un dépôt propre, avec les conventions et les gabarits écrits **avant** la première ligne de documentation réelle. Sans ça, les 340 fichiers suivants seront hétérogènes.

### 1.2 Entrées

- L'arborescence actuelle du dépôt
- `PLAN-00-DIRECTEUR.md` §3 (principes) et §6 (identifiants)

### 1.3 Actions

#### A. Sauvegarde et branche

```bash
git add -A && git commit -m "chore: état avant réécriture de la documentation"
git checkout -b docs/lot-0-socle
```

#### B. Retrait de BMAD

| À retirer | Chemin | Volume |
| --- | --- | --- |
| Moteur BMAD | `_bmad/` | 56 fichiers |
| Sorties BMAD | `_bmad-output/` | vide |
| Skills BMAD | `.claude/skills/bmad-*` | **45 dossiers** |

> Sur macOS via l'agent, si la suppression directe est impossible, déplacer vers `_to_delete/` puis supprimer manuellement. Vérifier ensuite que `.claude/skills/` ne contient plus que les skills projet (0 au départ).

#### C. Archivage des 4 documents actuels

Ils ne sont **pas jetés** : ils restent la source de tout le lot 4.

```
docs/_sources/
├── LISEZ-MOI.md                 ← « ces fichiers sont des sources historiques, pas la doc »
├── SPEC-TECHNIQUE.md            ← déplacé
├── SPEC-ECRANS-1-public-auth.md
├── SPEC-ECRANS-2-apprenant.md
├── SPEC-ECRANS-3-parent-teacher-admin.md
├── INVENTAIRE-ECRANS.md
├── template-CLAUDE.md           ← copie de template/CLAUDE.md
├── template-README.md
└── template-HANDOFF.md
```

`docs/_sources/LISEZ-MOI.md` doit dire explicitement : **statut = archive, ne pas modifier, ne pas citer comme référence, contient des affirmations périmées (identité chromatique, nombre de shells, en-têtes de fichiers)**. C'est un garde-fou : sans lui, un agent citera `SPEC-TECHNIQUE.md` comme s'il faisait autorité.

#### D. Squelette de l'arborescence

Créer tous les dossiers de `PLAN-00 §4.1` avec un `.gitkeep`, pour que l'agent des lots suivants n'ait pas à décider où poser un fichier.

### 1.4 Livrables

| Fichier | Contenu | Lignes |
| --- | --- | ---: |
| `docs/00-INDEX.md` | Carte de la doc **orientée tâche**. Format : trois colonnes « Je veux… / Je lis… / Puis… ». ~25 entrées : « implémenter un écran », « ajouter un endpoint », « comprendre le consentement », « savoir pourquoi telle décision », « recetter une zone »… | ~120 |
| `docs/00-CONVENTIONS-DOC.md` | Les 9 principes P1-P9 de PLAN-00 §3, développés avec exemple ✅ / ❌ chacun · le système d'ID de §6 · le nommage des fichiers (kebab-case, sans accent dans le nom, accents dans les titres) · la règle des 400 lignes · l'usage de Mermaid | ~250 |
| `docs/05-fonctionnalites/_modele-fiche-fonctionnalite.md` | Gabarit — voir §1.5 | ~90 |
| `docs/06-ecrans/_modele-fiche-ecran.md` | Gabarit — voir §1.6 | ~110 |
| `docs/02-architecture/adr/0000-modele-adr.md` | Gabarit ADR — voir §1.7 | ~60 |
| `docs/_sources/LISEZ-MOI.md` | Avertissement d'archive | ~30 |

### 1.5 Gabarit — fiche fonctionnalité

```markdown
---
id: F-07
nom: Achat d'un parcours payant
persona: [apprenant, parent]
piliers: [parcours]
statut: specifie          # specifie | partiel | a-concevoir
ecrans: [WC05, WA01, WA02, WA03, WA04, WA05, WA06, WA07]
regles: [RM-11, RM-12, RM-14, RM-21]
endpoints: [POST /purchases, POST /payments/mobile-money, GET /payments/:id]
adr: [ADR-0006, ADR-0007]
epic: EP-06
---

# F-07 · Achat d'un parcours payant

## Intention
Une phrase. Pourquoi cette fonctionnalité existe, du point de vue de l'utilisateur.

## Périmètre
Ce qui est dedans / ce qui est dehors. Explicite.

## Parcours nominal
Diagramme Mermaid `flowchart` reliant les écrans.

## Règles appliquées
Table : ID de règle · énoncé court · où elle est appliquée (serveur / interface / les deux).

## Cas limites et erreurs
Table : situation · comportement attendu · écran · code d'erreur.

## Critères d'acceptation
CA-01 · Étant donné … Quand … Alors …
(un CA par règle et par cas limite, minimum)

## Trous
[À CONCEVOIR] · ce qui manque, et qui doit le concevoir.
```

### 1.6 Gabarit — fiche écran

```markdown
---
id: WA03
nom: Formulaire de paiement Mobile Money
zone: achat-parcours
prefixe: WA
cible: web                 # web | mobile
dimensions: 1240x760
shell: WebAppShell
shell_props: { active: catalog, headerTitle: "Paiement" }
persona: [apprenant]
fonctionnalite: F-07
statut_source: D           # I implémenté | D déclaré | S statique | A-CONCEVOIR
regles: [RM-14, RM-15, RM-16]
endpoints: [POST /payments/mobile-money]
composants: [Field, Input, PhoneInput, WANetworkCard, Button, Badge]
etats: [nominal, chargement, erreur-validation, erreur-reseau]
precedent: [WA02, WC05]
suivant: [WA04, WA07]
epic: EP-06
---

# WA03 · Formulaire de paiement Mobile Money

## Rôle dans le parcours
Deux phrases maximum.

## Structure
Schéma ASCII ou description des zones, reprise/adaptée de la spec source.

## Contenu et micro-copie
Table : élément · texte exact en français · variable éventuelle.
**La micro-copie est normative** : elle est reprise telle quelle dans le code.

## Éléments interactifs
Table : élément · type · action · cible · état source [I]/[D]/[S] · règle appliquée.

## États
Table : état · déclencheur · rendu · a11y.
Minimum obligatoire : nominal · vide (si liste) · chargement · erreur.

## Données consommées
Table : champ affiché · source (endpoint, champ) · format · repli si absent.

## Validations
Table : champ · règle client · règle serveur · message d'erreur FR · code ERR-xxx.

## Accessibilité
Ordre de tabulation · rôles ARIA · annonces `aria-live` · contrastes à vérifier.

## Critères d'acceptation
CA-01 · Étant donné … Quand … Alors …

## Écarts avec la source
Ce qui change par rapport au canvas `template/`, et pourquoi (référence ADR).
```

### 1.7 Gabarit — ADR

```markdown
---
id: ADR-0006
titre: Format du Kit Code
statut: accepte            # propose | accepte | remplace-par-ADR-xxxx | rejete
date: 2026-08-XX
decideurs: [Amadou]
anomalie_source: SPEC-TECHNIQUE §8.5
impacte: [RM-21, F-07, WA01, WA06, EP-06]
---

# ADR-0006 · Format du Kit Code

## Contexte
Le problème, factuel. Les preuves (citations des sources, avec ligne).

## Options
Table : option · avantages · inconvénients · coût.

## Décision
Ce qui est retenu. **Formulation exécutable** : un développeur doit pouvoir coder à partir de ce seul paragraphe.

## Conséquences
Ce qui change dans le modèle, les écrans, l'API, la doc. Liste des fichiers à mettre à jour.

## Suivi
Ce qu'il faudra revérifier plus tard, et quand.
```

### 1.8 Critères d'acceptation du lot 0

- [ ] `_bmad/`, `_bmad-output/`, et les 45 `.claude/skills/bmad-*` ont disparu
- [ ] Les 4 documents sources sont dans `docs/_sources/` avec l'avertissement
- [ ] Tous les dossiers de `PLAN-00 §4.1` existent
- [ ] Les 3 gabarits sont écrits et **utilisables tels quels** (un agent peut les remplir sans question)
- [ ] `00-INDEX.md` couvre au moins 20 tâches distinctes
- [ ] `git status` est propre, la branche est mergeable

### 1.9 Prompt d'exécution

```
Tu exécutes le Lot 0 du plan de documentation Steamy.

Lis d'abord : docs/plan/PLAN-00-DIRECTEUR.md (§3 principes, §4 arborescence, §6 identifiants)
et docs/plan/PLAN-01-SOCLE.md §1 (ce lot).

Fais, dans cet ordre :
1. Retire BMAD : _bmad/, _bmad-output/, et les 45 dossiers .claude/skills/bmad-*.
2. Déplace les 4 documents de docs/ vers docs/_sources/, ajoute-y une copie de
   template/CLAUDE.md, template/README.md, template/HANDOFF.md renommés template-*.md,
   et écris docs/_sources/LISEZ-MOI.md qui déclare ces fichiers comme archive
   historique non normative.
3. Crée toute l'arborescence de dossiers de PLAN-00 §4.1 avec des .gitkeep.
4. Écris les 5 fichiers listés en PLAN-01 §1.4, en suivant exactement les
   gabarits de §1.5, §1.6, §1.7.

Contraintes : français intégral. Noms de fichiers en kebab-case sans accent.
Aucun fichier ne dépasse 400 lignes. Tableaux plutôt que prose.
Ne commence aucun autre lot.

À la fin, vérifie les critères de PLAN-01 §1.8 et liste ce qui n'est pas rempli.
```

---

## 2. Lot 1a — Les 13 décisions d'architecture (ADR)

### 2.1 Objectif

**C'est le lot le plus important du projet.** Tant qu'une anomalie du `SPEC-TECHNIQUE.md` §8 n'est pas tranchée, chaque agent qui la rencontre invente une réponse différente. Les 16 anomalies deviennent 13 ADR (certaines sont regroupées) plus 4 ADR de stack.

### 2.2 Entrées

- `docs/_sources/SPEC-TECHNIQUE.md` §8 intégral (les 16 anomalies)
- `docs/_sources/SPEC-TECHNIQUE.md` §3 (modèle de données déduit) et §4 (invariants)
- `docs/_sources/template-CLAUDE.md` (contexte produit, règles métier embarquées)
- Décision cadre : Next.js + MySQL

### 2.3 Les 13 ADR

| ADR | Titre | Anomalie source | Difficulté | Recommandation à proposer |
| --- | --- | --- | --- | --- |
| **0001** | Stack Next.js + MySQL | — | Moyenne | Next.js App Router, TypeScript strict, MySQL 8, Tailwind + tokens CSS, React Server Components par défaut. Détailler versions, hébergement, CDN, stockage média. |
| **0002** | ORM et migrations | — | Faible | Prisma (maturité MySQL, migrations versionnées, typage bout en bout). Alternative Drizzle à documenter. |
| **0003** | Identité chromatique | §8.1 🔴 | **Faible mais bloquante** | **Le magenta `#9E1B9A` est la primaire** — c'est ce que disent les tokens, la doc est en retard. Conséquence : purger les 5 emplacements qui codent `rgba(91,63,224,…)` en dur ; `#5B3FE0` ne subsiste que comme `--cat-robotique`. |
| **0004** | Authentification de l'apprenant | §8.2 🔴 | Faible | **Identifiant + mot de passe, jamais téléphone.** Supprimer « changer de numéro » de `WD18`, remplacer « Téléphone » par « Identifiant » dans `WD13`, cantonner le reset par SMS (`WL02`-`WL05`) aux parents/enseignants. Le reset apprenant passe par le parent (voir ADR-0005). |
| **0005** | Politique de refus du consentement | §8.4 🟠 | **Élevée — décision produit** | 4 sources se contredisent. Proposer : refus **terminal pour la demande**, nouvelle demande possible après un **délai de 30 jours**, **changement de parent référent soumis à modération admin** (`WAD08`). Impacte `ConsentRequest`, `WP11`, `WP12`, `W18`, `WAD08`. |
| **0006** | Format du Kit Code | §8.5 🟠 | Moyenne | 12 vs 16 caractères selon les écrans. Proposer : **`STEAMY-XXXX-XXXX`, 16 caractères affichés, 8 significatifs**, alphabet Crockford Base32 (sans I/L/O/U), insensible à la casse, séparateurs ignorés à la saisie. **Anti-fraude** : 5 tentatives par heure et par compte, verrou après 10, journalisation. |
| **0007** | Référentiels côté serveur | §8.6, §8.12, §8.14 | Moyenne | Six listes sont dupliquées en dur : indicatifs téléphoniques, réseaux Mobile Money, objectifs (9 vs 10), avatars (9 vs 10), pays, niveaux scolaires. Décision : **toutes deviennent des tables de référence servies par l'API**, jamais des constantes de code. |
| **0008** | Bandes de score des quiz | §8.7 🟠 | Faible | `warn` n'est défini nulle part. Proposer : **≥ seuil = `ok`** · **50 % à seuil-1 = `warn` (« à refaire »)** · **< 50 % = `ko` (« échoué »)**. Le seuil vaut 70 % en formative, 80 % en sommative. Définir aussi le **nombre de tentatives** (trou identifié en `WJ` : proposer illimité en formative, 3 en sommative avec révision imposée entre deux). |
| **0009** | Champs de l'Impact Tracker | §8.3 🟠 | **Élevée — trois décisions distinctes** | (a) **Zone rurale** : ajouter un référentiel de localités qualifiées urbain/rural plutôt qu'un champ libre. (b) **Institutions** : entité absente — la créer ou renoncer au KPI. (c) **Complétions de parcours** : instrumenter l'événement. Ne pas fusionner ces trois décisions. |
| **0010** | Stratégie de rendu Next.js | — | Moyenne | Par zone : site public `WL` → statique/ISR (SEO, cache CDN, connectivité) · app apprenant → RSC + streaming · admin → client-side avec revalidation · paiement → server actions strictes. Justifier avec la contrainte de connectivité ouest-africaine. |
| **0011** | Stratégie de test | — | Faible | Vitest (unitaire) + Testing Library (composants) + Playwright (E2E sur les 8 parcours critiques) + tests de contrat sur `openapi.yaml`. Seuils par couche. |
| **0012** | i18n, formats et devise | §8.8 (devise) | Faible | Français unique (pas de i18n multi-langue, mais **fichiers de messages centralisés** pour éviter les chaînes en dur). Devise normalisée **FCFA** partout, format `1 240 FCFA` (espace insécable). Dates, téléphones par pays. |
| **0013** | Navigation applicative | §8.10 🟡 | Moyenne | `NAV_ITEMS` ne couvre pas les zones conçues. Décision : **6 entrées** — Accueil · Mes parcours *(nouveau)* · Catalogue · Mes souhaits · Badges *(écran à concevoir)* · Profil. Retirer les `title="Bientôt"`. Déclenche 2 écrans [À CONCEVOIR]. |

### 2.4 Anomalies non promues en ADR

Elles sont traitées ailleurs, mais doivent être **explicitement tracées** pour qu'on ne les perde pas :

| Anomalie | Traitement |
| --- | --- |
| §8.8 données mock incohérentes | → `07-qualite/jeu-de-donnees-demo.md` (Lot 6). **Un seul jeu de données**, cohérent : Léa Adjovi, 4ème, Cotonou, un seul e-mail, un seul kit robot, un seul effectif d'apprenants. |
| §8.9 reset du mot de passe enfant | → fonctionnalité `F-xx` + écran [À CONCEVOIR] sur `WPD03`/`WPD10`, et correction de la FAQ `WPD13`. |
| §8.11 fonctionnalités annoncées non spécifiées (10 items) | → `01-produit/perimetre-et-trous.md`, chacune avec un statut : à concevoir / hors périmètre v1 / à supprimer de l'UI. |
| §8.13 accessibilité | → `03-design-system/accessibilite.md` + `07-qualite/criteres-accessibilite.md`. Devient un critère de recette, pas une finition. |
| §8.15 en-têtes périmés, §8.16 artefacts de canvas | → `03-design-system/mapping-template-vers-code.md` : liste de ce qu'on ne porte pas (`onWheel`, `position:absolute` sur les modales, `opacity:.55`, `blur(1px)`, `title="Bientôt"`, timer `00:42`, badge `2`). |
| §8.14 divergence mobile (9 écarts) | → ADR-0007 pour les référentiels, et `01-produit/perimetre-et-trous.md` pour le reste. **Le mobile est un chantier de conception, pas de portage** : 156 écrans sur 172 n'ont aucune maquette 360×760. |

### 2.5 Livrables

14 fichiers dans `docs/02-architecture/adr/` (0000 déjà fait au lot 0, plus 0001 à 0013).

Chaque ADR est rédigée par l'agent **au statut `propose`**, avec une option recommandée argumentée. Amadou passe et bascule chacune en `accepte` (ou choisit une autre option). C'est le jalon **J2**.

### 2.6 Critères d'acceptation

- [ ] Les 16 anomalies du §8 sont chacune soit tranchées par une ADR, soit tracées en §2.4 avec une destination
- [ ] Chaque ADR cite ses preuves (fichier + section source)
- [ ] Chaque ADR liste ses **conséquences fichier par fichier**
- [ ] Chaque ADR a une option recommandée **et** au moins une alternative sérieuse
- [ ] Aucune ADR ne dépasse 150 lignes
- [ ] Les ADR 0003, 0004, 0005, 0006 (les bloquantes) sont en tête de la file de validation

### 2.7 Prompt d'exécution

```
Tu exécutes le Lot 1a du plan de documentation Steamy : les 13 ADR.

Lis : docs/plan/PLAN-01-SOCLE.md §2, docs/_sources/SPEC-TECHNIQUE.md (§3, §4, §8 intégral),
docs/_sources/template-CLAUDE.md, docs/02-architecture/adr/0000-modele-adr.md.

Écris les 13 ADR listées en §2.3, une par fichier, au format du gabarit 0000.
Statut de chacune : "propose".

Pour chaque ADR :
- Contexte factuel avec citations sourcées (fichier + §).
- Au moins 2 options, en tableau avantages/inconvénients/coût.
- Une décision recommandée, formulée de façon EXÉCUTABLE : un développeur doit
  pouvoir coder à partir de ce seul paragraphe.
- Les conséquences listées fichier par fichier et écran par écran.

La recommandation de chaque ADR t'est donnée en colonne 5 du tableau §2.3 :
approfondis-la, ne la contredis pas sans argument fort — et si tu la contredis,
dis-le en tête de l'ADR.

Écris ensuite docs/02-architecture/adr/INDEX.md : table des 13 ADR
(id, titre, statut, anomalie source, impacte).

Contraintes : français, ≤150 lignes par ADR, aucune ADR ne laisse de question ouverte
dans sa section Décision.
```

---

## 3. Lot 1b — Socle produit

### 3.1 Objectif

Écrire **la** source unique des règles métier, des personas et des parcours. Tout le reste de la doc y référera par ID.

### 3.2 Entrées

- Les 13 ADR **acceptées** (jalon J2 franchi)
- `SPEC-TECHNIQUE.md` §4 (invariants) et §3 (modèle)
- `template-CLAUDE.md` §« Product context & feature scope »
- Les 3 `SPEC-ECRANS-*.md` pour les parcours

### 3.3 Livrables

| Fichier | Contenu | Points d'attention | Lignes |
| --- | --- | --- | ---: |
| `01-produit/vision-et-personas.md` | 4 personas : apprenant 10-17, parent, enseignant, admin. Pour chacun : contexte, objectifs, contraintes, appareil et connexion, ce qu'il ne peut pas faire. | L'admin est un persona à part entière (RBAC, 2FA, 15 écrans) — il est absent des « 3 personas » de `template-CLAUDE.md`. | 200 |
| `01-produit/piliers-produit.md` | Les 4 piliers : parcours pédagogiques · boutique de kits · Steamy Events · dashboards & notifications. Pour chacun : intention, entités, écrans, état de conception. | Signaler que **Steamy Events est le pilier le moins conçu** (fiche événement inexistante). | 180 |
| `01-produit/regles-metier.md` | **LE fichier central.** `RM-01` à `RM-nn` (~45 règles estimées), groupées : comptes · consentement · paiement · pédagogie · commerce · événements · interface. Pour chaque règle : énoncé impératif, portée (serveur/client/les deux), écrans concernés, endpoint concerné, ADR de référence, critère de vérification. | Format **tabulaire strict**. Chaque règle tient en une ligne d'énoncé. Aucune règle sans ID. C'est le fichier que tous les agents chargeront. | 400 |
| `01-produit/parcours-utilisateurs.md` | Les 8 parcours end-to-end en Mermaid, **reconstruits** faute des `.mmd` d'origine : 0 master · 1 auth+onboarding · 2 dashboard apprenant · 3 dashboard parent · 4 boutique kit · 5 achat parcours · 6 déroulement pédagogique · 7 dashboard enseignant. | **Risque R1 du plan directeur.** Ces diagrammes remplacent les `.mmd` introuvables. Chaque nœud porte un ID d'écran. À valider en J2. | 350 |
| `01-produit/glossaire.md` | ~40 termes : Parcours, Projet, Niveau, Mission, Formative, Sommative, Kit, Kit Code, Voucher, Badge de niveau/projet, Certification, Ticket Events, Consentement, Détour parent, Mobile Money, FCFA, MSISDN, Zeti, Artboard, Shell, Zone… | Chaque terme : définition, terme anglais équivalent (pour le code), ce que ce n'est **pas**. | 150 |
| `01-produit/ton-et-copie.md` | Tutoiement apprenant/enseignant, vouvoiement parent, neutre admin. Emojis : où oui, où non. Zeti : ses 6 poses et quand chacune apparaît. Micro-copie d'erreur : ton rassurant, jamais culpabilisant. Bibliothèque de formulations types. | Inclure une table **✅ / ❌** d'exemples réels tirés des écrans. | 200 |
| `01-produit/perimetre-et-trous.md` | Tout ce qui est annoncé mais non conçu, avec un statut décidé : `à concevoir v1` / `hors périmètre v1` / `à retirer de l'UI`. ~20 entrées (§8.11, §8.9, §8.10, fiche événement, badges, mode hors ligne, RBAC, import batch, changement de parent, blog, tutoriels communautaires, création de classe, rejoindre l'équipe…). Plus les **156 écrans mobile** non conçus. | C'est la liste de courses du designer. Elle doit être chiffrée en nombre d'écrans. | 250 |

### 3.4 Critères d'acceptation

- [ ] `regles-metier.md` couvre les 5 tables d'invariants du `SPEC-TECHNIQUE.md` §4 sans perte
- [ ] Chaque règle a un ID, une portée, et au moins un écran ou endpoint qui l'applique
- [ ] Les 8 parcours Mermaid rendent correctement et n'utilisent que des IDs d'écran existants
- [ ] Le glossaire n'a aucun terme sans définition, et distingue Parcours/Projet/Niveau/Mission sans ambiguïté
- [ ] `perimetre-et-trous.md` chiffre chaque trou (nombre d'écrans, persona touché)
- [ ] Aucune contradiction avec une ADR acceptée

### 3.5 Prompt d'exécution

```
Tu exécutes le Lot 1b du plan de documentation Steamy : le socle produit.

Prérequis : les 13 ADR de docs/02-architecture/adr/ sont au statut "accepte".
Si ce n'est pas le cas, arrête-toi et signale-le.

Lis : docs/02-architecture/adr/*.md, docs/_sources/SPEC-TECHNIQUE.md §3 et §4,
docs/_sources/template-CLAUDE.md, et les 3 docs/_sources/SPEC-ECRANS-*.md
(pour les enchaînements).

Écris les 7 fichiers de docs/01-produit/ décrits en PLAN-01 §3.3.

Priorité absolue à regles-metier.md : c'est la source unique de tous les invariants.
Format tabulaire. Une règle = un ID RM-xx = une ligne d'énoncé impératif.
Chaque règle porte : portée (serveur | client | les deux), écrans, endpoint, ADR, critère
de vérification. Vise 45 règles environ, groupées en 7 familles.

Pour parcours-utilisateurs.md : les diagrammes .mmd d'origine sont introuvables.
Reconstruis les 8 flux en Mermaid depuis les fiches d'écran des sources. Chaque nœud
porte un ID d'écran réel. Marque clairement en tête que ces diagrammes sont
RECONSTRUITS et doivent être validés.

Contraintes : français, ≤400 lignes par fichier, aucune contradiction avec une ADR.
Si tu rencontres une règle absente des sources, ne l'invente pas : inscris-la
dans perimetre-et-trous.md avec le marqueur [À CONCEVOIR].
```

---

## 4. Lot 2 — Architecture technique

### 4.1 Objectif

Transformer « Next.js + MySQL » en une architecture décidée, arborescée, schématisée — au point qu'un agent puisse créer un fichier au bon endroit sans réfléchir.

### 4.2 Entrées

- Les 13 ADR acceptées, en particulier 0001, 0002, 0010, 0011, 0012
- `01-produit/regles-metier.md` (lot 1b)
- `SPEC-TECHNIQUE.md` §3 (modèle de données déduit) et §7 (surface d'API proposée)

### 4.3 Livrables

| Fichier | Contenu | Points d'attention | Lignes |
| --- | --- | --- | ---: |
| `vue-d-ensemble.md` | Diagramme de contexte (C4-1) : Steamy et ses acteurs + systèmes externes (agrégateur Mobile Money, passerelle SMS, stockage média, CDN). Diagramme de conteneurs (C4-2) : app Next.js, MySQL, cache, stockage objet, worker de tâches. | Les intégrations externes ne sont **nommées nulle part** dans les sources. À décider ici (avec un ADR complémentaire si besoin). | 200 |
| `stack.md` | Table complète : couche · choix · version · justification · alternative écartée. Front, back, base, ORM, auth, validation (Zod), formulaires, état serveur, tests, lint, CI, hébergement, observabilité. | Chaque ligne renvoie à l'ADR qui la justifie. | 200 |
| `arborescence-du-code.md` | `src/` dossier par dossier, avec **ce qui va dedans et ce qui n'y va pas**. Route groups Next.js par persona : `(public)`, `(auth)`, `(app)`, `(parent)`, `(teacher)`, `(admin)`. Couches : `components/ui` (design system), `components/shells`, `features/<zone>`, `server/` (actions, services, repositories), `lib/`, `db/`. | **Casser les 2 cycles** identifiés au §1.2 des sources dès la conception de l'arborescence : les 18 composants partagés vont dans `components/`, jamais dans une feature. | 300 |
| `conventions-de-code.md` | Nommage (fichiers, composants, hooks, actions). RSC par défaut / `'use client'` par exception, avec la règle de décision. Gestion des erreurs (Result vs exception). Chaînes UI : jamais en dur, toujours via le catalogue de messages. Imports absolus. Style : Tailwind + tokens, jamais de hex. Commentaires en français. | Inclure une checklist « avant de commit ». | 300 |
| `modele-de-donnees.md` | Le schéma complet : ~30 entités. Diagramme ER Mermaid + table par entité (champ, type MySQL, contraintes, index, note). Puis le schéma ORM commenté. | Reprendre §3 des sources et le **compléter** : y ajouter les entités décidées en ADR-0009 (Localité qualifiée, Institution), les tables de référence d'ADR-0007, l'audit trail, les tables de sessions. Attention aux **collations MySQL** (accents dans les données françaises, `utf8mb4_0900_ai_ci`). | 400 |
| `authentification-et-sessions.md` | 4 modes de connexion (apprenant identifiant/mdp · parent téléphone/mdp · enseignant · admin email/mdp/2FA). Hachage (argon2id). Sessions, durée, révocation. Politique de mot de passe (celle de `PwReq`). Reset par persona (conséquence d'ADR-0004). | Le reset de l'apprenant **passe par le parent** — flux à décrire complètement, il n'existe dans aucun écran actuel. | 250 |
| `autorisation-et-rbac.md` | Matrice rôle × ressource × action. Les 4 rôles admin (super-admin, contenu, support, finance) d'ADR non implémentés → les définir ici. Règle du **détour parent** comme autorisation, pas comme UI. | Le RBAC est « descriptif uniquement » dans les sources (§8.11). Ce fichier le rend réel. | 250 |
| `paiement-mobile-money.md` | Machine à états d'un paiement. Création d'intent, redirection/USSD, webhook, idempotence, timeout, réconciliation, remboursement. Les 3 réseaux (MTN, Moov, Celtiis) pilotés par configuration (ADR-0007). Détour parent (`WA02`, `WK08`). Codes d'échec et messages FR. | **Aucun agrégateur n'est nommé dans les sources.** Documenter une couche d'abstraction `PaymentProvider` pour ne pas se lier trop tôt. | 300 |
| `consentement-parental.md` | Machine à états de `ConsentRequest` conforme à ADR-0005. Envoi SMS, polling côté enfant, notification côté parent, refus motivé, délai de 30 jours, changement de référent modéré. Les 4 « détours parent » (paiement parcours, paiement kit, suppression de compte, event < 16 ans). | Diagramme d'états Mermaid obligatoire. C'est le mécanisme le plus subtil du produit. | 250 |
| `medias-et-fichiers.md` | Vidéos d'intro de niveau, médias de mission, images de kits, avatars, **certification PDF**, factures PDF, export CSV de l'Impact Tracker. Stockage, formats, tailles, génération, cache. | La contrainte de connectivité impose des budgets de poids explicites. | 200 |
| `notifications.md` | 3 canaux (in-app, SMS, e-mail). Table des types de notification × persona × canal × préférence modifiable. Les écrans de préférences (`WD06`, `WPD08`, `WT08`) doivent en dériver. | Aujourd'hui les toggles de préférence sont des mocks sans modèle derrière. | 200 |
| `performance-et-connectivite.md` | Contrainte Afrique de l'Ouest en exigences chiffrées : budget JS par route, budget image, stratégie de cache, comportement en 2G/3G, dégradation gracieuse, offline (portée décidée en ADR ou marqué hors périmètre). Auto-hébergement de Nunito, suppression de l'`@import` Google Fonts. | Les sources insistent lourdement : c'est une contrainte **produit**, pas une optimisation. | 250 |
| `securite.md` | Menaces et parades. Spécificité **mineurs** : minimisation des données, pas d'exposition publique du profil enfant sans consentement, journalisation des accès. Anti-fraude Kit Code (ADR-0006). Rate limiting. 2FA admin. Chiffrement au repos des MSISDN. Politique de rétention. | Le produit collecte : date de naissance, école, localité, **situation de handicap**, téléphone parental. Traitement à documenter avec soin. | 300 |
| `observabilite.md` | Logs structurés, métriques, traçage. **Instrumentation de l'Impact Tracker** : les 30 KPI en 8 groupes, quels événements les alimentent, lesquels sont manuels (ADR-0009). | La « complétion de parcours » n'est pas instrumentée aujourd'hui (`WAD01` affiche « — · mesure à activer »). | 250 |
| `adr/INDEX.md` | Mis à jour avec les éventuelles ADR nées de ce lot (agrégateur de paiement, passerelle SMS, hébergement). | | 60 |

### 4.4 Critères d'acceptation

- [ ] `modele-de-donnees.md` couvre les 6 familles du §3 des sources, plus les entités nées des ADR
- [ ] Chaque entité a ses index et ses contraintes d'unicité (identifiant apprenant, téléphone parent, Kit Code, référence de commande)
- [ ] `arborescence-du-code.md` place explicitement les **18 composants partagés** et **casse les 2 cycles**
- [ ] Les 45 règles métier du lot 1b ont chacune un lieu d'application désigné dans l'architecture
- [ ] `paiement-mobile-money.md` et `consentement-parental.md` ont chacun un diagramme d'états complet
- [ ] Aucun choix technique n'apparaît sans être justifié par une ADR

### 4.5 Prompt d'exécution

```
Tu exécutes le Lot 2 du plan de documentation Steamy : l'architecture technique.

Prérequis : les 13 ADR sont acceptées et docs/01-produit/ est écrit.

Lis : docs/02-architecture/adr/*.md, docs/01-produit/regles-metier.md,
docs/_sources/SPEC-TECHNIQUE.md §3 (modèle) et §7 (API proposée).

Écris les 15 fichiers de docs/02-architecture/ décrits en PLAN-01 §4.3.

Trois exigences non négociables :
1. modele-de-donnees.md doit être COMPLET et exécutable : un diagramme ER Mermaid,
   une table par entité (champ, type MySQL, contrainte, index), puis le schéma ORM.
   Ajoute les entités nées des ADR (localités qualifiées, institutions, tables de
   référence, audit, sessions). Fais attention aux collations MySQL : les données sont
   en français avec accents.
2. arborescence-du-code.md doit CASSER les deux cycles de dépendance identifiés dans
   les sources (dashboard↔parent-dashboard, dashboard↔purchase) en plaçant les 18
   composants partagés dans components/, jamais dans une feature.
3. paiement-mobile-money.md et consentement-parental.md doivent chacun contenir un
   diagramme d'états Mermaid complet, avec tous les cas d'échec.

Si un choix d'intégration externe (agrégateur Mobile Money, passerelle SMS,
hébergeur, stockage objet) n'est décidé nulle part, écris une ADR supplémentaire
au statut "propose" plutôt que de choisir en silence.

Contraintes : français, ≤400 lignes par fichier, chaque choix renvoie à son ADR.
```

---

## 5. Récapitulatif du plan 01

| Lot | Fichiers | Jalon | Effort agent estimé |
| --- | ---: | --- | --- |
| 0 · Nettoyage & socle | 6 + arborescence | J1 | 1 session |
| 1a · 13 ADR | 14 | **J2** | 2 sessions |
| 1b · Socle produit | 7 | J2 | 2 sessions |
| 2 · Architecture | 15 | J3 | 3 sessions |
| **Total** | **42 fichiers** | | **~8 sessions** |

**Suite** : [PLAN-02-SPECIFICATIONS.md](PLAN-02-SPECIFICATIONS.md) — design system, API, fonctionnalités, 172 écrans.
