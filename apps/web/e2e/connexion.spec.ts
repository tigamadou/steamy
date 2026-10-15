import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { DEMO, DEMO_PASSWORD } from "./support/demo";

// W16 · Connexion (LOT-2-AUTH, étape 2.1) : un seul écran pour les trois rôles, retour `next` sûr.

async function signIn(page: Page, identifier: string, password: string = DEMO_PASSWORD) {
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(identifier);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

for (const role of ["learner", "parent", "teacher"] as const) {
  test(`W16 connecte le compte ${role} du jeu de démo dans son espace`, async ({ page }) => {
    await page.goto("/connexion");
    // Le parent saisit son numéro national : le Bénin est présélectionné (C7)
    await signIn(page, role === "parent" ? "01 90 00 00 01" : DEMO[role].identifier);
    await expect(page).toHaveURL(DEMO[role].home);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(DEMO[role].firstName);
  });
}

test("W16 ramène à la page demandée et ignore un `next` externe", async ({ page }) => {
  await page.goto("/apprenant");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fapprenant$/);
  await signIn(page, DEMO.learner.identifier);
  await expect(page).toHaveURL("/apprenant");

  await page.context().clearCookies();
  await page.goto("/connexion?next=https://evil.example/apprenant");
  await signIn(page, DEMO.parent.identifier);
  await expect(page).toHaveURL("/parent");
});

test("W16 renvoie un message unique, y compris pour un compte du personnel", async ({ page }) => {
  await page.goto("/connexion");
  await signIn(page, DEMO.learner.identifier, "mauvais-mot-de-passe1");
  const alert = page.getByRole("alert").filter({ hasText: "Connexion impossible" });
  await expect(alert).toContainText("Identifiant ou mot de passe incorrect.");

  await signIn(page, "superadmin@steamy.test");
  await expect(alert).toContainText("Identifiant ou mot de passe incorrect.");
  await expect(page).toHaveURL("/connexion");
});

test("W16 renvoie un utilisateur déjà connecté vers son espace, et un apprenant hors de l'espace parent", async ({
  page,
}) => {
  await page.goto("/connexion");
  await signIn(page, DEMO.learner.identifier);
  await expect(page).toHaveURL("/apprenant");
  await page.goto("/connexion");
  await expect(page).toHaveURL("/apprenant");
  await page.goto("/parent");
  await expect(page).toHaveURL("/apprenant");
});

test("W16 : la déconnexion ramène à la connexion", async ({ page }) => {
  await page.goto("/connexion");
  await signIn(page, DEMO.teacher.identifier);
  await expect(page).toHaveURL("/enseignant");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL("/connexion");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bon retour");
});

test("W16 : « Mot de passe oublié ? » oriente selon le profil (D26)", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
  await page.getByRole("button", { name: "Je suis apprenant" }).click();
  await expect(page.getByRole("dialog")).toContainText("Demande à ton parent");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("W16 ne présente aucune violation d'accessibilité", async ({ page }) => {
  await page.goto("/connexion");
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
});
