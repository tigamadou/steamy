# PLAN-02 — Spécifications : design system, API, fonctionnalités, 172 écrans

> ⚠️ **Document historique (août 2026), non maintenu.** Ce plan de réécriture de la documentation date d'avant le
> choix de l'architecture réelle. Il prévoit une stack « Next.js + MySQL/Prisma » qui a été abandonnée au profit de
> Next.js (front) + API Django/PostgreSQL. Ses « lots 0-6 » sont des lots de *documentation*, sans rapport avec les lots
> d'implémentation des écrans.
> Documents à jour :
> - [alignement des specs](../alignement/ARBITRAGES.md) ;
> - [spec technique](../SPEC-TECHNIQUE.md) ;
> - [infrastructure](../infra/README.md) ;
> - plans d'implémentation par lot dans `docs/plans/`.

**Couvre les lots 3 et 4 du [plan directeur](PLAN-00-DIRECTEUR.md).**
C'est le gros du volume : ~245 fichiers sur les ~340 du projet documentaire.

| Lot | Sortie | Jalon | Parallélisable |
| --- | --- | --- | --- |
| 3a | Design system documenté (9 fichiers) | J4 | ✅ avec 3b |
| 3b | Contrat d'API complet + `openapi.yaml` (15 fichiers) | J4 | ✅ avec 3a |
| 4a | ~45 fiches fonctionnalité | — | après 3 |
| 4b | **172 fiches écran**, par zone | — | ✅ 14 zones en parallèle |

---

## 1. Lot 3a — Design system

### 1.1 Objectif

Le canvas `template/` contient 32 292 lignes de JSX qui **sont** le design system, mais sous forme de prototype sans build. Ce lot en extrait le **contrat** : ce que chaque composant doit faire, pas comment le prototype le fait.

### 1.2 Entrées

- `template/ds-tokens.css` (5,3 Ko), `ds-atoms.jsx` (15 Ko), `ds-complex.jsx` (27 Ko), `ds-charts.jsx` (13 Ko), `ds-icons.jsx` (6,5 Ko), `ds-mascot.jsx` (7,6 Ko)
- `docs/_sources/SPEC-TECHNIQUE.md` §2 (contrats déjà extraits) et §8.16 (artefacts à ne pas porter)
- `ADR-0003` (identité chromatique), `ADR-0007` (référentiels serveur), `ADR-0010` (rendu)

### 1.3 Livrables

| Fichier | Contenu | Points d'attention | Lignes |
| --- | --- | --- | ---: |
| `principes-visuels.md` | L'esthétique « candy » : élévation vers le bas, press visible, animations expressives de succès/échec, arrondis généreux, emojis fonctionnels. Grille 4/8. Densités. Mouvement (`--ease-bounce`, durées). | C'est ce qui rend le produit reconnaissable. Un agent qui ne lit que les tokens produira du Bootstrap. | 180 |
| `tokens.md` | **Toutes** les variables de `ds-tokens.css`, en tables par famille : couleur (primary, success, amber, error, info, warning, cat×6, ink), typo, espacement, rayon, ombre, animation. Pour chacune : nom, valeur, usage, exemple. Puis le **mapping vers la stack** (variables CSS + thème Tailwind). | Appliquer ADR-0003 : primaire = magenta `#9E1B9A`. **Purger les 5 valeurs qui codent `rgba(91,63,224,…)` en dur** (`--shadow-card`, `--shadow-card-hover`, `.app-sidebar__item.is-active`, `.welcome-card`, `.cat-project.is-current`, `@keyframes pulse`) et documenter leurs remplaçantes. Retirer l'`@import` Google Fonts ; **Nunito seule**, auto-hébergée. | 350 |
| `atomes.md` | Les 11 atomes + les 4 promus (`Checkbox`, `PwReq`, `GoalChip`, `StatPill`). Pour chacun : intention, table de props (nom, type, défaut, obligatoire), variantes, états (défaut, survol, focus, actif, désactivé, erreur), a11y, exemple d'usage, ce qu'il ne fait pas. | `PhoneInput` : rendre l'indicatif dépendant du pays (ADR-0007). `OTPInput` : le rendre **réellement saisissable** (il est en affichage seul dans le prototype). `PwReq` porte de la **règle**, pas du style. | 400 |
| `composes.md` | Les 9 composés + les 8 promus (`ChoiceCard`, `UserTypeCard`, `Toggle`, `SectionHeader`, `SettingsRow`, `QuizAttemptRow`, `QuickActionTile`, `SkeletonBlock`, `WPDSection`, `WPDInfoCard`, `WANetworkCard`, `WKKitCard`). Même structure que les atomes. | **Paramétrer ce qui est en dur** : timer du `Quiz` (`00:42`), badge du `BottomNav` (`2`), réseaux de `WANetworkCard`, onglets du `BottomNav`. `Modal` : passer en `position: fixed` + portail, avec piège de focus et `Escape`. | 400 |
| `data-viz.md` | `Sparkline`, `BarChart`, `DonutChart`, `StatCard`, `DataTable`, `SegmentedControl`. Contrat de données de `DataTable` (colonnes, lignes, dense, tri, vide, clic de ligne). Monochrome `--ink-*` par défaut, couleur par prop. | Réservé au back-office. Interdiction de la famille `--primary-*` dans l'admin. | 250 |
| `layouts-et-shells.md` | Les **6 shells** : `PublicShell`, `WebShell`, `WebAppShell`, `WebParentShell`, `WebTeacherShell`, `WebAdminShell`. Pour chacun : schéma, props, zones, navigation, comportement responsive. Plus les **règles de navigation** (une sous-route garde l'`active` du parent). | Appliquer ADR-0013 : la nav apprenant passe à **6 entrées** (ajout « Mes parcours »), les `title="Bientôt"` disparaissent. Les sources ne listaient que 4 shells — il y en a 6. | 300 |
| `icones-et-mascotte.md` | Les 30 icônes (nom, usage, alternative). Zeti : 6 poses (`idle`, `wave`, `cheer`, `focus`, `sad`, `sleep`) et la règle d'emploi de chacune. Les logos : 2 assets, règles d'usage, **interdiction du filtre `brightness(0) invert(1)`**, préférence pour le SVG. | Table pose → contexte : onboarding, état vide, célébration, échec, attente longue. | 200 |
| `accessibilite.md` | Le niveau cible (WCAG 2.1 AA) et comment l'atteindre composant par composant. Focusabilité de tous les éléments cliquables (aujourd'hui des `<div cursor:pointer>`). ARIA. `aria-live` sur toasts et notifications. Gestion du focus dans `Modal`. Contrastes : **`--ink-400` (#A39DBE) est à 2,6:1 sur blanc — sous le seuil**, décider de son remplacement ou de son cantonnement. Navigation clavier complète. | Le public cible inclut des utilisateurs en situation de handicap **explicitement modélisés** dans le profil. Ce n'est pas une finition. | 300 |
| `mapping-template-vers-code.md` | Table : composant du canvas → composant cible → fichier de destination → écarts. Plus la **liste noire** des artefacts à ne pas porter (§8.16 des sources) : `onWheel stopPropagation`, `position:absolute` sur `modal-backdrop` et `wish-toast-wrap`, `opacity:.55` de `WC02b`, `blur(1px)` de `WD16`, `title="Bientôt"`, timer `00:42`, badge `2`, commentaire « ⭐ TA CONTRIBUTION ». | C'est le document qui évite qu'un agent recopie un artefact de mise en scène en croyant que c'est du produit. | 250 |

### 1.4 Critères d'acceptation

- [ ] Les 6 fichiers `ds-*` du template sont couverts sans composant oublié
- [ ] Les **18 composants à promouvoir** ont chacun une destination désignée
- [ ] Toute valeur en dur identifiée dans les sources est soit paramétrée, soit justifiée
- [ ] Aucune couleur hexadécimale ne figure hors de `tokens.md`
- [ ] Chaque composant a une section a11y non vide
- [ ] La liste noire du mapping couvre les 8 artefacts du §8.16

### 1.5 Prompt d'exécution

```
Tu exécutes le Lot 3a du plan de documentation Steamy : le design system.

Prérequis : docs/02-architecture/ est écrit, ADR-0003 et ADR-0013 sont acceptées.

Lis : template/ds-tokens.css, ds-atoms.jsx, ds-complex.jsx, ds-charts.jsx,
ds-icons.jsx, ds-mascot.jsx (lis vraiment le code, pas seulement les résumés),
docs/_sources/SPEC-TECHNIQUE.md §2 et §8.16,
docs/02-architecture/adr/0003-*.md et 0013-*.md.

Écris les 9 fichiers de docs/03-design-system/ décrits en PLAN-02 §1.3.

Tu documentes un CONTRAT, pas le prototype. Pour chaque composant :
intention · props (nom, type, défaut, obligatoire) · variantes · états
(défaut/survol/focus/actif/désactivé/erreur) · accessibilité · exemple · non-buts.

Trois obligations :
1. tokens.md applique ADR-0003 (primaire magenta) et purge explicitement les 5
   emplacements qui codent l'ancien violet rgba(91,63,224,…) en dur.
2. Tout ce qui est codé en dur dans le prototype et qui devrait être une donnée
   (timer du Quiz, badge du BottomNav, réseaux Mobile Money, indicatif téléphonique,
   objectifs, avatars) est documenté comme PARAMÈTRE, avec sa source de données.
3. mapping-template-vers-code.md contient une liste noire explicite des artefacts
   de canvas à ne jamais porter (SPEC-TECHNIQUE §8.16).

Contraintes : français, ≤400 lignes par fichier, aucune couleur hexa hors tokens.md.
```

---

## 2. Lot 3b — Contrat d'API

### 2.1 Objectif

Le §7 des sources propose ~90 endpoints déduits des écrans. Ce lot les transforme en **contrat exécutable** : OpenAPI valide, codes d'erreur catalogués, messages français normés.

### 2.2 Entrées

- `docs/_sources/SPEC-TECHNIQUE.md` §7 (les 11 groupes d'endpoints)
- `docs/02-architecture/modele-de-donnees.md`, `autorisation-et-rbac.md`, `paiement-mobile-money.md`, `consentement-parental.md`
- `docs/01-produit/regles-metier.md`

### 2.3 Livrables

| Fichier | Contenu | Lignes |
| --- | --- | ---: |
| `04-api/conventions.md` | Style d'URL, verbes, versionnage, pagination (curseur), tri, filtrage, formats de date et de montant, en-têtes, idempotence (clé sur les écritures de paiement), rate limiting, forme d'une réponse d'erreur, forme d'une réponse paginée. | 250 |
| `04-api/erreurs.md` | Catalogue complet `ERR-xxx` : code, statut HTTP, situation, **message français destiné à l'utilisateur**, action proposée, écran concerné. ~60 entrées. Inclut les cas des sources : `KIT_CODE_INVALID_OR_USED`, `PARENT_APPROVAL_REQUIRED`, `USERNAME_TAKEN`, `PAYMENT_FAILED{reason}`, `OUT_OF_STOCK`, `CONSENT_REFUSED`, `IMPORT_LINE_ERROR`… | 300 |
| `04-api/openapi.yaml` | Le contrat complet : ~90 opérations, tous les schémas, tous les codes d'erreur, exemples de requête et de réponse. **Doit valider** (spectral / redocly). | ~2500 |
| `04-api/domaines/auth.md` | Les 7 opérations d'authentification. Par persona. Sessions, 2FA admin. | 150 |
| `04-api/domaines/inscription-consentement.md` | ~11 opérations. Le flux asynchrone complet, le polling, le refus motivé, le délai d'ADR-0005. | 250 |
| `04-api/domaines/catalogue.md` | Catalogue, détail, inscription, souhaits, arbre de progression. | 180 |
| `04-api/domaines/achat.md` | Kit Code, achat, intents de paiement, webhooks, détour parent. Le plus délicat. | 250 |
| `04-api/domaines/pedagogie.md` | Projets, niveaux, missions, quiz, tentatives, badges, certification, progression. Les seuils 70/80 et les bandes d'ADR-0008 côté serveur. | 250 |
| `04-api/domaines/boutique.md` | Kits, panier, commandes, livraison, suivi, alerte de réapprovisionnement, factures. | 200 |
| `04-api/domaines/parent.md` | Enfants, ajout, édition, suppression, **réinitialisation du mot de passe enfant** (§8.9, aujourd'hui absent de l'UI), rapport hebdomadaire, approbations en attente. | 200 |
| `04-api/domaines/enseignant.md` | Classes, apprenants, **import par lot avec erreurs par ligne** (aujourd'hui non conçu), commentaires, évaluations, parcours encadrés. | 200 |
| `04-api/domaines/evenements.md` | Events, **fiche détaillée (à créer)**, candidatures apprenant et parent, consentement < 16 ans. | 150 |
| `04-api/domaines/admin.md` | Vue d'ensemble, 30 KPI, rapports, saisie manuelle, export, utilisateurs, modération, contenu, commandes, paiements, events, **RBAC réel**, paramètres. | 300 |
| `04-api/domaines/transverse.md` | Notifications, préférences, adresse de livraison, moyen de paiement, suppression de compte. | 150 |
| `04-api/INDEX.md` | Table de toutes les opérations : méthode, chemin, domaine, rôles autorisés, écrans appelants, règles appliquées. **C'est la table de jointure API ↔ écrans.** | 250 |

### 2.4 Règle de complétude

Chaque opération doit porter, dans son fichier de domaine :

| Section | Obligatoire |
| --- | --- |
| Intention | ✅ |
| Rôles autorisés | ✅ (renvoi à la matrice RBAC) |
| Requête : schéma + validation | ✅ |
| Réponse 2xx : schéma + exemple | ✅ |
| Erreurs : codes `ERR-xxx` possibles | ✅ |
| Règles métier appliquées (`RM-xx`) | ✅ |
| Écrans appelants | ✅ |
| Effets de bord (notification, audit, webhook) | ✅ |
| Idempotence / concurrence | si écriture |

### 2.5 Critères d'acceptation

- [ ] `openapi.yaml` valide sans erreur
- [ ] Les ~90 endpoints du §7 des sources sont tous présents, plus ceux nés des ADR
- [ ] Tout endpoint cité dans une fiche écran (lot 4) existe dans `openapi.yaml` — et réciproquement
- [ ] Chaque code d'erreur a un message français prêt à afficher
- [ ] Chaque écriture sensible (paiement, consentement, suppression) documente son idempotence
- [ ] `INDEX.md` permet de partir d'un écran et de trouver ses endpoints, et l'inverse

### 2.6 Prompt d'exécution

```
Tu exécutes le Lot 3b du plan de documentation Steamy : le contrat d'API.

Prérequis : docs/02-architecture/ et docs/01-produit/regles-metier.md sont écrits.

Lis : docs/_sources/SPEC-TECHNIQUE.md §7, docs/02-architecture/modele-de-donnees.md,
autorisation-et-rbac.md, paiement-mobile-money.md, consentement-parental.md,
docs/01-produit/regles-metier.md.

Écris les 15 fichiers de docs/04-api/ décrits en PLAN-02 §2.3.

Ordre de travail : conventions.md → erreurs.md → les 11 fichiers de domaine →
openapi.yaml (dérivé des fichiers de domaine, pas l'inverse) → INDEX.md.

Chaque opération porte les 9 sections obligatoires de PLAN-02 §2.4.

Ajoute les endpoints manquants identifiés dans les sources mais absents du §7 :
- POST /parent/children/:id/reset-password (§8.9 : annoncé partout, jamais exposé)
- GET /events/:id (fiche événement : non conçue mais nécessaire)
- l'import par lot enseignant avec erreurs par ligne (§8.11)
- les tables de référence d'ADR-0007 (pays, indicatifs, réseaux Mobile Money,
  objectifs, avatars, niveaux scolaires, localités qualifiées)
- l'écran Badges d'ADR-0013

openapi.yaml doit valider. Vérifie-le avant de finir.

Contraintes : français pour les descriptions et les messages d'erreur,
anglais pour les noms de champs et de schémas (convention de code).
```

---

## 3. Lot 4a — Fiches fonctionnalité

### 3.1 Objectif

Les écrans décrivent des états ; les fonctionnalités décrivent des **intentions traversantes**. Sans cette couche, un agent qui implémente `WA03` ignore que le paiement a un détour parent en `WA02` et un webhook côté serveur.

### 3.2 Découpage proposé (~45 fiches)

| Famille | Fiches | Écrans couverts |
| --- | ---: | --- |
| **Accès & identité** | 7 · inscription apprenant · inscription parent · consentement parental · connexion (4 modes) · réinitialisation de mot de passe · unicité de l'identifiant · suppression de compte | `W`, `WP`, `WL02`-`WL05`, `WD15`, `WD18` |
| **Onboarding & profil** | 5 · profil apprenant · objectifs · avatar · profil parent · édition de profil | `W11`-`W15`, `WP07`-`WP10`, `WD17`, `WPD10` |
| **Découverte** | 5 · catalogue et filtres · détail de parcours · liste de souhaits · recherche · site public et SEO | `WC`, `WW`, `WL` |
| **Acquisition** | 6 · inscription à un parcours gratuit · achat de parcours payant · Kit Code · paiement Mobile Money · détour parent de paiement · échecs et reprises | `WA`, `WC04`, `WC05` |
| **Pédagogie** | 8 · progression dans un parcours · mission · évaluation formative · évaluation sommative · échec et remédiation · badges · certification · ticket Events | `WJ`, `WC06`, `WD07`, `WD08`, `WD21` |
| **Boutique** | 5 · catalogue de kits · panier · commande invité · livraison et suivi · rupture de stock | `WK`, `WL07`, `WD14` |
| **Encadrement parent** | 5 · tableau de bord parent · gestion des enfants · rapport hebdomadaire · approbations · notifications parent | `WPD` |
| **Encadrement enseignant** | 4 · classes · ajout d'apprenants (unitaire et lot) · suivi des évaluations · commentaires | `WT` |
| **Événements** | 3 · catalogue d'events · candidature apprenant · candidature via parent | `WD10`, `WD11`, `WPD06`, `WPD12`, `WL21` |
| **Administration** | 6 · Impact Tracker · modération et consentements · gestion des utilisateurs · gestion du contenu · paiements et commandes · équipe et RBAC | `WAD` |
| **Transverse** | 4 · notifications et préférences · états transversaux · aide et support · paramètres | `WD04`-`WD06`, `WD12`, `WD13`, `WX` |

### 3.3 Critères d'acceptation

- [ ] Chaque écran des 172 apparaît dans **au moins une** fiche fonctionnalité
- [ ] Chaque règle `RM-xx` apparaît dans au moins une fiche
- [ ] Chaque fiche a un diagramme Mermaid de son parcours nominal
- [ ] Chaque fiche a au moins 3 critères d'acceptation en Gherkin français
- [ ] Chaque fiche liste ses cas limites avec un code d'erreur
- [ ] Les fiches marquées `a-concevoir` sont listées dans `01-produit/perimetre-et-trous.md`

### 3.4 Prompt d'exécution

```
Tu exécutes le Lot 4a du plan de documentation Steamy : les fiches fonctionnalité.

Prérequis : docs/03-design-system/ et docs/04-api/ sont écrits.

Lis : docs/06-ecrans/_modele-fiche-fonctionnalite.md (le gabarit),
docs/01-produit/regles-metier.md, docs/01-produit/parcours-utilisateurs.md,
docs/04-api/INDEX.md, et les 3 docs/_sources/SPEC-ECRANS-*.md.

Écris ~45 fiches dans docs/05-fonctionnalites/, selon le découpage de PLAN-02 §3.2,
plus INDEX.md.

Chaque fiche suit exactement le gabarit : front-matter YAML complet, intention,
périmètre (dedans/dehors), parcours nominal en Mermaid, règles appliquées,
cas limites et erreurs, critères d'acceptation en Gherkin français, trous.

Numérote F-01 à F-45 en suivant l'ordre des familles du §3.2.

Vérifie à la fin, par script ou à la main, que les 172 IDs d'écran apparaissent
chacun dans au moins une fiche, et liste les manquants.

Contraintes : français, ≤250 lignes par fiche, front-matter valide,
aucun endpoint cité qui n'existe pas dans openapi.yaml.
```

---

## 4. Lot 4b — Les 172 fiches écran

### 4.1 Objectif

Rendre chaque écran **individuellement adressable** par un agent. C'est ce qui permet à `/nouvel-ecran WD07` de fonctionner au lot 5.

### 4.2 Découpage en 14 sous-lots

Chaque zone est un sous-lot indépendant, exécutable en parallèle. Ordre recommandé si séquentiel : celui du §9 des sources (dépendances de composants), ici en colonne « Rang ».

| Sous-lot | Zone | Préfixe | Écrans | Source | Rang | Difficulté |
| --- | --- | --- | ---: | --- | ---: | --- |
| 4b-01 | Auth apprenant web | `W` | 17 | SPEC-ECRANS-1 §5.2 | 1 | Moyenne — porte le consentement |
| 4b-02 | Auth parent web | `WP` | 12 | SPEC-ECRANS-1 §5.3 | 2 | Moyenne |
| 4b-03 | Dashboard apprenant | `WD` | 22 | SPEC-ECRANS-2 §5.6 | 3 | **Élevée** — 22 écrans, fournit 6 composants partagés |
| 4b-04 | Catalogue | `WC` | 8 | SPEC-ECRANS-2 §5.7 | 4 | Faible |
| 4b-05 | Achat parcours | `WA` | 7 | SPEC-ECRANS-2 §5.9 | 5 | **Élevée** — Kit Code + Mobile Money + détour parent |
| 4b-06 | Déroulement pédagogique | `WJ` | 11 | SPEC-ECRANS-2 §5.10 | 6 | **Élevée** — cœur produit, seuils, badges, remédiation |
| 4b-07 | Dashboard parent | `WPD` | 14 | SPEC-ECRANS-3 §5.11 | 7 | Moyenne |
| 4b-08 | Boutique de kits | `WK` | 11 | SPEC-ECRANS-3 §5.13 | 8 | Moyenne |
| 4b-09 | Liste de souhaits | `WW` | 3 | SPEC-ECRANS-2 §5.8 | 9 | Faible |
| 4b-10 | Dashboard enseignant | `WT` | 12 | SPEC-ECRANS-3 §5.12 | 10 | Moyenne |
| 4b-11 | Site public | `WL` | 21 | SPEC-ECRANS-1 §5.1 | 11 | Moyenne — SEO, contenu, légal |
| 4b-12 | Back-office admin | `WAD` | 15 | SPEC-ECRANS-3 §5.14 | 12 | **Élevée** — 30 KPI, data-viz, RBAC |
| 4b-13 | États transversaux | `WX` | 3 | SPEC-ECRANS-3 §6 | 13 | Faible — mais **enveloppe, pas pages** |
| 4b-14 | Auth apprenant mobile | `MOB` | 16 | SPEC-ECRANS-1 §5.4 | 14 | **Élevée** — 9 écarts avec le web, dont 3 de modèle |
| | **Total** | | **172** | | | |

### 4.3 Règles spécifiques par zone

| Zone | Règle |
| --- | --- |
| `W` | `W09` et `W17` sont du **code mort** (aucun artboard). Ne pas leur faire de fiche. 17 fiches, pas 19. |
| `WD` | Appliquer ADR-0004 : `WD13` affiche « Identifiant », pas « Téléphone » ; `WD18` perd sa section « changer de numéro ». Documenter l'écart. |
| `WJ` | Créer une fiche **[À CONCEVOIR]** pour la sommative échouée (`WJ08` est calibré pour la formative avec « seuil 70 % » en dur) et pour la vue de synthèse d'un parcours. |
| `WAD` | Esthétique **monochrome** : la famille `--primary-*` y est bannie. Chaque fiche doit le rappeler. Appliquer ADR-0009 pour les KPI indisponibles. |
| `WX` | Ce sont des **enveloppes**, pas des pages. Un seul fichier `etats-transversaux.md` plutôt que 3 fiches, avec les 3 niveaux de chargement (skeleton structurel · loader + message rassurant · pastille inline). |
| `MOB` | Renommer `01`-`16` en `MOB01`-`MOB16` (PLAN-00 §6). Chaque fiche documente l'**écart avec son homologue web** et son statut : à aligner / à concevoir / obsolète. Les 9 écarts du §8.14 sont la grille de lecture. |
| Toutes | Créer les fiches **[À CONCEVOIR]** décidées en ADR-0013 : écran « Badges », entrée « Mes parcours ». Et la fiche événement détaillée. |

### 4.4 Ce qui est ajouté par rapport aux specs sources

Les specs actuelles décrivent le **rendu**. Les fiches doivent ajouter 5 sections qui n'y sont pas :

| Section ajoutée | Pourquoi |
| --- | --- |
| **Données consommées** (champ → endpoint → format → repli) | Sans ça, l'agent invente des noms de champ. |
| **Validations** (client / serveur / message FR / code `ERR-xxx`) | Applique P8 : le serveur fait foi. |
| **États obligatoires** (nominal, vide actionnable, chargement, erreur) | Les sources documentent surtout le nominal. La recette exige les 4. |
| **Accessibilité** (tabulation, ARIA, `aria-live`, contrastes) | Point de départ très bas (§8.13). |
| **Critères d'acceptation** en Gherkin | Rend l'écran testable. |

### 4.5 Critères d'acceptation

- [ ] 172 fiches (moins les 3 `WX` fusionnées, plus les fiches [À CONCEVOIR]) existent
- [ ] Chaque front-matter est valide et complet
- [ ] Chaque écran cite au moins une `RM-xx` ou justifie qu'il n'en applique aucune
- [ ] Chaque écran listant des données cite ses endpoints, et ils existent dans `openapi.yaml`
- [ ] Chaque écran a ses 4 états minimum
- [ ] Chaque écran a au moins 2 critères d'acceptation
- [ ] La micro-copie française est **exacte** (reprise du canvas, pas reformulée)
- [ ] `06-ecrans/INDEX.md` est généré depuis les front-matters et recompte 172

### 4.6 Prompt d'exécution (à lancer une fois par zone)

```
Tu exécutes le sous-lot 4b-<NN> du plan de documentation Steamy :
les fiches écran de la zone <PRÉFIXE> (<N> écrans).

Prérequis : docs/03-design-system/, docs/04-api/ et docs/05-fonctionnalites/
sont écrits.

Lis :
- docs/06-ecrans/_modele-fiche-ecran.md (le gabarit — respecte-le à la lettre)
- docs/_sources/<SPEC-ECRANS-x>.md, section <§x.y> (la description de rendu)
- template/<screens-xxx.jsx> (le code réel — lis-le, les specs résument)
- docs/01-produit/regles-metier.md
- docs/04-api/INDEX.md
- docs/03-design-system/layouts-et-shells.md
- docs/03-design-system/mapping-template-vers-code.md (la liste noire)
- les règles spécifiques de ta zone : PLAN-02 §4.3

Écris une fiche par écran dans docs/06-ecrans/<PRÉFIXE>/<ID>.md.

Les specs sources décrivent le RENDU. Tu dois ajouter les 5 sections manquantes
(PLAN-02 §4.4) : données consommées, validations, états obligatoires,
accessibilité, critères d'acceptation.

Reprends la micro-copie française EXACTEMENT telle qu'elle est dans le canvas —
elle est normative, elle sera copiée dans le code. Ne la reformule pas.

Si une donnée, un endpoint ou une règle te manque : n'invente pas. Marque
[À CONCEVOIR] et ajoute une ligne à docs/01-produit/perimetre-et-trous.md.

Ne porte aucun artefact de la liste noire du mapping.

Contraintes : français, front-matter YAML valide, ≤200 lignes par fiche.
À la fin, liste les IDs traités et les [À CONCEVOIR] remontés.
```

### 4.7 Génération de l'index

Après les 14 sous-lots, un script lit les front-matters et produit `06-ecrans/INDEX.md` :
colonnes ID · nom · zone · cible · shell · fonctionnalité · statut source · epic. Plus le recomptage par zone et le total (172), et la table de correspondance `01`-`16` → `MOB01`-`MOB16`.

Ce script est livré au lot 6 avec le vérificateur de liens.

---

## 5. Récapitulatif du plan 02

| Lot | Fichiers | Jalon | Effort agent estimé |
| --- | ---: | --- | --- |
| 3a · Design system | 9 | J4 | 2 sessions |
| 3b · API + OpenAPI | 15 | J4 | 3 sessions |
| 4a · Fonctionnalités | 46 | — | 3 sessions |
| 4b · 172 écrans | ~178 | — | **14 sessions (1 par zone, parallélisables)** |
| **Total** | **~248 fichiers** | | **~22 sessions** |

> **Conseil d'exécution du 4b** : lancer les 14 zones en parallèle est tentant mais produit de l'hétérogénéité. Faire d'abord **une zone témoin** (`WC`, 8 écrans, faible difficulté), la faire valider, ajuster le gabarit si nécessaire, puis lancer les 13 autres.

**Suite** : [PLAN-03-AGENTS-ET-QUALITE.md](PLAN-03-AGENTS-ET-QUALITE.md) — outillage agentique, qualité, livraison, roadmap.
