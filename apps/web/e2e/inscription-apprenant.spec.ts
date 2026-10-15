import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { uniquePhone, uniqueSuffix } from "./support/api";
import { DEMO } from "./support/demo";
import { loginAs } from "./support/session";
import { sendConsentRequest } from "./support/signup";

// W01-W06, W19 · Inscription de l'apprenant jusqu'au SMS de consentement (LOT-2-AUTH, étape 2.3)

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

test("W02 → W06 : l'apprenant s'inscrit et son parent reçoit le SMS de consentement", async ({ page }) => {
  await page.goto("/inscription");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("construire les robots de demain");
  await expect(page.getByText("Plus de 12 000")).toHaveCount(0);
  await axe(page);
  await page.getByRole("link", { name: "Créer un compte gratuit" }).click();

  await expect(page).toHaveURL("/inscription/type");
  await expect(page.getByText("Créer un compte", { exact: true })).toBeVisible();
  await axe(page);
  await page.getByText("Un·e apprenant·e").click();
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page).toHaveURL("/inscription/apprenant/identite");
  await expect(page.getByText("Inscription · étape 1/4")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /J'accepte les conditions/ })).not.toBeChecked();
  await axe(page);
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Indique ton prénom.").first()).toBeVisible();

  // W19 : identifiant déjà pris, signalé au blur
  const identifiant = page.getByRole("textbox", { name: /^Identifiant/ });
  await identifiant.fill(DEMO.learner.identifier);
  await identifiant.blur();
  await expect(page.getByText("Cet identifiant est déjà associé à un compte Steamy.").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Choisir un autre identifiant" }).click();
  await identifiant.fill(`awa.${uniqueSuffix()}`);
  await page.getByRole("textbox", { name: /^Prénom/ }).fill("Awa");
  await page.getByRole("textbox", { name: /^Nom/ }).fill("Test");
  await page.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page).toHaveURL("/inscription/apprenant/age");
  await expect(page.getByText("Inscription · étape 2/4")).toBeVisible();
  await expect(page.getByText(/16 ans/)).toHaveCount(0);
  const age = page.getByRole("spinbutton", { name: "Ton âge" });
  await age.press("End");
  await expect(age).toHaveAttribute("aria-valuenow", "17");
  await age.press("Home");
  await expect(age).toHaveAttribute("aria-valuenow", "10");
  await axe(page);
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page).toHaveURL("/inscription/apprenant/parent");
  await expect(page.getByText("Inscription · étape 3/4 · Consentement parental")).toBeVisible();
  await axe(page);
  const link = await sendConsentRequest(page, uniquePhone());
  expect(link.pathname).toMatch(/^\/consentement\/[\w-]+$/);
});

test("W05 rechargé renvoie à W04 champs vides", async ({ page }) => {
  await page.goto("/inscription/apprenant/age");
  await expect(page).toHaveURL("/inscription/apprenant/identite");
  await expect(page.getByRole("textbox", { name: /^Prénom/ })).toHaveValue("");
});

test("W06 sans inscription en cours renvoie à la reprise", async ({ page }) => {
  await page.goto("/inscription/apprenant/parent");
  await expect(page).toHaveURL("/inscription/reprendre");
});

test("W02 et W03 renvoient un utilisateur connecté vers son espace", async ({ page }) => {
  await loginAs(page, "parent");
  await page.goto("/inscription");
  await expect(page).toHaveURL("/parent");
  await page.goto("/inscription/type");
  await expect(page).toHaveURL("/parent");
});

test("W03 oriente le parent vers WP01", async ({ page }) => {
  await page.goto("/inscription/type");
  await page.getByText("Un parent").click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL("/inscription/parent");
});
