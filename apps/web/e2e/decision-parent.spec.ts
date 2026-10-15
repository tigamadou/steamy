import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { createParent, uniquePhone } from "./support/api";
import { loginAs, loginViaApi } from "./support/session";
import { sendConsentRequest, signUpParentThroughScreens, startLearnerSignup } from "./support/signup";

// /consentement/[token], WP05, WP06, WP11, WP12 · Décision du parent (LOT-2-AUTH, étape 2.7, D20, C9)

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

test("lien SMS → WP01-WP03 → WP05 accepter → WP06 → profil", async ({ page, browser }) => {
  const username = await startLearnerSignup(page, "Kemi");
  const phone = uniquePhone();
  const link = await sendConsentRequest(page, phone);

  const parent = await (await browser.newContext()).newPage();
  const landing = await parent.goto(link.pathname);
  expect(landing?.headers()["referrer-policy"]).toBe("no-referrer");
  // Jeton retiré de l'URL, aucun détail sur l'enfant avant authentification
  await expect(parent).toHaveURL("/consentement");
  await expect(parent.getByRole("heading", { level: 1 })).toHaveText("Votre enfant vous demande votre accord");
  await expect(parent.getByText("Kemi")).toHaveCount(0);
  await axe(parent);
  await parent.getByRole("link", { name: "Créer mon compte" }).click();
  await expect(parent.getByText(new RegExp(`demande au \\+229 •• ${phone.slice(-2)}`))).toBeVisible();
  await signUpParentThroughScreens(parent, phone);

  await expect(parent).toHaveURL(/\/inscription\/parent\/demande\/\d+$/);
  const card = parent.getByRole("article", { name: "Demande de Kemi Test" });
  await expect(card).toContainText(`@${username}`);
  await expect(card).toContainText("14 ans");
  await expect(card).toContainText("Vous êtes sa mère");
  await expect(card).toContainText("En attente");
  await expect(card).toContainText("jamais à du marketing");
  await expect(parent.getByText("Informations renseignées")).toHaveCount(0);
  await axe(parent);
  await parent.getByRole("button", { name: "Accepter la demande" }).click();

  await expect(parent).toHaveURL(/\/acceptee$/);
  await expect(parent.getByRole("heading", { level: 1 })).toHaveText("Demande acceptée !");
  await expect(parent.getByText("Kemi peut maintenant terminer son inscription.")).toBeVisible();
  await axe(parent);
  await parent.getByRole("link", { name: "Compléter mon profil" }).click();
  await expect(parent).toHaveURL("/inscription/parent/profil/localisation");
});

test("parent déjà inscrit : lien → connexion → WP05 → WP11 refus confirmé → WP12", async ({ page, browser }) => {
  await startLearnerSignup(page, "Sena");
  const phone = uniquePhone();
  await createParent({ phone, password: "Parent2026x" });
  const link = await sendConsentRequest(page, phone);

  const parent = await (await browser.newContext()).newPage();
  await parent.goto(link.pathname);
  await parent.getByRole("link", { name: "J'ai déjà un compte" }).click();
  await expect(parent).toHaveURL(/\/connexion\?next=%2Fconsentement$/);
  await parent.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(phone);
  await parent.getByRole("textbox", { name: /^Mot de passe/ }).fill("Parent2026x");
  await parent.getByRole("button", { name: "Se connecter" }).click();
  await expect(parent).toHaveURL(/\/inscription\/parent\/demande\/\d+$/);

  await parent.getByRole("link", { name: "Refuser" }).click();
  await expect(parent).toHaveURL(/\/refus$/);
  await expect(parent.getByText(/définitif/)).toHaveCount(0);
  await axe(parent);
  await parent.getByRole("button", { name: "Confirmer le refus" }).click();
  await expect(parent.getByText("Choisissez un motif.").first()).toBeVisible();
  await parent.getByRole("combobox", { name: /^Motif du refus/ }).selectOption({ label: "Nous en discutons d'abord à la maison" });
  await parent.getByRole("textbox", { name: /^Précisions/ }).fill("On en reparle ce soir.");
  await parent.getByRole("button", { name: "Confirmer le refus" }).click();
  const dialog = parent.getByRole("dialog", { name: "Refuser la demande de Sena ?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Refuser la demande" }).click();

  await expect(parent).toHaveURL(/\/refusee$/);
  await expect(parent.getByRole("heading", { level: 1 })).toHaveText("Demande refusée");
  await expect(parent.getByText("Sena verra votre décision. Aucune inscription n'a été créée.")).toBeVisible();
  await axe(parent);

  // Côté enfant : W18 avec le motif choisi
  await page.reload();
  await expect(page).toHaveURL("/inscription/apprenant/refus");
  await expect(page.getByText("Motif indiqué : « Nous en discutons d'abord à la maison »")).toBeVisible();
});

test("le lien d'un autre numéro est refusé sans détail sur l'enfant (CONSENT_PHONE_MISMATCH)", async ({
  page,
  browser,
}) => {
  await startLearnerSignup(page, "Ayo");
  const link = await sendConsentRequest(page, uniquePhone());

  const other = await (await browser.newContext()).newPage();
  const { phone } = await createParent();
  await loginViaApi(other, phone);
  await other.goto(link.pathname);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText("Cette demande ne vous est pas adressée");
  await expect(other.getByText("Ayo")).toHaveCount(0);
});

test("un lien déjà utilisé ou inconnu est refusé", async ({ page }) => {
  await loginAs(page, "parent");
  await page.goto("/consentement/jeton-inconnu");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lien incomplet ou déjà utilisé");
});
