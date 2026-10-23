import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginViaApi, logoutFromShell } from "../support/session";
import { createLearner } from "../support/signup";

// LOT-3 étape 3.5 · Profil et paramètres de l'apprenant : WD13 (hub), WD17 (modifier le profil), WD18 (mot de
// passe). Chaque test crée son apprenant : le profil de Léa, partagé par d'autres specs, n'est jamais modifié.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Récapitulatif des erreurs du formulaire (l'annonceur de route de Next porte aussi le rôle `alert`). */
function errorSummary(page: Page) {
  return page.getByRole("alert").filter({ hasText: "Corrige les erreurs" });
}

/** Valeur affichée par le hub WD13 pour une donnée du profil. */
function info(page: Page, label: string) {
  return page.locator("dt", { hasText: label }).locator("xpath=following-sibling::dd[1]");
}

test("WD13 : le hub du profil montre l'identifiant en lecture seule et mène aux réglages", async ({ page }) => {
  const learner = await createLearner();
  await loginViaApi(page, learner.username, learner.password);
  await page.goto("/apprenant/profil");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Profil");
  await expect(info(page, "Nom")).toHaveText("Kofi Test");
  await expect(info(page, "Date de naissance")).not.toHaveText("Non renseigné");
  const connection = page.getByRole("region", { name: "Connexion" });
  await expect(connection.getByText(learner.username, { exact: true })).toBeVisible();
  await expect(connection.getByRole("link", { name: /Identifiant/ })).toHaveCount(0);
  // Ni téléphone, ni moyen de paiement (D30), ni écran non livré annoncé « Bientôt »
  await expect(page.getByText(/Téléphone|Mobile Money|Bientôt/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Préférences de notification/ })).toHaveAttribute(
    "href",
    "/apprenant/notifications/preferences",
  );
  await expect(page.getByRole("link", { name: "CGU et politiques" })).toHaveAttribute("href", "/legal/cgu");
  await axe(page);

  await page.getByRole("link", { name: /Mot de passe/ }).click();
  await expect(page).toHaveURL("/apprenant/profil/mot-de-passe");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mot de passe");
  await page.getByRole("navigation", { name: "Fil d'Ariane" }).getByRole("link", { name: "Profil" }).click();
  await expect(page).toHaveURL("/apprenant/profil");
});

test("WD17 : modifier le profil puis recharger", async ({ page }) => {
  const learner = await createLearner();
  await loginViaApi(page, learner.username, learner.password);
  await page.goto("/apprenant/profil");
  await page.getByRole("link", { name: /^Modifier/ }).click();

  await expect(page).toHaveURL("/apprenant/profil/modifier");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Modifier mon profil");
  const grade = page.getByRole("combobox", { name: /^Classe/ });
  // Formulaire prérempli par l'API (référentiels chargés côté navigateur)
  await expect(grade).not.toHaveValue("");
  await expect(page.getByText(/Le genre est facultatif/)).toBeVisible();
  await axe(page);

  // Date incohérente avec l'âge déclaré à l'inscription : refusée par le serveur (D23)
  const birthDate = page.getByLabel(/^Date de naissance/);
  const original = await birthDate.inputValue();
  await birthDate.fill("2010-01-01");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(errorSummary(page)).toContainText("ne correspond pas à l'âge indiqué");
  await birthDate.fill(original);

  await grade.selectOption({ index: 2 });
  const gradeLabel = (await grade.locator("option:checked").textContent()) as string;
  await page.getByRole("textbox", { name: /^Email/ }).fill("kofi@exemple.bj");
  await page.getByText("Garçon", { exact: true }).click();
  await page.getByRole("checkbox").nth(2).check({ force: true });
  await page.getByRole("button", { name: "Changer" }).click();
  await page.getByRole("radio").nth(1).check({ force: true });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Ton profil est enregistré.")).toBeVisible();

  await page.reload();
  await expect(grade).toHaveValue(/.+/);
  await expect(grade.locator("option:checked")).toHaveText(gradeLabel);
  await expect(page.getByRole("textbox", { name: /^Email/ })).toHaveValue("kofi@exemple.bj");
  await expect(page.getByRole("radio", { name: "Garçon" })).toBeChecked();
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(3);

  await page.goto("/apprenant/profil");
  await expect(info(page, "Classe")).toHaveText(gradeLabel);
});

test("WD18 : changer le mot de passe, puis se reconnecter avec le nouveau", async ({ page }) => {
  const learner = await createLearner();
  await loginViaApi(page, learner.username, learner.password);
  await page.goto("/apprenant/profil/mot-de-passe");
  await expect(page.getByRole("textbox", { name: /numéro/i })).toHaveCount(0);
  await axe(page);

  const current = page.getByLabel(/^Mot de passe actuel/);
  const next = page.getByLabel(/^Nouveau mot de passe/);
  const confirm = page.getByLabel(/^Confirme ton nouveau mot de passe/);
  await current.fill("Faux2026x");
  await next.fill("Nouveau2027x");
  await confirm.fill("Nouveau2027x");
  await page.getByRole("button", { name: "Mettre à jour le mot de passe" }).click();
  await expect(errorSummary(page)).toContainText("Mot de passe actuel incorrect.");

  await current.fill(learner.password);
  await page.getByRole("button", { name: "Mettre à jour le mot de passe" }).click();
  await expect(page.getByText("Ton mot de passe est mis à jour.")).toBeVisible();
  await expect(current).toHaveValue("");

  // La session reste ouverte, puis la reconnexion se fait avec le nouveau mot de passe
  await page.goto("/apprenant/profil");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Profil");
  await logoutFromShell(page);
  await expect(page).toHaveURL("/connexion");
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(learner.username);
  await page.getByLabel(/^Mot de passe/).fill("Nouveau2027x");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/apprenant");
});
