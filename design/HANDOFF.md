# Notes d'implémentation

Complément technique au [README](README.md). À lire avant de commencer une zone.

**Sommaire**

1. [Ce qui est réellement livré](#1-ce-qui-est-réellement-livré)
2. [Dépendances entre fichiers](#2-dépendances-entre-fichiers)
3. [Composants à promouvoir dans le design system](#3-composants-à-promouvoir-dans-le-design-system)
4. [Inventaire des 172 écrans](#4-inventaire-des-172-écrans)
5. [Règles métier à porter dans le code](#5-règles-métier-à-porter-dans-le-code)
6. [Trous connus](#6-trous-connus)
7. [Recommandations techniques](#7-recommandations-techniques)

---

## 1. Ce qui est réellement livré

| | |
| --- | --- |
| Écrans de référence | **172**, tous en français |
| Cible | **Web 1240×760** pour 156 écrans · **mobile 360×760** pour 16 (auth apprenant uniquement) |
| Design system | 6 fichiers, ~50 composants, tokens CSS complets |
| Spécifications comportementales | 8 diagrammes Mermaid, **hors dépôt** - à réclamer au designer (voir README §1) |
| Données | **toutes en dur.** Aucune API, aucun état persisté, aucune validation réelle |
| Interactivité | démonstrative. Certains écrans ont un état local React (dropdown ouvert, onglet actif), la plupart sont statiques |

**Un écran = une fonction React autonome** rendue dans un `<DCArtboard>`. Il n'y a **pas de navigation entre écrans** : chaque état est un artboard distinct posé sur le canvas. C'est voulu, c'est le modèle Figma.

Concrètement : `WA04 · Paiement en cours` et `WA05 · Paiement réussi` sont deux artboards indépendants, pas deux états d'un même composant.

⚠️ **L'enchaînement entre les écrans n'est nulle part dans ce dépôt.** Il est décrit dans les 8 diagrammes Mermaid `user flows/*.mmd`, qui sont **volontairement hors dépôt**. Les réclamer au designer avant de commencer une zone : sans eux, tu disposes de 172 états figés et d'aucune logique de navigation.

---

## 2. Dépendances entre fichiers

Aucun `import`. Tout repose sur des **globales implicites** (voir README, « Contrat de chargement »). Rien ne déclare ni ne vérifie ces liens.

### Ce que chaque fichier d'écrans consomme ailleurs

| Fichier | Dépend de |
| --- | --- |
| `screens-admin-web.jsx` | `ds-*` · `ds-charts` · **`screens-dashboard-web`** (`SettingsRow`) |
| `screens-auth-parent-web.jsx` | `ds-*` · **`screens-auth-web`** (`WebShell`) · **`screens-auth`** (`Checkbox`, `ChoiceCard`, `GoalChip`, `PwReq`, `UserTypeCard`) |
| `screens-auth-web.jsx` | `ds-*` · **`screens-auth`** (`Checkbox`, `ChoiceCard`, `GoalChip`, `PwReq`, `UserTypeCard`) |
| `screens-auth.jsx` | `ds-*` seulement (aucune dépendance écran) |
| `screens-catalog-web.jsx` | `ds-*` · **`screens-dashboard-web`** (`WebAppShell`) |
| `screens-dashboard-web.jsx` | `ds-*` · **`screens-auth`** (`ChoiceCard`, `GoalChip`, `PwReq`) · **`screens-parent-dashboard-web`** (`WPDSection`, `WPDInfoCard`) · **`screens-purchase-web`** (`WANetworkCard`) |
| `screens-journey-web.jsx` | `ds-*` · **`screens-dashboard-web`** (`WebAppShell`, `SectionHeader`) |
| `screens-kit-shop-web.jsx` | `ds-*` · **`screens-auth`** (`Checkbox`) · **`screens-dashboard-web`** (`WebAppShell`, `SectionHeader`) · **`screens-purchase-web`** (`WANetworkCard`) |
| `screens-parent-dashboard-web.jsx` | `ds-*` · **`screens-auth`** (`ChoiceCard`) · **`screens-dashboard-web`** (`SectionHeader`, `SettingsRow`, `StatPill`, `QuizAttemptRow`) |
| `screens-public-web.jsx` | `ds-*` · **`screens-auth-web`** (`WebShell`) · **`screens-auth`** (`PwReq`) · **`screens-dashboard-web`** (`SectionHeader`) · **`screens-kit-shop-web`** (`WKKitCard`) |
| `screens-purchase-web.jsx` | `ds-*` · **`screens-dashboard-web`** (`WebAppShell`) |
| `screens-states-web.jsx` | `ds-atoms`, `ds-mascot` seulement |
| `screens-teacher-dashboard-web.jsx` | `ds-*` · **`screens-dashboard-web`** (`SectionHeader`, `SettingsRow`, `StatPill`, `QuizAttemptRow`) · **`screens-parent-dashboard-web`** (`WPDSection`, `WPDInfoCard`) |
| `screens-wishlist-web.jsx` | `ds-*` · **`screens-dashboard-web`** (`WebAppShell`) |

**Deux cycles existent :**

- `screens-dashboard-web` ↔ `screens-parent-dashboard-web`
- `screens-dashboard-web` ↔ `screens-purchase-web`

Ils ne cassent rien ici, parce que les déclarations `function` sont hoistées au chargement et que l'appel n'a lieu qu'au rendu. **Un portage naïf vers des modules ES produirait un import circulaire.** Il faut casser les cycles en extrayant les composants partagés (section suivante).

### Implication pratique

**Aucun fichier d'écrans ne s'ouvre seul.** Isoler `screens-teacher-dashboard-web.jsx` sans charger `screens-dashboard-web.jsx` et `screens-parent-dashboard-web.jsx` donne 6 composants indéfinis et un écran blanc, sans autre message que la console.

---

## 3. Composants à promouvoir dans le design system

Ces 15 composants sont utilisés par plusieurs zones mais **vivent dans des fichiers d'écrans**. Le cahier des charges impose l'inverse (« tout composant utilisé dans plus d'un flow doit être promu dans le design system »). L'écart est assumé pour le prototype : **à corriger dès la première implémentation.**

| Composant | Défini dans | Consommé par | Nature |
| --- | --- | --- | --- |
| `WebAppShell` | `screens-dashboard-web` | catalog, wishlist, purchase, journey | **Layout** app apprenant (header + nav) |
| `WebShell` | `screens-auth-web` | auth-parent, public | **Layout** pré-login (split marque / formulaire) |
| `SectionHeader` | `screens-dashboard-web` | journey, kit-shop, parent-dash, teacher-dash, public | Titre de section + action |
| `SettingsRow` | `screens-dashboard-web` | admin, parent-dash, teacher-dash | Ligne de réglage + toggle |
| `StatPill` | `screens-dashboard-web` | parent-dash, teacher-dash | Pastille de statistique |
| `QuizAttemptRow` | `screens-dashboard-web` | parent-dash, teacher-dash | Ligne de tentative de quiz |
| `WPDSection` | `screens-parent-dashboard-web` | dashboard, teacher-dash | Bloc de section |
| `WPDInfoCard` | `screens-parent-dashboard-web` | dashboard, teacher-dash | Carte d'informations |
| `WANetworkCard` | `screens-purchase-web` | dashboard, kit-shop | **Sélecteur de réseau Mobile Money** |
| `WKKitCard` | `screens-kit-shop-web` | public | Carte kit |
| `UserTypeCard` | `screens-auth` | auth-web, auth-parent | Choix de persona |
| `ChoiceCard` | `screens-auth` | auth-web, auth-parent, dashboard, parent-dash | Carte de choix |
| `GoalChip` | `screens-auth` | auth-web, auth-parent, dashboard | Chip d'objectif |
| `PwReq` | `screens-auth` | auth-web, auth-parent, dashboard, public | **Règles de mot de passe** |
| `Checkbox` | `screens-auth` | auth-web, auth-parent, kit-shop | Case à cocher |

### Destination suggérée

- **Atomes** (`Checkbox`, `PwReq`, `StatPill`, `GoalChip`) → couche atomes
- **Composés** (`ChoiceCard`, `UserTypeCard`, `SectionHeader`, `SettingsRow`, `QuizAttemptRow`, `WPDSection`, `WPDInfoCard`, `WANetworkCard`, `WKKitCard`) → couche composants
- **Layouts** (`WebAppShell`, `WebShell`) → couche layouts, pas composants

`WANetworkCard` et `PwReq` méritent une attention particulière : ce sont des composants **porteurs de règle métier** (réseaux Mobile Money disponibles, politique de mot de passe). Leur logique doit être centralisée, pas dupliquée.

---

## 4. Inventaire des 172 écrans

Un ID = un écran, unique dans tout le dépôt. C'est le vocabulaire commun : citer l'ID dans les tickets.

> **Note d'historique.** Le back-office admin utilisait initialement le préfixe `WA`, déjà pris par l'achat de parcours. Il a été renommé **`WAD`** (août 2026). Toute référence antérieure à `WA01`-`WA15` désignant un écran admin correspond désormais à `WAD01`-`WAD15`.

### Site public pré-login · `screens-public-web.jsx` · 21 écrans

| ID | Écran |
| --- | --- |
| `WL01` | Accueil |
| `WL02` | Mot de passe oublié |
| `WL03` | Code OTP |
| `WL04` | Nouveau mot de passe |
| `WL05` | Réinitialisé ✓ |
| `WL06` | Projets & Parcours |
| `WL07` | Boutique de kits |
| `WL08` | Ateliers |
| `WL09` | Pages légales |
| `WL10` | À propos |
| `WL11` | Écoles · offre B2B + devis |
| `WL12` | Profil public |
| `WL13` | Défis |
| `WL14` | Classements |
| `WL15` | Tutoriels partagés |
| `WL16` | Catégories |
| `WL17` | Blog |
| `WL18` | Article |
| `WL19` | Communauté |
| `WL20` | Guides gratuits (capture de lead) |
| `WL21` | Événements / calendrier |

### Auth apprenant web · `screens-auth-web.jsx` · 17 écrans

| ID | Écran |
| --- | --- |
| `W01` | Splash |
| `W02` | Accueil |
| `W03` | Type d'utilisateur |
| `W04` | Identité & identifiant |
| `W05` | Âge |
| `W06` | Numéro du parent |
| `W07` | Attente consentement |
| `W08` | Accord reçu |
| `W10` | Mot de passe |
| `W11` | Profil 1 · infos |
| `W12` | Profil 2 · école |
| `W13` | Objectifs |
| `W14` | Avatar |
| `W15` | Bienvenue |
| `W16` | Connexion utilisateur existant |
| `W18` | Consentement refusé (terminal) |
| `W19` | Identifiant déjà utilisé |

> ⚠️ **Code mort à ne pas implémenter.** `W09` (OTP enfant) et `W17` (OTP invalide) ont été **retirés du flux** lors de la refonte « sous-compte parent » : l'apprenant n'a plus de numéro propre, donc plus d'OTP. Les fonctions `W09_OTP()` (`screens-auth-web.jsx:959`) et `W17_OTPError()` (ligne 1722) **existent encore dans le fichier** mais ne sont rendues sur aucun artboard. Elles sont conservées comme trace de l'ancien modèle. Ce sont les **seules** fonctions d'écran orphelines du dépôt : les 172 autres sont toutes rendues.

### Auth parent web · `screens-auth-parent-web.jsx` · 12 écrans

| ID | Écran |
| --- | --- |
| `WP01` | Créer un compte |
| `WP02` | OTP |
| `WP03` | Mot de passe |
| `WP04` | Invitation enfant ? |
| `WP05` | Demande de l'enfant |
| `WP06` | Demande acceptée |
| `WP07` | Profil 1 · localisation |
| `WP08` | Profil 2 · à propos |
| `WP09` | Profil 3 · enfants |
| `WP10` | Bienvenue parent |
| `WP11` | Motifs de refus |
| `WP12` | Refus envoyé |

### Auth apprenant mobile · `screens-auth.jsx` · 16 écrans · 360×760

⚠️ **Divergent du web.** Applique encore l'ancien modèle : numéro de téléphone propre à l'apprenant + OTP. **Le web fait référence.** À réaligner en phase 7.

| ID | Écran |
| --- | --- |
| `01` | Splash |
| `02` | Accueil |
| `03` | Type d'utilisateur |
| `04` | Téléphone & nom |
| `05` | Âge |
| `06` | Numéro parent (< 16 ans) |
| `07` | Attente consentement |
| `08` | Accord reçu |
| `09` | OTP |
| `10` | Mot de passe |
| `11` | Profil 1 · infos |
| `12` | Profil 2 · école |
| `13` | Objectifs |
| `14` | Avatar |
| `15` | Bienvenue |
| `16` | Connexion utilisateur existant |

### Dashboard apprenant · `screens-dashboard-web.jsx` · 22 écrans

| ID | Écran |
| --- | --- |
| `WD01` | Accueil |
| `WD02` | Accueil nouvel utilisateur |
| `WD03` | Chargement |
| `WD04` | Notifications · liste |
| `WD05` | Notifications · vide |
| `WD06` | Notifications · paramètres |
| `WD07` | Tentatives de quiz · liste |
| `WD08` | Tentatives de quiz · détail |
| `WD09` | Tentatives de quiz · vide |
| `WD10` | Steamy Events |
| `WD11` | Demande de participation |
| `WD12` | Aide & support |
| `WD13` | Paramètres (hub) |
| `WD14` | Historique de commande |
| `WD15` | Supprimer le compte |
| `WD16` | Déconnexion (modal partagé) |
| `WD17` | Éditer le profil |
| `WD18` | Modifier la connexion |
| `WD19` | Informations de livraison |
| `WD20` | Informations de paiement |
| `WD21` | Progression & recommandations |
| `WD22` | Infos de mon parent |

### Catalogue · `screens-catalog-web.jsx` · 8 écrans

| ID | Écran |
| --- | --- |
| `WC01` | Par défaut |
| `WC02` | Filtré (Robotique · Débutant) |
| `WC02b` | Dropdown Niveau ouvert |
| `WC03` | Aucun résultat |
| `WC04` | Détail parcours gratuit |
| `WC05` | Détail parcours payant + kit |
| `WC06a` | Vue inscrit · projets repliés |
| `WC06b` | Vue inscrit · projet 2 déplié |

### Liste de souhaits · `screens-wishlist-web.jsx` · 3 écrans

| ID | Écran |
| --- | --- |
| `WW01` | Avec items |
| `WW02` | Vide |
| `WW03` | Toast après retrait |

### Achat parcours · `screens-purchase-web.jsx` · 7 écrans

| ID | Écran |
| --- | --- |
| `WA01` | Saisie du Kit Code |
| `WA02` | Paiement par le parent |
| `WA03` | Formulaire de paiement Mobile Money |
| `WA04` | Paiement en cours |
| `WA05` | Paiement réussi |
| `WA06` | Kit Code invalide |
| `WA07` | Paiement échoué |

### Déroulement pédagogique · `screens-journey-web.jsx` · 11 écrans

| ID | Écran |
| --- | --- |
| `WJ01` | Détail projet |
| `WJ02` | Intro niveau |
| `WJ03` | Contenu mission |
| `WJ04` | Évaluation formative |
| `WJ05` | Revue des résultats |
| `WJ06` | Badge de niveau débloqué |
| `WJ07` | Certification & fin de parcours |
| `WJ08` | Échec d'évaluation |
| `WJ09` | Parcours incomplet |
| `WJ10` | Évaluation sommative |
| `WJ11` | Projet validé + badge de projet |

### Dashboard parent · `screens-parent-dashboard-web.jsx` · 14 écrans

| ID | Écran |
| --- | --- |
| `WPD01` | Accueil parent |
| `WPD02` | Mes enfants |
| `WPD03` | Détail enfant |
| `WPD04` | Ajouter un enfant |
| `WPD05` | Demande de consentement |
| `WPD06` | Steamy Events |
| `WPD07` | Historique de commande |
| `WPD08` | Paramètres parent |
| `WPD09` | Supprimer un enfant |
| `WPD10` | Modifier le profil enfant |
| `WPD11` | Rapport hebdomadaire |
| `WPD12` | Faire participer un enfant |
| `WPD13` | Aide & support |
| `WPD14` | Notifications |

### Dashboard enseignant · `screens-teacher-dashboard-web.jsx` · 12 écrans

| ID | Écran |
| --- | --- |
| `WT01` | Accueil formateur |
| `WT02` | Mes parcours |
| `WT03` | Mes classes |
| `WT04` | Apprenants d'une classe |
| `WT05` | Profil apprenant |
| `WT06` | Ajouter des apprenants (individuel / lot) |
| `WT07` | Suivi des évaluations |
| `WT08` | Paramètres |
| `WT09` | Steamy Events |
| `WT10` | Détail parcours encadré |
| `WT11` | Aide & support |
| `WT12` | Notifications |

### Boutique de kits · `screens-kit-shop-web.jsx` · 11 écrans

| ID | Écran |
| --- | --- |
| `WK01` | Catalogue kits |
| `WK02` | Détail kit |
| `WK03` | Panier |
| `WK04` | Informations invité |
| `WK05` | Livraison |
| `WK06` | Paiement |
| `WK07` | Confirmation & suivi |
| `WK08` | Paiement par le parent |
| `WK09` | Paiement échoué |
| `WK10` | Panier vide |
| `WK11` | Stock épuisé |

### Back-office admin · `screens-admin-web.jsx` · 15 écrans

Esthétique **monochrome** volontaire (tokens `--ink-*`). La famille `--primary-*` est bannie ici : la couleur ne sert qu'aux statuts et aux graphes.

| ID | Écran |
| --- | --- |
| `WAD01` | Vue d'ensemble |
| `WAD02` | Impact Tracker · dashboard KPI |
| `WAD03` | Impact Tracker · détail indicateur |
| `WAD04` | Impact Tracker · rapport trimestriel |
| `WAD05` | Impact Tracker · saisie manuelle |
| `WAD06` | Utilisateurs |
| `WAD07` | Détail utilisateur |
| `WAD08` | Modération & consentements |
| `WAD09` | Contenu / Parcours |
| `WAD10` | Boutique & commandes |
| `WAD11` | Paiements Mobile Money |
| `WAD12` | Steamy Events (modération) |
| `WAD13` | Équipe & rôles (RBAC) |
| `WAD14` | Paramètres généraux |
| `WAD15` | Connexion admin (2FA) |

### États transversaux · `screens-states-web.jsx` · 3 écrans

Réutilisables partout. **Ne pas les traiter comme une zone**, mais comme des états globaux de l'app.

| ID | Écran |
| --- | --- |
| `WX01` | Hors ligne |
| `WX02` | Erreur réseau |
| `WX03` | Chargement |

---

## 5. Règles métier à porter dans le code

Ces règles sont **encodées dans les écrans**, pas dans une spec séparée. Elles doivent devenir des invariants côté serveur, pas seulement des garde-fous d'interface.

### Comptes et consentement

| Règle | Écrans de référence |
| --- | --- |
| Tout apprenant est un **sous-compte rattaché à un parent**, quel que soit son âge | `W04`-`W08`, `WPD04` |
| L'apprenant se connecte par **identifiant + mot de passe** (jamais par téléphone) | `W16` |
| Le parent se connecte par **téléphone + mot de passe** | `W16` |
| Deux points d'entrée à l'inscription : **enfant-initié** (demande au parent) ou **parent-initié** (création directe) | `W06` / `WPD04` |
| Consentement asynchrone : message au parent → attente côté enfant → acceptation ou **refus motivé** → notification retour | `W07`, `W08`, `WP05`, `WP11`, `WP12`, `W18` |
| **Le refus est terminal.** Pas de retry, pas de contournement | `W18` |
| Toute action sensible (paiement, suppression de compte, données personnelles) impose un **détour parent** avec écran d'attente | `WA02`, `WK08`, `WD15` |

### Paiement

| Règle | Écrans de référence |
| --- | --- |
| **Mobile Money uniquement.** Aucun champ de carte bancaire nulle part | `WA03`, `WK06` |
| Formulaire = **Pays + Réseau + Numéro Mobile Money** | `WA03` |
| Réseaux ouest-africains (MTN, Moov…) | `WANetworkCard` |
| L'échec de paiement est un état de premier plan, avec retry | `WA07`, `WK09` |

### Pédagogie

| Règle | Écrans de référence |
| --- | --- |
| Hiérarchie stricte `Parcours → Projet → Niveau → Mission` | `WJ01`-`WJ03` |
| Fin de niveau → **évaluation formative**, seuil **≥ 70 %** | `WJ04`, `WJ05` |
| Fin de projet → **évaluation sommative**, seuil **≥ 80 %** | `WJ10`, `WJ11` |
| Échec → retour sur le concept échoué, pas blocage sec | `WJ08` |
| Récompenses : badge de niveau, badge de projet, **certification PDF** en fin de parcours + ticket Steamy Events offert | `WJ06`, `WJ11`, `WJ07` |

### Kits

| Règle | Écrans de référence |
| --- | --- |
| Un parcours peut exiger un kit physique. Le **Kit Code** (voucher livré avec le kit) débloque le contenu numérique | `WA01` |
| Code invalide → erreur explicite + retry + lien « Où trouver le code ? » | `WA06` |

### Contexte Afrique de l'Ouest

| Règle | Écrans de référence |
| --- | --- |
| Les états **loading** et **offline** sont des livrables, pas des détails | `WX01`-`WX03`, `WD03` |
| Messages rassurants pendant les attentes longues | `WA04`, `WJ04` |
| Éviter les requêtes lourdes, prévoir la dégradation gracieuse | transversal |
| Devise **FCFA** | `WC04`, `WC05`, `WK01` |

### Interface

- **100 % français**, aucune chaîne anglaise. Y compris erreurs et micro-copie.
- **Tutoiement systématique.** Le public a 10-17 ans.
- Toute liste a un **état vide actionnable**, jamais un simple « aucun résultat » : `WD05`, `WD09`, `WW02`, `WC03`, `WK10`.

---

## 6. Trous connus

À ne pas confondre avec des oublis : ce sont des choix de séquencement documentés.

### Non conçu

| Manque | Impact |
| --- | --- |
| **Parité mobile** sur 156 écrans | Seule l'auth apprenant existe en 360×760, et elle est divergente. **Le plus gros reste à faire côté design.** |
| Auth parent mobile (~16 écrans) | Miroir mobile de `WP01`-`WP12` |
| Pages légales apprenant (CGU, mentions, politiques) | Contenu, pas structure : `WL09` donne le gabarit |
| Détail d'un événement (date, lieu, prérequis) | `WD10` liste les events, la fiche détaillée manque |
| Vue résumé exhaustive de tous les projets d'un parcours | `WC06a`/`WC06b` couvrent le cas replié/déplié |
| Diagramme de flow du back-office admin | Le back-office est la **seule zone sans diagramme de référence**, même parmi ceux détenus par le designer |
| Fiche kit publique dédiée, panier/checkout publics | Déjà couverts in-app par `WK01`-`WK11` |

### Conçu mais non branché

Ces écrans montrent des interfaces dont la logique n'existe pas :

- Export PDF / CSV du rapport trimestriel (`WAD04`)
- RBAC réel (`WAD13`)
- `kpiStatus()` : la règle de statut des indicateurs est une baseline à affiner (`WAD02`)
- Import par lot d'apprenants : le cas d'erreur n'est pas conçu (`WT06`)

### Dépendance produit à remonter

Les KPI démographiques de l'Impact Tracker (genre, âge, **zone rurale**, **situation de handicap**) et les **institutions** sont marqués « Indisponibles » dans `WAD02` : **le formulaire d'inscription ne capte pas ces champs.**

Pour les passer en « Auto », il faut ajouter à l'inscription : localité urbain/rural, champ inclusion (opt-in), entité institution. De même, les complétions de parcours ne sont pas mesurées.

C'est une décision produit, pas technique. À trancher avant de figer le schéma de données.

---

## 7. Recommandations techniques

Par ordre de valeur.

### 1. Vendorer les dépendances CDN en local

**Sans connexion, le dépôt ne s'ouvre pas** : ni les écrans, ni le design system. Quatre ressources distantes, pas trois - l'`@import` de polices dans le CSS est facile à oublier :

| Ressource | Version | Chargée depuis |
| --- | --- | --- |
| React | 18.3.1 (build development) | unpkg, `<script>` des HTML |
| ReactDOM | 18.3.1 (build development) | unpkg, `<script>` des HTML |
| Babel standalone | 7.29.0 | unpkg, `<script>` des HTML |
| Nunito + JetBrains Mono | - | Google Fonts, **`@import` en `ds-tokens.css:6`** |

Pour un projet dont une contrainte produit explicite est la connectivité en Afrique de l'Ouest, c'est une ironie coûteuse. Télécharger les 3 bibliothèques dans `vendor/`, les polices dans `assets/fonts/`, puis repointer les `<script src>` **et l'`@import`** en relatif. Les hash SRI épinglés dans les HTML donnent les versions exactes.

Seule **Nunito** est nécessaire au produit : JetBrains Mono ne sert qu'au showcase, Fraunces qu'à la page d'accueil du dépôt.

### 2. Extraire les tokens avant d'écrire du CSS

`ds-tokens.css` est la seule source de vérité chromatique et dimensionnelle. Le convertir en tokens de la stack cible (variables CSS, thème Tailwind, objet JS) **avant** d'implémenter le premier écran. Sinon les valeurs en dur se propagent.

Familles disponibles : `--primary-*`, `--amber-*`, `--ink-*`, `--success-*`, `--error-*`, `--cat-*` (une couleur par catégorie de parcours), `--sp-*` (échelle 4/8), `--r-*`, `--shadow-*`, `--ease-*`.

### 3. Casser les cycles en premier

Extraire les 15 composants de la section 3 vers une vraie couche partagée **avant** de porter les écrans. Faire l'inverse (porter zone par zone) duplique ces composants dans chaque zone et reproduit les cycles.

Ordre suggéré : layouts (`WebAppShell`, `WebShell`) → atomes → composés.

### 4. Arbitrer la double identité chromatique

**Arbitré (C1)** : la primaire est le magenta `#9E1B9A`, la couleur du logo. Le violet `#5B3FE0` ne sert plus qu'à `--cat-robotique`.

### 5. Traiter les états transversaux comme un composant, pas une page

`WX01`-`WX03` (offline, erreur réseau, chargement) sont dessinés comme des écrans parce que le canvas n'a pas d'autre moyen de les montrer. Dans l'implémentation, ce sont des **états d'enveloppe** applicables à n'importe quelle vue.

### 6. Polices

| Police | Portée | À embarquer |
| --- | --- | --- |
| **Nunito** (`--font-sans`) | toute l'interface produit | **oui** |
| **JetBrains Mono** | showcase du design system uniquement | non |
| **Fraunces** italique | page d'accueil de ce dépôt (`index.html`) uniquement | non |

Fraunces et JetBrains Mono ne sont **pas des choix produit** : elles habillent les pages de service de ce dépôt. Ne pas les propager dans l'app.

### 7. Assets

| Asset | Statut |
| --- | --- |
| `steamy_logo.png` | **utilisé** · coloré, fond opaque, fonds clairs |
| `logo_landscape_white_tight.png` | **utilisé** · blanc, transparent, fonds foncés |
| `logo_landscape.svg` | non référencé · **version vectorielle, à préférer en implémentation** |
| `logo_landscape_white.png` | non référencé · non recadré (78 % de padding), **ne pas utiliser** |
| `insta.svg`, `linkedin.svg`, `x.svg` | non référencés · les icônes sociales des écrans sont en SVG inline. Disponibles si besoin |

Les icônes d'interface ne sont pas des fichiers : elles sont dans le `switch` de `ds-icons.jsx` (30 icônes line 24×24). À extraire en composants ou en sprite.
