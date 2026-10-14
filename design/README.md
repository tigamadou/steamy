# Steamy · Référence de design pour l'implémentation

Plateforme e-learning de robotique / STEM pour les 10-17 ans en Afrique francophone (Bénin et pays voisins).

Ce dépôt contient **172 écrans de référence** haute fidélité et le design system complet. C'est la spécification visuelle à partir de laquelle l'application doit être construite.

**Ce README est le document de prise en main.** Pour l'inventaire écran par écran, la carte des dépendances et les règles métier détaillées, voir [HANDOFF.md](HANDOFF.md).

---

## Sommaire

1. [Lis d'abord ceci](#1-lis-dabord-ceci)
2. [Prise en main en 5 minutes](#2-prise-en-main-en-5-minutes)
3. [Naviguer et retrouver un écran](#3-naviguer-et-retrouver-un-écran)
4. [Anatomie d'un fichier d'écrans](#4-anatomie-dun-fichier-décrans)
5. [Comment le runtime fonctionne](#5-comment-le-runtime-fonctionne)
6. [Étapes d'intégration](#6-étapes-dintégration)
7. [Problèmes possibles](#7-problèmes-possibles)
8. [Référence](#8-référence)
9. [Contexte produit et règles métier](#9-contexte-produit-et-règles-métier)
10. [Ce qui n'est pas livré](#10-ce-qui-nest-pas-livré)

---

## 1. Lis d'abord ceci

### Ce dépôt n'est pas une application à reprendre

C'est un **canvas de design façon Figma**, qui se trouve être écrit en React. La ressemblance avec un projet React est un piège.

| | |
| --- | --- |
| Pas de `package.json` | rien à installer, `npm install` n'a aucun sens ici |
| Pas de build (Vite, webpack, Next) | les `.jsx` sont lus tels quels par le navigateur |
| React 18 + Babel standalone via CDN | le JSX est compilé **à l'exécution**, dans la page |
| Pas d'`import` / `export` | tout passe par le scope global (§5) |
| Pas de routeur, pas d'état global, pas d'API | toutes les données sont en dur dans les composants |
| Pas de tests, pas de lint, pas de CI | la validation est visuelle |
| Pas de responsive | deux largeurs fixes : 1240 et 360 |

### Ce qu'on attend de toi

**Lire ces écrans comme une spec, puis les réimplémenter dans une vraie stack.** Relever les composants, les états, les espacements, les copies françaises, les règles métier encodées dans les parcours.

### Ce qu'il ne faut surtout pas faire

- Brancher un backend sur ces fichiers.
- Copier-coller les `.jsx` dans un projet React moderne en espérant que ça compile. Il n'y a aucun `import` : tout casse.
- Traiter un écran comme un composant réutilisable. Un écran est une **maquette**, souvent avec ses données en dur et son CSS local.
- Prendre l'auth mobile comme référence. Elle est divergente (§10).

### Documents à réclamer au designer

Trois documents ne sont **pas dans ce dépôt** et sont nécessaires :

| Document | Pourquoi il te faut |
| --- | --- |
| `user flows/*.mmd` · 8 diagrammes Mermaid | **La seule spécification des enchaînements.** Ce dépôt contient les écrans, pas les transitions entre eux. Sans ces diagrammes tu as 172 images fixes et aucune logique de navigation. |
| `Steamy_Design_steps.md` | Cahier des charges design et avancement détaillé par phase |
| `Steamy_site_map.pdf` | Arborescence du site public (`WL01`-`WL21`) |

**Réclame-les avant de commencer.** Le point sur les user flows est bloquant : voir §6, étape 0.

---

## 2. Prise en main en 5 minutes

### Prérequis

Un navigateur récent et **n'importe quel serveur HTTP statique**. Rien d'autre.

Les `.jsx` sont chargés en chemin relatif, donc **`file://` ne fonctionne pas** : ouvrir `App.html` par double-clic donne une page blanche.

### Lancer

```bash
python3 -m http.server 8000
```

Équivalents si tu préfères :

```bash
npx --yes serve -l 8000 .
```

```bash
php -S localhost:8000
```

Puis ouvrir <http://localhost:8000/> .

### Les trois pages

| URL | Contenu | Quand t'en servir |
| --- | --- | --- |
| `/` | Page d'accueil du dépôt, deux portes d'entrée | Point de départ |
| `/App.html` | **Le canvas principal.** Les 172 écrans, navigation latérale par persona | Tous les jours |
| `/design-system.html` | Showcase du design system : tokens, atomes, composants, data-viz | Quand tu construis un composant |

`App.html` mémorise la dernière vue ouverte dans `localStorage` sous la clé `steamy-flow`.

### Vérifier que tout a bien chargé

Une erreur de syntaxe dans un `.jsx` ne produit **aucun message visible** : la page rend partiellement. Réflexe systématique au premier chargement, dans la console du navigateur :

```js
// Doit renvoyer un tableau vide. Tout nom listé = un fichier qui n'a pas chargé.
['AuthFlow','AuthFlowWeb','AuthParentFlowWeb','PublicFlowWeb','DashboardFlowWeb',
 'CatalogFlowWeb','WishlistFlowWeb','PurchaseFlowWeb','JourneyFlowWeb',
 'ParentDashFlowWeb','TeacherDashFlowWeb','KitShopFlowWeb','AdminFlowWeb',
 'StatesFlowWeb'].filter(f => typeof window[f] !== 'function')
```

Si le tableau est vide et que la console est propre, tout est bon.

---

## 3. Naviguer et retrouver un écran

### Dans le canvas

| Action | Geste |
| --- | --- |
| Se déplacer | molette / trackpad, ou clic-glisser sur le fond |
| Zoomer | `Cmd` (macOS) ou `Ctrl` + molette |
| Changer de zone | bouton **☰ Vues** en haut à gauche |

Chaque écran est un **artboard** étiqueté avec son ID et son nom : `WD13 · Paramètres (hub)`.

### De l'ID au code

Les ID sont le vocabulaire commun. **Cite-les dans les tickets.** Pour passer d'un ID au code, en une commande :

```bash
grep -rn "function WD13" screens-*.jsx
```

La convention de nommage est `<ID>_<Intention>`, donc l'ID suffit à trouver la fonction : ici `WD13_Settings` dans `screens-dashboard-web.jsx`.

Pour voir l'artboard lui-même (dimensions, libellé, style appliqué), le bloc `<DCArtboard>` s'étale sur plusieurs lignes :

```bash
grep -rn -A6 'id="WD13"' screens-*.jsx
```

### Table des préfixes

Un préfixe par zone, **unique dans tout le dépôt**. 172 ID pour 172 écrans, aucun doublon.

| Préfixe | Zone | Fichier | Écrans |
| --- | --- | --- | --- |
| `WL` | Site public pré-login | `screens-public-web.jsx` | 21 |
| `W` | Auth apprenant · web | `screens-auth-web.jsx` | 17 |
| `WP` | Auth parent · web | `screens-auth-parent-web.jsx` | 12 |
| `01`-`16` | Auth apprenant · **mobile** | `screens-auth.jsx` | 16 |
| `WD` | Dashboard apprenant | `screens-dashboard-web.jsx` | 22 |
| `WC` | Catalogue | `screens-catalog-web.jsx` | 8 |
| `WW` | Liste de souhaits | `screens-wishlist-web.jsx` | 3 |
| `WA` | Achat parcours | `screens-purchase-web.jsx` | 7 |
| `WJ` | Déroulement pédagogique | `screens-journey-web.jsx` | 11 |
| `WPD` | Dashboard parent | `screens-parent-dashboard-web.jsx` | 14 |
| `WT` | Dashboard enseignant | `screens-teacher-dashboard-web.jsx` | 12 |
| `WK` | Boutique de kits | `screens-kit-shop-web.jsx` | 11 |
| `WAD` | Back-office admin | `screens-admin-web.jsx` | 15 |
| `WX` | États transversaux | `screens-states-web.jsx` | 3 |

> **Piège historique.** Le back-office admin utilisait `WA`, déjà pris par l'achat de parcours : 7 ID désignaient deux écrans différents. Renommé **`WAD`** en août 2026. Si un document antérieur mentionne `WA01`-`WA15` pour l'admin, lire `WAD01`-`WAD15`.

Inventaire complet des 172 écrans avec leur libellé : [HANDOFF.md §4](HANDOFF.md#4-inventaire-des-172-écrans).

---

## 4. Anatomie d'un fichier d'écrans

Tous les `screens-*.jsx` suivent la même structure. Exemple sur le plus court, `screens-wishlist-web.jsx` (3 écrans) :

```jsx
// 1. EN-TÊTE : ce que le fichier contient et ce dont il dépend. À lire en premier.
// screens-wishlist-web.jsx - Mes souhaits, version web (1240×760).
// 3 écrans : avec items · vide · toast après retrait.
// Réutilise WebAppShell + CourseCard + Toast (DS), expose window.WishlistFlowWeb.

// 2. DIMENSIONS de la zone. Toujours 1240×760 en web, 360×760 en mobile.
const WISH_W = 1240, WISH_H = 760;

// 3. CSS LOCAL, injecté à l'exécution dans un <style>. Utilise les tokens.
const wishlistWeb_styles = `
.wish-band { padding: 16px 20px; background: var(--ink-50); border-radius: 14px; }
...`;

// 4. DONNÉES EN DUR. Ce sont des mocks de présentation, pas un modèle de données.
const WISHLIST_FULL = [ { title: "Engrenages & mécanismes", level: "Débutant", free: true, ... } ];

// 5. HELPERS LOCAUX au fichier.
function WishHeader({ count }) { ... }

// 6. UN ÉCRAN = UNE FONCTION, nommée <ID>_<Intention>.
function WW01_List() { ... }
function WW02_Empty() { ... }
function WW03_Toast() { ... }

// 7. LE FLOW : assemble les écrans en artboards sur le canvas.
function WishlistFlowWeb() {
  return (
    <DesignCanvas>
      <DCSection id="wishlist" title="Mes souhaits" subtitle="…">
        <DCArtboard id="WW01" label="WW01 · Avec items" width={WISH_W} height={WISH_H}>
          <WW01_List />
        </DCArtboard>
        ...
      </DCSection>
    </DesignCanvas>
  );
}

// 8. EXPOSITION au routing de App.html.
window.WishlistFlowWeb = WishlistFlowWeb;
```

### Ce qu'il faut en retenir

- **L'en-tête (bloc 1) déclare les dépendances.** C'est la seule documentation de ce que le fichier consomme ailleurs. Fiable, mais pas exhaustive : la carte vérifiée est dans [HANDOFF.md §2](HANDOFF.md#2-dépendances-entre-fichiers).
- **Le CSS local (bloc 3) est du jetable.** Il existe parce qu'il n'y a pas de solution de styling. Ne le porte pas tel quel : les classes `.wish-band` n'ont pas vocation à survivre. En revanche, **les valeurs comptent** : espacements, rayons, tokens utilisés.
- **Les données (bloc 4) ne sont pas un schéma.** `WISHLIST_FULL` est une liste de props pour faire jolie. La modélisation réelle se déduit des user flows, pas d'ici.
- **Un écran par état.** `WW01`, `WW02` et `WW03` sont trois artboards indépendants, pas trois états d'un même composant. C'est la conséquence du modèle Figma : le canvas n'a pas d'autre moyen de montrer un état.

Ce dernier point est le plus important pour ton travail : **la séquence entre les états n'est pas dans ce dépôt.** Elle est dans les diagrammes `.mmd` (§1).

---

## 5. Comment le runtime fonctionne

Utile pour comprendre les messages d'erreur, et pour savoir pourquoi tu ne peux pas isoler un fichier.

### Ordre de chargement

Chaque HTML charge les scripts dans un **ordre strict** :

```
1. React 18 + ReactDOM + Babel standalone        CDN unpkg, hash SRI épinglés
2. design-canvas.jsx                             DesignCanvas, DCSection, DCArtboard
3. ds-mascot → ds-icons → ds-atoms → ds-complex → ds-charts
4. screens-*.jsx                                 les écrans
5. script inline                                 monte <App /> sur #root
```

### Pourquoi ça marche sans imports

`<script type="text/babel">` est compilé comme **script classique**, pas comme module. Une déclaration `function Button() {}` au niveau racine d'un fichier devient donc une **globale implicite**, visible de tous les fichiers chargés ensuite.

Il y a deux mécanismes, à ne pas confondre :

| Mécanisme | Comment | Qui |
| --- | --- | --- |
| Globale **explicite** | `window.X = X;` en fin de fichier | 35 points d'entrée : les `XxxFlowWeb`, les shells, `Icon`, `Logo`, `Mascot`, les primitives de charts |
| Globale **implicite** | `function X() {}` au niveau racine | tout le reste : `Button`, `Field`, `CourseCard`, `DCArtboard`… |

**Conséquence pratique : aucun fichier d'écrans ne s'ouvre seul.** Rien ne déclare ces liens, rien ne détecte un mauvais ordre. Charger `screens-teacher-dashboard-web.jsx` sans `screens-dashboard-web.jsx` ni `screens-parent-dashboard-web.jsx` donne 6 composants indéfinis et une page blanche, sans autre trace que la console.

Deux cycles existent (`dashboard-web` ↔ `parent-dashboard-web`, `dashboard-web` ↔ `purchase-web`). Ils sont inoffensifs ici, parce que les `function` sont hoistées au chargement et appelées seulement au rendu. **Ils deviendront de vrais imports circulaires si tu portes le code tel quel vers des modules ES.** Il faut les casser d'abord : voir §6, étape 3.

### Ne jamais introduire `import` / `export`

Babel standalone les accepte syntaxiquement mais le résultat casse silencieusement. Si tu modifies un `.jsx` de ce dépôt (pour annoter, tester une variante), reste dans le style existant.

---

## 6. Étapes d'intégration

Ordre recommandé. Chaque étape suppose la précédente faite.

### Étape 0 · Rassembler les entrées et cadrer

- [ ] Réclamer les **user flows `.mmd`** au designer. **Sans eux, ne commence pas** : tu implémenterais des écrans sans savoir ce qui mène de l'un à l'autre, et tu le découvrirais en recette.
- [ ] Réclamer `Steamy_Design_steps.md` et `Steamy_site_map.pdf`.
- [ ] Parcourir les 14 vues de `App.html` de bout en bout, une fois, sans rien coder. Compte 1 à 2 heures. L'objectif est de repérer les motifs récurrents, pas de mémoriser.
- [ ] Faire trancher les **deux décisions produit ouvertes** : l'identité chromatique (§7) et les champs d'inscription manquants pour l'Impact Tracker ([HANDOFF.md §6](HANDOFF.md#6-trous-connus)). Les deux impactent le schéma de données ou le thème.

### Étape 1 · Porter les tokens

`ds-tokens.css` est la seule source de vérité chromatique et dimensionnelle. **Le convertir avant d'écrire la première ligne de composant**, sinon les valeurs en dur se propagent partout et ne reviennent jamais.

Familles à porter : `--primary-*`, `--amber-*`, `--ink-*`, `--success-*`, `--error-*`, `--cat-*` (une couleur par catégorie de parcours), `--sp-*` (échelle 4/8), `--r-*` (rayons), `--shadow-*`, `--ease-*`.

- [ ] Convertir vers le format de la stack cible (variables CSS, thème Tailwind, objet de thème…)
- [ ] Embarquer **Nunito** en local (`--font-sans`). Ne pas dépendre du CDN Google Fonts : `ds-tokens.css:6` fait un `@import` distant.
- [ ] Ignorer Fraunces et JetBrains Mono : elles ne servent qu'à l'habillage de ce dépôt, pas au produit.

### Étape 2 · Porter les primitives du design system

Ouvrir `design-system.html` en parallèle : chaque composant y est montré dans tous ses états.

- [ ] **Atomes** · `Button` (6 variantes × 3 tailles), `Field`, `Input`, `PhoneInput`, `PasswordInput`, `OTPInput`, `Badge`, `Tag`, `Avatar`, `Loader`, `Toast`
- [ ] **Composés** · `CourseCard`, `ProgressBar`, `ProgressSteps`, `Medal`, `MissionItem` (états `todo/current/done/locked`), `Quiz`, `BottomNav`, `Modal`, `NotifItem`
- [ ] **Data-viz** · `Sparkline`, `BarChart`, `DonutChart`, `StatCard`, `DataTable`, `SegmentedControl`. Uniquement nécessaires au back-office : peuvent attendre l'étape 4h
- [ ] **Icônes** · 30 icônes dans le `switch` de `ds-icons.jsx`. Les extraire en composants ou en sprite
- [ ] **Mascotte** · `Mascot`, 6 poses (`idle/wave/cheer/focus/sad/sleep`)

Le style « candy » est intentionnel : ombre marquée sous les boutons, enfoncement visible au clic. Ce n'est pas un détail cosmétique, c'est l'identité produit pour un public de 10-17 ans.

### Étape 3 · Extraire la couche partagée et casser les cycles

**À faire avant de porter le moindre écran.** 15 composants utilisés par plusieurs zones vivent dans des fichiers d'écrans au lieu du design system. Si tu portes zone par zone sans les extraire d'abord, tu les dupliqueras dans chaque zone et tu reproduiras les cycles.

Liste complète, avec origine, consommateurs et destination suggérée : [HANDOFF.md §3](HANDOFF.md#3-composants-à-promouvoir-dans-le-design-system).

Ordre : **layouts** (`WebAppShell`, `WebShell`, `WebTeacherShell`, `WebAdminShell`) → **atomes** (`Checkbox`, `PwReq`, `StatPill`, `GoalChip`) → **composés** (`ChoiceCard`, `UserTypeCard`, `SectionHeader`, `SettingsRow`, `QuizAttemptRow`, `WPDSection`, `WPDInfoCard`, `WANetworkCard`, `WKKitCard`).

Deux composants méritent une attention particulière parce qu'ils **portent de la règle métier**, pas seulement du style :

- `WANetworkCard` · la liste des réseaux Mobile Money disponibles
- `PwReq` · la politique de mot de passe

Leur logique doit être centralisée une fois, pas dupliquée par zone.

### Étape 4 · Porter les zones, dans cet ordre

L'ordre suit les dépendances réelles, pas la valeur produit. Chaque zone suppose les précédentes.

| # | Zone | Écrans | Pourquoi à ce rang |
| --- | --- | --- | --- |
| a | **Auth apprenant + parent** | `W`, `WP` · 29 | Fournit `WebShell` et 5 composants partagés. Porte le consentement parental, qui conditionne tout le reste |
| b | **Dashboard apprenant** | `WD` · 22 | Fournit `WebAppShell` et 4 composants partagés dont dépendent 6 autres zones |
| c | **Catalogue** | `WC` · 8 | Premier consommateur de `WebAppShell`, faible surface. Bon test de l'étape 3 |
| d | **Achat parcours** | `WA` · 7 | Fournit `WANetworkCard`. Porte le Kit Code et le paiement Mobile Money |
| e | **Déroulement pédagogique** | `WJ` · 11 | Le cœur produit. Seuils d'évaluation, badges, certification |
| f | **Dashboard parent** | `WPD` · 14 | Fournit `WPDSection` / `WPDInfoCard`. Consomme la couche du dashboard apprenant |
| g | **Boutique de kits** | `WK` · 11 | Réutilise le paiement de (d) et la livraison |
| h | **Liste de souhaits** | `WW` · 3 | Petite zone, à glisser où ça arrange |
| i | **Dashboard enseignant** | `WT` · 12 | Consomme (b) et (f). À faire après les deux |
| j | **Site public** | `WL` · 21 | Indépendant de l'app. Peut se paralléliser dès l'étape 3 |
| k | **Back-office admin** | `WAD` · 15 | Esthétique distincte (monochrome), nécessite la data-viz. Interne, donc dernier |

### Étape 5 · États transversaux

`WX01`-`WX03` (hors ligne, erreur réseau, chargement) sont dessinés comme des écrans parce que le canvas n'a pas d'autre moyen de les montrer. **Ce sont des états d'enveloppe applicables à n'importe quelle vue**, pas trois pages.

- [ ] Les implémenter comme composants d'enveloppe, une fois
- [ ] Vérifier que **chaque liste a un état vide actionnable** : `WD05`, `WD09`, `WW02`, `WC03`, `WK10`. Jamais un simple « aucun résultat »
- [ ] Traiter les attentes longues avec un message rassurant, pas un spinner nu : `WA04`, `WJ04`

Ce n'est pas de la finition. La connectivité ouest-africaine est une contrainte produit explicite.

### Étape 6 · Mobile

**Il n'y a presque rien à porter : il y a à concevoir.** Seuls 16 écrans existent en 360×760 (auth apprenant), et ils sont divergents du web (§10). Les 156 autres écrans n'ont **pas** de maquette mobile.

Cette étape est un chantier de design, pas d'intégration. À cadrer avec le designer.

### Recette par zone

Avant de considérer une zone terminée :

- [ ] Tous les écrans de la zone rendus, comparés côte à côte avec l'artboard
- [ ] Tous les états présents, y compris vides, chargement et erreur
- [ ] Aucune couleur en dur : tout passe par les tokens
- [ ] Aucune chaîne en anglais, y compris messages d'erreur et micro-copie de boutons
- [ ] Tutoiement partout
- [ ] Les enchaînements correspondent au `.mmd` de la zone
- [ ] Les règles métier de la zone sont appliquées **côté serveur**, pas seulement en interface ([HANDOFF.md §5](HANDOFF.md#5-règles-métier-à-porter-dans-le-code))

---

## 7. Problèmes possibles

### Table de diagnostic rapide

| Symptôme | Cause probable | Correction |
| --- | --- | --- |
| Page blanche, console vide | ouvert en `file://` | servir en HTTP (§2) |
| Page blanche, erreur de parse en console | erreur de syntaxe JSX dans un `.jsx` | lire le nom de fichier et la ligne dans l'erreur |
| Un seul écran manque, les autres vont bien | erreur dans **cet** écran | console, chercher le nom de la fonction |
| Une zone entière est vide | le `screens-*.jsx` n'a pas chargé | lancer le contrôle des globales (§2) |
| `X is not defined` | fichier dépendant chargé trop tôt, ou pas chargé | [HANDOFF.md §2](HANDOFF.md#2-dépendances-entre-fichiers), corriger l'ordre dans le HTML |
| Mes modifications n'apparaissent pas | cache Babel | `Cmd+Shift+R` / `Ctrl+Shift+R` |
| Rien ne charge du tout | pas de réseau : React/Babel viennent du CDN | vendorer en local (ci-dessous) |
| Tout est en Times / Helvetica | `@import` Google Fonts de `ds-tokens.css:6` échoué | vérifier le réseau, ou embarquer Nunito |
| Rectangle blanc à la place du logo | filtre CSS appliqué au logo coloré | utiliser `<Logo white />`, jamais un filtre |
| Un élément centré se décale au survol | `transform` mono-valeur | combiner translate et scale |
| Une carte `sticky` ne colle pas | parent grid sans `align-items` | `align-items: flex-start` sur le grid |
| Deux écrans semblent porter le même ID | document antérieur à août 2026 | l'admin est passé de `WA` à `WAD` (§3) |
| Une fonction d'écran existe mais n'apparaît nulle part | code mort assumé | seules `W09_OTP` et `W17_OTPError` sont concernées, **ne pas les implémenter** (ci-dessous) |

### Les cas qui méritent un détail

#### L'échec silencieux de Babel standalone

C'est **le** piège de ce dépôt. Une erreur de syntaxe JSX ne produit aucune alerte : la page rend ce qu'elle peut et l'erreur va uniquement dans la console.

**Réflexe : si quelque chose ne s'affiche pas, ouvrir la console avant de chercher ailleurs.** Ne cherche pas dans le CSS, ne cherche pas dans le HTML.

#### Le cache Babel

Babel standalone met les `.jsx` en cache très agressivement. Après toute modification, **hard-refresh obligatoire** :

- macOS · `Cmd+Shift+R`
- Windows / Linux · `Ctrl+Shift+R`

Si même le hard-refresh ne suffit pas, ouvrir les DevTools et cocher « Disable cache » dans l'onglet Réseau.

#### Quatre dépendances CDN, donc pas de travail hors ligne

| Ressource | Origine |
| --- | --- |
| React 18.3.1 (build development) | unpkg |
| ReactDOM 18.3.1 (build development) | unpkg |
| Babel standalone 7.29.0 | unpkg |
| Nunito + JetBrains Mono | Google Fonts, via `@import` dans `ds-tokens.css:6` |

**Sans connexion, le dépôt ne s'ouvre pas.** Pour un projet dont une contrainte produit explicite est la connectivité en Afrique de l'Ouest, l'ironie coûte cher.

Correction, une dizaine de minutes : télécharger les trois bibliothèques dans `vendor/`, les polices dans `assets/fonts/`, et repointer les `<script src>` et l'`@import` en relatif. Les hash SRI présents dans les HTML donnent les versions exactes.

#### `X is not defined`

Presque toujours un problème d'ordre de chargement, pas un composant manquant. Le nom te dit où chercher :

| Nom | Vient de |
| --- | --- |
| `DesignCanvas`, `DCSection`, `DCArtboard` | `design-canvas.jsx` |
| `Icon` | `ds-icons.jsx` |
| `Mascot`, `Logo` | `ds-mascot.jsx` |
| `Button`, `Field`, `Input`, `Badge`, `Tag`, `Avatar`, `Loader`, `Toast`, `*Input` | `ds-atoms.jsx` |
| `CourseCard`, `ProgressBar`, `Medal`, `MissionItem`, `Quiz`, `Modal`, `NotifItem` | `ds-complex.jsx` |
| `Sparkline`, `BarChart`, `DonutChart`, `StatCard`, `DataTable`, `SegmentedControl` | `ds-charts.jsx` |
| `WebAppShell`, `SectionHeader`, `SettingsRow`, `StatPill`, `QuizAttemptRow` | `screens-dashboard-web.jsx` |
| `WebShell` | `screens-auth-web.jsx` |
| `WPDSection`, `WPDInfoCard` | `screens-parent-dashboard-web.jsx` |
| `WANetworkCard` | `screens-purchase-web.jsx` |
| `WKKitCard` | `screens-kit-shop-web.jsx` |
| `Checkbox`, `ChoiceCard`, `GoalChip`, `PwReq`, `UserTypeCard` | `screens-auth.jsx` |

#### Le logo, et pourquoi pas de filtre CSS

Deux assets distincts, pas un asset et une variante :

| Asset | Usage |
| --- | --- |
| `assets/steamy_logo.png` | Coloré, **fond opaque** → fonds clairs uniquement |
| `assets/logo_landscape_white_tight.png` | Blanc, fond transparent → fonds foncés, via `<Logo white />` |

Appliquer `filter: brightness(0) invert(1)` au logo coloré produit **un rectangle blanc**, parce que son fond est opaque. `logo_landscape_white.png` (non recadré, 78 % de padding) ne doit pas être utilisé directement, d'où la version `_tight`.

En implémentation, préférer `assets/logo_landscape.svg` : version vectorielle, présente dans le dépôt mais non utilisée par le canvas.

#### Le piège `transform`

Si un élément est centré par `transform: translate(-50%, -50%)` et qu'un `:hover` applique `transform: scale(1.05)`, le translate est **écrasé** et l'élément saute. Toujours combiner :

```css
transform: translate(-50%, -50%) scale(1.05);
```

Le motif revient dans plusieurs écrans (toasts, badges, modales).

#### Le piège `sticky` en grid

Pour qu'un élément en `position: sticky` colle réellement dans une grille, le parent grid doit avoir `align-items: flex-start`. Sinon les items s'étirent à la hauteur du plus grand et sticky n'a aucun effet. Le cas concret est la carte d'inscription du catalogue (`WC04`, `WC05`).

#### Deux fonctions d'écran sont du code mort

`screens-auth-web.jsx` déclare `W09_OTP()` (ligne 959) et `W17_OTPError()` (ligne 1722), mais **aucun artboard ne les rend**. Ce sont les vestiges de l'ancien modèle d'inscription, où l'apprenant avait son propre numéro de téléphone et recevait un OTP. La refonte « sous-compte parent » a supprimé cette étape.

Elles sont conservées volontairement comme trace historique. **Ne les implémente pas** : tu ajouterais une étape de vérification que le produit a explicitement retirée.

Ce sont les **seules** orphelines du dépôt. Les 172 autres fonctions d'écran sont toutes rendues, donc si tu trouves une fonction en grep, elle est légitime.

#### Double identité chromatique, décision non tranchée

L'app est violette (`--primary-500`, `#5B3FE0`), le logo officiel est en gradient orange-magenta. **La coexistence est volontaire mais n'a jamais été arbitrée.**

Ce n'est pas un bug à corriger de ta propre initiative. C'est une décision de marque à faire trancher **avant** de figer le thème.

---

## 8. Référence

### Design system

| Fichier | Contenu |
| --- | --- |
| `ds-tokens.css` | Tokens CSS. **Toujours passer par les variables, jamais de hex en dur** |
| `ds-icons.jsx` | `Icon({ name, size, color, strokeWidth })` · 30 icônes line 24×24 |
| `ds-mascot.jsx` | `Mascot({ pose, size, hue })` · mascotte **Zeti**, 6 poses. `Logo({ height, white })` |
| `ds-atoms.jsx` | `Button` `Field` `Input` `PhoneInput` `PasswordInput` `OTPInput` `Badge` `Tag` `Avatar` `Loader` `Toast` |
| `ds-complex.jsx` | `CourseCard` `ProgressBar` `ProgressSteps` `Medal` `MissionItem` `Quiz` `BottomNav` `Modal` `NotifItem` |
| `ds-charts.jsx` | `Sparkline` `BarChart` `DonutChart` `StatCard` `DataTable` `SegmentedControl` · SVG fait main, monochrome |
| `ds-canvas.jsx` | Le showcase rendu par `design-system.html`. Auto-monté : **ne pas charger ailleurs** |
| `design-canvas.jsx` | Infra du canvas : `DesignCanvas`, `DCSection`, `DCArtboard` |

Chaque fichier DS injecte son CSS via un `<style>` créé à l'exécution, gardé par un `document.getElementById('ds-X-styles')` pour éviter les doublons.

### Dimensions

- **Web** · `1240 × 760`, cible desktop, priorité produit
- **Mobile** · `360 × 760`

### Assets

| Asset | Statut |
| --- | --- |
| `steamy_logo.png` | utilisé · coloré, fond opaque, fonds clairs |
| `logo_landscape_white_tight.png` | utilisé · blanc, transparent, fonds foncés |
| `logo_landscape.svg` | non utilisé par le canvas · **vectoriel, à préférer en implémentation** |
| `logo_landscape_white.png` | non utilisé · non recadré, **ne pas utiliser** |
| `insta.svg`, `linkedin.svg`, `x.svg` | non utilisés · les icônes sociales des écrans sont en SVG inline. Disponibles si besoin |

### Documents du dépôt

| Fichier | Rôle |
| --- | --- |
| `README.md` | Ce document · prise en main et intégration |
| `HANDOFF.md` | Inventaire des 172 écrans, dépendances, règles métier, trous connus |
| `CLAUDE.md` | Instructions pour les agents IA travaillant sur ce dépôt |

### Ajouter une vue au canvas

Si tu as besoin d'annoter ou de prototyper une variante **dans** ce dépôt :

1. Créer `screens-<zone>-web.jsx`, définir les écrans et un `FlowXxxWeb()` retournant un `<DesignCanvas>` de `<DCSection>` / `<DCArtboard>`. **Ne pas auto-monter.**
2. Exposer en fin de fichier : `window.XxxFlowWeb = XxxFlowWeb;`
3. Dans `App.html` : ajouter le `<script src>`, une entrée dans `NAV_GROUPS`, une branche dans le ternaire de routing.
4. Choisir un **préfixe d'ID non utilisé** (§3).

---

## 9. Contexte produit et règles métier

### Personas

- **Apprenant** · 10-17 ans, utilisateur central. Suit des parcours, passe les évaluations, gagne badges et certifications, peut acheter des kits.
- **Parent** · porte d'entrée obligatoire. Reçoit les demandes de consentement, valide les paiements, suit la progression de ses enfants, peut en gérer plusieurs.
- **Enseignant** · encadre des parcours, gère des classes, suit les évaluations, commente aux apprenants et aux parents.

Un **back-office admin** complète l'ensemble : modération, contenu, paiements, Impact Tracker.

### Les 4 piliers

1. **Parcours pédagogiques** · hiérarchie `Parcours → Projet → Niveau → Mission`. Chaque niveau se conclut par une **évaluation formative** (≥ 70 % pour valider), chaque projet par une **sommative** (≥ 80 %). Récompenses : badges de niveau et de projet, certification PDF en fin de parcours, ticket Steamy Events offert.
2. **Boutique de kits physiques** · checkout Mobile Money, suivi de livraison. Un parcours peut exiger un kit : un **Kit Code** livré avec le kit physique débloque alors le contenu numérique.
3. **Steamy Events** · challenges, compétitions, ateliers. Les moins de 16 ans nécessitent l'accord du parent.
4. **Dashboards et notifications** · distincts par persona.

### Règles à porter côté serveur, pas seulement en interface

| Règle | Implication |
| --- | --- |
| Tout apprenant est un **sous-compte parent** | Quel que soit l'âge. L'apprenant se connecte par **identifiant + mot de passe**, jamais par téléphone. Le parent se connecte par **téléphone + mot de passe** |
| **Consentement parental asynchrone** | Message au parent → attente côté enfant → acceptation ou refus motivé → notification retour |
| **Le refus est terminal** | Pas de retry, pas de contournement |
| Action sensible → **détour parent** | Paiement, suppression de compte, données personnelles : écran d'attente + notification |
| **Mobile Money uniquement** | Aucun champ de carte bancaire, nulle part. Réseaux ouest-africains. Formulaire = Pays + Réseau + Numéro |
| **Kit Code** obligatoire si parcours avec kit | Saisie du voucher, erreur explicite si invalide, retry, lien « Où trouver le code ? » |
| Connectivité ouest-africaine | Les états **loading** et **offline** sont des livrables. Messages rassurants, éviter les requêtes lourdes |
| Devise **FCFA** | Aucun autre affichage monétaire |

Écrans de référence pour chaque règle : [HANDOFF.md §5](HANDOFF.md#5-règles-métier-à-porter-dans-le-code).

### Ton et langue

- **100 % français.** Aucune chaîne anglaise dans l'interface, y compris erreurs, micro-copie de boutons et textes commerciaux.
- **Tutoiement systématique.** Le public a 10-17 ans.
- Mascotte **Zeti** sur l'onboarding, les états vides et les célébrations.
- Tagline · « Nous formons les inventeurs de demain ».

---

## 10. Ce qui n'est pas livré

Détail complet dans [HANDOFF.md §6](HANDOFF.md#6-trous-connus).

### Le gros morceau

**La parité mobile.** 156 des 172 écrans n'existent qu'en web. Seule l'auth apprenant a une version 360×760, et **elle est divergente** : elle applique encore l'ancien modèle (numéro de téléphone propre à l'apprenant + OTP) et non le modèle « sous-compte parent ». **Le web fait référence.**

C'est un chantier de design à cadrer, pas une tâche d'intégration.

### Non conçu

- Auth parent mobile, environ 16 écrans
- Pages légales apprenant · le gabarit existe (`WL09`), le contenu manque
- Fiche détaillée d'un événement · `WD10` liste les events, la fiche manque
- Vue résumé exhaustive de tous les projets d'un parcours
- Diagramme de flow du back-office admin · seule zone sans `.mmd`

### Conçu mais non branché

Ces écrans montrent des interfaces dont la logique n'existe pas :

- Export PDF / CSV du rapport trimestriel · `WAD04`
- RBAC réel · `WAD13`
- Règle de statut des indicateurs · `WAD02`
- Cas d'erreur de l'import par lot d'apprenants · `WT06`

### Décision produit en attente

Les KPI démographiques de l'Impact Tracker (genre, âge, zone rurale, situation de handicap) et les institutions sont marqués « Indisponibles » dans `WAD02` : **le formulaire d'inscription ne capte pas ces champs.** À trancher avant de figer le schéma de données.
