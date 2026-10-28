import { expect, test, type Page, type TestInfo } from "@playwright/test";

import {
  COMMANDE_AUTRE_FAMILLE,
  evenementPaye,
  kitAnnule,
  kitEnAttente,
  kitPayee,
  parcoursPaye,
  parcoursRembourse,
} from "../fausse-api/ecrans/commandes-parent.ts";
import { expectAccessible } from "../support/a11y";
import { expectNoUnhandledCall, signInAs } from "../support/fausse-api";
import { chooseNetwork, freezeClock, pay, payButton, phoneField } from "../support/paiement";

// Commandes du parent (`/parent/commandes`) et suivi d'une commande (`/parent/commandes/[référence]`) : tests
// fonctionnels sur fixtures (docs/tests/FIXTURES-FAUSSE-API.md). Chaque test nomme sa fixture ; chaque scénario du
// cahier de recette est une étape `REC-PAR-xxx · …` (section « Historique de commande » de
// apps/web/e2e/CAHIER-DE-RECETTE.md). Les montants et les dates attendus sont ceux des fixtures.

const API_URL = "http://localhost:4010";
const LIST = "/parent/commandes";
const KIT = kitPayee();
const COURSE = parcoursPaye();
const EVENT = evenementPaye();
const PENDING = kitEnAttente();

const fcfa = (amount: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} F CFA`;
/** Ligne de montant (`dt` du libellé et `dd` du montant), libellé exact. */
const line = (page: Page, label: string) =>
  page.locator("dt").filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).locator("xpath=..").filter({ visible: true });
const orders = (page: Page) => page.getByRole("list", { name: "Mes commandes" }).getByRole("article");
const row = (page: Page, kind: string, title: string) => page.getByRole("article", { name: `${kind} : ${title}` });
const tabs = (page: Page) => page.getByRole("navigation", { name: "Filtrer les commandes" });

test.beforeEach(async ({}, testInfo) => {
  testInfo.annotations.push({ type: "projet", description: testInfo.project.name });
});

async function onMobile(testInfo: TestInfo, title: string, body: () => Promise<void>) {
  if (testInfo.project.name === "mobile") await test.step(title, body);
}

test("liste · parent avec six commandes : lignes, filtres, facture, reprise du paiement", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "commandes-parent");
  await page.goto(LIST);
  await expect(page.getByRole("heading", { level: 1, name: "Commandes" })).toBeVisible();

  await test.step("REC-PAR-166 · Ouvrir la page : titre, onglets de filtre, « Acheter un kit », liste « Mes commandes »", async () => {
    for (const label of ["Toutes", "Payées", "En attente", "Annulées", "Remboursées"]) {
      await expect(tabs(page).getByRole("link", { name: label })).toBeVisible();
    }
    await expect(tabs(page).getByRole("link", { name: "Toutes" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Acheter un kit" })).toHaveAttribute("href", "/parent/boutique");
    await expect(orders(page)).toHaveCount(6);
    await expect(page).toHaveTitle("Commandes · Steamy");
  });

  await test.step("REC-PAR-167 · Lire une ligne de commande de kit payée : repère, bénéficiaire, référence, date, livraison, badge, montant du serveur, « Facture » et « Suivre »", async () => {
    const kit = row(page, "Kit", "Pack Électronique").first();
    await expect(kit).toContainText("Kit");
    await expect(kit).toContainText("Pour Léa · N° CMD-K1 · 18 octobre 2026 · Livraison : En préparation");
    await expect(kit.getByText("Payée", { exact: true })).toBeVisible();
    await expect(kit).toContainText(fcfa(KIT.total));
    await expect(kit.getByRole("link", { name: "Facture de la commande CMD-K1" })).toHaveAttribute("href", `${API_URL}/api/payments/orders/CMD-K1/invoice/`);
    await expect(kit.getByRole("link", { name: "Suivre la commande CMD-K1" })).toHaveAttribute("href", "/parent/commandes/CMD-K1");
  });

  await test.step("REC-PAR-168 · Lire des commandes de parcours et d'événement : repères « Parcours » et « Événement », pas de livraison ni de « Suivre »", async () => {
    const course = row(page, "Parcours", "Capteurs électroniques").first();
    await expect(course).toContainText("Parcours");
    await expect(course).toContainText(`Pour Léa · N° CMD-C1 · 15 octobre 2026`);
    await expect(course).not.toContainText("Livraison");
    await expect(course.getByRole("link", { name: /Suivre/ })).toHaveCount(0);
    const event = row(page, "Événement", "Défi robots de Cotonou");
    await expect(event).toContainText(fcfa(EVENT.total));
    await expect(event.getByRole("link", { name: /Suivre/ })).toHaveCount(0);
    expect(COURSE.kind).toBe("course");
  });

  await onMobile(testInfo, "REC-PAR-180 · Mobile 360 px : lignes en colonne, badge, montant et boutons sous le libellé, onglets sans défilement horizontal de la page", async () => {
    const [title, badge] = await Promise.all([
      row(page, "Kit", "Pack Électronique").first().getByText("Pack Électronique").boundingBox(),
      row(page, "Kit", "Pack Électronique").first().getByText("Payée", { exact: true }).boundingBox(),
    ]);
    expect(badge!.y).toBeGreaterThan(title!.y);
  });

  await test.step("REC-PAR-441 · Accessibilité : aucune violation WCAG 2 A/AA sur la liste des commandes", async () => {
    await expectAccessible(page);
  });

  await test.step("REC-PAR-169 · Cliquer l'onglet « Payées » : URL ?statut=payees, onglet actif, seulement les commandes payées, filtre conservé au rechargement", async () => {
    await tabs(page).getByRole("link", { name: "Payées" }).click();
    await expect(page).toHaveURL(`${LIST}?statut=payees`);
    await expect(tabs(page).getByRole("link", { name: "Payées" })).toHaveAttribute("aria-current", "page");
    await expect(orders(page)).toHaveCount(3);
    await expect(page.getByText("Payée", { exact: true })).toHaveCount(3);
    await page.reload();
    await expect(orders(page)).toHaveCount(3);
  });

  await test.step("REC-PAR-170 · Cliquer « En attente », « Annulées », « Remboursées » : URL du filtre et badge de chaque statut", async () => {
    for (const [label, query, badge, title] of [
      ["En attente", "en-attente", "En attente de paiement", "Pack Électronique"],
      ["Annulées", "annulees", "Annulée", "Pack Électronique"],
      ["Remboursées", "remboursees", "Remboursée", "Capteurs électroniques"],
    ]) {
      await tabs(page).getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(`${LIST}?statut=${query}`);
      await expect(orders(page)).toHaveCount(1);
      await expect(orders(page).first()).toContainText(title);
      await expect(orders(page).first().getByText(badge, { exact: true })).toBeVisible();
    }
    expect(kitAnnule().status).toBe("cancelled");
    expect(parcoursRembourse().status).toBe("refunded");
  });

  await test.step("REC-PAR-172 · Ouvrir /parent/commandes?statut=inconnu : retour à « Toutes »", async () => {
    await page.goto(`${LIST}?statut=inconnu`);
    await expect(tabs(page).getByRole("link", { name: "Toutes" })).toHaveAttribute("aria-current", "page");
    await expect(orders(page)).toHaveCount(6);
  });

  await test.step("REC-PAR-175 · Cliquer « Facture » sur une commande payée dont le PDF est prêt : le navigateur reçoit facture-<numéro>.pdf", async () => {
    const download = page.waitForEvent("download");
    await row(page, "Kit", "Pack Électronique").first().getByRole("link", { name: "Facture de la commande CMD-K1" }).click();
    expect((await download).suggestedFilename()).toBe("facture-FAC-2026-000011.pdf");
  });

  await test.step("REC-PAR-177 · Lire la liste d'un parent : la commande d'une autre famille n'est jamais listée et son lien de facture répond « introuvable »", async () => {
    await expect(page.getByText(COMMANDE_AUTRE_FAMILLE)).toHaveCount(0);
    const response = await page.request.get(`${API_URL}/api/payments/orders/${COMMANDE_AUTRE_FAMILLE}/invoice/`);
    expect(response.status()).toBe(404);
  });

  await test.step("REC-PAR-178 · Cliquer « Payer » sur une commande « En attente de paiement » : détail de la commande, qui reprend le paiement", async () => {
    await page.getByRole("link", { name: "Payer la commande CMD-K2" }).click();
    await expect(page).toHaveURL("/parent/commandes/CMD-K2");
    await expect(page.getByRole("heading", { level: 2, name: "Payer par Mobile Money" })).toBeVisible();
    expect(PENDING.status).toBe("pending");
  });
  await expectNoUnhandledCall(session);
});

test("liste · état vide, filtre sans commande, facture en préparation, taxes éteintes", async ({ page, context }) => {
  await signInAs(context, "commandes-vide");

  await test.step("REC-PAR-173 · Ouvrir la page d'un parent sans commande : « Aucune commande pour l'instant », texte d'aide, « Voir la boutique de kits »", async () => {
    await page.goto(LIST);
    await expect(page.getByRole("heading", { level: 2, name: "Aucune commande pour l'instant" })).toBeVisible();
    await expect(page.getByText("Les parcours, kits et événements que vous réglez apparaîtront ici, avec leurs factures.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir la boutique de kits" })).toHaveAttribute("href", "/parent/boutique");
    await expectAccessible(page);
  });

  await test.step("REC-PAR-171 · Filtrer sur un statut sans commande : « Aucune commande « Payées » pour l'instant. »", async () => {
    await page.goto(`${LIST}?statut=payees`);
    await expect(page.getByText("Aucune commande « Payées » pour l'instant.")).toBeVisible();
  });

  await test.step("REC-PAR-176 · Ouvrir la liste d'une commande payée dont le PDF n'est pas prêt : « Facture en préparation » à la place du bouton", async () => {
    await signInAs(context, "commandes-facture-en-preparation");
    await page.goto(LIST);
    await expect(page.getByText("Facture en préparation")).toBeVisible();
    await expect(page.getByRole("link", { name: /^Facture de la commande/ })).toHaveCount(0);
  });

  await test.step("REC-PAR-442 · Ouvrir la liste avec les taxes éteintes : le montant de chaque ligne est le total du serveur (HT + livraison)", async () => {
    await signInAs(context, "commandes-sans-taxes");
    await page.goto(LIST);
    const noTax = kitPayee({}, { vat: null, aib: null });
    expect(noTax.total).toBe(noTax.subtotal + noTax.shippingFee);
    await expect(row(page, "Kit", "Pack Électronique")).toContainText(fcfa(noTax.total));
    await expect(row(page, "Parcours", "Capteurs électroniques")).toContainText(fcfa(parcoursPaye({}, { vat: null, aib: null }).total));
  });
});

test("liste · plus de dix commandes : pagination, filtre conservé", async ({ page, context }) => {
  await signInAs(context, "commandes-nombreuses");
  await page.goto(LIST);

  await test.step("REC-PAR-174 · Avoir plus de 10 commandes puis parcourir : dix par page, « Plus anciennes › » et « ‹ Plus récentes », filtre conservé", async () => {
    await expect(orders(page)).toHaveCount(10);
    const pages = page.getByRole("navigation", { name: "Pages des commandes" });
    await expect(pages.getByRole("link", { name: "‹ Plus récentes" })).toHaveCount(0);
    await pages.getByRole("link", { name: "Plus anciennes ›" }).click();
    await expect(page).toHaveURL(`${LIST}?page=2`);
    await expect(orders(page)).toHaveCount(2);
    await expect(pages.getByRole("link", { name: "‹ Plus récentes" })).toHaveAttribute("href", LIST);
    await page.goto(`${LIST}?statut=payees`);
    await page.getByRole("navigation", { name: "Pages des commandes" }).getByRole("link", { name: "Plus anciennes ›" }).click();
    await expect(page).toHaveURL(`${LIST}?statut=payees&page=2`);
    await expect(page.getByRole("navigation", { name: "Pages des commandes" }).getByRole("link", { name: "‹ Plus récentes" })).toHaveAttribute("href", `${LIST}?statut=payees`);
  });
});

test("liste · chargement et erreur du serveur", async ({ page, context }) => {
  await test.step("REC-PAR-165 · Ouvrir la page pendant que l'API répond lentement : squelette « Chargement de vos commandes… » puis la liste", async () => {
    await signInAs(context, "commandes-chargement-lent");
    await page.goto(LIST, { waitUntil: "commit" });
    await expect(page.getByRole("status", { name: "Chargement de vos commandes…" })).toBeVisible();
    await expect(orders(page).first()).toBeVisible();
  });

  await test.step("REC-PAR-181 · Ouvrir la liste alors que l'API répond en erreur 500 : état d'erreur « Oups, ça a coupé » du shell", async () => {
    await signInAs(context, "commandes-erreur-serveur");
    await page.goto(LIST);
    await expect(page.getByText("Oups, ça a coupé")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });
});

const detail = (reference: string) => `${LIST}/${reference}`;
const taxLabel = (tax: { code: "vat" | "aib"; rate: string }) => `${tax.code === "vat" ? "TVA" : "AIB"} (${tax.rate} %)`;

test("suivi · commande de kit payée : carte, montants du serveur, adresse, frise, Kit Codes, facture", async ({ page, context }, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:3100" });
  const session = await signInAs(context, "commandes-parent");
  await page.goto(detail("CMD-K1"));
  await expect(page.getByRole("heading", { level: 2, name: "Pack Électronique" })).toBeVisible();

  await test.step("REC-PAR-182 · Cliquer « Suivre » sur la commande de kit de Léa : fil d'Ariane, carte, articles, livraison, taxes et « Total à payer » du serveur, adresse, « Télécharger la facture »", async () => {
    const breadcrumb = page.getByRole("navigation", { name: "Fil d'Ariane" });
    await expect(breadcrumb.getByRole("link", { name: "Commandes" })).toHaveAttribute("href", LIST);
    await expect(breadcrumb).toContainText("CMD-K1");
    await expect(page.getByText("Kit · N° CMD-K1")).toBeVisible();
    await expect(page.getByText("Payée", { exact: true })).toBeVisible();
    await expect(page.getByText("Passée le 18 octobre 2026 · pour Léa · payée le 18 octobre 2026")).toBeVisible();
    await expect(line(page, "Pack Électronique")).toContainText(fcfa(KIT.items[0].total));
    await expect(line(page, "Livraison (Cotonou et Calavi)")).toContainText(fcfa(KIT.shippingFee));
    for (const tax of KIT.taxes) await expect(line(page, taxLabel(tax))).toContainText(fcfa(tax.amount));
    await expect(line(page, "Total à payer")).toContainText(fcfa(KIT.total));
    await expect(page.getByText("🚚 Marie Adjovi · Fidjrossè, Rue 12, villa verte, Cotonou")).toBeVisible();
    await expect(page.getByRole("link", { name: "Télécharger la facture de la commande CMD-K1" })).toHaveAttribute(
      "href",
      `${API_URL}/api/payments/orders/CMD-K1/invoice/`,
    );
    await expect(page).toHaveTitle("Commande · Steamy");
  });

  await test.step("REC-PAR-183 · Lire la section « Livraison » : frise « Commande confirmée », « En préparation » (en cours), « Expédiée », « Livrée »", async () => {
    const steps = page.getByRole("list", { name: "Suivi de livraison" });
    await expect(page.getByRole("heading", { level: 2, name: "Livraison" })).toBeVisible();
    for (const label of ["Commande confirmée", "En préparation", "Expédiée", "Livrée"]) await expect(steps).toContainText(label);
    await expect(steps.locator('[aria-current="step"]')).toContainText("En préparation");
    await expect(steps).toContainText(`Délai annoncé : ${"2 à 3 jours"}`);
  });

  await test.step("REC-PAR-184 · Lire la section « Kit Codes » : texte d'aide, liste au format STEAMY-XXXX-XXXX avec le nom du kit, « Copier » puis « Copié » et annonce", async () => {
    await expect(page.getByRole("heading", { level: 2, name: "Kit Codes" })).toBeVisible();
    await expect(page.getByText("Transmettez un code à votre enfant : il le saisit dans le parcours compatible pour le débloquer. Il est aussi imprimé sur la notice du kit.")).toBeVisible();
    const codes = page.getByRole("list", { name: "Kit Codes de la commande" }).getByRole("listitem");
    await expect(codes).toHaveCount(3);
    await expect(codes.first()).toContainText("STEAMY-AB12-CD34");
    await expect(codes.first()).toContainText("Pack Électronique");
    await page.getByRole("button", { name: "Copier le code STEAMY-AB12-CD34" }).click();
    await expect(page.getByRole("button", { name: "Copié le code STEAMY-AB12-CD34" })).toBeVisible();
    await expect(page.getByText("Code STEAMY-AB12-CD34 copié.")).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("STEAMY-AB12-CD34");
  });

  await test.step("REC-PAR-185 · Lire un Kit Code déjà saisi par l'enfant : badge « Utilisé », sans bouton « Copier »", async () => {
    const used = page.getByRole("listitem").filter({ hasText: "STEAMY-EF56-GH78" });
    await expect(used.getByText("Utilisé", { exact: true })).toBeVisible();
    await expect(used.getByRole("button")).toHaveCount(0);
  });

  await test.step("REC-PAR-186 · Lire un Kit Code révoqué par le Support : badge « Révoqué », sans « Copier », le code reste listé", async () => {
    const revoked = page.getByRole("listitem").filter({ hasText: "STEAMY-JK90-LM12" });
    await expect(revoked.getByText("Révoqué", { exact: true })).toBeVisible();
    await expect(revoked.getByRole("button")).toHaveCount(0);
  });

  await onMobile(testInfo, "REC-PAR-190 · Mobile 360 px : cartes empilées, frise et Kit Codes lisibles, bouton « Copier » d'au moins 44 px de large", async () => {
    const copy = (await page.getByRole("button", { name: /^Copi.* le code/ }).boundingBox())!;
    expect(copy.width).toBeGreaterThanOrEqual(44);
  });

  await test.step("REC-PAR-443 · Accessibilité : aucune violation WCAG 2 A/AA sur le suivi d'une commande de kit payée", async () => {
    await expectAccessible(page);
  });

  await test.step("REC-PAR-444 · Cliquer « Télécharger la facture » : le navigateur reçoit facture-<numéro>.pdf", async () => {
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Télécharger la facture de la commande CMD-K1" }).click();
    expect((await download).suggestedFilename()).toBe("facture-FAC-2026-000011.pdf");
  });
  await expectNoUnhandledCall(session);
});

test("suivi · frise selon l'état de la livraison, commande sans Kit Code, facture en préparation", async ({ page, context }) => {
  await test.step("REC-PAR-445 · Ouvrir une commande de kit expédiée : « Expédiée » en cours, « Délai annoncé » sous « Livrée »", async () => {
    await signInAs(context, "commande-kit-expediee");
    await page.goto(detail("CMD-K1"));
    const steps = page.getByRole("list", { name: "Suivi de livraison" });
    await expect(steps.locator('[aria-current="step"]')).toContainText("Expédiée");
    await expect(steps).toContainText("Délai annoncé");
  });

  await test.step("REC-PAR-446 · Ouvrir une commande de kit livrée : « Livrée » atteinte, plus de « Délai annoncé »", async () => {
    await signInAs(context, "commande-kit-livree");
    await page.goto(detail("CMD-K1"));
    const steps = page.getByRole("list", { name: "Suivi de livraison" });
    await expect(steps).toContainText("Livrée");
    await expect(steps.locator('[aria-current="step"]')).toHaveCount(0);
    await expect(steps).not.toContainText("Délai annoncé");
  });

  await test.step("REC-PAR-447 · Ouvrir une commande payée sans Kit Code : aucune section « Kit Codes »", async () => {
    await signInAs(context, "commande-sans-code");
    await page.goto(detail("CMD-K1"));
    await expect(page.getByRole("heading", { level: 2, name: "Livraison" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Kit Codes" })).toHaveCount(0);
  });

  await test.step("REC-PAR-448 · Ouvrir une commande payée dont le PDF n'est pas prêt : « Facture en préparation » à la place du bouton", async () => {
    await signInAs(context, "commandes-facture-en-preparation");
    await page.goto(detail("CMD-K1"));
    await expect(page.getByText("Facture en préparation")).toBeVisible();
    await expect(page.getByRole("link", { name: /Télécharger la facture/ })).toHaveCount(0);
  });
});

test("suivi · commandes de parcours, annulée, remboursée : messages et pas de paiement", async ({ page, context }) => {
  await signInAs(context, "commandes-parent");

  await test.step("REC-PAR-449 · Ouvrir une commande de parcours payée : repère « Parcours », pas de livraison, pas de Kit Codes, facture", async () => {
    await page.goto(detail("CMD-C1"));
    await expect(page.getByText("Parcours · N° CMD-C1")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Livraison" })).toHaveCount(0);
    await expect(page.getByText(/^Livraison/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Télécharger la facture/ })).toBeVisible();
  });

  await test.step("REC-PAR-188 · Ouvrir une commande annulée puis une commande remboursée : phrase de clôture, ni formulaire de paiement ni facture", async () => {
    await page.goto(detail("CMD-K3"));
    await expect(page.getByText("Commande annulée : elle n'a pas été payée à temps et le stock a été libéré.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Payer par Mobile Money" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Télécharger la facture/ })).toHaveCount(0);
    await page.goto(detail("CMD-C2"));
    await expect(page.getByText("Commande remboursée : elle vous a été remboursée.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Payer par Mobile Money" })).toHaveCount(0);
  });

  await test.step("REC-PAR-189 · Ouvrir la référence d'une commande d'une autre famille, ou inconnue : « Commande introuvable », aucune donnée de la commande", async () => {
    for (const reference of [COMMANDE_AUTRE_FAMILLE, "CMD-INCONNUE"]) {
      await page.goto(detail(reference));
      await expect(page.getByRole("heading", { level: 2, name: "Commande introuvable" })).toBeVisible();
      await expect(page.getByText("Cette commande n'existe pas ou n'a pas été passée depuis votre compte.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Voir mes commandes" })).toHaveAttribute("href", LIST);
      await expect(page.getByText(reference)).toHaveCount(0);
    }
    await expectAccessible(page);
  });
});

test("suivi · chargement et erreur du serveur", async ({ page, context }) => {
  await test.step("REC-PAR-450 · Ouvrir le suivi pendant que l'API répond lentement : squelette « Chargement de la commande… » puis la commande", async () => {
    await signInAs(context, "commande-chargement-lent");
    await page.goto(detail("CMD-K1"), { waitUntil: "commit" });
    await expect(page.getByRole("status", { name: "Chargement de la commande…" })).toBeVisible();
    await expect(page.getByText("Kit · N° CMD-K1")).toBeVisible();
  });

  await test.step("REC-PAR-451 · Ouvrir le suivi alors que l'API répond en erreur 500 : « Oups, ça a coupé » puis « Réessayer »", async () => {
    await signInAs(context, "commande-erreur-lecture");
    await page.goto(detail("CMD-K1"));
    await expect(page.getByText("Oups, ça a coupé")).toBeVisible();
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByText("Kit · N° CMD-K1")).toBeVisible();
  });
});

test("suivi · commande en attente : réservation, paiement prérempli, réussite", async ({ page, context }, testInfo) => {
  await page.clock.install();
  const session = await signInAs(context, "commande-en-attente-paiement-prefere");
  await page.goto(detail("CMD-K2"));
  await expect(page.getByText("Kit · N° CMD-K2")).toBeVisible();

  await test.step("REC-PAR-187 · Ouvrir une commande en attente (kit réservé) : badge « En attente de paiement », encart « À payer avant le … », formulaire prérempli avec le Mobile Money préféré", async () => {
    await expect(page.getByText("En attente de paiement", { exact: true })).toBeVisible();
    await expect(page.getByText(/À payer avant le \d{1,2} \w+ 2026 à \d{2}:\d{2} : passé ce délai, la commande est annulée\./)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Payer par Mobile Money" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /MTN Mobile Money/ })).toBeChecked();
    await expect(phoneField(page)).toHaveValue("01 97 00 00 01");
    await expect(payButton(page)).toHaveText(`Payer ${fcfa(PENDING.total)}`);
    await expect(page.getByRole("heading", { level: 2, name: "Livraison" })).toHaveCount(0);
    await expectAccessible(page);
  });

  await onMobile(testInfo, "REC-PAR-452 · Mobile 360 px : le formulaire de paiement passe sous la carte de la commande, bouton « Payer » pleine largeur", async () => {
    const card = (await page.getByText("Kit · N° CMD-K2").boundingBox())!;
    const button = (await payButton(page).boundingBox())!;
    expect(button.y).toBeGreaterThan(card.y);
    expect(button.width).toBeGreaterThan(250);
  });

  await test.step("REC-PAR-453 · Payer avec un numéro en …01 : la page se relit, commande « Payée », frise de livraison, Kit Code, facture en préparation, plus de formulaire", async () => {
    await freezeClock(page);
    await payButton(page).click();
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await page.clock.resume();
    await expect(page.getByText("Payée", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Livraison" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Kit Codes de la commande" }).getByRole("listitem")).toHaveCount(1);
    await expect(page.getByText("Facture en préparation")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Payer par Mobile Money" })).toHaveCount(0);
  });
  await expectNoUnhandledCall(session);
});

test("suivi · commande en attente : échec du paiement", async ({ page, context }) => {
  await page.clock.install();
  await signInAs(context, "commande-en-attente-paiement-prefere");
  await page.goto(detail("CMD-K2"));

  await test.step("REC-PAR-454 · Payer avec un numéro en …02 : « Paiement échoué », « Changer de numéro » et « Réessayer le paiement », la commande reste en attente", async () => {
    await freezeClock(page);
    await phoneField(page).fill("0197000002");
    await payButton(page).click();
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement échoué" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Changer de numéro" })).toBeVisible();
    await expect(page.getByText("En attente de paiement", { exact: true })).toBeVisible();
  });

});

test("suivi · commande en attente : paiement tardif remboursé", async ({ page, context }) => {
  await page.clock.install();
  await signInAs(context, "commande-en-attente-tardive");
  await page.goto(detail("CMD-K2"));

  await test.step("REC-PAR-456 · Payer une commande dont le paiement arrive après le délai : la page se relit, « Commande remboursée : elle vous a été remboursée. »", async () => {
    await freezeClock(page);
    await pay(page, "0197000001");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await page.clock.resume();
    await expect(page.getByText("Commande remboursée : elle vous a été remboursée.")).toBeVisible();
  });
});

test("suivi · commande en attente : trop de tentatives de paiement", async ({ page, context }) => {
  await signInAs(context, "commande-en-attente-trop-de-tentatives");
  await page.goto(detail("CMD-K2"));

  await test.step("REC-PAR-455 · Payer au-delà du plafond d'essais : « Trop de tentatives. Réessayez dans 45 secondes. », bouton désactivé", async () => {
    await pay(page, "0197000001");
    await expect(page.getByText("Trop de tentatives. Réessayez dans 45 secondes.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Réessayer dans 0:4\d/ })).toBeDisabled();
  });
});

test("suivi · commande en attente sans Mobile Money préféré : réseau à choisir", async ({ page, context }) => {
  await signInAs(context, "commandes-parent");
  await page.goto(detail("CMD-K2"));

  await test.step("REC-PAR-457 · Ouvrir une commande en attente sans Mobile Money préféré : aucun réseau coché, numéro vide, choix du réseau puis numéro avant de payer", async () => {
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(phoneField(page)).toHaveValue("");
    await payButton(page).click();
    await expect(page.getByText("Choisissez votre réseau Mobile Money.")).toBeVisible();
    await chooseNetwork(page);
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
  });
});
