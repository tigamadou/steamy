import { expect, test } from "@playwright/test";

import { DEMO, DEMO_PASSWORD } from "./support/demo";
import { sendConsentRequest, startLearnerSignup } from "./support/signup";

// P4 · Parent existant (LOT-2-AUTH 2.8) : le parent du jeu D2 reçoit une demande, se connecte et l'accepte.
// Un seul projet (« bureau ») : deux demandes simultanées au même numéro pour un même enfant s'annuleraient (C14).
test("P4 : Marie (jeu D2) ouvre le lien, se connecte et revient sur la demande pour l'accepter", { tag: "@donnees-uniques" }, async ({
  page,
  browser,
}) => {
  await startLearnerSignup(page, "Tobi");
  const link = await sendConsentRequest(page, DEMO.parent.identifier);

  const parent = await (await browser.newContext()).newPage();
  await parent.goto(link.pathname);
  await parent.getByRole("link", { name: "J'ai déjà un compte" }).click();
  await parent.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill("01 90 00 00 01");
  await parent.getByRole("textbox", { name: /^Mot de passe/ }).fill(DEMO_PASSWORD);
  await parent.getByRole("button", { name: "Se connecter" }).click();
  await expect(parent).toHaveURL(/\/inscription\/parent\/demande\/\d+$/);
  await expect(parent.getByRole("article", { name: "Demande de Tobi Test" })).toBeVisible();
  await parent.getByRole("button", { name: "Accepter la demande" }).click();
  await expect(parent.getByText("Tobi peut maintenant terminer son inscription.")).toBeVisible();
  // Profil de Marie déjà complet : direction son espace
  await parent.getByRole("link", { name: "Aller sur mon tableau de bord" }).click();
  await expect(parent).toHaveURL("/parent");
});
