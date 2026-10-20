import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// LOT-3 étape 3.7b · Parcours P4, checkout invité (D12) : WL07 → WK02 → WK03 → WK04 → WK05 → WK06 échec (WK09,
// panier conservé) → « Changer de numéro » → succès → WK07. Faux prestataire : numéro en `…02` refusé (`DECLINED`),
// `…01` accepté (apps/payments/providers/fake.py). Jeu D2 : Pack Électronique en stock, zones du Bénin.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

type Role = Parameters<Page["getByRole"]>[0];
type RoleOptions = NonNullable<Parameters<Page["getByRole"]>[1]>;

/** Éléments visibles seulement : Next garde la page précédente masquée dans le DOM (Activity). */
const role = (page: Page, name: Role, options: RoleOptions = {}) => page.getByRole(name, options).filter({ visible: true });
const text = (page: Page, value: string | RegExp) => page.getByText(value).filter({ visible: true });

/** Réseau Mobile Money : la radio est masquée (`sr-only`) sous sa carte, on clique la carte visible. */
async function choose(page: Page, network: string) {
  await text(page, network).click();
  await expect(page.getByRole("radio", { name: network })).toBeChecked();
}

test("P4 : checkout invité, échec du paiement puis réussite, suivi de la commande", async ({ page }) => {
  test.setTimeout(180_000);

  // WL07 → WK02 → WK03
  await page.goto("/boutique");
  await role(page, "link", { name: "Pack Électronique" }).click();
  await expect(page).toHaveURL("/boutique/pack-electronique");
  await role(page, "button", { name: "Ajouter au panier" }).click();
  await expect(role(page, "status").filter({ hasText: "« Pack Électronique » est dans votre panier." })).toBeVisible();
  await page.goto("/boutique/panier");
  await expect(role(page, "link", { name: "Pack Électronique" })).toBeVisible();
  await role(page, "link", { name: "Commander" }).click();

  // WK04 : coordonnées, conditions jamais précochées
  await expect(page).toHaveURL("/boutique/commande/coordonnees");
  await expect(role(page, "heading", { level: 1, name: "Vos coordonnées" })).toBeVisible();
  await role(page, "button", { name: "Continuer vers la livraison" }).click();
  await expect(role(page, "link", { name: "Indiquez votre prénom." })).toBeVisible();
  await role(page, "textbox", { name: /^Prénom/ }).fill("Awa");
  await role(page, "textbox", { name: /^Nom/ }).fill("Invitée");
  await role(page, "textbox", { name: /^Numéro de téléphone/ }).fill("0197123402");
  await expect(role(page, "checkbox", { name: /J'accepte/ })).not.toBeChecked();
  await role(page, "checkbox", { name: /J'accepte/ }).check();
  await axe(page);
  await role(page, "button", { name: "Continuer vers la livraison" }).click();

  // WK05 : zone, frais et délai lus dans l'API
  await expect(page).toHaveURL("/boutique/commande/livraison");
  await role(page, "combobox", { name: /^Pays/ }).selectOption("BJ");
  const zone = role(page, "combobox", { name: /zone de livraison/ });
  await expect(zone).toBeEnabled();
  await zone.selectOption({ label: "Porto-Novo" });
  await expect(text(page, /Livraison Porto-Novo : .* · délai annoncé 2 à 3 jours/)).toBeVisible();
  await role(page, "textbox", { name: /^Quartier/ }).fill("Ouando");
  await role(page, "textbox", { name: /^Rue/ }).fill("Près du marché");
  await axe(page);
  await role(page, "button", { name: "Continuer vers le paiement" }).click();

  // WK06 : total serveur et heure limite, paiement refusé (…02) → WK09
  await expect(page).toHaveURL("/boutique/commande/paiement");
  await expect(role(page, "heading", { name: /Total à payer · 1 article \+ livraison/ })).toBeVisible();
  await expect(text(page, /réservés jusqu'à \d{2}:\d{2}/)).toBeVisible();
  await axe(page);
  await choose(page, "MTN Mobile Money");
  await role(page, "textbox", { name: /^Numéro Mobile Money/ }).fill("0197123402");
  await role(page, "button", { name: /^Payer/ }).click();
  await expect(role(page, "heading", { name: "Paiement échoué" })).toBeVisible({ timeout: 30_000 });
  // Refus notifié par le prestataire (`DECLINED`) : l'API confirme qu'aucun débit n'a eu lieu
  await expect(text(page, /Aucun montant n'a été débité/)).toBeVisible();
  await expect(text(page, /Votre panier est conservé/)).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("steamy:panier"))).toContain("pack-electronique");

  // « Changer de numéro » puis paiement accepté (…01) → WK07
  await role(page, "button", { name: "Changer de numéro" }).click();
  await choose(page, "MTN Mobile Money");
  await role(page, "textbox", { name: /^Numéro Mobile Money/ }).fill("0197123401");
  await role(page, "button", { name: /^Payer/ }).click();
  await expect(page).toHaveURL(/\/boutique\/commandes\/[\w-]+$/, { timeout: 30_000 });
  await expect(role(page, "heading", { level: 1, name: "Merci, c'est commandé !" })).toBeVisible();
  await expect(role(page, "list", { name: "Suivi de livraison" })).toBeVisible();
  await expect(text(page, "Délai annoncé : 2 à 3 jours")).toBeVisible();
  await expect(text(page, /Le Kit Code est imprimé sur la notice/)).toBeVisible();
  await axe(page);
  expect(await page.evaluate(() => window.localStorage.getItem("steamy:panier"))).toBeNull();

  // Page de suivi à jeton : jamais de référent vers un site tiers (C10)
  const response = await page.request.get(page.url());
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
});
