import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Primitives du back-office (SPEC-TECHNIQUE §2.5) : importables seulement depuis `app/(backoffice)`.
const backofficeOnly = {
  group: ["@/components/backoffice", "@/components/backoffice/*", "**/components/backoffice", "**/components/backoffice/*"],
  message: "Primitives du back-office : import réservé à app/(backoffice).",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**"],
    ignores: ["src/app/(backoffice)/**", "src/components/backoffice/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [backofficeOnly] }] },
  },
  // Pages publiques (lot 1) : client anonyme `getPublicApi()` uniquement. `getServerApi()` et `next/headers`
  // liraient les cookies du visiteur et rendraient la page dynamique (SPEC-TECHNIQUE §1.2).
  {
    files: ["src/app/(public)/**", "src/components/public/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/lib/api", message: "Pages publiques : utiliser getPublicApi() (@/lib/api-public)." },
            { name: "next/headers", message: "Pages publiques : aucune lecture des cookies ni des en-têtes." },
          ],
          patterns: [
            { group: ["**/lib/api"], message: "Pages publiques : utiliser getPublicApi() (@/lib/api-public)." },
            backofficeOnly,
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Rapports Playwright
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
