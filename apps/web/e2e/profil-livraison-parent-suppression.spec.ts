import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/session";
import { createLearner } from "./support/signup";

// LOT-3 étape 3.5 (suite) · WD19 (adresse de livraison), WD22 (mon parent), WD15 (suppression du compte). Chaque
// test crée son apprenant (rejouable, comptes de démo intacts) et part du hub WD13.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

async function openFromHub(page: Page, link: RegExp, url: string, title: string) {
  const learner = await createLearner();
  await loginViaApi(page, learner.username, learner.password);
  await page.goto("/apprenant/profil");
  await page.getByRole("link", { name: link }).filter({ visible: true }).click();
  await expect(page).toHaveURL(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
}

test("WD19 : enregistrer l'adresse de livraison puis recharger", async ({ page }) => {
  await openFromHub(page, /Adresse de livraison/, "/apprenant/profil/livraison", "Adresse de livraison");
  // Pays repris de la localité du profil, zones du référentiel du pays (D38)
  await expect(page.getByRole("combobox", { name: /^Pays/ })).toHaveValue("BJ");
  const zone = page.getByRole("combobox", { name: /^Ville ou zone/ });
  await expect(zone).toBeEnabled();
  await axe(page);

  await page.getByRole("button", { name: "Enregistrer l'adresse" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choisis ta zone de livraison." })).toBeVisible();

  await zone.selectOption({ index: 1 });
  const zoneLabel = (await zone.locator("option:checked").textContent()) as string;
  await page.getByRole("textbox", { name: /^Ville\b/ }).fill("Cotonou");
  await page.getByRole("textbox", { name: /^Quartier/ }).fill("Fidjrossè");
  await page.getByRole("textbox", { name: /^Rue/ }).fill("Rue 12, près de la pharmacie");
  await page.getByRole("button", { name: "Enregistrer l'adresse" }).click();
  await expect(page.getByText("Ton adresse de livraison est enregistrée.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("combobox", { name: /^Ville ou zone/ }).locator("option:checked")).toHaveText(zoneLabel);
  await expect(page.getByRole("textbox", { name: /^Ville\b/ })).toHaveValue("Cotonou");
  await expect(page.getByRole("textbox", { name: /^Quartier/ })).toHaveValue("Fidjrossè");
  await expect(page.getByRole("textbox", { name: /^Rue/ })).toHaveValue("Rue 12, près de la pharmacie");
});

test("WD22 : le parent lié, sans numéro ni changement de parent", async ({ page }) => {
  await openFromHub(page, /Mon parent/, "/apprenant/profil/parent", "Mon parent");
  await expect(page.getByRole("heading", { level: 3, name: /Maman/ })).toBeVisible();
  await expect(page.getByText(/^Lien de parenté : /)).toBeVisible();
  await expect(page.getByText("Lien validé")).toBeVisible();
  await expect(page.getByText(/\+229|changement de parent/i)).toHaveCount(0);
  await axe(page);
});

test("WD15 : demande de suppression envoyée au parent, puis annulée", async ({ page }) => {
  await openFromHub(page, /Supprimer mon compte/, "/apprenant/profil/suppression", "Supprimer mon compte");
  await expect(page.getByText(/30 jours plus tard \(J\+30\)/)).toBeVisible();
  await expect(page.getByText("Les factures de tes commandes sont conservées.")).toBeVisible();
  await axe(page);

  await page.getByRole("textbox", { name: /Pourquoi pars-tu/ }).fill("Je teste la suppression.");
  await page.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page.getByRole("heading", { name: "Demande envoyée à ton parent" })).toBeVisible();

  // L'état vient du serveur : il survit au rechargement
  await page.reload();
  await expect(page.getByRole("heading", { name: "Demande envoyée à ton parent" })).toBeVisible();
  await page.getByRole("button", { name: "Annuler ma demande" }).click();
  await expect(page.getByText("Ta demande de suppression est annulée.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Envoyer la demande" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Envoyer la demande" })).toBeVisible();
});
