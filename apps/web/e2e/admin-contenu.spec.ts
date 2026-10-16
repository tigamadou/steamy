import { expect, test } from "@playwright/test";

import { API_URL, STAFF, staffLogin } from "./support/staff";

// LOT-6 · 6.3 WAD09 Contenu dans l'admin Django : le groupe Contenu parcourt la liste des parcours (accès, kit,
// inscrits), puis l'arbre par pages chaînées (fil d'Ariane vers le parent, aperçu Vimeo de la mission). Le statut ne se
// modifie que par « Publier » (arbre complet exigé). Lecture seule sur le jeu D2 : « Publier » est rejoué sur un parcours
// déjà publié et complet, rien n'est dépublié (les autres specs lisent le catalogue public).

test("6.3 Contenu parcourt l'arbre d'un parcours et le publie (WAD09)", async ({ page }) => {
  test.slow(); // attente possible de la fenêtre TOTP suivante ; admin-connexion.spec.ts envoie un code faux à Contenu
  await page.goto(`${API_URL}/admin/login/?next=/admin/catalog/course/`);
  await staffLogin(page, STAFF.content);
  await expect(page).toHaveURL(`${API_URL}/admin/catalog/course/`);

  const results = page.locator("#result_list");
  await expect(results.getByRole("columnheader", { name: "Accès" })).toBeVisible();
  await expect(results.getByRole("columnheader", { name: "Inscrits" })).toBeVisible();
  await expect(results.getByRole("columnheader", { name: "Kit requis" })).toBeVisible();

  // Un parcours publié du jeu D2 : statut en lecture seule, projets en ligne avec un lien vers leur page
  await page.goto(`${API_URL}/admin/catalog/course/?status__exact=published`); // filtre par statut
  const course = results.locator("tbody tr").first();
  const title = (await course.locator("th a").textContent())?.trim() ?? "";
  await course.locator("th a").click();
  await expect(page.locator(".field-status .readonly")).toHaveText("Publié");
  await expect(page.locator('select[name="status"], input[name="status"]')).toHaveCount(0);

  await page.getByRole("link", { name: "Modification", exact: true }).first().click();
  await expect(page.locator(".field-path").getByRole("link", { name: title, exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Modification", exact: true }).first().click();
  await expect(page.locator(".field-path").getByRole("link", { name: title, exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Modification", exact: true }).first().click();
  await expect(page.locator(".field-path a")).toHaveCount(3);
  await expect(page.locator(".field-vimeo_preview iframe")).toHaveAttribute("src", /^https:\/\/player\.vimeo\.com\/video\/\d+/);

  // « Publier » sur un parcours complet : confirmé, le statut reste « Publié »
  await page.goto(`${API_URL}/admin/catalog/course/?status__exact=published`);
  await results.locator("tbody tr").first().locator('input[name="_selected_action"]').check();
  await page.locator('select[name="action"]').selectOption("publish");
  await page.getByRole("button", { name: /Exécuter|Envoyer|Go/ }).click();
  await expect(page.locator(".messagelist")).toContainText("1 parcours publié.");
});
