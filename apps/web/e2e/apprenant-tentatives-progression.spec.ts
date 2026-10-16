import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { decideConsent, uniquePhone } from "./support/api";
import { loginAs } from "./support/session";
import { completeLearnerProfile, sendConsentRequest, startLearnerSignup } from "./support/signup";

// LOT-3 étape 3.4 · Tentatives de quiz (WD07-WD09) et progression (WD21). Jeu D2 : Léa a des tentatives `ok`,
// `warn` et `ko` sur « Découverte de la robotique », un streak et du temps d'apprentissage.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

test("WD07 → WD08 : bandeau, filtre par statut dans l'URL, détail d'une tentative", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/quiz");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes tentatives de quiz");
  await expect(page.getByText("Taux de réussite")).toBeVisible();
  await axe(page);

  await page.getByRole("link", { name: "Réussis" }).click();
  await expect(page).toHaveURL("/apprenant/quiz?statut=ok");
  await expect(page.getByRole("link", { name: "Réussis" })).toHaveAttribute("aria-current", "page");
  const rows = page.getByRole("list", { name: "Tes tentatives" }).getByRole("link");
  await expect(rows.first()).toContainText("Réussi");
  await page.reload();
  await expect(page.getByRole("link", { name: "Réussis" })).toHaveAttribute("aria-current", "page");

  await rows.first().click();
  await expect(page).toHaveURL(/\/apprenant\/quiz\/\d+$/);
  await expect(page.getByText(/bonnes? réponses? sur \d+ · seuil \d+ %/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir le parcours" })).toHaveAttribute("href", /\/apprenant\/parcours\/[\w-]+$/);
  await axe(page);
});

test("WD21 : progression de la semaine, histogramme accessible, maîtrise par catégorie", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/profil/progression");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ma progression");
  await expect(page.getByText("Cette semaine")).toBeVisible();
  await expect(page.getByRole("table", { name: "Temps d'apprentissage des 7 derniers jours" }).getByRole("row")).toHaveCount(8);
  await expect(page.getByRole("heading", { name: "Maîtrise par catégorie" })).toBeVisible();
  await axe(page);
});

test("WD09 : un nouvel apprenant n'a pas encore de quiz", async ({ page }) => {
  test.setTimeout(90_000);
  await startLearnerSignup(page);
  const phone = uniquePhone();
  const link = await sendConsentRequest(page, phone);
  await decideConsent(link, phone, { accept: true });
  await page.goto("/inscription/apprenant/mot-de-passe");
  await completeLearnerProfile(page, "Robot2026x");
  await page.goto("/apprenant/quiz");
  await expect(page.getByRole("heading", { name: "Pas encore de quiz" })).toBeVisible();
  await expect(page.getByText(/classement/)).toHaveCount(0);
  await axe(page);
  await page.getByRole("link", { name: /Voir mes parcours en cours/ }).click();
  await expect(page).toHaveURL("/apprenant/parcours");
});
