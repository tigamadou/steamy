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
- Appels API : uniquement côté serveur via `getServerApi()` (`src/lib/api.ts`),
  typés par `@steamy/api-client`. L'URL vient de `API_URL`, lue à l'exécution.

⚠️ Next 16 diffère sensiblement des versions précédentes : voir `AGENTS.md`.
