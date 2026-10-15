import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Tests de composants (Vitest + Testing Library), colocalisés : `*.test.tsx`.
// Les Server Components async ne sont pas testables ici : ils relèvent de Playwright (e2e/).
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    // Rapport cobertura lu par diff-cover en CI : 100 % exigé sur le code ajouté ou modifié (`make coverage-web`)
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/**/*.d.ts"],
      reporter: ["text-summary", "cobertura"],
    },
  },
});
