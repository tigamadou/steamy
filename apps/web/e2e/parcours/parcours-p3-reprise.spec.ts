import { expect, test } from "@playwright/test";

import { uniquePhone } from "../support/api";
import { sendConsentRequest, startLearnerSignup } from "../support/signup";

// P3 · Reprise (LOT-2-AUTH 2.8, C5, D21) : code de reprise lu sur W07, nouvel appareil, connexion W16, reprise.
test("P3 : W16 d'un compte en attente → reprise préremplie → mauvais code refusé → W07", async ({ page, browser }) => {
  const username = await startLearnerSignup(page, "Bio");
  await sendConsentRequest(page, uniquePhone());
  const card = page.getByRole("region", { name: "Ton code de reprise" });
  const code = ((await card.locator("p").first().textContent()) ?? "").replace(/\s/g, "");

  const other = await (await browser.newContext()).newPage();
  await other.goto("/connexion");
  await other.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(username);
  await other.getByRole("textbox", { name: /^Mot de passe/ }).fill(code);
  await other.getByRole("button", { name: "Se connecter" }).click();
  await other.getByRole("button", { name: "Reprendre mon inscription" }).click();
  await expect(other).toHaveURL("/inscription/reprendre");
  await expect(other.getByRole("textbox", { name: /^Identifiant/ })).toHaveValue(username);
  await other.getByRole("textbox", { name: /^Code de reprise/ }).fill("AAAA-AAAA");
  await other.getByRole("button", { name: "Reprendre mon inscription" }).click();
  await expect(other.getByText(/Identifiant ou code de reprise incorrect/).first()).toBeVisible();
  // L'identifiant reste saisi après l'erreur
  await expect(other.getByRole("textbox", { name: /^Identifiant/ })).toHaveValue(username);
  await other.getByRole("textbox", { name: /^Code de reprise/ }).fill(code.toLowerCase());
  await other.getByRole("button", { name: "Reprendre mon inscription" }).click();
  await expect(other).toHaveURL("/inscription/apprenant/attente");
  await expect(other.getByRole("heading", { level: 1 })).toHaveText("On attend l'accord de ton parent…");
});
