import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { createParent, uniquePhone } from "./support/api";
import { loginViaApi } from "./support/session";
import { sendConsentRequest, startLearnerSignup } from "./support/signup";

// LOT-4 étape 4.3 · WPD05 Demande de consentement (origine enfant), modale de refus (reprise de WP11), D20, D22, C9.
// Chaque test crée sa propre famille : les demandes du jeu D2 (Marie) restent intactes.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

const PASSWORD = "Parent2026x";

/** Lien SMS ouvert par un parent déjà inscrit (profil complet) : connexion, puis arrivée sur WPD05. */
async function openFromSms(browser: Browser, link: URL, phone: string): Promise<Page> {
  const parent = await (await browser.newContext()).newPage();
  await parent.goto(link.pathname);
  await parent.getByRole("link", { name: "J'ai déjà un compte" }).click();
  await parent.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(phone);
  await parent.getByRole("textbox", { name: /^Mot de passe/ }).fill(PASSWORD);
  await parent.getByRole("button", { name: "Se connecter" }).click();
  await expect(parent).toHaveURL(/\/parent\/consentements\/\d+$/);
  await expect(parent.getByRole("heading", { level: 1 })).toHaveText("Demande de consentement");
  return parent;
}

test("refus : lien SMS → connexion → WPD05 → refus motivé → W18 côté enfant, puis délai de 30 jours", async ({
  page,
  browser,
}) => {
  test.slow();
  const username = await startLearnerSignup(page, "Yao");
  const phone = uniquePhone();
  await createParent({ phone, password: PASSWORD });
  const link = await sendConsentRequest(page, phone);

  const parent = await openFromSms(browser, link, phone);
  // D20 : prénom, nom, identifiant, âge et lien de parenté, rien d'autre
  const card = parent.getByRole("article", { name: "Demande de Yao Test" });
  await expect(card).toContainText(`@${username}`);
  await expect(card).toContainText("14 ans");
  await expect(card).toContainText("Vous êtes sa mère");
  await expect(card).toContainText("En attente");
  await expect(parent.getByText("Demande envoyée par Yao")).toBeVisible();
  await expect(parent.getByText(/une nouvelle demande sera possible dans 30 jours/)).toBeVisible();
  await expect(parent.getByText(/Informations renseignées|Centres d'intérêt/)).toHaveCount(0);
  await axe(parent);

  // Un autre parent ne voit pas la demande : « Demande introuvable » (numéro jamais divulgué)
  const url = parent.url();
  const other = await (await browser.newContext()).newPage();
  await loginViaApi(other, (await createParent()).phone);
  await other.goto(url);
  await expect(other.getByRole("heading", { level: 2, name: "Demande introuvable" })).toBeVisible();
  await expect(other.getByText("Yao")).toHaveCount(0);

  // Modale de refus : motif obligatoire, « Annuler » ne fait rien
  await parent.getByRole("button", { name: "Refuser", exact: true }).click();
  let dialog = parent.getByRole("dialog", { name: "Refuser la demande de Yao ?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(dialog).toBeHidden();
  await parent.getByRole("button", { name: "Refuser", exact: true }).click();
  dialog = parent.getByRole("dialog", { name: "Refuser la demande de Yao ?" });
  await dialog.getByRole("button", { name: "Refuser la demande" }).click();
  await expect(dialog.getByText("Choisissez un motif.").first()).toBeVisible();
  await axe(parent);
  await dialog.getByRole("combobox", { name: /^Motif du refus/ }).selectOption({ label: "Mon enfant est trop jeune" });
  await dialog.getByRole("textbox", { name: /^Précisions/ }).fill("Attends l'an prochain.");
  await dialog.getByRole("button", { name: "Refuser la demande" }).click();

  // WPD05 relu en lecture seule
  await expect(parent.getByRole("dialog")).toHaveCount(0);
  await expect(parent.getByRole("status").filter({ hasText: "Vous avez refusé cette demande" })).toContainText(
    "« Mon enfant est trop jeune »",
  );
  await expect(parent.getByRole("article", { name: "Demande de Yao Test" })).toContainText("Refusée");
  await expect(parent.getByRole("button", { name: "Accepter la demande" })).toHaveCount(0);
  await axe(parent);

  // Côté enfant : W07 → W18 par le polling, avec le motif
  await expect(page).toHaveURL("/inscription/apprenant/refus", { timeout: 25_000 });
  await expect(page.getByText("Motif indiqué : « Mon enfant est trop jeune »")).toBeVisible();

  // Nouvelle demande au même numéro : CONSENT_COOLDOWN
  const again = await (await browser.newContext()).newPage();
  await startLearnerSignup(again, "Yao");
  await again.getByRole("textbox", { name: /^Numéro de téléphone du parent/ }).fill(phone.slice(4));
  await again.getByRole("combobox", { name: /^Lien de parenté/ }).selectOption({ label: "Mère" });
  await again.getByRole("button", { name: "Envoyer la demande au parent" }).click();
  await expect(again.getByText(/a refusé une demande il y a moins de 30 jours/).first()).toBeVisible();
});

test("acceptation : WPD05 → retour à l'accueil avec la confirmation, l'enfant poursuit en W08 puis W10", async ({
  page,
  browser,
}) => {
  test.slow();
  await startLearnerSignup(page, "Ama");
  const phone = uniquePhone();
  await createParent({ phone, password: PASSWORD });
  const link = await sendConsentRequest(page, phone);

  const parent = await openFromSms(browser, link, phone);
  const url = parent.url();
  await parent.getByRole("button", { name: "Accepter la demande" }).click();
  await expect(parent).toHaveURL(/\/parent\?consentement=\d+$/);
  await expect(parent.getByRole("status").filter({ hasText: "Demande acceptée" })).toHaveText(
    "Demande acceptée : Ama peut terminer son inscription.",
  );
  await axe(parent);

  // La demande traitée reste consultable, en lecture seule
  await parent.goto(url);
  await expect(parent.getByRole("status").filter({ hasText: "Vous avez accepté cette demande" })).toBeVisible();
  await expect(parent.getByRole("article", { name: "Demande de Ama Test" })).toContainText("Acceptée");
  await expect(parent.getByRole("button", { name: "Refuser", exact: true })).toHaveCount(0);

  // Côté enfant : W07 → W08 (polling) → W10
  await expect(page).toHaveURL("/inscription/apprenant/accord", { timeout: 25_000 });
  await page.getByRole("link", { name: "Continuer" }).click();
  await expect(page).toHaveURL("/inscription/apprenant/mot-de-passe");
});
