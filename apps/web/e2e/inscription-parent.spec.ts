import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { uniquePhone } from "./support/api";
import { DEMO } from "./support/demo";
import { extractCode, waitForSms } from "./support/mailpit";
import { signUpParentThroughScreens } from "./support/signup";

// WP01-WP04, WP07-WP10 · Inscription du parent seul (LOT-2-AUTH, étape 2.6, vouvoiement)

async function axe(page: Page) {
  // Titre posé par les métadonnées de la route (générées à la requête pour les étapes de profil)
  await expect(page).toHaveTitle(/ · Steamy$/);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

async function openWP01(page: Page) {
  await page.goto("/inscription/type");
  await page.getByText("Un parent").click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL("/inscription/parent");
}

async function requestCode(page: Page, phone: string): Promise<string> {
  await page.getByRole("textbox", { name: /^Prénom/ }).fill("Mariam");
  await page.getByRole("textbox", { name: /^Nom/ }).fill("Test");
  await page.getByRole("textbox", { name: /^Numéro de téléphone/ }).fill(phone.slice(4));
  await page.getByRole("checkbox", { name: /J'accepte les conditions/ }).check();
  const since = new Date();
  await page.getByRole("button", { name: "Recevoir mon code par SMS" }).click();
  await expect(page).toHaveURL("/inscription/parent/code");
  return extractCode(await waitForSms(phone, { since }));
}

test("WP01 → WP10 : un parent seul crée son espace", async ({ page }) => {
  await openWP01(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Créez votre compte parent");
  await axe(page);
  const phone = uniquePhone();
  await signUpParentThroughScreens(page, phone);

  await expect(page).toHaveURL("/inscription/parent/demande");
  await axe(page);
  await page.getByText("Oui, mon enfant m'a envoyé une demande").click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Aucune demande en attente n'est adressée à votre numéro.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Continuer" }).click();

  await expect(page).toHaveURL("/inscription/parent/profil/localisation");
  await expect(page.getByText("Profil parent 1/3")).toBeVisible();
  await axe(page);
  await page.getByRole("combobox", { name: /^Localité/ }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Suivant" }).click();

  await expect(page).toHaveURL("/inscription/parent/profil/a-propos");
  await axe(page);
  // Tout est facultatif
  await page.getByRole("button", { name: "Suivant" }).click();

  await expect(page).toHaveURL("/inscription/parent/profil/enfants");
  const finish = page.getByRole("button", { name: "Terminer mon profil 🚀" });
  await expect(finish).toBeDisabled();
  await axe(page);
  await page.getByRole("checkbox").first().check({ force: true });
  await finish.click();

  await expect(page).toHaveURL("/inscription/parent/bienvenue");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bienvenue, Mariam !");
  await expect(page.getByText("Aucun enfant rattaché pour le moment.")).toBeVisible();
  await axe(page);
  await page.getByRole("link", { name: "Aller sur mon tableau de bord" }).click();
  await expect(page).toHaveURL("/parent");
});

test("WP02 : code faux refusé, saisie bloquée après les essais permis, numéro modifiable", async ({ page }) => {
  await openWP01(page);
  await requestCode(page, uniquePhone());
  await axe(page);
  const otp = page.getByLabel("Code à 6 chiffres reçu par SMS");
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await otp.fill("000000");
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/auth/parent-signup/verify/")),
      page.getByRole("button", { name: "Vérifier le code" }).click(),
    ]);
  }
  await expect(page.getByText("Trop d'essais avec ce code. Demandez un nouveau code.")).toBeVisible();
  await expect(otp).toBeDisabled();
  await page.getByRole("button", { name: "Modifier le numéro" }).click();
  await expect(page).toHaveURL("/inscription/parent");
});

test("WP02 : un numéro déjà inscrit mène à la connexion après vérification (C13)", async ({ page }) => {
  await openWP01(page);
  const code = await requestCode(page, DEMO.parent.identifier);
  await page.getByLabel("Code à 6 chiffres reçu par SMS").fill(code);
  await page.getByRole("button", { name: "Vérifier le code" }).click();
  await expect(page).toHaveURL(/\/connexion\?compte=existant/);
  await expect(page.getByText("Vous avez déjà un compte avec ce numéro : connectez-vous.")).toBeVisible();
});

test("WP02 et WP03 sans code demandé renvoient à WP01", async ({ page }) => {
  await page.goto("/inscription/parent/code");
  await expect(page).toHaveURL("/inscription/parent");
  await page.goto("/inscription/parent/mot-de-passe");
  await expect(page).toHaveURL("/inscription/parent");
});
