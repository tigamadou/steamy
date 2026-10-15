import { expect, test } from "@playwright/test";

import { uniquePhone } from "./support/api";
import {
  completeLearnerProfile,
  completeParentProfile,
  sendConsentRequest,
  signUpParentThroughScreens,
  startLearnerSignup,
} from "./support/signup";

// P1 · Inscription et accord (LOT-2-AUTH 2.8) : les deux côtés passent par les écrans, faux SMS lu dans Mailpit.
test("P1 : l'enfant s'inscrit, son parent crée son compte et accepte, l'enfant termine et se reconnecte", async ({
  page,
  browser,
}) => {
  test.slow();
  await page.goto("/inscription");
  await page.getByRole("link", { name: "Créer un compte gratuit" }).click();
  const username = await startLearnerSignup(page, "Kossi");
  const phone = uniquePhone();
  const link = await sendConsentRequest(page, phone);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("On attend l'accord de ton parent…");

  const parent = await (await browser.newContext()).newPage();
  await parent.goto(link.pathname);
  await parent.getByRole("link", { name: "Créer mon compte" }).click();
  await signUpParentThroughScreens(parent, phone);
  await expect(parent).toHaveURL(/\/inscription\/parent\/demande\/\d+$/);
  await parent.getByRole("button", { name: "Accepter la demande" }).click();
  await expect(parent.getByRole("heading", { level: 1 })).toHaveText("Demande acceptée !");
  await parent.getByRole("link", { name: "Compléter mon profil" }).click();
  await completeParentProfile(parent);
  await expect(parent.getByText(/^Kossi, 14 ans/)).toBeVisible();
  await parent.getByRole("link", { name: "Aller sur mon tableau de bord" }).click();
  await expect(parent).toHaveURL("/parent");

  // Côté enfant : W07 passe seul à W08 (polling)
  await expect(page).toHaveURL("/inscription/apprenant/accord", { timeout: 25_000 });
  await page.getByRole("link", { name: "Continuer" }).click();
  await completeLearnerProfile(page, "Kossi2026x");
  await page.getByRole("link", { name: "Aller sur mon tableau de bord" }).click();
  await expect(page).toHaveURL("/apprenant");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL("/connexion");
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(username);
  await page.getByRole("textbox", { name: /^Mot de passe/ }).fill("Kossi2026x");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/apprenant");
});
