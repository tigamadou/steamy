import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { expectAccessible } from "../support/a11y";
import { expectNoUnhandledCall, signInAs } from "../support/fausse-api";

// Back-office Finance : paiements, détail d'un paiement et remboursements. Tests fonctionnels sur fixtures
// (docs/tests/FIXTURES-FAUSSE-API.md) : chaque test nomme sa fixture ; chaque scénario du cahier de recette est une
// étape `REC-ADM-xxx · …` (section « Paiements et remboursements » de apps/web/e2e/CAHIER-DE-RECETTE.md). Montants, dates
// et statuts attendus sont ceux des fixtures de `fausse-api/ecrans/backoffice-paiements.ts`.

const PAYMENTS = "/backoffice/paiements";
const REFUNDS = "/backoffice/remboursements";
const nav = (page: Page) => page.getByRole("navigation", { name: "Navigation du back-office" });
const payments = (page: Page) => page.getByRole("table", { name: "Paiements Mobile Money" });
const rowsOf = (table: Locator) => table.getByRole("row");
const status = (page: Page) => page.getByRole("status").filter({ hasText: /\S/ });
const alert = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });
const totals = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

test.beforeEach(async ({}, testInfo) => {
  testInfo.annotations.push({ type: "projet", description: testInfo.project.name });
});

async function onMobile(testInfo: TestInfo, title: string, body: () => Promise<void>) {
  if (testInfo.project.name === "mobile") await test.step(title, body);
}

/** Ouvre le menu sous 1024 px (projet mobile) ; sans effet sur bureau. */
async function openMenu(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const toggle = page.getByRole("button", { name: "Menu du back-office" });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
}

async function openFromMenu(page: Page, entry: RegExp, url: string) {
  await openMenu(page);
  await nav(page).getByRole("link", { name: entry }).click();
  await expect(page).toHaveURL(url);
}

test("paiements · Finance : menu, totaux, tableau, filtres et pagination d'URL", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "backoffice-finance");
  await page.goto("/backoffice");

  await test.step("REC-ADM-611 · Ouvrir « Paiements » depuis le groupe « Finance » du menu : titre, onglet, totaux, filtres et tableau", async () => {
    await openMenu(page);
    await expect(nav(page).getByText("Finance", { exact: true })).toBeVisible();
    await expect(nav(page).getByRole("link", { name: /^Remboursements/ })).toHaveAttribute("href", REFUNDS);
    await expect(nav(page).getByRole("link", { name: /^Paiements/ })).toHaveAttribute("href", PAYMENTS);
    await nav(page).getByRole("link", { name: /^Paiements/ }).click();
    await expect(page).toHaveURL(PAYMENTS);
    await expect(page.getByRole("heading", { level: 1, name: "Paiements" })).toBeVisible();
    await expect(page).toHaveTitle("Paiements · Back-office");
    await expect(page.getByRole("form", { name: "Filtres des paiements" })).toBeVisible();
    await expect(payments(page)).toBeVisible();
    await expectAccessible(page);
  });

  await test.step("REC-ADM-612 · Lire les quatre totaux : volume encaissé, nombre de paiements, réussis / échoués, taux d'échec", async () => {
    await expect(totals(page, "Volume encaissé")).toContainText(/74\s000\sFCFA/);
    await expect(totals(page, "Paiements")).toContainText("5");
    await expect(totals(page, "Réussis / échoués")).toContainText("2 / 2");
    await expect(totals(page, "Taux d'échec")).toContainText(/50\s%/);
  });

  await test.step("REC-ADM-613 · Lire le tableau : numéro masqué, statut, motif d'échec, lien vers le détail, aucun numéro complet", async () => {
    await expect(rowsOf(payments(page))).toHaveCount(6);
    const failed = rowsOf(payments(page)).filter({ hasText: "STY-7002-2" });
    await expect(failed).toContainText("01 ** ** ** 02");
    await expect(failed).toContainText("Échoué");
    await expect(failed).toContainText("Paiement refusé");
    await expect(failed).toContainText("Solde insuffisant");
    await expect(failed).toContainText(/15\s000\sFCFA/);
    await expect(failed.getByRole("link")).toHaveAttribute("href", "/backoffice/paiements/2");
    expect(await payments(page).innerText()).not.toMatch(/(\d ?){9,}/);
  });

  await test.step("REC-ADM-614 · Filtrer par statut, par réseau puis par recherche : l'URL porte les filtres, le rechargement les conserve", async () => {
    await page.getByLabel("Statut").selectOption("failed");
    await page.getByRole("button", { name: "Filtrer" }).click();
    await expect(page).toHaveURL(/statut=failed/);
    await expect(rowsOf(payments(page))).toHaveCount(3);
    await page.getByLabel("Réseau").selectOption("moov");
    await page.getByRole("button", { name: "Filtrer" }).click();
    await expect(page).toHaveURL(/reseau=moov/);
    await page.getByLabel("Référence ou identifiant").fill("STY-7002-2");
    await page.getByRole("button", { name: "Filtrer" }).click();
    await expect(page).toHaveURL(/q=STY-7002-2/);
    await expect(rowsOf(payments(page))).toHaveCount(2);
    // Les totaux suivent tout le filtre
    await expect(totals(page, "Paiements")).toContainText("1");
    await expect(totals(page, "Taux d'échec")).toContainText(/100\s%/);
    await page.reload();
    await expect(page.getByLabel("Statut")).toHaveValue("failed");
    await expect(page.getByLabel("Réseau")).toHaveValue("moov");
    await expect(page.getByLabel("Référence ou identifiant")).toHaveValue("STY-7002-2");
    await expect(rowsOf(payments(page))).toHaveCount(2);
  });

  await test.step("REC-ADM-615 · Filtrer sans résultat, puis « Réinitialiser » : état vide, puis liste complète", async () => {
    await page.getByLabel("Référence ou identifiant").fill("introuvable");
    await page.getByRole("button", { name: "Filtrer" }).click();
    await expect(page.getByText("Aucun paiement ne correspond à ces filtres.")).toBeVisible();
    await page.getByRole("link", { name: "Réinitialiser" }).click();
    await expect(page).toHaveURL(PAYMENTS);
    await expect(rowsOf(payments(page))).toHaveCount(6);
  });

  await onMobile(testInfo, "REC-ADM-616 · Ouvrir « Paiements » à 360 px : le tableau défile dans sa région, la page ne défile pas", async () => {
    const region = page.getByRole("region", { name: "Paiements Mobile Money" });
    await expect(region).toHaveAttribute("tabindex", "0");
    expect(await region.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await expectAccessible(page);
  });

  expect(await session.writes()).toEqual([]);
  await expectNoUnhandledCall(session);
});

test("paiements · détail d'un paiement échoué, revérification d'un paiement en attente", async ({ page, context }) => {
  const session = await signInAs(context, "backoffice-finance");
  await page.goto(PAYMENTS);

  await test.step("REC-ADM-617 · Ouvrir le détail d'un paiement échoué : cartes, autre tentative, journal ; pas de remboursement", async () => {
    await page.getByRole("link", { name: /STY-7002-2/ }).click();
    await expect(page).toHaveURL("/backoffice/paiements/2");
    await expect(page.getByRole("heading", { level: 1, name: "Paiement CMD-7002" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Fil d'Ariane" }).getByRole("link", { name: "Paiements" })).toHaveAttribute("href", PAYMENTS);
    const payment = page.getByRole("region", { name: "Paiement", exact: true });
    await expect(payment).toContainText("Paiement refusé");
    await expect(payment).toContainText("Solde insuffisant");
    await expect(payment).toContainText("01 ** ** ** 02");
    await expect(page.getByRole("region", { name: "Commande" })).toContainText("CMD-7002");
    await expect(page.getByRole("table", { name: "Autres tentatives" }).getByRole("link", { name: "STY-7002-1" })).toHaveAttribute("href", "/backoffice/paiements/5");
    await expect(page.getByText("Aucun remboursement.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Revérifier chez FedaPay" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Demander un remboursement" })).toHaveCount(0);
    await expectAccessible(page);
  });

  await test.step("REC-ADM-618 · Revérifier un paiement en attente : statut mis à jour, message, journal ; plus de « Revérifier »", async () => {
    await page.goto("/backoffice/paiements/3");
    const payment = page.getByRole("region", { name: "Paiement", exact: true });
    await expect(payment).toContainText("En attente");
    await page.getByRole("button", { name: "Revérifier chez FedaPay" }).click();
    await expect(status(page)).toHaveText("Paiement revérifié : statut Réussi.");
    await expect(payment).toContainText("Réussi");
    await expect(page.getByRole("button", { name: "Revérifier chez FedaPay" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Demander un remboursement" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Journal du paiement" })).toContainText("Paiement revérifié chez FedaPay");
    await expectAccessible(page);
  });

  expect(await session.writes()).toEqual(["POST /api/backoffice/payments/3/recheck/"]);
  await expectNoUnhandledCall(session);
});

test("remboursements · demande, traitement avec référence et passage dans « Traités »", async ({ page, context }) => {
  const session = await signInAs(context, "backoffice-finance");
  await page.goto("/backoffice/paiements/1");

  await test.step("REC-ADM-619 · Demander un remboursement : montant prérempli au reste remboursable, motif obligatoire", async () => {
    await page.getByRole("button", { name: "Demander un remboursement" }).click();
    const dialog = page.getByRole("dialog", { name: "Demander un remboursement" });
    await expect(dialog.getByLabel(/Montant \(FCFA\)/)).toHaveValue("34000");
    await expectAccessible(page);
    await dialog.getByRole("button", { name: "Demander le remboursement" }).click();
    await expect(dialog.getByText("Le motif est obligatoire.")).toBeVisible();
    await dialog.getByLabel(/Montant \(FCFA\)/).fill("40000");
    await dialog.getByLabel(/Motif/).fill("Trop demandé");
    await dialog.getByRole("button", { name: "Demander le remboursement" }).click();
    await expect(dialog.getByText(/Saisissez un montant entier entre 1 et/)).toBeVisible();
    expect(await session.writes()).toEqual([]);
  });

  await test.step("REC-ADM-620 · Demander 5 000 FCFA avec un motif : la modale se ferme, message, reste remboursable mis à jour", async () => {
    const dialog = page.getByRole("dialog", { name: "Demander un remboursement" });
    await dialog.getByLabel(/Montant \(FCFA\)/).fill("5000");
    await dialog.getByRole("button", { name: "Demander le remboursement" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(status(page)).toHaveText("Remboursement demandé : il apparaît dans les remboursements à traiter.");
    await expect(page.getByRole("region", { name: "Paiement", exact: true })).toContainText(/Reste remboursable\s*29\s000\sFCFA/);
    await expect(page.getByRole("table", { name: "Remboursements du paiement" }).getByRole("row")).toHaveCount(3);
  });

  await test.step("REC-ADM-621 · Ouvrir « Remboursements » : le remboursement demandé est « à traiter »", async () => {
    await openFromMenu(page, /^Remboursements/, REFUNDS);
    await expect(page.getByRole("heading", { level: 1, name: "Remboursements" })).toBeVisible();
    await expect(page.getByRole("link", { name: "À traiter" })).toHaveAttribute("aria-current", "page");
    const table = page.getByRole("table", { name: "Remboursements à traiter" });
    await expect(rowsOf(table)).toHaveCount(3);
    const requested = rowsOf(table).filter({ hasText: /5\s000\sFCFA/ });
    await expect(requested).toContainText("Trop demandé");
    await expect(requested).toContainText("CMD-7001");
    await expectAccessible(page);
  });

  await test.step("REC-ADM-622 · « Marquer comme remboursé » sans référence : refusé, aucun appel ; avec référence : la ligne passe dans « Traités »", async () => {
    const table = page.getByRole("table", { name: "Remboursements à traiter" });
    await rowsOf(table).filter({ hasText: /5\s000\sFCFA/ }).getByRole("button", { name: /Marquer comme remboursé/ }).click();
    const dialog = page.getByRole("dialog", { name: "Marquer comme remboursé" });
    await expectAccessible(page);
    await dialog.getByRole("button", { name: "Confirmer" }).click();
    await expect(dialog.getByText("La référence du remboursement est obligatoire.")).toBeVisible();
    expect((await session.writes()).filter((write) => write.includes("process"))).toEqual([]);
    await dialog.getByLabel(/Référence du remboursement/).fill("FDP-REM-0099");
    await dialog.getByRole("button", { name: "Confirmer" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(status(page)).toHaveText("Remboursement de la commande CMD-7001 marqué comme fait.");
    await expect(rowsOf(table)).toHaveCount(2);
    await page.getByRole("link", { name: "Traités" }).click();
    await expect(page).toHaveURL(/onglet=traites/);
    const done = page.getByRole("table", { name: "Remboursements traités" });
    await expect(rowsOf(done)).toHaveCount(3);
    await expect(rowsOf(done).filter({ hasText: "FDP-REM-0099" })).toContainText("Fatou Kouassi");
    await expect(page.getByRole("button", { name: /Marquer comme remboursé/ })).toHaveCount(0);
    await expectAccessible(page);
  });

  expect(await session.writes()).toEqual(["POST /api/backoffice/payments/1/refunds/", "POST /api/backoffice/refunds/3/process/"]);
  await expectNoUnhandledCall(session);
});

test("remboursements · déjà marqué comme fait ailleurs (409)", async ({ page, context }) => {
  const session = await signInAs(context, "backoffice-remboursement-deja-fait");
  await page.goto(REFUNDS);

  await test.step("REC-ADM-623 · Marquer un remboursement déjà fait : message dédié, liste rafraîchie, la ligne passe dans « Traités »", async () => {
    const table = page.getByRole("table", { name: "Remboursements à traiter" });
    await table.getByRole("button", { name: /Marquer comme remboursé/ }).click();
    await page.getByLabel(/Référence du remboursement/).fill("FDP-REM-0100");
    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect(alert(page)).toHaveText("Ce remboursement est déjà marqué comme remboursé.");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Aucun remboursement à traiter.")).toBeVisible();
    await page.getByRole("link", { name: "Traités" }).click();
    await expect(rowsOf(page.getByRole("table", { name: "Remboursements traités" }))).toHaveCount(3);
  });

  await expectNoUnhandledCall(session);
});

test("incidents · prestataire injoignable à la revérification, erreur serveur de la liste", async ({ page, context }) => {
  const session = await signInAs(context, "backoffice-reverification-impossible");
  await page.goto("/backoffice/paiements/3");

  await test.step("REC-ADM-624 · Revérifier alors que FedaPay ne répond pas : message d'erreur, statut inchangé, nouvel essai possible", async () => {
    await page.getByRole("button", { name: "Revérifier chez FedaPay" }).click();
    await expect(alert(page)).toContainText("Le prestataire de paiement n'a pas répondu");
    await expect(page.getByRole("region", { name: "Paiement", exact: true })).toContainText("En attente");
    await expect(page.getByRole("button", { name: "Revérifier chez FedaPay" })).toBeEnabled();
    await expectAccessible(page);
  });
  await expectNoUnhandledCall(session);

  await context.clearCookies();
  const broken = await signInAs(context, "backoffice-erreur-serveur");
  await test.step("REC-ADM-625 · Ouvrir « Paiements » alors que l'API est en erreur : état d'erreur dans le shell, la navigation reste disponible", async () => {
    await page.goto(PAYMENTS);
    await expect(page.getByRole("heading", { name: "Chargement impossible" })).toBeVisible();
    await expect(page.locator('aside[aria-label="Back-office"]')).toBeAttached();
  });
  await expectNoUnhandledCall(broken);
});

test("accès · Support : pages Finance refusées, menu sans « Finance »", async ({ page, context }) => {
  const session = await signInAs(context, "backoffice-support");

  await test.step("REC-ADM-626 · Support ouvre « Paiements » puis « Remboursements » et un détail : accès refusé ; le menu n'a pas de groupe « Finance »", async () => {
    for (const path of [PAYMENTS, REFUNDS, "/backoffice/paiements/1"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/backoffice/acces-refuse");
    }
    await openMenu(page);
    await expect(nav(page).getByRole("link", { name: /^Vue d'ensemble/ })).toBeVisible();
    await expect(nav(page).getByText("Finance", { exact: true })).toHaveCount(0);
    await expect(nav(page).getByRole("link", { name: /^Paiements/ })).toHaveCount(0);
    await expect(nav(page).getByRole("link", { name: /^Remboursements/ })).toHaveCount(0);
    await expectAccessible(page);
  });

  await expectNoUnhandledCall(session);
});

test("vue d'ensemble · « À traiter » ouvre les écrans Finance", async ({ page, context }) => {
  const session = await signInAs(context, "backoffice-finance");
  await page.goto("/backoffice");
  const todo = page.getByRole("region", { name: "À traiter" });

  await test.step("REC-ADM-627 · Ouvrir « Paiements échoués » depuis « À traiter » : liste filtrée sur les paiements échoués", async () => {
    await expect(todo.getByRole("link", { name: /Remboursements à traiter/ })).toHaveAttribute("href", REFUNDS);
    await todo.getByRole("link", { name: /Paiements échoués/ }).click();
    await expect(page).toHaveURL(`${PAYMENTS}?statut=failed`);
    await expect(page.getByLabel("Statut")).toHaveValue("failed");
    await expect(rowsOf(payments(page))).toHaveCount(3);
  });

  await test.step("REC-ADM-628 · Ouvrir « Remboursements à traiter » depuis « À traiter » : onglet « À traiter »", async () => {
    await page.goBack();
    await todo.getByRole("link", { name: /Remboursements à traiter/ }).click();
    await expect(page).toHaveURL(REFUNDS);
    await expect(page.getByRole("link", { name: "À traiter" })).toHaveAttribute("aria-current", "page");
  });

  await expectNoUnhandledCall(session);
});

test("vide · aucun paiement, aucun remboursement", async ({ page, context }) => {
  const session = await signInAs(context, "backoffice-finance-vide");

  await test.step("REC-ADM-629 · Ouvrir « Paiements » sans aucun paiement : état vide, taux d'échec « — » (jamais 0)", async () => {
    await page.goto(PAYMENTS);
    await expect(page.getByText("Aucun paiement ne correspond à ces filtres.")).toBeVisible();
    await expect(totals(page, "Taux d'échec")).toContainText("—");
    await expect(totals(page, "Taux d'échec")).toContainText("aucun paiement réglé");
    await expectAccessible(page);
  });

  await test.step("REC-ADM-630 · Ouvrir « Remboursements » sans remboursement : états vides des deux onglets", async () => {
    await page.goto(REFUNDS);
    await expect(page.getByText("Aucun remboursement à traiter.")).toBeVisible();
    await page.getByRole("link", { name: "Traités" }).click();
    await expect(page.getByText("Aucun remboursement traité.")).toBeVisible();
    await expectAccessible(page);
  });

  await expectNoUnhandledCall(session);
});
