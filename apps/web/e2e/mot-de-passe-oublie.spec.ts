import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { createParent, uniquePhone } from "./support/api";
import { extractCode, waitForSms } from "./support/mailpit";
import { loginViaApi } from "./support/session";

// WL02-WL05 · Mot de passe oublié du parent par SMS (LOT-2-AUTH, étape 2.2, D26)

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

async function requestCode(page: Page, phone: string) {
  await page.goto("/mot-de-passe-oublie");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pas de panique !");
  // Numéro national : le Bénin est présélectionné
  await page.getByRole("textbox", { name: /Numéro de téléphone/ }).fill(phone.slice(4));
  await page.getByRole("button", { name: "Recevoir le code", exact: true }).click();
  await expect(page).toHaveURL("/mot-de-passe-oublie/code");
}

test("WL02 → WL05 : un parent réinitialise par SMS, se reconnecte, et son ancienne session est fermée", async ({
  page,
  browser,
}) => {
  const { phone } = await createParent();
  const elsewhere = await browser.newPage();
  await loginViaApi(elsewhere, phone);
  await elsewhere.goto("/parent");
  await expect(elsewhere).toHaveURL("/parent");

  await page.goto("/mot-de-passe-oublie");
  await axe(page);
  const since = new Date();
  await requestCode(page, phone);
  await expect(page.getByText(/vient d'être envoyé à \+229 01 •• •• •• \d\d/)).toBeVisible();
  await axe(page);
  const code = extractCode(await waitForSms(phone, { since }));
  await page.getByLabel("Code à 6 chiffres reçu par SMS").fill(code);
  await page.getByRole("button", { name: "Vérifier le code" }).click();

  await expect(page).toHaveURL("/mot-de-passe-oublie/nouveau");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Choisissez un nouveau mot de passe");
  await expect(page.getByText("Différent de l'ancien")).toHaveCount(0);
  await axe(page);
  await page.getByLabel(/^Nouveau mot de passe/).fill("NouveauMdp2026");
  await page.getByLabel(/^Confirmez le mot de passe/).fill("NouveauMdp2026");
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();

  await expect(page).toHaveURL("/mot-de-passe-oublie/termine");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mot de passe réinitialisé !");
  await axe(page);
  await page.getByRole("link", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/connexion");
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(phone);
  await page.getByLabel(/^Mot de passe/).fill("NouveauMdp2026");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/parent");

  await elsewhere.reload();
  await expect(elsewhere).toHaveURL(/\/connexion\?next=%2Fparent$/);
});

test("WL02 répond de même pour un numéro inconnu ; WL03 bloque la saisie après les essais permis", async ({ page }) => {
  await requestCode(page, uniquePhone());
  const otp = page.getByLabel("Code à 6 chiffres reçu par SMS");
  const tooMany = page.getByText("Trop d'essais avec ce code. Demandez un nouveau code.");
  for (let attempt = 0; attempt < 4 && !(await tooMany.isVisible()); attempt += 1) {
    await otp.fill("000000");
    await page.getByRole("button", { name: "Vérifier le code" }).click();
    await expect(page.getByRole("button", { name: "Vérifier le code" })).not.toHaveAttribute("aria-busy", "true");
  }
  await expect(tooMany).toBeVisible();
  await expect(otp).toBeDisabled();
  await page.getByRole("button", { name: "Modifier le numéro" }).click();
  await expect(page).toHaveURL("/mot-de-passe-oublie");
});

test("WL04 rechargé renvoie à WL02 avec un message", async ({ page }) => {
  await page.goto("/mot-de-passe-oublie/nouveau");
  await expect(page).toHaveURL("/mot-de-passe-oublie");
  await expect(page.getByRole("status")).toContainText("la réinitialisation reprend depuis le début");
});
