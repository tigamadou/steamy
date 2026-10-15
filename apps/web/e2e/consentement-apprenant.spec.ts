import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { decideConsent, isUsernameAvailable, uniquePhone } from "./support/api";
import { sendConsentRequest, startLearnerSignup } from "./support/signup";

// W07, W08, W18 et reprise d'inscription (LOT-2-AUTH, étape 2.4, C5, D21, D22)

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Code de reprise affiché par W07 (groupé par 4 pour la lecture). */
async function readResumeCode(page: Page): Promise<string> {
  const card = page.getByRole("region", { name: "Ton code de reprise" });
  await expect(card).toBeVisible();
  return ((await card.locator("p").first().textContent()) ?? "").replace(/\s/g, "");
}

test("W07 → W08 : l'accord du parent est détecté sans recharger la page", async ({ page }) => {
  await startLearnerSignup(page);
  const phone = uniquePhone();
  const link = await sendConsentRequest(page, phone);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("On attend l'accord de ton parent…");
  await expect(page.getByText(new RegExp(`\\+229 •• ${phone.slice(-2)}`))).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "En attente de la réponse…" })).toBeVisible();
  expect(await readResumeCode(page)).toMatch(/^[A-Z0-9]{8}$/);
  await axe(page);
  await page.getByRole("button", { name: "J'ai noté mon code" }).click();
  await expect(page.getByRole("region", { name: "Ton code de reprise" })).toBeHidden();

  await decideConsent(link, phone, { accept: true });
  // Polling toutes les 15 s
  await expect(page).toHaveURL("/inscription/apprenant/accord", { timeout: 25_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Super, c'est validé !");
  await axe(page);
  await page.getByRole("link", { name: "Continuer" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/mot-de-passe");
});

test("W18 : le refus est affiché avec son motif, l'identifiant est libéré, le même parent est en délai", async ({
  page,
  browser,
}) => {
  const username = await startLearnerSignup(page);
  const phone = uniquePhone();
  const link = await sendConsentRequest(page, phone);
  await decideConsent(link, phone, { accept: false, note: "On en reparle à la maison." });

  await page.reload();
  await expect(page).toHaveURL("/inscription/apprenant/refus");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Inscription non validée");
  await expect(page.getByText(/^Motif indiqué : «/)).toBeVisible();
  await expect(page.getByText("Tu pourras refaire une demande à ce parent dans 30 jours.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /Changer de parent|Réessayer plus tard/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Changer de parent|Réessayer plus tard/ })).toHaveCount(0);
  await axe(page);
  expect(await isUsernameAvailable(username)).toBe(true);

  // Nouvelle inscription vers le même parent : délai de 30 jours (C9). Dans un autre navigateur : la session de
  // celui-ci garde le refus affiché (W18), voir le rapport du lot sur `POST auth/learner-signup/`.
  const again = await (await browser.newContext()).newPage();
  await startLearnerSignup(again);
  await again.getByRole("textbox", { name: /^Numéro de téléphone du parent/ }).fill(phone.slice(4));
  await again.getByRole("combobox", { name: /^Lien de parenté/ }).selectOption({ label: "Mère" });
  await again.getByRole("button", { name: "Envoyer la demande au parent" }).click();
  await expect(again.getByText(/a refusé une demande il y a moins de 30 jours/).first()).toBeVisible();
});

test("reprise : identifiant et code de reprise dans un autre navigateur, code faux refusé", async ({ page, browser }) => {
  const username = await startLearnerSignup(page);
  await sendConsentRequest(page, uniquePhone());
  const code = await readResumeCode(page);

  const other = await (await browser.newContext()).newPage();
  await other.goto("/inscription/reprendre");
  await expect(other.getByRole("heading", { level: 1 })).toHaveText("Reprendre mon inscription");
  await axe(other);
  await other.getByRole("textbox", { name: /^Identifiant/ }).fill(username);
  await other.getByRole("textbox", { name: /^Code de reprise/ }).fill("ZZZZ-ZZZZ");
  await other.getByRole("button", { name: "Reprendre mon inscription" }).click();
  await expect(other.getByText("Identifiant ou code de reprise incorrect.", { exact: false }).first()).toBeVisible();
  await other.getByRole("textbox", { name: /^Code de reprise/ }).fill(code);
  await other.getByRole("button", { name: "Reprendre mon inscription" }).click();
  await expect(other).toHaveURL("/inscription/apprenant/attente");
  // Le code n'est montré qu'une fois, dans l'onglet de l'inscription
  await expect(other.getByRole("region", { name: "Ton code de reprise" })).toHaveCount(0);
});

test("W16 : un compte en attente bascule vers la reprise, identifiant prérempli", async ({ page, browser }) => {
  const username = await startLearnerSignup(page);
  await sendConsentRequest(page, uniquePhone());
  const code = await readResumeCode(page);

  const other = await (await browser.newContext()).newPage();
  await other.goto("/connexion");
  await other.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(username);
  await other.getByLabel(/^Mot de passe/).fill(code);
  await other.getByRole("button", { name: "Se connecter" }).click();
  await expect(other.getByText("Ton inscription attend encore l'accord de ton parent.").first()).toBeVisible();
  await other.getByRole("button", { name: "Reprendre mon inscription" }).click();
  await expect(other).toHaveURL("/inscription/reprendre");
  await expect(other.getByRole("textbox", { name: /^Identifiant/ })).toHaveValue(username);
});
