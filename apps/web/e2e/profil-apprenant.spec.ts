import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { decideConsent, uniquePhone } from "./support/api";
import { logoutFromShell } from "./support/session";
import { sendConsentRequest, startLearnerSignup } from "./support/signup";

// W10-W15 · Mot de passe et profil de l'apprenant après l'accord du parent (LOT-2-AUTH, étape 2.5)

async function axe(page: Page) {
  // Titre posé par les métadonnées de la route (générées à la requête pour les étapes de profil)
  await expect(page).toHaveTitle(/ · Steamy$/);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Date de naissance cohérente avec l'âge choisi en W05 (D23). */
function birthDateFor(age: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  date.setMonth(date.getMonth() - 2);
  return date.toISOString().slice(0, 10);
}

test("W10 → W15 : l'apprenant choisit son mot de passe, complète son profil et retrouve son espace", async ({
  page,
}) => {
  // W05 : 13 ans par défaut, +1 → 14 ans
  const username = await startLearnerSignup(page);
  const phone = uniquePhone();
  const link = await sendConsentRequest(page, phone);
  await decideConsent(link, phone, { accept: true });
  await page.goto("/inscription/apprenant/mot-de-passe");

  await expect(page.getByText("Inscription · étape 4/4")).toBeVisible();
  await expect(page.getByText(/majuscule|pas trop évident/i)).toHaveCount(0);
  await axe(page);
  await page.getByRole("textbox", { name: /^Mot de passe/ }).fill("Robot2026x");
  await page.getByRole("textbox", { name: /^Confirme ton mot de passe/ }).fill("Robot2026x");
  await page.getByRole("button", { name: "Valider mon mot de passe" }).click();

  await expect(page).toHaveURL("/inscription/apprenant/profil/infos");
  await expect(page.getByText("Profil 1/4")).toBeVisible();
  await axe(page);
  const birthDate = page.getByLabel(/^Date de naissance/);
  await birthDate.fill(birthDateFor(11));
  await page.getByRole("combobox", { name: /^Localité/ }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.getByText("ne correspond pas à l'âge indiqué").first()).toBeVisible();
  await birthDate.fill(birthDateFor(14));
  await page.getByRole("button", { name: "Suivant" }).click();

  await expect(page).toHaveURL("/inscription/apprenant/profil/ecole");
  await expect(page.getByText("Profil 2/4")).toBeVisible();
  await expect(page.getByText("Le genre et la situation de handicap sont facultatifs.", { exact: false })).toBeVisible();
  await axe(page);
  await page.getByRole("combobox", { name: /^Ta classe/ }).selectOption({ index: 1 });
  // Genre et handicap laissés vides : facultatifs
  await page.getByRole("button", { name: "Suivant" }).click();

  await expect(page).toHaveURL("/inscription/apprenant/profil/objectifs");
  const next = page.getByRole("button", { name: /^Suivant · / });
  await expect(next).toBeDisabled();
  await axe(page);
  const goals = page.getByRole("checkbox");
  await goals.nth(0).check({ force: true });
  await expect(next).toBeDisabled();
  await goals.nth(1).check({ force: true });
  await expect(next).toHaveText(/Suivant · 2 sélectionnés/);
  await next.click();

  await expect(page).toHaveURL("/inscription/apprenant/profil/avatar");
  const finish = page.getByRole("button", { name: "Terminer mon profil 🚀" });
  await expect(finish).toBeDisabled();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await axe(page);
  await page.getByRole("radio").first().check({ force: true });
  await finish.click();

  await expect(page).toHaveURL("/inscription/apprenant/bienvenue");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bienvenue, Awa !");
  await expect(page.getByText(/parcours gratuit débloqué/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Voir les parcours gratuits" })).toHaveAttribute(
    "href",
    "/apprenant/catalogue?prix=gratuit",
  );
  await axe(page);
  await page.getByRole("link", { name: "Aller sur mon tableau de bord" }).click();
  await expect(page).toHaveURL("/apprenant");

  await logoutFromShell(page);
  await expect(page).toHaveURL("/connexion");
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(username);
  await page.getByRole("textbox", { name: /^Mot de passe/ }).fill("Robot2026x");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/apprenant");
});

test("sans session, une étape de profil renvoie à la connexion", async ({ page }) => {
  await page.goto("/inscription/apprenant/profil/avatar");
  await expect(page).toHaveURL(/\/connexion/);
});
