import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { extractCode, extractLink, waitForMessage } from "./support/mailpit";

// Activation enseignant (C6) puis mot de passe oublié par email (LOT-2-AUTH, étape 2.2, P6).
// L'invitation du jeu de démo est à usage unique : parcours en série, sur le seul projet « bureau » (étiquette
// `@donnees-uniques`, exclue du projet « mobile » dans playwright.config.ts).
const INVITED = "nadia.houngbo@steamy.test";

test.describe.configure({ mode: "serial" });

test.describe("activation enseignante", { tag: "@donnees-uniques" }, () => {
  let activationPath = "";

  test("une enseignante invitée active son compte depuis le lien de l'email", async ({ page }) => {
    const invitation = await waitForMessage(INVITED, { contains: "Activez votre compte" });
    activationPath = extractLink(invitation, "/activation/").pathname;

    const response = await page.goto(activationPath);
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Activer votre compte");
    await expect(page).toHaveURL("/activation");
    await expect(page.getByText(/n•*@steamy\.test|@steamy\.test/)).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);

    await page.getByLabel(/^Mot de passe/).fill("NadiaActive2026");
    await page.getByLabel(/^Confirmez le mot de passe/).fill("NadiaActive2026");
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page).toHaveURL("/enseignant");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nadia");
  });

  test("le lien d'activation déjà utilisé est refusé", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(activationPath);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lien expiré ou déjà utilisé");
    await expect(page.getByRole("link", { name: "Contacter l'équipe Steamy" })).toBeVisible();
  });

  test("l'enseignante réinitialise son mot de passe par email (WL02-WL05)", async ({ page }) => {
    await page.goto("/mot-de-passe-oublie");
    await page.getByRole("button", { name: "Vous êtes enseignant ? Recevoir le code par email" }).click();
    const since = new Date();
    await page.getByRole("textbox", { name: /Adresse email/ }).fill(INVITED);
    await page.getByRole("button", { name: "Recevoir le code" }).click();
    await expect(page).toHaveURL("/mot-de-passe-oublie/code");
    const code = extractCode(await waitForMessage(INVITED, { since }));
    await page.getByLabel("Code à 6 chiffres reçu par email").fill(code);
    await page.getByRole("button", { name: "Vérifier le code" }).click();
    await page.getByLabel(/^Nouveau mot de passe/).fill("NadiaReset2026");
    await page.getByLabel(/^Confirmez le mot de passe/).fill("NadiaReset2026");
    await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
    await expect(page).toHaveURL("/mot-de-passe-oublie/termine");

    await page.goto("/connexion");
    await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(INVITED);
    await page.getByLabel(/^Mot de passe/).fill("NadiaReset2026");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL("/enseignant");
  });
});
