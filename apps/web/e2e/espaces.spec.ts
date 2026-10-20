import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { DEMO } from "./support/demo";
import { loginAs, logoutFromShell } from "./support/session";

// Socle du lot 2 (étape 2.0) : garde optimiste (`proxy.ts`), garde de rôle des layouts et cookies de session
// partagés entre le web et l'API, validés par un vrai `POST auth/login/`.

test("un visiteur sans session est renvoyé vers la connexion avec le chemin demandé", async ({ page }) => {
  await page.goto("/parent/enfants/3?onglet=progres");
  const url = new URL(page.url());
  expect(url.pathname).toBe("/connexion");
  expect(url.searchParams.get("next")).toBe("/parent/enfants/3?onglet=progres");
});

for (const role of ["learner", "parent", "teacher"] as const) {
  test(`le compte ${role} du jeu de démo atteint son espace après un vrai POST auth/login/`, async ({ page }) => {
    await loginAs(page, role);
    await page.goto(DEMO[role].home);
    await expect(page).toHaveURL(DEMO[role].home);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(DEMO[role].firstName);
  });
}

test("un apprenant qui ouvre l'espace parent est renvoyé vers le sien", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/parent");
  await expect(page).toHaveURL("/apprenant");
});

test("une session invalide est traitée comme expirée", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "sessionid", value: "perimee", url: baseURL! }]);
  await page.goto("/enseignant");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fenseignant$/);
});

test("la déconnexion ferme la session et l'espace redevient inaccessible", async ({ page }) => {
  await loginAs(page, "parent");
  await page.goto("/parent");
  await logoutFromShell(page);
  await expect(page).toHaveURL("/connexion");
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fparent$/);
});

test("la page d'attente d'un espace ne présente aucune violation d'accessibilité", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
});
