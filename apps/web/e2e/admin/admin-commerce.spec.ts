import { expect, test } from "@playwright/test";

import { API_URL, STAFF, staffLogin } from "../support/staff";

// LOT-6 · 6.4 WAD10 (boutique et commandes) et WAD11 (paiements) dans l'admin Django. Lecture seule sur le jeu D2 :
// les autres specs lisent ses commandes. Les écritures (livraison, révocation, remboursement) sont couvertes par pytest.
// Comptes Support et Finance déjà connectés par d'autres specs : un code TOTP ne sert qu'une fois, d'où l'attente
// possible de plusieurs fenêtres de 30 s.

test("6.4 Support suit les commandes de kits, leurs Kit Codes et le stock (WAD10)", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(`${API_URL}/admin/login/?next=/admin/payments/order/`);
  await staffLogin(page, STAFF.support);
  // Commandes payées seulement : P4 crée des commandes invitées, pas encore payées pendant ce test
  await page.goto(`${API_URL}/admin/payments/order/?kind__exact=kit&status__exact=paid`);

  const results = page.locator("#result_list");
  await expect(results.getByRole("columnheader", { name: "Articles" })).toBeVisible();
  await expect(results.getByRole("columnheader", { name: "Livraison" })).toBeVisible();
  // La livraison avance par l'action, jamais par le formulaire de la commande
  await expect(page.locator('select[name="action"] option[value="set_shipping_status"]')).toHaveCount(1);

  await results.locator("tbody tr th a").first().click();
  await expect(page.locator(".field-kit_codes")).toContainText(/STEAMY-[0-9A-Z]{4}-[0-9A-Z]{4} · (disponible|utilisé|révoqué)/);
  await expect(page.locator('select[name="shipping_status"], select[name="status"]')).toHaveCount(0);

  await page.goto(`${API_URL}/admin/shop/kit/`);
  await expect(page.locator("#result_list")).toContainText(/En stock|Stock bas|Rupture/);
});

test("6.4 Finance lit les paiements : agrégats, numéro masqué, notification du prestataire (WAD11)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto(`${API_URL}/admin/login/?next=/admin/payments/payment/`);
  await staffLogin(page, STAFF.finance);
  await expect(page).toHaveURL(`${API_URL}/admin/payments/payment/`);

  const totals = page.getByRole("region", { name: "Agrégats des paiements listés" });
  await expect(totals).toContainText("encaissés (paiements réussis)");
  await expect(totals).toContainText("taux d'échec");
  await expect(page.locator("#result_list")).toContainText("••••");

  await page.locator("#result_list tbody tr th a").first().click();
  await expect(page.locator(".field-masked_msisdn")).toContainText("••••");
  await expect(page.locator(".field-payload")).toBeVisible();
});
