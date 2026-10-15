# Lot 1 · Socle front et site public

Premier lot front. Il livre d'abord le **socle** dont tous les lots ont besoin (étape 1.0), puis les pages publiques.
Références : [README des plans](README.md) (étapes d'API, règles communes, définition de « terminé », routes),
[ARBITRAGES](../alignement/ARBITRAGES.md), [CONVENTIONS](../alignement/CONVENTIONS.md),
[SPEC-TECHNIQUE](../SPEC-TECHNIQUE.md) §1, §2, §4.6, §6, §7, [SPEC-ECRANS-1](../SPEC-ECRANS-1-public-auth.md) (lot 1),
[SPEC-ECRANS-3](../SPEC-ECRANS-3-parent-teacher-admin.md) §6 (WX). Maquette : `design/screens-public-web.jsx`,
`design/screens-states-web.jsx`, `design/ds-*`.

## Avancement

Statut : 🟡 en cours · Prochaine tâche : 1.0c (après API-1) · Prérequis : API-1 (client régénéré, `make seed` D2, avant 1.0c, renommage CSRF compris) ; API-L1 (avant 1.1, 1.3, 1.4, 1.6 et le formulaire de 1.5)

### Étape 1.0 · Socle front — 🟡 en cours
- [x] **1.0a** Outillage, tokens, assets · `feature/lot1-socle-outillage` · PR #18
  - [x] Vitest + Testing Library (`vitest.config.mts`, scripts `test` web et `pnpm -r test`, cible `make test-web`)
  - [x] Playwright (`apps/web/e2e/`, `playwright.config.ts` Chromium bureau + mobile 360 px, `@axe-core/playwright`)
  - [x] Cible `make e2e` et override `compose.e2e.yml` (web en image `prod`, `make migrate seed`, `playwright test`) : projet `steamy-e2e` sans port publié, Playwright dans l'image officielle épinglée
  - [x] CI : `pnpm test` dans le job `web`, nouveau job `e2e` et filtre `e2e`, rapport en artefact, `e2e` ajouté aux `needs` de `ci-ok` ; navigateurs fournis par l'image officielle Playwright (au lieu d'un cache)
  - [x] Tokens (C1) : commentaire « magenta », `--shadow-card(-hover)` dérivés de `--primary-500` dans `tokens.css` et `design/ds-tokens.css`
  - [x] Polices (§1.4) : retirer JetBrains Mono (`layout.tsx`, `fonts/`, licence OFL, `--font-mono`), Nunito seule
  - [x] Assets `design/assets/` → `public/brand/` (logos, icônes sociales) ; `app/icon.png`, `apple-icon.png`, `favicon.ico` recadrés sur le symbole ; logo blanc = `logo_landscape_white_tight.png` (recadré)
  - [x] Nettoyage : page de démonstration et `components/browser-api-status.tsx` supprimés, `/runtime-config` gardé ; `app/page.tsx` remplacée par un accueil provisoire statique (le parcours témoin exige `/` en 200, WL01 arrive en 1.1)
  - ~~Chemin CSRF `/api/auth/csrf/` dans `lib/api-browser.ts`~~ : fait par API-1.2 (PR #17), qui régénère le client ; contrôlé en 1.0c
  - [x] Test Vitest témoin, parcours Playwright témoin (accueil en 200) et test axe
  - [x] Couverture unitaire 100 % du code ajouté ou modifié : `@vitest/coverage-v8` (rapport `apps/web/coverage/cobertura-coverage.xml`), `diff-cover --fail-under=100` dans le job `web` (`fetch-depth: 0`, même base de comparaison que le job `api`), cible `make coverage-web`
  - [x] E2E 100 % des écrans : l'outillage Playwright permet d'écrire le test de chaque écran cité dans la matrice écran → test (job `e2e-matrice`) ; 1.0a et 1.0b ne livrent aucun écran
  - [x] Recette : `make test-web` et `make e2e` passent en local ; aucune occurrence de `91, 63, 224` ni de `jetbrains` dans `apps/web/src`
  - [ ] Recette après fusion : `e2e` exécuté en CI sur une PR qui ne touche que `apps/api/`
- [x] **1.0b** Design system de base · `feature/lot1-design-system` · PR #19
  - [x] `Icon`
  - [x] `Logo`, `Mascot` (6 poses, décoratif) ; `Logo` sur les PNG officiels (le tagline du SVG dépend d'une police non embarquée)
  - [x] `Button` (variantes dont `outline-inverse`, `loading`, rendu `a`)
  - [x] `Badge`, `Tag`
  - [x] `Avatar`
  - [x] `Loader` (toujours avec texte, `role="status"`)
  - [x] `Field`, `Input`, `Textarea`, `Select`, `Checkbox`
  - [x] `PhoneInput` (pays en prop au format de `referentials/countries/`, sortie E.164) ; type `PhoneCountry` à aligner sur le client généré
  - [x] `Toast`
  - [x] `Tabs` (variante `tabs-pill`)
  - [x] `SkeletonBlock`
  - [x] `CourseCard`
  - [x] `WKKitCard` (mode vitrine)
  - [x] `Accordion`, `FaqAccordion`
  - [x] Tests : rendu, variantes, clavier et `vitest-axe` sur chaque composant ; `PhoneInput` (changement de pays, E.164, numéro invalide)
  - [x] Couverture : 100 % des lignes et des branches du design system (diff-cover à 100 % sur le code modifié)
  - [x] Recette : contrastes AA (aucun texte en `--ink-400` ; texte foncé sur vert et ambre, survol primaire en 600, `danger` en `--error-600`), focus visible, aucun `rgba` ni hex en dur hors `tokens.css`
- [ ] **1.0c** Shell public, enveloppes, SEO (requiert API-1) · `feature/lot1-socle-public`
  - [ ] Contrôler le chemin CSRF `/api/auth/csrf/` dans `lib/api-browser.ts` (renommé par API-1.2, PR #17)
  - [ ] `lib/routes.ts` (table unique des URL)
  - [ ] `app/(public)/layout.tsx` : `PublicShell`, `<main id="contenu">`, lien d'évitement
  - [ ] `PublicNav` + `MegaMenu` accessible (clavier, `Échap`, clic extérieur, tiroir mobile avec piège de focus) et emplacement `NavAccount`
  - [ ] `PublicFooter` (4 colonnes selon D17, icônes sociales)
  - [ ] `WLJoinBanner`, `WLSectionHead`, `WLPillarCard`, `WLStep`, `WLSocial`
  - [ ] `WXState`, `AppStateBoundary`
  - [ ] WX01 `OfflineGate` dans le layout racine
  - [ ] WX02 `error.tsx` (racine et `(public)`) et `global-error.tsx`
  - [ ] WX03 `loading.tsx` et `not-found.tsx`
  - [ ] Métadonnées : `metadata` racine, `robots.ts`, `sitemap.ts`, Open Graph par défaut
  - [ ] `getPublicApi()` (`lib/api-public.ts`) et son test (jamais de `cookies()`/`headers()`), règle ESLint sur `getServerApi()` dans `(public)`
  - [ ] Tests Vitest : `WXState` par registre, `OfflineGate`, mega-menu au clavier
  - [ ] Parcours Playwright : navigation clavier nav et mega-menu, hors ligne (WX01), URL inconnue → 404, footer sans lien mort (liste blanche `/connexion`, `/inscription`, `/inscription/parent`)
  - [ ] Recette : `next build` prérend toutes les routes publiques, aucune en dynamique pur ; entrées reportées absentes

### Étape 1.2 · Conception des maquettes — ⬜ à faire
- [ ] **1.2** Conception de WL22, WL23, WL24 · `feature/lot1-conception-wl22-24`
  - [x] Maquette WL22 fiche parcours (d'après WC04 dans `PublicShell`, états chargement et 404)
  - [x] Maquette WL23 fiche événement (CTA selon visiteur / apprenant / parent / complet / passé)
  - [x] Maquette WL24 aide & contact (FAQ par thème, formulaire au vouvoiement, confirmation, erreur)
  - [x] Fichier `design/screens-public-a-concevoir-web.jsx` ajouté à `App.html` (vue « Public »)
  - [ ] Recette : validation par le porteur produit (C18) ; aucune donnée de mineur (D15)

### Écrans — ⬜ à faire
- [ ] **1.1** Accueil, catalogue, catégories (requiert API-L1) · `feature/lot1-accueil-catalogue`
  - [ ] WL01 `/` (sections, ancre `#comment-ca-marche`, 3 `CourseCard` mis en avant, CTA, chiffres depuis `content/site.ts`)
  - [ ] WL06 `/parcours` (filtres `Tag`, état dans l'URL, pagination, états skeleton, vide, erreur)
  - [ ] WL16 `/categories` (`CategoryCard`)
  - [ ] Appels `catalog/categories/` et `catalog/courses/?category=&page=` via `'use cache'`
  - [ ] Tests Vitest : `CategoryCard`, sérialisation filtre ↔ URL
  - [ ] Parcours Playwright « découverte » (accueil → ancre → catalogue → filtre → catégories → catalogue filtré)
  - [ ] Recette : aucun chiffre ni catégorie en dur ; les 6 catégories du jeu D2 apparaissent
- [ ] **1.3** Fiche parcours publique WL22 (requiert API-L1 et 1.2) · `feature/lot1-fiche-parcours`
  - [ ] Route `/parcours/[slug]` (`'use cache'` + `cacheTag('catalog')`, `notFound()` si non publié)
  - [ ] `generateMetadata`, JSON-LD `Course`, slug ajouté au sitemap
  - [ ] CTA visiteur (`/inscription?next=…`, `/connexion?next=…`) et mention du kit
  - [ ] Appel `catalog/courses/{slug}/` sans contenu de mission
  - [ ] Test API et test Playwright : absence de `vimeoId` / corps de mission dans le HTML
  - [ ] Test Vitest : plan en accordéon au clavier
  - [ ] Parcours Playwright : WL06 → WL22 → CTA → URL d'inscription avec retour
- [ ] **1.4** Événements et boutique (requiert API-L1 et 1.2) · `feature/lot1-evenements-boutique`
  - [ ] WL21 `/evenements` (`EventRow`, prix, état vide)
  - [ ] WL23 `/evenements/[slug]` (`EventDetail` réutilisable, CTA selon l'état, JSON-LD `Event`, slug au sitemap)
  - [ ] WL07 `/boutique` (grille `WKKitCard` en mode vitrine, filtres)
  - [ ] Appels `events/`, `events/{slug}/`, `shop/kits/`
  - [ ] Parcours Playwright « événements » (WL21 → WL23 → CTA visiteur ; événement complet → CTA désactivé)
- [ ] **1.5** Pages éditoriales (WL20 requiert API-L1 pour `public/leads/`, le reste sans API) · `feature/lot1-editorial`
  - [ ] WL09 `/legal/[doc]` (`Tabs`, `#consentement-parental`, corrections S3, D6, D15, D23, D40)
  - [ ] WL10 `/a-propos`
  - [ ] WL17 `/blog` et WL18 `/blog/[slug]` (MDX, pagination statique, fil d'Ariane, partage)
  - [ ] WL20 `/guides` (PDF dans `public/guides/`, `GuideCard`)
  - [ ] Encart newsletter de WL20 (`POST public/leads/`, consentement non coché)
  - [ ] Contenus `src/content/{legal,blog,guides,faq}` et `site.ts`
  - [ ] Tests Vitest : formulaire newsletter (consentement obligatoire, `VALIDATION_ERROR`)
  - [ ] Parcours Playwright : footer → CGU#consentement-parental, onglets légaux par URL, blog → article, newsletter acceptée
  - [ ] Recette : aucune mention « moins de 16 ans » ni « numéro » de l'apprenant (grep CI sur `src/content`)
- [ ] **1.6** Formulaires B2B et aide (requiert API-1, API-L1 et 1.2) · `feature/lot1-formulaires`
  - [ ] WL11 `/ecoles` (3 `OfferCard`, CTA vers `#devis?offre=`, formulaire au vouvoiement, confirmation en place)
  - [ ] WL24 `/aide` (FAQ `content/faq/`, formulaire de contact, `?sujet=`, ancres `#faq` et `#contact`)
  - [ ] Appels `public/quote-requests/`, `public/contact-messages/`, `referentials/countries/` (passé à `PhoneInput`)
  - [ ] Tests Vitest : validation, mapping des `fields`, `THROTTLED`
  - [ ] Parcours Playwright « devis » (offre présélectionnée → envoi → confirmation ; email dans Mailpit)
  - [ ] Parcours Playwright « contact » (`/aide?sujet=candidature`)

### Neutralisation des écrans reportés — ⬜ à faire
- [ ] **Neutralisation** des écrans reportés et fusionnés (WL08, WL12-WL15, WL19) · à livrer avec 1.0c et 1.5
  - [ ] Onglet WL13 retiré de `PublicNav`, WL15 et WL19 retirés du mega-menu « Ressources », WL08 retiré (« Steamy Events » → WL21)
  - [ ] Aucun lien vers WL12 ni WL14
  - [ ] Test Playwright : aucun `href` vers `/defis`, `/communaute`, `/tutoriels`, `/classements`, `/ateliers`

- [ ] **Critères de fin du lot 1**
  - [ ] Étapes 1.0a-1.6 fusionnées dans `development`, CI verte (`ci-ok` incluant `e2e`)
  - [ ] Chaque écran v1 et à concevoir respecte la définition de « terminé » du README (360 px → bureau, registres, AA, états, aucune donnée en dur, tests)
  - [ ] Parcours Playwright verts : découverte, événements, devis, contact, newsletter, navigation clavier, hors ligne ; axe sans violation sérieuse sur toutes les routes publiques
  - [ ] `next build` : toutes les routes de `(public)` prérendues ; `getServerApi` absent de `(public)`
  - [ ] Aucun lien vers WL08, WL12-WL15, WL19 ; aucun violet `rgba(91,63,224)` ni JetBrains Mono
  - [ ] WX01-WX03 et `getPublicApi` documentés dans `apps/web/README.md`

## Périmètre

| Statut | Écrans |
| --- | --- |
| v1 | `PublicShell`, WL01, WL06, WL07, WL09, WL10, WL11, WL16, WL17, WL18, WL20, WL21 (absorbe WL08, S8), WX01-WX03 |
| À concevoir | WL22 fiche parcours (D11), WL23 fiche événement (S8), WL24 aide & contact (D17) |
| Reporté (S7) | WL12-WL15, WL19 : aucune route, aucun lien entrant (voir « Neutralisation ») |
| Hors lot | WL02-WL05 (lot 2, `WebShell`) ; WK02-WK07 (checkout invité, lot 3, D12) |

## Choix techniques du lot

| Sujet | Choix | Réf. |
| --- | --- | --- |
| Rendu et cache | `cacheComponents` est déjà actif (`next.config.ts`). Le **squelette** de chaque page (shell, éditorial) est prérendu au build. Les données d'API sont lues dans des fonctions `'use cache'` (`cacheLife` en minutes, `cacheTag('catalog' \| 'events' \| 'shop')`), appelées dans un composant placé sous `<Suspense>` qui fait `await connection()` : l'API n'est **pas** joignable au build de l'image (URL lue à l'exécution, §1.2), et `generateStaticParams` ne peut pas renvoyer de liste vide avec Cache Components | §1.2, §1.4 |
| Client anonyme | `lib/api-public.ts` → `getPublicApi()` : `createApiClient(process.env.API_URL)` sans `cookies()`, timeout court (`AbortSignal.timeout`), jamais utilisé hors pages publiques. `getServerApi()` interdit dans `(public)` (règle ESLint `no-restricted-imports`) | §1.2 |
| Formulaires publics | Composants client via `getBrowserApi()` (CSRF via `GET /api/auth/csrf/`), `Button loading` anti double envoi, erreurs `{ code, message, fields }` mappées sur les `Field` par `lib/api-errors.ts` ; `THROTTLED` affiche le délai | D4, §6, §7.1 |
| Contenu éditorial | `@next/mdx` (plugins déclarés par nom, contrainte Turbopack) ; `src/content/{legal,blog,guides,faq}` + `src/content/site.ts` (chiffres vitrine, offres B2B, équipe), cohérents avec le jeu D2. `generateStaticParams` sur les fichiers locaux uniquement | D10, D2 |
| SEO | `metadata` racine (`metadataBase` = domaine de production, `title.template`), `generateMetadata` par page, `sitemap.ts` et `robots.ts`, données structurées JSON-LD (`Course`, `Event`, `Article`). Staging servi avec `X-Robots-Tag: noindex` (Traefik) | D11, §4.6 |
| Styles | Tailwind 4 adossé à `styles/tokens.css` ; aucune couleur en dur, aucun `style` inline porté de la maquette | C1, §2.6 |

## Étape 1.0 · Socle front

Découpée en trois PR livrables séparément. Aucune ne dépend d'un endpoint d'API-L1.

### 1.0a · Outillage, tokens, assets — `feature/lot1-socle-outillage` · M

| Contenu | Détail |
| --- | --- |
| Vitest + Testing Library | `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest-axe` ; `apps/web/vitest.config.ts`, tests colocalisés `*.test.tsx`. Scripts `test` (web) et `pnpm -r test` (racine), cible `make test-web`. Les Server Components async sont testés par Playwright (limite de Vitest) |
| Playwright | `apps/web/e2e/`, `playwright.config.ts` (Chromium bureau + mobile 360 px), `@axe-core/playwright`. Cible `make e2e` : stack Docker avec un **override `compose.e2e.yml`** qui sert le web en image `prod` (le service `web` de `compose.yml` tourne en `next dev`, trop lent et instable pour des parcours), `make migrate seed` puis `playwright test` |
| CI (`.github/workflows/ci.yml`) | Job `web` : ajouter `pnpm test`. Nouveau job `e2e` déclenché par un nouveau filtre `e2e` (= `*ci`, `apps/api/**`, `apps/web/**`, `packages/**`, `compose.yml`, `compose.e2e.yml`, `Makefile`) : un changement d'API peut casser un parcours, le filtre `web` seul ne suffit pas. Navigateurs Playwright en cache, rapport en artefact en cas d'échec. Ajouter `e2e` aux `needs` de `ci-ok` |
| Tokens (C1) | `tokens.css` : commentaire « indigo/violet » → « magenta » ; `--shadow-card(-hover)` dérivés de `--primary-500` (`color-mix(in srgb, var(--primary-500) 6% / 14%, transparent)`) au lieu de `rgba(91,63,224,…)`. Même correction dans `design/ds-tokens.css` (en-tête de `tokens.css` : « ici ET dans le prototype ») |
| Polices (§1.4) | Retirer JetBrains Mono : `layout.tsx`, `fonts/jetbrains-mono-*`, `OFL-jetbrains-mono.txt`, `--font-mono` de `tokens.css` et `globals.css`. Nunito seule |
| Assets | `design/assets/` → `public/brand/` : `logo_landscape.svg`, `logo_landscape_white.png` (fond sombre, jamais d'`invert` sur le PNG coloré), `steamy_logo.png` (favicon, icônes `app/icon.png`, `apple-icon.png`), `insta.svg`, `linkedin.svg`, `x.svg` |
| Nettoyage | Supprimer la page de démonstration (`app/page.tsx`, `components/browser-api-status.tsx`) ; garder `/runtime-config`. `lib/api-browser.ts` : chemin CSRF `/api/auth/csrf/` (après API-1) |

**Tests** : un test Vitest témoin, un parcours Playwright témoin (la page d'accueil répond 200), un test axe.
**Recette** : `make test-web` et `make e2e` passent en local ; la CI exécute `e2e` sur une PR qui ne touche que
`apps/api/` ; aucune occurrence de `91, 63, 224` ni de `jetbrains` dans `apps/web/src`.

### 1.0b · Design system de base — `feature/lot1-design-system` · L

Port de `design/ds-*.jsx` dans `apps/web/src/components/ds/` (un dossier par composant, export nommé, test colocalisé).

| Composant | Exigences (SPEC-TECHNIQUE §2.2, §2.3, §2.6) |
| --- | --- |
| `Icon` | Jeu SVG de `ds-icons.jsx`, `aria-hidden` par défaut, `title` quand l'icône est seule |
| `Logo`, `Mascot` | SVG ; `Mascot` : 6 poses (`idle`, `wave`, `cheer`, `focus`, `sad`, `sleep`), `hue` par défaut `--primary-500`, décoratif (`aria-hidden`) |
| `Button` | Variantes `primary`, `secondary`, `amber`, `outline`, `ghost`, `danger` + **`outline-inverse`** (spec WL01) ; `size`, `block`, `icon`, `iconRight`, `loading` (désactive, `aria-busy`), rendu `a` via `href` |
| `Badge`, `Tag` | `Tag` = vrai `button` (`aria-pressed`) ou lien filtrant |
| `Avatar` | Emoji ou initiales, couleurs de token ; jamais de photo de mineur (D15) |
| `Loader` | `dots` / `spin`, **toujours avec un texte** (`role="status"`) |
| `Field`, `Input`, `Textarea`, `Select`, `Checkbox` | `error` remplace `hint`, `aria-describedby`, `aria-invalid` ; `Checkbox` non cochée par défaut |
| `PhoneInput` | Sélecteur de pays alimenté par `referentials/countries/` (indicatif, format, validation), émet de l'**E.164** ; liste passée en prop (le composant n'appelle pas l'API) |
| `Toast` | Portail, `position: fixed`, `aria-live="polite"` |
| `Tabs` | Variante `tabs-pill` (WL09), onglets = liens adressables |
| `SkeletonBlock` | Skeleton structurel (§6) |
| `CourseCard` | Carte = lien ; pastille « Gratuit » si `isFree` ; **difficulté** (pas « niveau », S2) ; pas de `rating` (C8) ; cœur absent en public (`onFav` facultatif, lot 3) |
| `WKKitCard` | Mode « vitrine » au lot 1 (voir 1.4) |
| `Accordion`, `FaqAccordion` | `details/summary` accessible ; `FaqAccordion` (FAQ par thème, recherche locale facultative) sert WL24 et sera réutilisé par WD12, WPD13, WT11 |

**Tests** : rendu, variantes, clavier, `vitest-axe` sur chaque composant ; `PhoneInput` : changement de pays, sortie
E.164, numéro invalide. **Recette** : contrastes AA (aucun texte en `--ink-400`), focus visible sur tout élément
interactif, aucun `rgba` ni hex en dur hors `tokens.css`.

### 1.0c · Shell public, enveloppes, SEO — `feature/lot1-socle-public` · M

| Contenu | Détail |
| --- | --- |
| Routes | `lib/routes.ts` : table unique des URL (README) utilisée par la nav, le footer et les tests |
| `app/(public)/layout.tsx` | `PublicShell` = `PublicNav` + `<main id="contenu">` + `PublicFooter`, lien d'évitement « Aller au contenu » |
| `PublicNav` | Sticky, flou ; onglet actif `--primary-600` (`aria-current="page"`) ; « Ressources » actif sur WL17, WL18, WL20, WL21, WL23. **Mega-menu accessible** : bouton `aria-expanded`/`aria-controls`, ouverture au clic et au clavier (Entrée, Espace, ↓), flèches entre entrées, `Échap` ferme et rend le focus, fermeture au clic extérieur ; pas d'ouverture au seul survol. Mobile : menu en tiroir avec piège de focus. Emplacement `NavAccount` (îlot client) : « Se connecter » → `/connexion`, « Créer un compte » → `/inscription` ; l'état connecté (accès à l'espace selon le rôle) est branché au lot 2 sans rendre la page dynamique |
| `PublicFooter` | Fond `--ink-900`, 4 colonnes et cibles selon D17 (table de la spec 1.1), logo blanc, icônes sociales (liens externes `rel="noopener"`) |
| `WLJoinBanner` et sections | `WLJoinBanner` (copie de la spec), `WLSectionHead`, `WLPillarCard`, `WLStep`, `WLSocial` dans `components/public/` |
| Enveloppes WX (SPEC-ECRANS-3 §6) | `components/states/WXState` (pose, emoji, titre, corps, 1-2 boutons, textes par registre : `tu`, `vous`, neutre). `AppStateBoundary` : **WX01** `OfflineGate` client (événements `online`/`offline`, `router.refresh()` au retour ; aucun bouton « Mode hors ligne », D16) monté dans le layout racine ; **WX02** `app/error.tsx` + `(public)/error.tsx` (client, `retry()` de Next 16, message de l'API si utile) et `global-error.tsx` ; **WX03** `loading.tsx` (loader + message rassurant), réservé aux attentes longues — les grilles utilisent des skeletons. `not-found.tsx` sur le même modèle (`Mascot sad`) |
| Métadonnées | `metadata` racine, `robots.ts`, `sitemap.ts` (pages éditoriales ; les slugs d'API s'ajoutent aux étapes 1.2-1.3 via une fonction `'use cache'`), Open Graph par défaut (logo) |
| `getPublicApi()` | Voir « Choix techniques » ; test unitaire : ne lit jamais `cookies()`/`headers()` |

**Tests** : Vitest (WXState par registre, OfflineGate, mega-menu au clavier) ; Playwright : navigation au clavier de
la nav et du mega-menu, `context.setOffline(true)` affiche WX01 puis se rétablit, URL inconnue → 404, footer sans lien
mort hors routes du lot 2 (`/connexion`, `/inscription`, `/inscription/parent`, liste blanche retirée au lot 2).
**Recette** : `next build` affiche les routes publiques en prérendu (statique ou partiel), aucune en dynamique pur ;
les entrées reportées sont absentes.

## Étapes d'écrans

| Étape | Branche | Écrans · routes | Taille |
| --- | --- | --- | --- |
| 1.1 | `feature/lot1-accueil-catalogue` | WL01 `/`, WL06 `/parcours`, WL16 `/categories` | M |
| 1.2 | `feature/lot1-conception-wl22-24` | Maquettes WL22, WL23, WL24 (conception) | S |
| 1.3 | `feature/lot1-fiche-parcours` | WL22 `/parcours/[slug]` | M |
| 1.4 | `feature/lot1-evenements-boutique` | WL21 `/evenements`, WL23 `/evenements/[slug]`, WL07 `/boutique` | M |
| 1.5 | `feature/lot1-editorial` | WL09 `/legal/[doc]`, WL10 `/a-propos`, WL17 `/blog`, WL18 `/blog/[slug]`, WL20 `/guides` | M |
| 1.6 | `feature/lot1-formulaires` | WL11 `/ecoles`, WL24 `/aide` | M |

### 1.1 · Accueil, catalogue, catégories — M

- **WL01** : sections de la spec 1.2 ; « Comment ça marche » = ancre `#comment-ca-marche` (D16) ; chiffres et
  textes depuis `content/site.ts` (D2, D10) ; 3 `CourseCard` mis en avant (carte → WL22) ; CTA « Rejoindre l'équipe »
  → `/aide?sujet=candidature#contact` ; « Créer un compte parent » → `/inscription/parent` ; CTA final en
  `outline-inverse`. Pas de « mode hors ligne ».
- **WL06** : filtres `Tag` issus de `catalog/categories/`, **état dans l'URL** (`/parcours?categorie=<slug>`), lien
  « Toutes les catégories » → WL16, `WLJoinBanner`, pagination si `next`. États : skeleton de grille, vide (« Aucun
  parcours dans cette catégorie » + « Voir tout »), erreur (WX02 local à la grille, le shell reste).
- **WL16** : cartes catégorie (couleur portée par la catégorie, emoji, nombre de parcours publiés) → WL06 filtré.
- **API** (API-L1) : `GET catalog/categories/`, `GET catalog/courses/?category=&page=` (publiés seulement).
- **Tests** : Vitest (`CategoryCard`, sérialisation filtre ↔ URL) ; Playwright « découverte » : accueil → ancre →
  catalogue → filtre (URL partageable, rechargement conserve le filtre) → catégories → catalogue filtré.
- **Recette** : aucun chiffre ni catégorie en dur ; les 6 catégories du jeu D2 apparaissent.

### 1.2 · Conception de WL22, WL23, WL24 — S

Maquettes produites **à partir des composants existants** (aucun nouveau style) dans un nouveau fichier
`design/screens-public-a-concevoir-web.jsx`, ajouté à `App.html` (vue « Public »), validées avant 1.3, 1.4 et 1.6
(C18).

| Écran | Base | Contenu à dessiner (spec 1.14-1.16) |
| --- | --- | --- |
| WL22 | WC04 (`screens-catalog-web.jsx`) dans `PublicShell` | En-tête (visuel, catégorie, difficulté, prix/« Gratuit », durée, kit requis), plan **titres seulement** (projets › niveaux › missions, accordéon), certification, CTA visiteur, encart « s'obtient avec le Kit Code », `WLJoinBanner`. États : chargement, 404 |
| WL23 | Ligne d'événement de WL21 + mise en page de WL18 | Pastille date, lieu/« En ligne », public visé, places restantes, prix, rappel accord parental ; CTA selon visiteur / apprenant / parent / complet / passé (motif affiché) |
| WL24 | Encart de WL20 + sections WL09 | FAQ par thème (accordéons `details/summary`), formulaire de contact au vouvoiement, confirmation en place, erreur |

**Recette** : revue de la maquette par le porteur produit ; aucune donnée de mineur (D15).

### 1.3 · Fiche parcours publique WL22 — M

- Route `/parcours/[slug]`, données via `'use cache'` + `cacheTag('catalog')`, `generateMetadata` (titre,
  description, image OG), JSON-LD `Course`, slug ajouté au sitemap ; `notFound()` si non publié.
- CTA visiteur : « Commencer » / « Demander à mon parent » → `/inscription?next=/parcours/<slug>` ; « Se
  connecter » → `/connexion?next=…` (paramètre unique, README). La redirection d'un connecté vers WC04 est ajoutée au lot 3 (via `NavAccount`
  / redirection côté client, pour garder la page en cache). « Voir le kit » (D36) : affiché au lot 3 avec WK02 ; au
  lot 1, mention seule.
- **API** (API-L1) : `GET catalog/courses/{slug}/` — **aucun contenu de mission** dans la réponse (vérifié par un
  test API et un test Playwright qui cherche l'absence de `vimeoId`/corps de mission dans le HTML).
- **Tests** : Vitest (plan en accordéon au clavier) ; Playwright : WL06 → WL22 → CTA → URL d'inscription avec retour.

### 1.4 · Événements WL21, WL23 et boutique WL07 — M

- **WL21** : liste des événements publiés à venir, pastille couleur de catégorie, `Badge` prix (vert si gratuit,
  prix serveur en FCFA) → WL23. Pas de `WLJoinBanner`, pas d'« Inscris-toi en quelques secondes ». État vide :
  « Aucun événement à venir ».
- **WL23** `/evenements/[slug]` : CTA visiteur « Participer » → `/connexion?next=…` ou `/inscription` ; complet ou
  passé : CTA désactivé avec motif. Les CTA connectés (WD11 au lot 3, WPD12 au lot 4) sont ajoutés par ces lots ;
  composant `EventDetail` exporté pour être réutilisé dans WD10 et WPD06. JSON-LD `Event`.
- **WL07** : grille `WKKitCard` + filtres. Le checkout invité (D12) et WK02 arrivent au lot 3 : au lot 1, mode
  **vitrine** (prix, disponibilité, pas de bouton « Ajouter », carte non cliquable). Le lot 3 active panier et lien.
- **API** (API-L1) : `GET events/`, `GET events/{slug}/`, `GET shop/kits/`.
- **Tests** : Playwright « événements » : WL21 → WL23 → CTA visiteur ; événement complet (jeu D2) → CTA désactivé.

### 1.5 · Pages éditoriales — M

- **WL09** `/legal/[doc]` (`cgu`, `mentions-legales`, `confidentialite`) en `Tabs` liens ; section
  `#consentement-parental` dans les CGU (cible du footer, D17 : qui valide, ce que voit le parent D20, 7 jours D21,
  effet d'un refus D22) ; corrections S3, D6, D15, D23, D40 de la spec 1.6 ; « Dernière mise à jour » lue dans le
  MDX. Texte à valider juridiquement (D6).
- **WL10** `/a-propos` : statique, chiffres de `content/site.ts`, équipe adulte uniquement.
- **WL17** `/blog`, **WL18** `/blog/[slug]` : MDX, à la une + secondaires, pagination statique dès qu'une page
  déborde, fil d'Ariane, conteneur 760 px, liens de partage ; mineurs selon D15 (relecture éditoriale).
- **WL20** `/guides` : PDF dans `public/guides/`, téléchargement libre (D14) ; encart newsletter au **vouvoiement**
  (parents et enseignants, C12), Email* + case de consentement non cochée → `POST public/leads/` (API-L1). Le reste
  de l'étape ne dépend d'aucune API et peut être développé avant API-L1.
- **Tests** : Vitest (formulaire newsletter : consentement obligatoire, erreur `VALIDATION_ERROR`) ; Playwright :
  footer → CGU#consentement-parental ; onglets légaux par URL ; blog → article ; newsletter acceptée.
- **Recette** : aucune mention « moins de 16 ans » ni « numéro » de l'apprenant (grep CI sur `src/content`).

### 1.6 · Formulaires B2B et aide — M

- **WL11** `/ecoles` : 3 offres de `content/site.ts` (sans « tableau de bord établissement » ni « API &
  intégrations », D61) ; **tous les CTA** défilent vers `#devis` avec l'offre présélectionnée (`?offre=`, D13) ;
  formulaire au vouvoiement : Établissement*, Personne à contacter*, Email*, Téléphone* (`PhoneInput`), offre,
  message → confirmation en place.
- **WL24** `/aide` : FAQ statique `content/faq/` (compte et consentement, Mobile Money, kits et livraison,
  événements, mot de passe oublié : apprenant → son parent, parent → `/mot-de-passe-oublie`) ; formulaire de contact :
  Nom*, Email ou téléphone*, Sujet* (`?sujet=` présélectionne : `question`, `paiement`, `livraison`,
  `changement-parent`, `candidature`, `autre`), Message* ; ancres `#faq` et `#contact`.
- **API** (API-L1, API-1) : `POST public/quote-requests/`, `POST public/contact-messages/`,
  `GET referentials/countries/` (lu côté serveur en cache, passé à `PhoneInput`).
- **Tests** : Vitest (validation, mapping des `fields`, `THROTTLED`) ; Playwright « devis » (CTA d'offre → formulaire
  présélectionné → envoi → confirmation ; email reçu dans Mailpit) et « contact » (`/aide?sujet=candidature`).

## Neutralisation des écrans reportés et fusionnés

| Écran | Traitement |
| --- | --- |
| WL13 Défis | Onglet retiré de `PublicNav` |
| WL15 Tutoriels, WL19 Communauté | Retirés du mega-menu « Ressources » (reste : Blog, Événements, Guides) |
| WL08 Ateliers | Retiré du mega-menu ; aucune route ; « Steamy Events » du footer → WL21 |
| WL12 Profil public, WL14 Classements | Aucun lien (cartes, footer, articles) |
| Tous | Aucune route créée : une URL saisie tombe sur `not-found.tsx`. Test Playwright : aucun `href` vers `/defis`, `/communaute`, `/tutoriels`, `/classements`, `/ateliers` |

## Arborescence des routes

```
src/app/
├── layout.tsx            Nunito, metadata racine, OfflineGate (WX01)
├── error.tsx · global-error.tsx · not-found.tsx · loading.tsx      (WX02, 404, WX03)
├── robots.ts · sitemap.ts · icon.png · apple-icon.png
├── runtime-config/route.ts                                          (existant)
└── (public)/
    ├── layout.tsx        PublicShell
    ├── error.tsx
    ├── page.tsx                          WL01  /
    ├── parcours/page.tsx                 WL06  /parcours?categorie=
    ├── parcours/[slug]/page.tsx          WL22
    ├── categories/page.tsx               WL16
    ├── boutique/page.tsx                 WL07  (boutique/[slug] = WK02, lot 3)
    ├── evenements/page.tsx               WL21
    ├── evenements/[slug]/page.tsx        WL23
    ├── ecoles/page.tsx                   WL11  #devis
    ├── a-propos/page.tsx                 WL10
    ├── blog/page.tsx · blog/[slug]/page.tsx   WL17 · WL18
    ├── guides/page.tsx                   WL20
    ├── legal/[doc]/page.tsx              WL09  cgu · mentions-legales · confidentialite
    └── aide/page.tsx                     WL24  #faq · #contact · ?sujet=
src/components/{ds,public,states}/ · src/content/{legal,blog,guides,faq,site.ts}
src/lib/{api-public,api-errors,routes}.ts · e2e/
```

## Composants du design system

| Lot | Composants |
| --- | --- |
| **1 (créés ici)** | DS : `Icon`, `Logo`, `Mascot`, `Button` (+ `outline-inverse`), `Badge`, `Tag`, `Avatar`, `Loader`, `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `PhoneInput`, `Toast`, `Tabs`, `SkeletonBlock`, `CourseCard`, `WKKitCard` (vitrine). DS (suite) : `Accordion`, `FaqAccordion`, `Breadcrumb`. Public : `PublicShell`, `PublicNav` + `MegaMenu`, `NavAccount`, `PublicFooter`, `WLJoinBanner`, `WLSectionHead`, `WLPillarCard`, `WLStep`, `WLSocial`, `CategoryCard`, `EventRow`, `EventDetail` (réutilisés dans les shells connectés), `BlogCard`, `GuideCard`, `OfferCard`. États : `WXState`, `AppStateBoundary`, `OfflineGate` |
| 2 | `WebShell`, `PasswordInput`, `NewPasswordFields`, `OTPInput`, `PwReq` (D25), `GoalChip`, `AvatarPicker`, `ProgressSteps`, `UserTypeCard`, `ChoiceCard`, `Modal` (premier besoin), `Celebration`, `ConsentRequestCard` |
| 3 | `AppShell`, `StatPill`, `ProgressBar`, `Medal`, `MissionItem`, `Quiz`, `QuizAttemptRow`, `NotifItem`, `Toggle`, `SectionHeader`, `SettingsRow`, `QuickActionTile`, `Section`, `InfoCard`, `WANetworkCard`, `PaymentForm`, `PaymentStatusPanel`, `AddressForm`, `ShippingTimeline`, `VimeoPlayer`, `KitCodeInput` ; activation du cœur de `CourseCard` et du panier de `WKKitCard` |
| 6 | `AdminShell` et primitives data-viz `Sparkline`, `BarChart`, `DonutChart`, `StatCard`, `DataTable`, `SegmentedControl`, rangés dans `src/components/backoffice/` (réservés au back-office, §2.5) |

## Dépendances vers l'API

| Étape du lot | Requiert | Endpoints (SPEC-TECHNIQUE §7) |
| --- | --- | --- |
| 1.0a, 1.0b | — | — |
| 1.0c | API-1 (client régénéré, `make seed` D2, renommage CSRF par API-1.2) | `GET auth/csrf/` |
| 1.1 | API-L1 | `catalog/categories/`, `catalog/courses/` |
| 1.2 | — | — |
| 1.3 | API-L1 + 1.2 | `catalog/courses/{slug}/` |
| 1.4 | API-L1 + 1.2 | `events/`, `events/{slug}/`, `shop/kits/` |
| 1.5 | API-L1 pour WL20 seulement | `public/leads/` |
| 1.6 | API-1 + API-L1 + 1.2 | `public/quote-requests/`, `public/contact-messages/`, `referentials/countries/` |

Ordre conseillé : 1.0a → 1.0b → 1.0c → (1.2 et 1.5 en parallèle, sans API) → 1.1 → 1.3 → 1.4 → 1.6.

**Besoins d'API intégrés à API-L1 et au §7** : `Course.featured` et `catalog/courses/?featured=` (WL01),
`courseCount` dans `catalog/categories/`, `events/?upcoming=` et `seatsLeft`, `Kit.category` et
`shop/kits/?category=` (catégories du référentiel `catalog/categories/`), `fields` détaillés et throttle dédié sur
les trois `POST public/*` (API-L1.4), jeu D2 couvrant chaque état (catégorie vide, événement complet, passé, payant,
gratuit).

## Risques

| Risque | Parade |
| --- | --- |
| Prérendu impossible : l'API n'existe pas au build de l'image | Données uniquement sous `Suspense` + `connection()` + `'use cache'` ; `next build` sans `API_URL` en CI comme garde-fou |
| `use cache` en mémoire par instance (k3s mono-nœud) : fraîcheur après publication | `cacheLife` court ; webhook de revalidation par tag envisagé au lot 6 |
| Next 16 diffère des habitudes (cache, `retry`, `params` asynchrones) | Lire `node_modules/next/dist/docs` avant chaque étape (AGENTS.md) |
| Liens vers des routes des lots 2 et 3 (`/connexion`, `/inscription`, WK02) | Liste blanche du test de liens, retirée au lot 2 ; WL07 en vitrine jusqu'au lot 3 ; ne pas mettre le lot 1 en production seul |
| Parcours Playwright lents ou instables sur la stack Docker | Web en image `prod` (`compose.e2e.yml`), `--wait` sur les healthchecks, jeu D2 rechargé à chaque run |
| Contenu éditorial (légal, blog, guides PDF, FAQ) non fourni | Gabarits MDX et contenus de départ ; validation juridique de WL09 (D6) suivie hors code |
| Canonical et indexation avec une image promue staging → prod | `metadataBase` = domaine de prod ; `noindex` posé par l'ingress de staging |
| Exposition de données de mineurs | Aucune donnée d'apprenant consommée au lot 1 ; relecture D15 des contenus ; test « pas de contenu de mission » sur WL22 |

## Points ouverts

| Point | Bloque |
| --- | --- |
| Validation juridique des textes légaux de WL09 et de la mention de finalité (D6) | Mise en production (pas le développement) |
| Contenus éditoriaux définitifs (blog, guides PDF, FAQ, chiffres vitrine) | Recette de 1.5 et 1.6 (gabarits de départ en attendant) |
| SVG du logo au texte vectorisé : le tagline de `logo_landscape.svg` est un `<text>` en police Agile, non embarquée (`Logo` utilise les PNG en attendant) | Rien (qualité d'affichage) |

## Critères de fin de lot

- Étapes 1.0a-1.6 fusionnées dans `development`, CI verte (`ci-ok` incluant `e2e`).
- Chaque écran v1 et à concevoir respecte la définition de « terminé » du README (360 px → bureau, tutoiement grand
  public et vouvoiement pour B2B, newsletter et contact, AA, états chargement/vide/erreur/hors ligne, aucune donnée
  en dur, tests).
- Parcours Playwright verts : découverte (WL01 → WL06 → WL22), événements (WL21 → WL23), devis, contact,
  newsletter, navigation clavier, hors ligne ; axe sans violation sérieuse sur toutes les routes publiques.
- `next build` : toutes les routes de `(public)` prérendues (statique ou partiel) ; `getServerApi` absent de
  `(public)`.
- Aucun lien vers WL08, WL12-WL15, WL19 ; aucun violet `rgba(91,63,224)` ni JetBrains Mono.
- WX01-WX03 et `getPublicApi` documentés dans `apps/web/README.md` pour réutilisation par les lots 2 à 6.
