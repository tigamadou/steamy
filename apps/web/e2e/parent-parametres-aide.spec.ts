import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { createParent, uniquePhone } from "./support/api";
import { DEMO_PASSWORD } from "./support/demo";
import { extractCode, waitForSms } from "./support/mailpit";
import { loginAs, loginViaApi, logoutFromShell } from "./support/session";

// LOT-4 étape 4.9 · paramètres (WPD08) et aide (WPD13) du parent.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Clic répété jusqu'à l'effet attendu : un clic arrivé avant l'hydratation est perdu. */
async function clickUntil(page: Page, name: string | RegExp, visible: () => Promise<void>) {
  await expect(async () => {
    await page.getByRole("button", { name }).first().click();
    await visible();
  }).toPass();
}

test("WPD08 : changement de numéro par OTP sur le nouveau numéro, puis connexion avec ce numéro", async ({ page }) => {
  const { phone } = await createParent({ firstName: "Kafui" });
  const next = uniquePhone();
  await loginViaApi(page, phone);
  await page.goto("/parent/parametres");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paramètres");
  await axe(page);

  await clickUntil(page, /^Changer de numéro/, () =>
    expect(page.getByRole("form", { name: "Changer de numéro" })).toBeVisible({ timeout: 2_000 }),
  );
  await page.getByRole("textbox", { name: /^Nouveau numéro/ }).fill(next.replace("+229", ""));
  await page.getByLabel(/^Mot de passe actuel/).fill(DEMO_PASSWORD);
  const since = new Date();
  await page.getByRole("button", { name: "Recevoir le code" }).click();
  const code = extractCode(await waitForSms(next, { since }));
  await page.getByRole("textbox", { name: /Code à 6 chiffres/ }).fill(code);
  await page.getByRole("button", { name: "Valider le nouveau numéro" }).click();
  await expect(page.getByText(/Votre numéro est modifié/)).toBeVisible();
  await expect(page.getByText(next)).toHaveCount(2);

  // Connexion avec le nouveau numéro ; l'ancien ne sert plus (le toast, en bas d'écran, est fermé d'abord)
  await page.locator("[data-toast]").getByRole("button", { name: "Fermer" }).click();
  await logoutFromShell(page);
  await expect(page).toHaveURL("/connexion");
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(phone);
  await page.getByLabel(/^Mot de passe/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Connexion impossible" })).toBeVisible();
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(next);
  await page.getByLabel(/^Mot de passe/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/parent");
});

test("WPD08 : email du profil, rapport hebdomadaire coupé par email et conservé", async ({ page }) => {
  const { phone } = await createParent({ firstName: "Sena" });
  await loginViaApi(page, phone);
  await page.goto("/parent/parametres");
  await clickUntil(page, /^Modifier/, () =>
    expect(page.getByRole("form", { name: "Mes informations" })).toBeVisible({ timeout: 2_000 }),
  );
  await page.getByRole("textbox", { name: /^Email/ }).fill("sena.test@steamy.test");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Vos informations sont enregistrées.")).toBeVisible();

  const progress = page.getByRole("switch", { name: /^Progression\s*par email$/ });
  await expect(progress).toBeChecked();
  await progress.click();
  await expect(page.getByText("Préférence enregistrée.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: /^Progression\s*par email$/ })).not.toBeChecked();
});

test("WPD08 : suppression du compte bloquée avec des enfants, possible sans enfant", async ({ page }) => {
  await loginAs(page, "parent");
  await page.goto("/parent/parametres");
  await expect(page.getByRole("button", { name: "Supprimer", exact: true })).toBeDisabled();
  await expect(page.getByText(/Supprimez d'abord le compte de chacun de vos enfants/)).toBeVisible();

  await page.context().clearCookies();
  const { phone } = await createParent({ firstName: "Komi" });
  await loginViaApi(page, phone);
  await page.goto("/parent/parametres");
  await expect(page.getByText(/désactivé immédiatement puis anonymisé dans 30 jours/)).toBeVisible();
  await clickUntil(page, /^Supprimer$/, () => expect(page.getByRole("dialog")).toBeVisible({ timeout: 2_000 }));
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fparent$/);
});

test("WPD13 : FAQ du parent avec recherche locale et contact du support", async ({ page }) => {
  await loginAs(page, "parent");
  await page.goto("/parent/aide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aide & support");
  await expect(page.getByText("Comment ajouter un enfant ?", { exact: true })).toBeVisible();
  await axe(page);
  await page.getByRole("searchbox", { name: "Rechercher une question" }).fill("Mobile Money");
  await expect(page.getByText("Comment payer un parcours, un kit ou un événement ?", { exact: true })).toBeVisible();
  await expect(page.getByText("Comment ajouter un enfant ?", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Contacter le support" }).click();
  await expect(page).toHaveURL("/aide#contact");
});
