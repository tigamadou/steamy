# @steamy/web

Front Next.js 16 de Steamy (App Router, Cache Components, TypeScript, Tailwind 4).

- Démarrage : `make up` à la racine du monorepo → http://localhost:3000
- Tokens du design system : `src/styles/tokens.css`, exposés en utilitaires Tailwind
  (`bg-primary-500`, `text-ink-900`…) dans `src/app/globals.css`
- Design system : `src/components/ds/` (un dossier par composant, export nommé, test colocalisé),
  importé depuis `@/components/ds`. Couleurs par tokens uniquement : aucun hex ni `rgba` hors `tokens.css`,
  aucun texte en `--ink-400`. Les composants porteurs d'un référentiel (`PhoneInput`) reçoivent leurs données
  en props et n'appellent pas l'API.
- Tests : `make test-web` (Vitest + Testing Library, `*.test.tsx` colocalisés, `vitest-axe` via `@/test/axe`) ;
  `make e2e` (Playwright sur la stack Docker, `e2e/`, web en image `prod`, voir `compose.e2e.yml`).
- Appels API, typés par `@steamy/api-client` (URL lue à l'exécution, jamais au build) :
  - **pages publiques** (`app/(public)/`) : `getPublicApi()` (`src/lib/api-public.ts`), client **anonyme** sans
    cookies ni en-têtes, délai court. À appeler dans une fonction `'use cache'` (`cacheTag`, `cacheLife`), depuis un
    composant placé sous `<Suspense>` qui fait `await connection()` : l'API n'est pas joignable au build de l'image.
    `getServerApi()` et `next/headers` y sont interdits (règle ESLint) : ils rendraient la page dynamique ;
  - **espaces connectés** : `getServerApi()` (`src/lib/api.ts`, relaie la session) côté serveur,
    `getBrowserApi()` (`src/lib/api-browser.ts`, CSRF via `/api/auth/csrf/`) dans les composants client.
- URL : toujours via `routes` (`src/lib/routes.ts`), table unique utilisée par la navigation, le pied de page et les
  tests ; retour après connexion par le seul paramètre `?next=`.
- Site public : `PublicShell` (`src/components/public/`), servi par `app/(public)/layout.tsx` : lien d'évitement,
  `PublicNav` (mega-menu « Ressources », tiroir mobile, emplacement `NavAccount`), `<main id="contenu">`,
  `PublicFooter`.
- Contenu éditorial (D10) dans `src/content/` : MDX (`@next/mdx`, typographie dans `components/public/mdx.tsx`)
  exportant `metadata`, recensé par un `index.ts` par dossier (`blog`, `legal`) ; guides PDF dans `public/guides/` ;
  FAQ et textes de marque en TS. `src/content/content.test.ts` refuse « moins de 16 ans » et tout numéro d'apprenant.

## Back-office (lot 6, WAD01-WAD05)

- `app/(backoffice)/` : layout gardé par `BackofficeGate` (personnel `isStaff` + `otpVerified`, sinon connexion de
  l'admin Django WAD15 `<PUBLIC_API_URL>/admin/login/?next=<origine>/backoffice/…`), `noindex`. Chaque page
  restreinte appelle `requireGroups(PAGE_GROUPS.…)` (`lib/backoffice/`) : hors groupe → `/backoffice/acces-refuse`.
- `components/backoffice/` : `AdminShell` (navigation par groupes D71, Plateforme et Système vers l'admin Django),
  `AdminHeader`/`AdminContent` par page, primitives data-viz (`Sparkline`, `BarChart`, `DonutChart`, `StatCard`,
  `DataTable`, `SegmentedControl`) et de statut (`SourceTag`, `KpiStatusBadge`, `StatusBadge`, `DeadlineTracker`).
  Import interdit hors de `app/(backoffice)` (ESLint) ; monochrome, aucun `--primary-*` (`monochrome.test.ts`).
- e2e : `e2e/support/staff.ts` (`staffLogin`, code TOTP de développement).

## États transversaux (WX01-WX03)

Implémentés une fois dans `src/components/states/` (SPEC-ECRANS-3 §6), textes par registre (`tu`, `vous`,
`neutre`) dans `messages.ts`. Chaque espace ne choisit que son registre :

| État | Où | Réutilisation |
| --- | --- | --- |
| WX01 hors ligne | `OfflineGate`, monté une fois dans `app/layout.tsx` (événements `online`/`offline`, `router.refresh()` au retour) | Rien à faire : le registre suit l'URL (`registerOf`) |
| WX02 erreur | `app/error.tsx`, `app/(public)/error.tsx`, `app/global-error.tsx` | Un `error.tsx` par espace : `<ErrorState register="vous" onRetry={retry} onBack={router.back} />` ; erreur d'une section seule : `<AppStateBoundary register="…">` (WX02 réduit, `catchError`) |
| WX03 chargement long | `app/loading.tsx` (`LoadingState`) | Attentes longues seulement ; une grille affiche un `SkeletonBlock` dans son `<Suspense>` |
| 404 | `app/not-found.tsx` (`NotFoundState` dans `PublicShell`) | `notFound()` dans une page |

Pas de « mode hors ligne » (D16) ; jamais de spinner nu : tout délai est verbalisé.

⚠️ Next 16 diffère sensiblement des versions précédentes : voir `AGENTS.md`.
