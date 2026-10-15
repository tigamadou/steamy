import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Étape 1.1 du lot 1 : parcours « découverte » sur le jeu de démonstration D2 (6 catégories, dont « Énergie »
// sans parcours ; « L'IA pour les curieux » en brouillon, donc invisible).

const CATEGORIES = ["Robotique", "Électronique", "Code", "IA", "Mécanique", "Énergie"];

test("découverte : accueil → ancre → catalogue → filtre → catégories → catalogue filtré", async ({ page }) => {
  await page.goto("/");
  const popular = page.getByRole("heading", { level: 3 }).filter({ visible: true });
  await expect(page.locator("article")).toHaveCount(3);
  await expect(popular.first()).toBeVisible();

  await page.getByRole("link", { name: "Comment ça marche" }).click();
  await expect(page).toHaveURL("/#comment-ca-marche");
  await expect(page.getByRole("heading", { level: 2, name: "Comment ça marche" })).toBeInViewport();

  await page.getByRole("link", { name: "Explorer tout le catalogue" }).click();
  await expect(page).toHaveURL("/parcours");
  const filters = page.getByRole("navigation", { name: "Filtrer par catégorie" });
  await expect(filters.getByRole("link")).toHaveText(["Tous", ...CATEGORIES]);
  await expect(page.getByText("L'IA pour les curieux")).toHaveCount(0);

  await filters.getByRole("link", { name: "Code" }).click();
  await expect(page).toHaveURL("/parcours?categorie=code");
  await expect(filters.getByRole("link", { name: "Code" })).toHaveAttribute("aria-current", "true");
  await page.reload();
  await expect(page.getByRole("link", { name: "Initiation à Scratch" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Découverte de la robotique" })).toHaveCount(0);

  await page.getByRole("link", { name: "Toutes les catégories" }).click();
  await expect(page).toHaveURL("/categories");
  for (const label of CATEGORIES) {
    await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: "Robotique", exact: true }).click();
  await expect(page).toHaveURL("/parcours?categorie=robotique");
  await expect(
    page.getByRole("link", { name: "Construis ton robot Bluetooth" }).filter({ visible: true }),
  ).toBeVisible();
});

test("WL06 : une catégorie sans parcours affiche l'état vide", async ({ page }) => {
  await page.goto("/parcours?categorie=energie");
  await expect(page.getByText("Aucun parcours dans cette catégorie")).toBeVisible();
  await page.getByRole("link", { name: "Voir tout" }).click();
  await expect(page).toHaveURL("/parcours");
});

test("WL01, WL06, WL16 ne présentent aucune violation d'accessibilité", async ({ page }) => {
  for (const path of ["/", "/parcours", "/categories"]) {
    await page.goto(path);
    await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations, path).toEqual([]);
  }
});
