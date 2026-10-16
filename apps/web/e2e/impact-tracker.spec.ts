import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { API_URL, STAFF, staffLogin } from "./support/staff";

// LOT-6 · 6.8 Impact Tracker : WAD02 (période dans l'URL, valeurs relues côté serveur) et WAD03 (détail d'un
// indicateur), par le groupe Finance. Les valeurs dépendent du calcul nocturne : seuls la période, les libellés et
// la définition renvoyés par l'API sont vérifiés. Un code TOTP ne sert qu'une fois : `staffLogin` attend au besoin.

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

test("6.8 Finance change de période sur WAD02 puis ouvre un indicateur (WAD03)", async ({ page }) => {
  test.slow(); // attente possible de la fenêtre TOTP suivante (bureau et mobile partagent le compte)
  await page.goto("/backoffice/impact");
  await expect(page).toHaveURL((url) => url.href.startsWith(`${API_URL}/admin/login/`));
  await staffLogin(page, STAFF.finance);
  await expect(page).toHaveURL(`${BASE_URL}/backoffice/impact`);
  await expect(page.getByRole("heading", { level: 1, name: "Impact Tracker" })).toBeVisible();

  const periods = page.getByRole("group", { name: "Période" });
  await expect(periods.getByRole("button", { name: "Mois" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("list", { name: "Sources des indicateurs" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ventes & finance" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Inclusion · Apprenants (NA)" })).toBeVisible();
  // D75 : ni tuile « Activer la collecte », ni statut recalculé par le front
  await expect(page.getByText(/Activer la collecte|Configurer la collecte/)).toHaveCount(0);

  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);

  // La période passe dans l'URL et le serveur renvoie les KPI du trimestre en cours
  await periods.getByRole("button", { name: "Trimestre" }).click();
  await expect(page).toHaveURL(`${BASE_URL}/backoffice/impact?periode=trimestre`);
  await expect(page.getByText(/^Période : T[1-4] \d{4}/)).toBeVisible();
  await expect(periods.getByRole("button", { name: "Trimestre" })).toHaveAttribute("aria-pressed", "true");

  // Rechargement : la période reste celle de l'URL
  await page.reload();
  await expect(page.getByText(/^Période : T[1-4] \d{4}/)).toBeVisible();

  // WAD03 : détail de l'indicateur, période conservée
  await page
    .getByRole("region", { name: "Ventes & finance" })
    .getByRole("link", { name: "Ventes réalisées" })
    .click();
  await expect(page).toHaveURL(`${BASE_URL}/backoffice/impact/indicateurs/ventes?periode=trimestre`);
  await expect(page.getByRole("heading", { level: 1, name: "Détail de l'indicateur" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ventes réalisées", exact: true })).toBeVisible();
  const definition = page.getByRole("region", { name: "Définition" });
  await expect(definition.getByText("Montant des commandes payées dans la période (FCFA)")).toBeVisible();
  await expect(definition.getByText("Mensuelle")).toBeVisible();
  await expect(page.getByRole("table", { name: "Historique de l'indicateur Ventes réalisées" })).toBeVisible();

  const detail = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(detail.violations).toEqual([]);

  // Code inconnu : 404 ; fil d'Ariane : retour au tableau de bord sur la même période
  await page.getByRole("navigation", { name: "Fil d'Ariane" }).getByRole("link", { name: "Impact Tracker" }).click();
  await expect(page).toHaveURL(`${BASE_URL}/backoffice/impact?periode=trimestre`);
  await page.goto("/backoffice/impact/indicateurs/inconnu");
  await expect(page.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeVisible();
});
