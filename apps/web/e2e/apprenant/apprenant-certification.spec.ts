import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAs } from "../support/session";

// LOT-3 étape 3.3c · WJ07 (certification obtenue) et WJ09 (parcours incomplet), jeu D2 : Léa a terminé et
// certifié « Initiation à Scratch », et suit « Découverte de la robotique ».

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

test("WJ07 : certificat lu dans l'API, PDF téléchargeable une fois prêt", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/parcours/initiation-scratch/certification");
  await expect(page.getByText("Certification Steamy")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Initiation à Scratch" })).toBeVisible();
  await expect(page.getByText(/n° CERT-/)).toBeVisible();
  await axe(page);
  // Le PDF est généré par le worker (D33) : « Préparation… » puis le lien, sans recharger la page
  const download = page.getByRole("link", { name: "Télécharger la certification (PDF)" });
  await expect(download).toBeVisible({ timeout: 30_000 });
  const [file] = await Promise.all([page.waitForEvent("download"), download.click()]);
  expect(file.suggestedFilename()).toMatch(/\.pdf$/);
});

test("WJ09 : parcours incomplet, ce qu'il reste à faire et reprise", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/parcours/decouverte-robotique/certification");
  await expect(page.getByRole("heading", { name: "Encore un effort !" })).toBeVisible();
  await expect(page.getByText(/Il te reste \d+ (projets?|missions?) pour obtenir ta certification/)).toBeVisible();
  await expect(page.getByText(/parent/)).toHaveCount(0);
  await axe(page);
  await page.getByRole("link", { name: /Continuer le projet \d+/ }).click();
  await expect(page).toHaveURL(/\/apprenant\/parcours\/decouverte-robotique\/(missions|quiz)\/\d+$/);
});
