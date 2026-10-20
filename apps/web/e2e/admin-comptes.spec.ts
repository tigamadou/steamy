import { expect, test } from "@playwright/test";

import { API_URL, STAFF, staffLogin } from "./support/staff";

// LOT-6 · 6.2 comptes dans l'admin Django : WAD06-WAD08 par le Support (recette D2 : retrouver Léa Adjovi, voir son
// parent et ses consentements), WAD13 par le Super-admin. Lecture seule sur le jeu D2 : les écritures (statut, relance,
// litige, changement de parent, mot de passe, invitation) sont couvertes par pytest. Un code TOTP ne sert qu'une fois
// par compte : attente possible de plusieurs fenêtres de 30 s.

test("6.2 Support retrouve Léa Adjovi, son parent et les consentements (WAD06-WAD08)", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(`${API_URL}/admin/login/?next=/admin/accounts/user/`);
  await staffLogin(page, STAFF.support);

  // WAD06 : recherche par identifiant, colonnes ville et statut, invitation d'un enseignant
  await page.goto(`${API_URL}/admin/accounts/user/?q=lea.adjovi`);
  const results = page.locator("#result_list");
  await expect(results.getByRole("columnheader", { name: "Ville" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inviter un enseignant" })).toBeVisible();
  await results.getByRole("link", { name: "lea.adjovi" }).click();

  // WAD07 : identifiants en lecture seule, consentements en ligne, lien vers le parent
  await expect(page.locator('input[name="username"], input[name="role"]')).toHaveCount(0);
  await expect(page.locator(".field-parent a")).toBeVisible();
  await page.locator(".field-parent a").click();
  await expect(page.getByRole("link", { name: "lea.adjovi" }).first()).toBeVisible();

  // WAD08 : suivi des consentements, sans action qui accepte ou refuse à la place du parent (D70)
  await page.goto(`${API_URL}/admin/accounts/consentrequest/`);
  const actions = page.locator('select[name="action"] option');
  await expect(page.locator('select[name="action"] option[value="resend"]')).toHaveCount(1);
  await expect(actions.filter({ hasText: /Accepter|Valider/ })).toHaveCount(0);
});

test("6.2 Super-admin consulte l'équipe et ses appareils TOTP (WAD13)", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(`${API_URL}/admin/login/?next=/admin/accounts/staffmember/`);
  await staffLogin(page, STAFF.superAdmin);
  await expect(page).toHaveURL(`${API_URL}/admin/accounts/staffmember/`);
  const results = page.locator("#result_list");
  await expect(results).toContainText(STAFF.support);
  await expect(results.getByRole("columnheader", { name: "Groupes" })).toBeVisible();
  await expect(page.locator('select[name="action"] option[value="reset_totp"]')).toHaveCount(1);
});
