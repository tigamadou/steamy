import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vitest parallélise par fichier et prend ≈ un worker par cœur : trop quand plusieurs agents tournent ensemble
// (docs/infra/agents.md). Dans un environnement d'agent (AGENT_LOT), 2 workers ; `VITEST_MAX_WORKERS`, lue nativement
// par Vitest, garde la priorité.
export function agentMaxWorkers(env: Record<string, string | undefined>): number | undefined {
  return env.AGENT_LOT && !env.VITEST_MAX_WORKERS ? 2 : undefined;
}

// Tests de composants (Vitest + Testing Library), colocalisés : `*.test.tsx`.
// Les Server Components async ne sont pas testables ici : ils relèvent de Playwright (e2e/).
export default defineConfig({
  // MDX du contenu éditorial (src/content/), compilé comme par @next/mdx
  plugins: [{ enforce: "pre", ...mdx() }, react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "e2e/fausse-api/**/*.test.ts"],
    css: false,
    maxWorkers: agentMaxWorkers(process.env),
    // Rapport cobertura lu par diff-cover en CI : 100 % exigé sur le code ajouté ou modifié (`make coverage-web`)
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/**/*.d.ts"],
      reporter: ["text-summary", "cobertura"],
    },
  },
});
