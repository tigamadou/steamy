import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { payPaymentRequest } from "./support/commerce";
import { loginViaApi } from "./support/session";
import { createLearner } from "./support/signup";

// LOT-3 étape 3.7c · Fin du parcours P5 : WK01 → WK03 → « Demander à mon parent » → WK08 (demande de kit), annulation,
// nouvelle demande, puis paiement du parent avec l'adresse de livraison (par l'API, en attendant WPD15 du lot 4) →
// WK08 « réglée » → WD14. Apprenant et parent neufs : rejouable.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Élément visible seulement : Next garde la page précédente masquée dans le DOM (Activity). */
const visible = (page: Page, role: Parameters<Page["getByRole"]>[0], name: string | RegExp) =>
  page.getByRole(role, { name }).filter({ visible: true });

/** Identifiant de la demande ouverte (WK08). */
function requestId(page: Page): number {
  return Number(new URL(page.url()).pathname.split("/").pop());
}

test("P5 · WK03 → WK08 : demande de kit au parent, annulation, nouvelle demande réglée → WD14", async ({ page }) => {
  test.setTimeout(180_000);
  const learner = await createLearner({ firstName: "Yao" });
  await loginViaApi(page, learner.username, learner.password);

  // WK01 → WK03
  await page.goto("/apprenant/boutique");
  await visible(page, "button", "Ajouter Pack Électronique au panier").click();
  await expect(page.getByRole("status").filter({ hasText: "« Pack Électronique » est dans ton panier." })).toBeVisible();
  await page.goto("/apprenant/boutique/panier");
  await expect(visible(page, "link", "Pack Électronique")).toBeVisible();

  // WK03 → WK08
  await visible(page, "button", "Demander à mon parent").click();
  await expect(page).toHaveURL(/\/apprenant\/demandes\/\d+$/, { timeout: 20_000 });
  const first = requestId(page);
  await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toHaveText("Demande à ton parent");
  await expect(visible(page, "heading", "On a envoyé ta demande à Maman")).toBeVisible();
  await expect(page.getByText("Montant des articles · livraison ajoutée par ton parent").filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/22\s000 F CFA/).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Demande envoyée à Maman · en attente du paiement…").filter({ visible: true })).toBeVisible();
  // Ni relance, ni « Changer de parent », ni « Renvoyer le lien », ni condition d'âge (S3)
  await expect(visible(page, "button", "Relancer mon parent")).toHaveCount(0);
  await expect(page.getByText(/Changer de parent|Renvoyer le lien|16 ans/).filter({ visible: true })).toHaveCount(0);
  await axe(page);

  // Annulation, retour au panier, nouvelle demande
  await visible(page, "button", "Annuler la demande").click();
  await page.getByRole("dialog", { name: "Annuler la demande ?" }).getByRole("button", { name: "Annuler la demande" }).click();
  await expect(visible(page, "heading", "Tu as annulé cette demande")).toBeVisible();
  await visible(page, "link", "Retour au panier").click();
  await expect(page).toHaveURL("/apprenant/boutique/panier");
  await visible(page, "button", "Demander à mon parent").click();
  await expect(page).not.toHaveURL(/\/boutique\/panier$/, { timeout: 20_000 });
  await expect(page).not.toHaveURL(`/apprenant/demandes/${first}`);
  await expect(visible(page, "heading", "On a envoyé ta demande à Maman")).toBeVisible();
  const second = requestId(page);

  // Le parent ajoute l'adresse et paie : WK08 passe à « réglée » (interrogation toutes les 10 s)
  await payPaymentRequest(learner.parentPhone, second, { kit: true });
  await expect(visible(page, "heading", "C'est réglé !")).toBeVisible({ timeout: 45_000 });
  await visible(page, "link", "Voir mes commandes").click();
  await expect(page).toHaveURL("/apprenant/profil/commandes");
  await expect(
    page.getByRole("list", { name: "Tes commandes" }).filter({ visible: true }).getByRole("listitem").filter({ hasText: "Pack Électronique" }),
  ).toContainText("Livraison : En préparation");
});
