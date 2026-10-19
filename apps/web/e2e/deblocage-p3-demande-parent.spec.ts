import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { payPaymentRequest } from "./support/commerce";
import { loginViaApi } from "./support/session";
import { createLearner } from "./support/signup";

// LOT-3 étape 3.6 · Parcours P3 (demande de paiement) : WC05 → « Demander à mon parent » → WA02 en attente (relance
// limitée) → bandeau de WD23 et WD14 → annulation → nouvelle demande → paiement du parent (par l'API, en attendant
// WPD15 du lot 4) → notification, WA02 « réglée », parcours dans WD23 et WD14. Apprenant et parent neufs : rejouable.

const COURSE = "capteurs-electroniques";
const COURSE_TITLE = "Capteurs électroniques";

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Identifiant de la demande ouverte (WA02). */
function requestId(page: Page): number {
  return Number(new URL(page.url()).pathname.split("/").pop());
}

test("P3 · WA02 : demande au parent, relance, annulation, nouvelle demande réglée → WD23 et WD14", async ({ page }) => {
  test.setTimeout(180_000);
  const learner = await createLearner({ firstName: "Sena" });
  await loginViaApi(page, learner.username, learner.password);

  // WC05 → WA02
  await page.goto(`/apprenant/catalogue/${COURSE}`);
  const card = page.getByRole("complementary", { name: "Inscription au parcours" });
  await expect(card.getByText("Payé par ton parent · accès à vie")).toBeVisible();
  await card.getByRole("button", { name: "Demander à mon parent" }).click();
  await expect(page).toHaveURL(/\/apprenant\/demandes\/\d+$/, { timeout: 20_000 });
  const first = requestId(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Demande à ton parent");
  await expect(page.getByRole("heading", { level: 2, name: "On a envoyé ta demande à Maman" })).toBeVisible();
  await expect(page.getByText(/18\s000 F CFA/)).toBeVisible();
  await expect(page.getByText("Demande envoyée à Maman · en attente du paiement…")).toBeVisible();
  // Relance limitée : la première n'est possible qu'après le délai fixé par le serveur (C4)
  await expect(page.getByRole("button", { name: "Relancer mon parent" })).toBeDisabled();
  await expect(page.getByText(/^Tu pourras relancer ton parent le /)).toBeVisible();
  await expect(page.getByText(/Changer de parent|Renvoyer le lien/)).toHaveCount(0);
  await axe(page);

  // WC05 : « Demande envoyée » ramène à la même demande
  await page.goto(`/apprenant/catalogue/${COURSE}`);
  await page.getByRole("link", { name: "Demande envoyée" }).click();
  await expect(page).toHaveURL(`/apprenant/demandes/${first}`);

  // WD23 : bandeau des demandes en attente
  await page.goto("/apprenant/parcours");
  await expect(page.getByRole("heading", { level: 2, name: "En attente de ton parent · 1 demande" })).toBeVisible();
  await axe(page);

  // WD14 : la demande « En attente de ton parent », sans facture
  await page.goto("/apprenant/profil");
  await page.getByRole("link", { name: /Mes commandes/ }).click();
  await expect(page).toHaveURL("/apprenant/profil/commandes");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes commandes");
  const orders = page.getByRole("list", { name: "Tes commandes" });
  await expect(orders.getByText("En attente de ton parent")).toBeVisible();
  await expect(page.getByText(/Facture/)).toHaveCount(0);
  await axe(page);
  await orders.getByRole("link", { name: `Voir la demande : ${COURSE_TITLE}` }).click();
  await expect(page).toHaveURL(`/apprenant/demandes/${first}`);

  // Annulation, puis nouvelle demande
  await page.getByRole("button", { name: "Annuler la demande" }).click();
  await page.getByRole("dialog", { name: "Annuler la demande ?" }).getByRole("button", { name: "Annuler la demande" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Tu as annulé cette demande" })).toBeVisible();
  await page.getByRole("button", { name: "Refaire la demande" }).click();
  await expect(page).not.toHaveURL(`/apprenant/demandes/${first}`, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 2, name: "On a envoyé ta demande à Maman" })).toBeVisible();
  const second = requestId(page);

  // Le parent règle la demande : la page, interrogée toutes les 10 s, passe à « réglée »
  await payPaymentRequest(learner.parentPhone, second);
  await expect(page.getByRole("heading", { level: 2, name: "C'est réglé !" })).toBeVisible({ timeout: 45_000 });
  await page.getByRole("link", { name: "Accéder au parcours" }).click();
  await expect(page).toHaveURL(`/apprenant/parcours/${COURSE}`);

  // Notification « parcours débloqué »
  await page.goto("/apprenant/notifications");
  await expect(page.getByText(`${COURSE_TITLE} est débloqué`)).toBeVisible();

  // WD23 : le parcours est suivi, plus de demande en attente
  await page.goto("/apprenant/parcours");
  await expect(page.getByRole("link", { name: COURSE_TITLE, exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /En attente de ton parent/ })).toHaveCount(0);

  // WD14 : la commande payée par le parent
  await page.goto("/apprenant/profil/commandes?statut=payees");
  await expect(page.getByRole("list", { name: "Tes commandes" }).getByRole("listitem").filter({ hasText: COURSE_TITLE })).toContainText(
    "Payée",
  );
});
