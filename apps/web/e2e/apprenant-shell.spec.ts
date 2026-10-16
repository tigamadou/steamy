import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { DEMO, DEMO_PASSWORD } from "./support/demo";
import { loginAs, logoutFromShell, openShellMenu } from "./support/session";

// LOT-3 étape 3.0 · AppShell de l'apprenant (SPEC-ECRANS-2 §5.5) et WD16 (déconnexion), P7 « contrôle d'accès ».

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

test("l'apprenant connecté retrouve son shell : 5 entrées, profil, cloche et recherche", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Salut ${DEMO.learner.firstName} 👋`);
  await expect(page.getByRole("link", { name: /notifications? non lues?|aucune non lue/ })).toHaveAttribute(
    "href",
    "/apprenant/notifications",
  );
  await expect(page.locator('[title="Bientôt"]')).toHaveCount(0);
  await axe(page);

  await openShellMenu(page);
  const nav = page.getByRole("navigation", { name: "Navigation de ton espace" });
  await expect(nav.getByRole("link")).toHaveText(["Accueil", "Mes parcours", "Catalogue", "Mes souhaits", "Profil"]);
  await expect(nav.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Léa A.", { exact: true })).toBeVisible();
  await expect(page.getByText(/· Cotonou$/)).toBeVisible();
  await axe(page);

  const search = page.getByRole("searchbox", { name: "Rechercher un parcours" }).filter({ visible: true });
  await search.fill("robot");
  await search.press("Enter");
  await expect(page).toHaveURL("/apprenant/catalogue?q=robot");
});

test("un parent qui ouvre l'espace apprenant est renvoyé vers le sien", async ({ page }) => {
  await loginAs(page, "parent");
  await page.goto("/apprenant");
  await expect(page).toHaveURL("/parent");
});

test("sans session, l'espace apprenant renvoie à la connexion puis revient à la page demandée", async ({ page }) => {
  await page.goto("/apprenant?depuis=e2e");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fapprenant%3Fdepuis%3De2e$/);
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(DEMO.learner.identifier);
  await page.getByLabel(/^Mot de passe/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/apprenant?depuis=e2e");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(DEMO.learner.firstName);
});

test("WD16 : la modale de déconnexion s'annule au clavier puis déconnecte", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant");

  await openShellMenu(page);
  await page.getByRole("button", { name: "Déconnexion" }).click();
  const dialog = page.getByRole("dialog", { name: "Déjà l'heure de partir ?" });
  await expect(dialog).toBeVisible();
  await axe(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await logoutFromShell(page);
  await expect(page).toHaveURL("/connexion");
  await page.goto("/apprenant");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fapprenant$/);
});

test("à 360 px, la navigation est un tiroir qui se ferme par Échap", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await loginAs(page, "learner");
  await page.goto("/apprenant");
  const nav = page.getByRole("navigation", { name: "Navigation de ton espace" });
  await expect(nav).toBeHidden();
  const menu = page.getByRole("button", { name: "Ouvrir le menu" });
  await openShellMenu(page);
  await expect(nav).toBeVisible();
  // Tiroir modal : le reste de la page est inerte
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await expect(page.locator("[inert] main#contenu")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(menu).toBeFocused();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
