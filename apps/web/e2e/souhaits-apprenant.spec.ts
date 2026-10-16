import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signUpFreshLearner } from "./support/learner";
import { loginAs } from "./support/session";

// LOT-3 étape 3.2 · Mes souhaits WW01-WW03 (SPEC-ECRANS-2 §5.8), parcours P7 « souhaits avec annulation ».
// Un apprenant neuf par test : les projets « bureau » et « mobile » ne partagent aucun souhait.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

const heart = (page: Page, title: string) =>
  page.getByRole("button", { name: `Ajouter « ${title} » à ma liste de souhaits` });

test("WW01 : les souhaits du jeu de démo, triés", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/souhaits");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes souhaits");
  await expect(page.getByText(/^\d+ parcours sauvegardés?$/)).toBeVisible();
  await page.getByRole("button", { name: /^Trier ·/ }).click();
  await page.getByRole("menuitemradio", { name: "Titre" }).click();
  await expect(page).toHaveURL("/apprenant/souhaits?tri=titre");
  await expect(page.getByRole("button", { name: /^Trier ·/ })).toContainText("Titre");
  await axe(page);
});

test("P7 souhaits : ajouter depuis WC01, retirer depuis WW01, annuler, recharger", async ({ page }) => {
  test.setTimeout(150_000);
  await signUpFreshLearner(page);

  // WW02 : aucun souhait
  await page.goto("/apprenant/souhaits");
  await expect(page.getByRole("heading", { level: 2, name: "Aucun parcours en souhaits" })).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: "Découvrir le catalogue" }).click();
  await expect(page).toHaveURL("/apprenant/catalogue");

  // WC01 : cœur distinct du lien de la carte
  await heart(page, "Initiation à Scratch").click();
  await expect(heart(page, "Initiation à Scratch")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status")).toContainText("Parcours ajouté à tes souhaits");
  await expect(page).toHaveURL("/apprenant/catalogue");

  // WW01 puis WW03 : retrait optimiste, « Annuler »
  await page.goto("/apprenant/souhaits");
  await expect(page.getByText("1 parcours sauvegardé", { exact: true })).toBeVisible();
  await heart(page, "Initiation à Scratch").click();
  await expect(page.getByRole("heading", { level: 2, name: "Aucun parcours en souhaits" })).toBeVisible();
  const toast = page.getByRole("status").filter({ hasText: "Parcours retiré des souhaits" });
  await expect(toast).toBeVisible();
  await axe(page);
  await toast.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("link", { name: "Initiation à Scratch" })).toBeVisible();

  // L'annulation est enregistrée côté serveur
  await page.reload();
  await expect(page.getByRole("link", { name: "Initiation à Scratch" })).toBeVisible();

  // Retrait définitif
  await heart(page, "Initiation à Scratch").click();
  await expect(page.getByRole("heading", { level: 2, name: "Aucun parcours en souhaits" })).toBeVisible();
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Aucun parcours en souhaits" })).toBeVisible({
      timeout: 2000,
    });
  }).toPass();
});
