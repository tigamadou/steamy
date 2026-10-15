import { configureAxe } from "vitest-axe";

/**
 * axe pour les tests de composants. jsdom ne calcule pas le rendu : la règle de contraste
 * y est inopérante et vérifiée par Playwright (`@axe-core/playwright`) sur les pages réelles.
 */
export const axe = configureAxe({
  rules: { "color-contrast": { enabled: false } },
});
