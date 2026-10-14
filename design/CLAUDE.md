# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is (read first)

Steamy est une plateforme e-learning de robotique/STEM pour les 10–17 ans en Afrique francophone (Bénin, pays voisins). Ce dépôt **n'est pas une vraie application React** - c'est un **canvas Figma-like statique** où chaque écran est une frame React/JSX rendue en runtime via React 18 + Babel standalone chargés depuis unpkg. Il n'y a **aucun build pipeline** : pas de `package.json`, pas de Vite/webpack, pas de `npm install`. Les fichiers `.jsx` sont chargés tels quels par les HTML via `<script type="text/babel">`.

L'utilisateur final est un designer-développeur. Le rendu cible est un canvas pannable/zoomable affichant des artboards (équivalent des frames Figma) qu'on peut présenter, prototyper et utiliser comme handoff. Tous les écrans sont **en français**.

## Commands

Tout passe par un serveur HTTP local statique (les `.jsx` sont chargés en chemin relatif, donc `file://` ne fonctionne pas).

```bash
# Démarrer le serveur (depuis la racine du projet)
python3 -m http.server 8765

# Ouvrir l'app
http://localhost:8765/                      # ← page d'accueil (2 portes d'entrée)
http://localhost:8765/App.html              # ← runtime unifié, les 172 écrans
http://localhost:8765/design-system.html    # ← showcase du Design System
```

Aucun lint, aucun test, aucun build. Le seul "test" est l'inspection visuelle dans le navigateur (Cmd+Shift+R pour bypasser le cache agressif de Babel standalone).

### Vérification statique (utile avant livraison)

Il n'y a pas de tooling dans le dépôt, mais `@babel/parser` suffit à valider tous les `.jsx` hors navigateur : parse de chaque fichier (erreurs de syntaxe), résolution de chaque composant JSX (références mortes), et unicité des `id` de `DCArtboard` (collisions d'IDs d'écrans). À refaire après tout renommage d'ID en masse.

## High-level architecture

### Runtime model

Chaque HTML charge dans cet ordre strict :

1. React 18 + ReactDOM + Babel standalone (CDN unpkg)
2. `design-canvas.jsx` - fournit `DesignCanvas`, `DCSection`, `DCArtboard` (le pan/zoom + le layout des artboards)
3. **Fichiers Design System** (DS) : `ds-mascot.jsx` → `ds-icons.jsx` → `ds-atoms.jsx` → `ds-complex.jsx` → `ds-charts.jsx`
4. **Fichiers Screens** (`screens-*.jsx`)
5. Un script `<script type="text/babel">` inline qui monte un `<App />` racine

**Ne jamais utiliser `import`/`export`** - ils planteraient silencieusement dans Babel standalone (les erreurs s'écrivent dans la console, la page semble juste cassée).

#### Deux mécanismes de globales, ne pas les confondre

- **Globale explicite** : `window.X = X;` en fin de fichier. Réservé aux **points d'entrée** : les `XxxFlowWeb`, les shells (`WebAppShell`, `WebShell`, `WebTeacherShell`, `WebAdminShell`), `Icon`, `Logo`, `Mascot`, et les primitives de `ds-charts.jsx`. 35 noms au total.
- **Globale implicite** : une déclaration `function X() {}` au niveau racine d'un fichier. `<script type="text/babel">` est compilé comme **script classique** (pas module), donc la déclaration atterrit dans le scope global et devient visible des fichiers chargés ensuite. C'est ainsi que résolvent `Button`, `Field`, `CourseCard`, `DCArtboard` et la majorité du DS.

Conséquence : **les dépendances inter-fichiers ne sont déclarées nulle part et rien ne détecte un mauvais ordre de chargement.** La carte complète est dans `HANDOFF.md` §2. À consulter avant de déplacer, isoler ou supprimer un fichier.

Il existe aussi 15 composants partagés qui vivent dans des fichiers d'écrans au lieu du DS (`WebAppShell`, `SectionHeader`, `SettingsRow`, `StatPill`, `QuizAttemptRow`, `WPDSection`, `WPDInfoCard`, `WANetworkCard`, `WKKitCard`, `Checkbox`, `ChoiceCard`, `GoalChip`, `PwReq`, `UserTypeCard`, `WebShell`). Cela crée 2 cycles (`dashboard-web` ↔ `parent-dashboard-web`, `dashboard-web` ↔ `purchase-web`). Écart assumé pour le prototype, documenté dans `HANDOFF.md` §3 : **ne pas l'aggraver**, tout nouveau composant multi-zone va dans le DS.

### App.html - le runtime unifié

`App.html` est le seul HTML actif au quotidien. Une navigation latérale masquable (`SideNav`, groupée par persona) bascule entre 14 vues exposées en globals. La vue courante est persistée dans `localStorage` sous la clé `steamy-flow`.

| ID vue        | Global utilisé                  | Fichier source                       |
| ------------- | ------------------------------- | ------------------------------------ |
| `dashboard`   | `window.DashboardFlowWeb`       | `screens-dashboard-web.jsx`          |
| `catalog`     | `window.CatalogFlowWeb`         | `screens-catalog-web.jsx`            |
| `wishlist`    | `window.WishlistFlowWeb`        | `screens-wishlist-web.jsx`           |
| `purchase`    | `window.PurchaseFlowWeb`        | `screens-purchase-web.jsx`           |
| `journey`     | `window.JourneyFlowWeb`         | `screens-journey-web.jsx`            |
| `parentdash`  | `window.ParentDashFlowWeb`      | `screens-parent-dashboard-web.jsx`   |
| `teacherdash` | `window.TeacherDashFlowWeb`     | `screens-teacher-dashboard-web.jsx`  |
| `kitshop`     | `window.KitShopFlowWeb`         | `screens-kit-shop-web.jsx`           |
| `admin`       | `window.AdminFlowWeb`           | `screens-admin-web.jsx`              |
| `public`      | `window.PublicFlowWeb`          | `screens-public-web.jsx`             |
| `web`         | `window.AuthFlowWeb`            | `screens-auth-web.jsx`               |
| `parent`      | `window.AuthParentFlowWeb`      | `screens-auth-parent-web.jsx`        |
| `mobile`      | `window.AuthFlow`               | `screens-auth.jsx`                   |
| `states`      | `window.StatesFlowWeb`          | `screens-states-web.jsx`             |

`screens-auth.jsx` historiquement s'auto-montait sur `#root`. Pour permettre la cohabitation dans `App.html`, on a ajouté un garde `if (!window.STEAMY_NO_AUTOMOUNT)` autour de son `ReactDOM.createRoot().render()`. **`App.html` doit déclarer `window.STEAMY_NO_AUTOMOUNT = true` avant de charger `screens-auth.jsx`** sinon double-mount.

### Comment ajouter une nouvelle zone (workflow standard)

1. Créer `screens-<zone>-web.jsx` qui définit les écrans + un `FlowXxxWeb()` qui retourne un `<DesignCanvas>` avec des `<DCSection>` et `<DCArtboard>` ; **ne pas auto-mounter**
2. Exposer en fin de fichier : `window.XxxFlowWeb = XxxFlowWeb;`
3. Dans `App.html` : ajouter le `<script type="text/babel" src="screens-xxx-web.jsx"></script>` après les autres screens, ajouter une entrée dans le tableau `FlowToggle` opts, et ajouter une branche dans le ternaire de routing
4. Test : hard-refresh navigateur, basculer le toggle

### Conventions d'écrans

- **Mobile** : 360×760. IDs d'artboard `01`, `02`, … ; fonctions préfixées `S` (`S01_Splash`). Wrapper layout : `<Phone>` + `<StatusBar>` + `<TopBar>` + `<CTA>` (définis dans `screens-auth.jsx`).
- **Web** : 1240×760. **Un préfixe par zone, unique dans tout le dépôt.** Wrapper layout post-login : `<WebAppShell>` (défini dans `screens-dashboard-web.jsx`, exposé sur `window`). Wrapper pré-login : `<WebShell>` (défini dans `screens-auth-web.jsx`, split brand/form). Shells dédiés : `<WebTeacherShell>`, `<WebAdminShell>`.
- Chaque écran = une fonction React autonome, p.ex. `function WC04_Free()`.
- Le rendu sur canvas : `<DCArtboard id="WC04" label="WC04 · Gratuit" width={1240} height={760} style={catWebStyle}><WC04_Free /></DCArtboard>`.

#### Table des préfixes (⚠️ ne jamais réutiliser un préfixe)

| Préfixe | Zone | Fichier | Écrans |
| ------- | ---- | ------- | ------ |
| `WL`  | Site public pré-login   | `screens-public-web.jsx`            | 21 |
| `W`   | Auth apprenant web      | `screens-auth-web.jsx`              | 17 |
| `WP`  | Auth parent web         | `screens-auth-parent-web.jsx`       | 12 |
| `01`-`16` | Auth apprenant mobile | `screens-auth.jsx`                | 16 |
| `WD`  | Dashboard apprenant     | `screens-dashboard-web.jsx`         | 22 |
| `WC`  | Catalogue               | `screens-catalog-web.jsx`           | 8  |
| `WW`  | Liste de souhaits       | `screens-wishlist-web.jsx`          | 3  |
| `WA`  | Achat parcours          | `screens-purchase-web.jsx`          | 7  |
| `WJ`  | Déroulement pédagogique | `screens-journey-web.jsx`           | 11 |
| `WPD` | Dashboard parent        | `screens-parent-dashboard-web.jsx`  | 14 |
| `WT`  | Dashboard enseignant    | `screens-teacher-dashboard-web.jsx` | 12 |
| `WK`  | Boutique de kits        | `screens-kit-shop-web.jsx`          | 11 |
| `WAD` | Back-office admin       | `screens-admin-web.jsx`             | 15 |
| `WX`  | États transversaux      | `screens-states-web.jsx`            | 3  |

**Total : 172 écrans, 172 IDs uniques.** L'admin utilisait `WA` à l'origine, en collision avec l'achat de parcours ; renommé `WAD` en août 2026. Après tout ajout ou renommage en masse, revérifier l'unicité (voir « Vérification statique »).

### Design System (`ds-*.jsx`)

| Fichier          | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Composants clés exposés |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `ds-tokens.css`  | Tokens CSS : `--primary-*`, `--amber-*`, `--ink-*`, `--success-*`, `--error-*`, `--cat-*` (couleurs catégorie), `--sp-*` (espacements 4/8), `--r-*` (radii), `--shadow-*`. **Utiliser exclusivement les vars, jamais de hex en dur** dans les composants.                                                                                                                                                                                            |
| `ds-icons.jsx`   | `Icon({ name, size, color, strokeWidth })` - 30 icônes line outline 24×24. Pour ajouter une icône : ajouter un `case 'xxx': return <svg…>` dans le switch.                                                                                                                                                                                                                                                                                          |
| `ds-mascot.jsx`  | `Mascot({ pose, size, hue })` - robot "Zeti", 6 poses : `idle`/`wave`/`cheer`/`focus`/`sad`/`sleep`. + `Logo({ height, white, style })` - **2 assets** : `assets/steamy_logo.png` (coloré, fond blanc opaque) sur fonds clairs ; `white` charge `assets/logo_landscape_white_tight.png` (blanc, fond transparent) sur fonds foncés. **Pas de filtre CSS** (le fond opaque du PNG coloré rendrait un rectangle blanc sous `brightness(0) invert(1)`). |
| `ds-atoms.jsx`   | `Button`, `Field`, `Input`, `PhoneInput`, `PasswordInput`, `OTPInput`, `Badge`, `Tag`, `Avatar`, `Loader`, `Toast`. Style "candy" Duolingo (ombre marquée en bas, press visible). Variantes button : `primary/secondary/amber/outline/ghost/danger` × `sm/md/lg`.                                                                                                                                                                                    |
| `ds-complex.jsx` | `CourseCard`, `ProgressBar`, `ProgressSteps`, `Medal`, `MissionItem` (états `todo/current/done/locked`), `Quiz`, `BottomNav` (5 onglets hardcodés `home/catalog/wishlist/badges/profile`), `Modal`, `NotifItem`.                                                                                                                                                                                                                                     |
| `ds-charts.jsx`  | `Sparkline`, `BarChart`, `DonutChart`, `StatCard`, `DataTable`, `SegmentedControl`. SVG inline fait main (pas de librairie : aucun build). **Monochrome par défaut** (`--ink-*`), la couleur passe par prop. Réservé au back-office admin et aux rapports. Charger après `ds-complex.jsx`.                                                                                                                                                             |
| `ds-canvas.jsx`  | Le **showcase** du DS (sections Identité, Fondations, Atomes, Complexes, Data-viz, Le système au travail). Auto-monté **uniquement** par `design-system.html` - ne pas charger ailleurs. `DesignCanvas`/`DCSection`/`DCArtboard` viennent de `design-canvas.jsx`, pas de ce fichier.                                                                                                                                                                  |

Chaque fichier DS injecte ses styles via un `<style>` créé dynamiquement (`document.getElementById('ds-X-styles')` pour éviter les doublons sur re-load).

### Source-of-truth des user flows

Le dossier `user flows/` contient les diagrammes Mermaid définissant le comportement attendu par zone (par feature). **Avant de designer une nouvelle phase, lire le `.mmd` correspondant** : ils sont nommés par numéro (`1_authentification.mmd`, `2_dashboard_apprenant.mmd`, …) qui mappe les phases de `Steamy_Design_steps.md`.

`Steamy_Design_steps.md` (le SDS) est le **tableau de bord d'avancement** des phases. Il maintient le statut ✅/🔄/⏳ et la roadmap. Ses sections sont mises à jour à chaque livraison.

## Règle critique : Web first, Mobile last

Voir l'encadré ⚠️ en tête de `Steamy_Design_steps.md`. **Les phases P1 à P6 sont d'abord livrées en web 1240×760.** Les versions mobile 360×760 sont obligatoires mais regroupées en **Phase 7 (Parité mobile)**, livrée après que les 6 phases web soient terminées. Exception historique : l'auth apprenant existe déjà en mobile (`screens-auth.jsx`) - ne pas re-faire.

Cela veut dire qu'une demande "ajoute le dashboard parent" se traduit par **fabriquer en web uniquement** pour l'instant. La parité mobile viendra plus tard.

## Product context & feature scope

### Personas (3)

- **Apprenant** (10–17 ans) - l'utilisateur central. Suit des parcours, fait des quiz, gagne des badges et certifications, peut acheter des kits.
- **Parent** - porte d'entrée pour les moins de 16 ans : reçoit les demandes de consentement, valide les paiements, suit la progression de ses enfants, peut gérer plusieurs enfants. Inscription possible soit en autonome soit via invitation envoyée par un enfant.
- **Enseignant** - 3ᵉ persona défini dans `user flows/7_dashboard_enseignant.mmd`, **intégré au SDS en Phase 3b** et livré en web (`screens-teacher-dashboard-web.jsx`, écrans `WT01`–`WT12`, toggle « Enseignant », shell `WebTeacherShell`). Couvre : suivi des parcours encadrés, gestion de classes, ajout d'apprenants (individuel ou import batch), suivi des évaluations formatives/sommatives, commentaires aux apprenants/parents, events & notifications.

### Les 4 piliers produits

1. **Parcours pédagogiques** - hiérarchie : Parcours → Projet → Niveau → Mission. Gratuit ou payant (Mobile Money). Chaque niveau se conclut par une **évaluation formative** (quiz ; score ≥70% pour valider, sinon retour sur concept échoué). Chaque projet par une **sommative** (≥80% pour valider). Récompenses : badges numériques de niveau et de projet, certification PDF téléchargeable en fin de parcours + ticket Steamy Events offert.
2. **Boutique de kits physiques** - kits robotique vendus avec checkout Mobile Money, livraison tracking. Un parcours peut nécessiter un kit : dans ce cas un **Kit Code** (voucher physique livré avec le kit) doit être saisi pour débloquer le contenu - c'est le lien DRM-light entre achat physique et accès digital.
3. **Steamy Events** - challenges, compétitions, ateliers ponctuels. Apprenants postulent ; pour les <16 ans, le parent doit accepter via son dashboard. Statuts : en attente / acceptée / refusée.
4. **Dashboards & notifications** - distincts par persona. Le parent voit la progression de ses enfants, valide les demandes de consentement, traite les notifs paiement/sécurité.

### Business rules transversales (embedded au design)

| Règle                                     | Implication design                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Âge < 16 → parent obligatoire             | Toute action sensible (paiement, suppression compte, données personnelles) doit faire un **détour parent** avec écran d'attente + notification                   |
| Consentement parental asynchrone          | Flow : envoi SMS/notif au numéro parent → écran attente côté enfant → acceptation/refus avec motif côté parent → notif retour à l'enfant. Le refus est terminal. |
| Mobile Money uniquement                   | Pas de champ carte bancaire. Réseaux MTN / Moov / etc. ouest-africains. Le formulaire de paiement = Pays + Réseau + Numéro Mobile Money.                         |
| Kit Code obligatoire si parcours-avec-kit | Écran de saisie code voucher avec validation, erreur explicite "code invalide" + retry + lien "Où trouver le code ?"                                             |
| Connectivité Afrique de l'Ouest           | Prévoir explicitement états **loading** (parfois longs) et **offline** ; messages rassurants pendant les délais ; éviter les requêtes lourdes                    |
| Texte 100% français                       | Aucun string anglais dans l'UI. Inclut copy commerciale, états d'erreur, micro-copy boutons.                                                                     |

### Identity & tone

- Public cible jeune → **tutoiement** systématique, ton décontracté, emojis pour ponctuer
- Mascotte **Zeti** (petit robot) accompagne onboarding, états vides, célébrations - 6 poses : `idle/wave/cheer/focus/sad/sleep`
- Esthétique **candy "Duolingo-inspired"** : boutons à ombre marquée vers le bas, press visible, animations success/failure expressives
- Logo officiel gradient orange-magenta + tagline "**Nous formons les inventeurs de demain**" (visible sous le wordmark dans `assets/steamy_logo.png`)
- Couleur primaire : magenta `--primary-500` (`#9E1B9A`), la couleur du logo. Le violet `#5B3FE0` ne sert plus qu'à `--cat-robotique` (arbitrage C1, `docs/alignement/ARBITRAGES.md`)

### Reference user flows (source-of-truth)

Tout flow nouveau ou modifié doit d'abord être lu depuis `user flows/*.mmd` (diagrammes Mermaid). Mapping vers les phases :

| Fichier                      | Couvre                                     | Phase SDS         |
| ---------------------------- | ------------------------------------------ | ----------------- |
| `0_steamy_full_flow.mmd`     | Master flow inter-zones                    | référence globale |
| `1_authentification.mmd`     | Auth + onboarding apprenant & parent       | P1                |
| `2_dashboard_apprenant.mmd`  | Menu apprenant, paramètres, navigation     | P2                |
| `3_dashboard_parent.mmd`     | Dashboard parent, gestion enfants          | P3                |
| `4_boutique_kit.mmd`         | Catalogue kits, panier, livraison          | P5                |
| `5_achat_parcours.mmd`       | Achat parcours (gratuit/payant + Kit Code) | P4                |
| `6_deroulement_parcours.mmd` | Flow pédagogique complet                   | P6                |
| `7_dashboard_enseignant.mmd` | Dashboard enseignant                       | P3b               |

**`Steamy_Design_steps.md` (SDS)** est le tableau de bord vivant des phases (statuts ✅/🔄/⏳, périmètre par zone, reste à faire). Toujours s'y référer **avant** de commencer un nouveau travail pour éviter de re-faire ce qui est déjà livré ou de devancer une dépendance.

### État actuel d'avancement (snapshot - voir SDS pour à jour)

- **P0 Design System** ✅ (+ `ds-charts.jsx` et sa section Data-viz au showcase)
- **P1 Auth** ✅ : Apprenant web+mobile · Parent web · Reset MDP · Site public `WL01`-`WL21`
- **P2 Dashboard Apprenant** ✅ : 22 écrans · pages légales ⏳
- **P3 Dashboard Parent** ✅ : 14 écrans
- **P3b Dashboard Enseignant** ✅ : 12 écrans
- **P4 Achat parcours** ✅ : Kit Code + paiement Mobile Money + états d'échec
- **P5 Boutique de Kit** ✅ : 11 écrans (catalogue → suivi, + vide/stock épuisé)
- **P6 Déroulement parcours** 🔄 : projet→niveau→mission→formative→sommative→badges→certif ✅ · vue résumé exhaustive ⏳
- **P7 Parité mobile** 🔄 : Auth apprenant ✅ (mais **divergente** du web) · les 156 autres écrans ⏳
- **P8 Handoff** ✅ : `README.md` + `HANDOFF.md`, dépôt assaini, IDs dédupliqués
- **P9 Espace Admin & Impact Tracker** 🔄 : 15 écrans `WAD01`-`WAD15` ✅ · `.mmd` de référence ⏳

## Conventions visuelles & identité

- Logo officiel : `assets/steamy_logo.png` (PNG 995×263, gradient orange-magenta + wordmark "steamy" + tagline). Toujours via `<Logo height={…} />`, jamais en re-rendant le wordmark en texte.
- Couleur primaire : magenta `--primary-500` (`#9E1B9A`), la même que le logo. Ne jamais coder l'ancien violet en dur (`rgba(91,63,224,…)`).
- Deux assets PNG via `<Logo>` : `steamy_logo.png` (coloré, fond opaque → fonds clairs) et `logo_landscape_white_tight.png` (blanc, transparent → fonds foncés via prop `white`). **Ne pas réintroduire de filtre `brightness(0) invert(1)`** : le fond opaque du logo coloré donnerait un rectangle blanc. Le `logo_landscape_white.png` brut (carré, 78% de padding) ne doit pas être utilisé directement - d'où le `_tight` recadré.
- Chaque sous-page d'app utilise `<WebAppShell active="xxx" headerTitle="…" headerSearch={…} notifDot={…}>` avec `active` parmi `home`/`catalog`/`wishlist`/`badges`/`profile`. Les sous-routes d'une zone (ex : notifs vues depuis le dashboard) gardent l'`active` du parent.

## Workflow d'itération (important)

1. **Avant tout travail créatif** (nouvelle zone, nouveau parcours), invoquer la skill `brainstorming` (présenter design en sections, valider, écrire plan, exécuter). Ce projet a un historique de plans incrémentaux et le workflow brainstorming est respecté.
2. **Plan file** : les plans approuvés sont écrits dans `~/.claude/plans/ce-projet-vise-distributed-pascal.md` (auto-géré par plan mode). Ce fichier est **réécrit à chaque nouvelle livraison** - il représente la livraison courante, pas l'historique.
3. Les modifications cosmétiques (1 ligne CSS, fix de hover, etc.) ne déclenchent pas le workflow plan/brainstorm - éditer directement.
4. **Cache Babel agressif** : après modification d'un `.jsx`, l'utilisateur doit hard-refresh (Cmd+Shift+R) sinon l'ancienne version reste. Le réflexe à mentionner.
5. **Versioning** : le dépôt est désormais sous Git, qui porte l'historique. La convention historique de snapshot manuel dans `_versions/` avant édition n'est plus nécessaire pour tracer les changements - `_versions/` est gitignoré et ne contient que l'antériorité pré-Git. Pour une refonte lourde d'un écran existant, préférer une branche.

## Pièges connus

- **CSS `transform` mono-valeur** : si un élément utilise `transform: translate(-50%, -50%)` pour centrer et qu'un hover applique `transform: scale(1.x)`, le translate est perdu. Toujours combiner : `transform: translate(-50%, -50%) scale(1.x);`.
- **Position sticky en grid** : pour qu'une carte en `position: sticky` colle vraiment dans une grille (`EnrollCard` du catalogue), le parent grid doit avoir `align-items: flex-start`. Sans ça, les items s'étirent à la hauteur du plus grand et sticky n'a aucun effet.
- **Babel standalone échec silencieux** : une erreur de syntaxe JSX dans un fichier n'apparaît qu'en console, la page rend partiellement. Si un écran ne s'affiche pas, ouvrir la console avant de chercher ailleurs.
- **`window.Logo` vs local `Logo`** : `ds-canvas.jsx` définissait historiquement une fonction `Logo` locale qui shadowait la globale. Ce conflit est résolu (fonction locale supprimée) ; à garder en tête si l'on rétablit un composant local du même nom.
- **Chemins d'assets relatifs** : `<Logo>` charge `assets/steamy_logo.png` en chemin relatif. Fonctionne tant que les HTML sont à la racine. Si on déplace ou héberge sous sous-chemin, repenser la stratégie.

## Fichiers à éviter de modifier sans raison

- `README.md` et `HANDOFF.md` - documents de handoff destinés au développeur. Les mettre à jour si le périmètre change (nouveaux écrans, nouveaux IDs, composants promus dans le DS), mais ne pas les traiter comme des brouillons.
- Le `BottomNav` hardcodé dans `ds-complex.jsx` - ses 5 onglets sont des constantes design.
- `index.html` / `screens-welcome-web.jsx` - page d'accueil du dépôt, pas un écran produit. Ses deux liens pointent vers `App.html` et `design-system.html` : à mettre à jour si un fichier est renommé.

### Historique de nettoyage (août 2026)

Retirés du dépôt lors du handoff, archivés dans `_versions/_removed-from-handoff-20260803/` :

- `Auth Onboarding.html` - wrapper legacy qui ne rendait que l'auth mobile (`AuthFlowWeb` était chargé mais jamais monté). Remplacé par les vues « Auth · Web » / « Auth · Mobile » de `App.html`.
- `speo.md` - brief d'un **autre projet** (Spéo, livraison Europe→Afrique), sans rapport avec Steamy.
- `temp/` - payloads JSON résiduels.
- `.claudeignore` - devenu inutile (il ne masquait que les fichiers ci-dessus).

`Design System.html` a été renommé **`design-system.html`** (les espaces dans les noms de fichiers posent problème en URL, en shell et en CI).

### Fichiers présents sur disque mais gitignorés

Ces fichiers **restent utilisables normalement en local** (les lire, s'y référer, les mettre à jour), mais ne partent pas dans le dépôt remis au développeur :

| Chemin | Raison |
| ------ | ------ |
| `_versions/` | Historique de design local, antériorité pré-Git |
| `Steamy_site_map.pdf` | Référence lourde (3,5 Mo) |
| `Steamy_Design_steps.md` | Document de conception interne |
| `user flows/` | Diagrammes Mermaid, documents de conception internes |
| `.claude/settings.local.json` | Réglages d'outillage locaux |

⚠️ **Conséquence à ne pas perdre de vue** : `README.md` et `HANDOFF.md` ne doivent **jamais** renvoyer le développeur vers ces chemins comme s'il les avait. Le SDS et les `.mmd` y sont présentés comme des **documents à réclamer au designer** (README §1). Si l'on ajoute une référence à un `.mmd` dans la doc de handoff, la formuler ainsi.

Le SDS reste la source de vérité de l'avancement **pour le designer et les agents**, et `user flows/*.mmd` la source de vérité du comportement : continuer à les lire et à les tenir à jour comme avant.
