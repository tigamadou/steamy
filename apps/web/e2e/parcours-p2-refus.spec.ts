import { expect, test } from "@playwright/test";

import { createParent, isUsernameAvailable, uniquePhone } from "./support/api";
import { sendConsentRequest, startLearnerSignup } from "./support/signup";

// P2 · Refus (LOT-2-AUTH 2.8, D22, C9) : le parent refuse avec un motif, l'enfant le voit sur W18.
test("P2 : refus motivé par le parent, W18 côté enfant, identifiant libéré, délai de 30 jours", async ({
  page,
  browser,
}) => {
  test.slow();
  const username = await startLearnerSignup(page, "Fifa");
  const phone = uniquePhone();
  await createParent({ phone, password: "Parent2026x" });
  const link = await sendConsentRequest(page, phone);

  const parent = await (await browser.newContext()).newPage();
  await parent.goto(link.pathname);
  await parent.getByRole("link", { name: "J'ai déjà un compte" }).click();
  await parent.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(phone);
  await parent.getByRole("textbox", { name: /^Mot de passe/ }).fill("Parent2026x");
  await parent.getByRole("button", { name: "Se connecter" }).click();
  await parent.getByRole("link", { name: "Refuser" }).click();
  await parent.getByRole("combobox", { name: /^Motif du refus/ }).selectOption({ label: "Mon enfant est trop jeune" });
  await parent.getByRole("textbox", { name: /^Précisions/ }).fill("Attends l'an prochain.");
  await parent.getByRole("button", { name: "Confirmer le refus" }).click();
  await parent.getByRole("dialog").getByRole("button", { name: "Refuser la demande" }).click();
  await expect(parent.getByRole("heading", { level: 1 })).toHaveText("Demande refusée");

  // W07 → W18 par le polling
  await expect(page).toHaveURL("/inscription/apprenant/refus", { timeout: 25_000 });
  await expect(page.getByText("Motif indiqué : « Mon enfant est trop jeune »")).toBeVisible();
  expect(await isUsernameAvailable(username)).toBe(true);

  const again = await (await browser.newContext()).newPage();
  await startLearnerSignup(again, "Fifa");
  await again.getByRole("textbox", { name: /^Numéro de téléphone du parent/ }).fill(phone.slice(4));
  await again.getByRole("combobox", { name: /^Lien de parenté/ }).selectOption({ label: "Mère" });
  await again.getByRole("button", { name: "Envoyer la demande au parent" }).click();
  await expect(again.getByText(/a refusé une demande il y a moins de 30 jours/).first()).toBeVisible();
});
