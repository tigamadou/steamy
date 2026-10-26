import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Aucune violation WCAG 2 A/AA, et aucun défilement horizontal (même à 360 px, où un débordement décale les clics). */
export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}
