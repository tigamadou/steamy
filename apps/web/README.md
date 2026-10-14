# @steamy/web

Front Next.js 16 de Steamy (App Router, Cache Components, TypeScript, Tailwind 4).

- Démarrage : `make up` à la racine du monorepo → http://localhost:3000
- Tokens du design system : `src/styles/tokens.css`, exposés en utilitaires Tailwind
  (`bg-primary-500`, `text-ink-900`…) dans `src/app/globals.css`
- Appels API : uniquement côté serveur via `getServerApi()` (`src/lib/api.ts`),
  typés par `@steamy/api-client`. L'URL vient de `API_URL`, lue à l'exécution.

⚠️ Next 16 diffère sensiblement des versions précédentes : voir `AGENTS.md`.
