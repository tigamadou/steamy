import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { courseRequest, kitOrder, kitRequest, REQUEST_ID, SAVED_ADDRESS, ZONES } from "../fausse-api/fixtures.ts";
import { expectAccessible } from "../support/a11y";
import { chooseNetwork, freezeClock, pay, payButton, phoneField } from "../support/paiement";
import { openShellMenu } from "../support/session";
import { chooseScenario, expectNoUnhandledCall, settlePayment, signInAs } from "../support/fausse-api";

// Demande de paiement du parent (`/parent/demandes/[id]`) : tests fonctionnels sur fixtures (fausse API,
// docs/tests/FIXTURES-FAUSSE-API.md). Chaque test nomme sa fixture ; chaque scénario du cahier de recette est une étape
// `REC-PAR-xxx · …` (section « Demande de paiement » de apps/web/e2e/CAHIER-DE-RECETTE.md).
// Les montants attendus sont ceux des fixtures, comme l'écran reçoit ceux de l'API : rien n'est recalculé ici.

const PATH = `/parent/demandes/${REQUEST_ID}`;
const COURSE = courseRequest();
const KIT = kitRequest();
const ORDER_URL = "**/api/payments/orders/**";

const fcfa = (amount: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} F CFA`;
/** Ligne de montant du récapitulatif (`dt` du libellé et `dd` du montant), libellé exact. */
const line = (page: Page, label: string) =>
  page.locator("dt").filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).locator("xpath=..");

test.beforeEach(async ({}, testInfo) => {
  testInfo.annotations.push({ type: "projet", description: testInfo.project.name });
});

/** Étape jouée sur le projet mobile (360 px) seulement. */
async function onMobile(testInfo: TestInfo, title: string, body: () => Promise<void>) {
  if (testInfo.project.name === "mobile") await test.step(title, body);
}

test("à payer · parcours : formulaire, validations, pays, réseau coupé, paiement et lecture seule", async ({ page, context }, testInfo) => {
  await page.clock.install();
  const session = await signInAs(context, "parcours-en-attente");
  await page.goto(PATH);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Demande de paiement");

  await test.step("REC-PAR-325 · Ouvrir la demande en étant connecté : affichage direct, entrée « Accueil » active", async () => {
    if (testInfo.project.name === "mobile") await openShellMenu(page);
    await expect(page.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
    if (testInfo.project.name === "mobile") await page.keyboard.press("Escape");
  });

  await test.step("REC-PAR-332 · Lire la demande de parcours : enfant, pastille, dates, objet et « Total à payer »", async () => {
    await expect(page.getByText("Demande de votre enfant")).toBeVisible();
    await expect(page.getByText("Léa Adjovi")).toBeVisible();
    await expect(page.getByText("13 ans · 4ᵉ · bénéficiaire")).toBeVisible();
    await expect(page.getByText("À payer", { exact: true })).toBeVisible();
    await expect(page.getByText(/Reçue le 20 octobre 2026 · valable jusqu'au 27 octobre 2026/)).toBeVisible();
    await expect(page.getByText("Parcours", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Capteurs électroniques" })).toBeVisible();
    await expect(line(page, "Total à payer")).toContainText(fcfa(COURSE.total));
    await expect(page.getByText("Le parcours est débloqué pour Léa dès la confirmation du paiement.")).toBeVisible();
  });

  await test.step("REC-PAR-434 · Lire les lignes de taxes : sous-total HT, TVA et AIB du serveur, puis « Total à payer »", async () => {
    await expect(line(page, "Sous-total HT")).toContainText(fcfa(COURSE.amount));
    for (const tax of COURSE.taxes) {
      const label = tax.code === "vat" ? "TVA" : "AIB";
      await expect(line(page, `${label} (${tax.rate} %)`)).toContainText(fcfa(tax.amount));
    }
    expect(COURSE.amount + COURSE.taxes.reduce((sum, tax) => sum + tax.amount, 0)).toBe(COURSE.total);
  });

  await test.step("REC-PAR-438 · Lire l'onglet du navigateur : « Demande de paiement · Steamy »", async () => {
    await expect(page).toHaveTitle("Demande de paiement · Steamy");
  });

  await test.step("REC-PAR-349 · Lire le formulaire sans Mobile Money préféré : pays selon la localité, aucun réseau coché, numéro vide", async () => {
    await expect(page.getByRole("heading", { level: 2, name: "Payer par Mobile Money" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^Pays/ })).toHaveValue("BJ");
    await expect(page.getByRole("radio")).toHaveCount(2);
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(phoneField(page)).toHaveValue("");
    await expect(payButton(page)).toHaveText(`Payer ${fcfa(COURSE.total)}`);
    await expect(page.getByText("Paiement sécurisé · aucune carte bancaire")).toBeVisible();
  });

  await test.step("REC-PAR-392 · Accessibilité : aucune violation WCAG 2 A/AA sur la demande à payer, aucun défilement horizontal", async () => {
    await expectAccessible(page);
  });

  await onMobile(testInfo, "REC-PAR-387 · Mobile 360 px : une colonne, bouton « Payer » pleine largeur et d'au moins 44 px", async () => {
    const box = (await payButton(page).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThan(250);
    const summary = (await page.getByRole("heading", { level: 2, name: "Capteurs électroniques" }).boundingBox())!;
    expect(box.y).toBeGreaterThan(summary.y);
  });

  await test.step("REC-PAR-350 · « Payer » sans réseau ni numéro : deux erreurs, aucun appel", async () => {
    await payButton(page).click();
    await expect(page.getByText("Choisissez votre réseau Mobile Money.")).toBeVisible();
    await expect(page.getByText("Saisissez un numéro Mobile Money valide pour ce pays.")).toBeVisible();
    expect(await session.writes()).toEqual([]);
  });

  await test.step("REC-PAR-351 · Numéro trop court ou avec des lettres : « Saisissez un numéro Mobile Money valide pour ce pays. »", async () => {
    await chooseNetwork(page);
    await phoneField(page).fill("0197");
    await payButton(page).click();
    await expect(page.getByText("Saisissez un numéro Mobile Money valide pour ce pays.")).toBeVisible();
    await phoneField(page).fill("abcdef");
    await payButton(page).click();
    await expect(page.getByText("Saisissez un numéro Mobile Money valide pour ce pays.")).toBeVisible();
    expect(await session.writes()).toEqual([]);
  });

  await test.step("REC-PAR-352 · Changer le pays : réseaux du nouveau pays, réseau et numéro précédents effacés", async () => {
    await phoneField(page).fill("0197000001");
    await page.getByRole("combobox", { name: /^Pays/ }).selectOption("TG");
    await expect(page.getByRole("radio")).toHaveCount(2);
    await expect(page.getByText("T-Money")).toBeVisible();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(phoneField(page)).toHaveValue("");
  });

  await test.step("REC-PAR-353 · Pays sans réseau actif : message d'aide et bouton « Payer » désactivé", async () => {
    await page.getByRole("combobox", { name: /^Pays/ }).selectOption("CI");
    await expect(page.getByText("Aucun réseau Mobile Money n'est disponible pour ce pays. Choisissez un autre pays.")).toBeVisible();
    await expect(payButton(page)).toBeDisabled();
    await page.getByRole("combobox", { name: /^Pays/ }).selectOption("BJ");
    await expect(payButton(page)).toBeEnabled();
  });

  await test.step("REC-PAR-357 · Réseau coupé puis « Payer » : « Le serveur est injoignable… », aucune initiation", async () => {
    await page.route(ORDER_URL, (route) => route.abort());
    await chooseNetwork(page);
    await phoneField(page).fill("0197000001");
    await payButton(page).click();
    await expect(page.getByText("Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez.")).toBeVisible();
    await page.unroute(ORDER_URL);
    expect(await session.writes()).toEqual([]);
  });

  await test.step("REC-PAR-355 · Double clic sur « Payer » : une seule initiation de paiement", async () => {
    await freezeClock(page);
    await payButton(page).dblclick();
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    expect((await session.writes()).filter((write) => write.endsWith("/payments/"))).toHaveLength(1);
  });

  await test.step("REC-PAR-360 · Paiement réussi (…01) : « Confirmation… » puis « Payée », numéro masqué, retour à l'accueil", async () => {
    await expect(page.getByText("Confirmation…", { exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Demande envoyée au +229••••01" })).toBeVisible();
    await expect(page.getByText(/Validez la demande sur votre téléphone/)).toBeVisible();
    await expect(page.getByText(/0197000001|22901970000001/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Refuser la demande/ })).toHaveCount(0);
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { name: "Paiement réussi !" })).toBeVisible();
    await expect(page.getByText(/Capteurs électroniques/).first()).toBeVisible();
    await expect(page.getByText("Le parcours Capteurs électroniques est débloqué pour Léa.")).toBeVisible();
    await expect(page.getByText("Payée", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/parent");
    await page.clock.resume();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-362 · Recharger la demande payée : lecture seule, « Voir la commande », « Montant demandé »", async () => {
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Cette demande est réglée" })).toBeVisible();
    await expect(page.getByText("Payée le 21 octobre 2026.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir la commande" })).toHaveAttribute("href", /^\/parent\/commandes\/CMD-501/);
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toBeVisible();
    await expect(page.getByText("Payée", { exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Numéro Mobile Money/ })).toHaveCount(0);
    await expectAccessible(page);
  });

  await test.step("REC-PAR-385 · Lire le libellé du montant d'une demande close : « Montant demandé »", async () => {
    await expect(page.getByText("Montant demandé", { exact: true })).toBeVisible();
    await expect(page.getByText("Total à payer")).toHaveCount(0);
  });

  await expectNoUnhandledCall(session);
});

test("accès · parent non connecté : redirection vers la connexion puis retour sur la demande", async ({ page, context }) => {
  await chooseScenario(context, "parcours-en-attente");

  await test.step("REC-PAR-324 · Ouvrir le lien sans session : connexion, puis retour automatique sur la demande", async () => {
    await page.goto(PATH);
    await expect(page).toHaveURL(`/connexion?next=${encodeURIComponent(PATH)}`);
    await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill("0190000001");
    await page.getByLabel(/^Mot de passe/).fill("Steamy2026");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Demande de paiement");
    await expect(page.getByRole("heading", { level: 2, name: "Capteurs électroniques" })).toBeVisible();
  });
});

test("accès · identifiant illisible ou inconnu : « Demande introuvable »", async ({ page, context }) => {
  const session = await signInAs(context, "parcours-en-attente");

  await test.step("REC-PAR-329 · Ouvrir /parent/demandes/abc et /parent/demandes/999999999 : même page « Demande introuvable »", async () => {
    for (const id of ["abc", "999999999"]) {
      await page.goto(`/parent/demandes/${id}`);
      await expect(page.getByRole("heading", { level: 2, name: "Demande introuvable" })).toBeVisible();
    }
    await expectAccessible(page);
  });
  await expectNoUnhandledCall(session);
});

test("accès · demande d'une autre famille : « Demande introuvable » sans donnée de l'enfant", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "autre-famille");
  await page.goto(PATH);

  await test.step("REC-PAR-328 · Ouvrir la demande d'un enfant d'une autre famille : page « Demande introuvable », bouton vers l'accueil", async () => {
    await expect(page.getByRole("heading", { level: 2, name: "Demande introuvable" })).toBeVisible();
    await expect(
      page.getByText("Ce lien ne correspond à aucune demande de vos enfants. Vérifiez que vous êtes connecté avec le bon compte parent."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir mes demandes à valider" })).toHaveAttribute("href", "/parent");
    await expect(page.getByText("Léa")).toHaveCount(0);
    await expect(page.getByText("Capteurs électroniques")).toHaveCount(0);
    await expect(page.getByText(/F CFA/)).toHaveCount(0);
    await expectAccessible(page);
  });

  await test.step("REC-PAR-386 · Ouvrir une demande close en tant qu'autre parent : « Demande introuvable »", async () => {
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Demande introuvable" })).toBeVisible();
  });

  await onMobile(testInfo, "REC-PAR-391 · Mobile 360 px : message et bouton « Voir mes demandes à valider » lisibles", async () => {
    const button = page.getByRole("link", { name: "Voir mes demandes à valider" });
    await expect(button).toBeInViewport();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
  await expectNoUnhandledCall(session);
});

test("accès · session d'un apprenant : renvoi vers l'espace apprenant", async ({ page, context }) => {
  await signInAs(context, "session-apprenant");

  await test.step("REC-PAR-330 · Ouvrir la demande avec la session d'un apprenant : redirection vers l'espace apprenant", async () => {
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/apprenant/);
  });
});

test("accès · API en erreur : état « Oups, ça a coupé »", async ({ page, context }) => {
  await signInAs(context, "erreur-serveur");
  await page.goto(PATH);

  await test.step("REC-PAR-331 · Ouvrir la demande quand l'API répond en erreur : « Oups, ça a coupé » avec « Retour » et « Réessayer »", async () => {
    await expect(page.getByRole("heading", { level: 2, name: "Oups, ça a coupé" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retour" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await expectAccessible(page);
  });
});

test("chargement · réponse lente : squelette « Chargement de la demande… » puis contenu", async ({ page, context }) => {
  await signInAs(context, "chargement-lent");

  await test.step("REC-PAR-327 · Ouvrir la demande avec un réseau lent : squelette du récapitulatif et du formulaire, puis contenu", async () => {
    await page.goto(PATH, { waitUntil: "commit" });
    await expect(page.getByRole("status", { name: "Chargement de la demande…" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Capteurs électroniques" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Chargement de la demande…" })).toHaveCount(0);
  });
});

// Utilisés par les tests des états suivants


test("à payer · Mobile Money préféré : pays, réseau et numéro préremplis", async ({ page, context }) => {
  const session = await signInAs(context, "parcours-paiement-prefere");
  await page.goto(PATH);

  await test.step("REC-PAR-348 · Lire le formulaire de paiement d'un parent avec Mobile Money préféré : pays, réseau et numéro préremplis", async () => {
    await expect(page.getByRole("combobox", { name: /^Pays/ })).toHaveValue("BJ");
    await expect(page.getByRole("radio", { name: /MTN Mobile Money/ })).toBeChecked();
    await expect(phoneField(page)).toHaveValue("01 97 00 00 01");
    await expect(payButton(page)).toHaveText(`Payer ${fcfa(COURSE.total)}`);
    await expect(page.getByText("Paiement sécurisé · aucune carte bancaire")).toBeVisible();
    await expectAccessible(page);
  });
  await expectNoUnhandledCall(session);
});

test("à payer · parcours qui exige un kit : ligne « Kit requis »", async ({ page, context }) => {
  await signInAs(context, "parcours-avec-kit-requis");
  await page.goto(PATH);

  await test.step("REC-PAR-333 · Ouvrir une demande de parcours qui exige un kit : « Kit requis : … non inclus »", async () => {
    await expect(
      page.getByText("Kit requis : Pack Électronique · non inclus (Léa saisira le Kit Code livré avec le kit)"),
    ).toBeVisible();
  });
});

test("à payer · taxes éteintes : aucune ligne de taxe, total égal au HT", async ({ page, context }) => {
  const request = courseRequest({}, { vat: null, aib: null });
  await signInAs(context, "parcours-sans-taxes");
  await page.goto(PATH);

  await test.step("REC-PAR-433 · Lire une demande sans taxe (taxes éteintes) : ni sous-total, ni TVA, ni AIB ; total égal au prix HT", async () => {
    await expect(line(page, "Total à payer")).toContainText(fcfa(request.total));
    expect(request.total).toBe(request.amount);
    await expect(page.getByText("Sous-total HT")).toHaveCount(0);
    await expect(page.getByText(/^TVA|^AIB/)).toHaveCount(0);
  });
});

test("à payer · événement : repère « Événement » et titre", async ({ page, context }) => {
  await signInAs(context, "evenement-en-attente");
  await page.goto(PATH);

  await test.step("REC-PAR-335 · Ouvrir une demande portant sur un événement : repère « Événement » et titre de l'événement", async () => {
    await expect(page.getByText("Événement", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Défi robots de Cotonou" })).toBeVisible();
  });
});

test("à payer · kit : adresse de livraison, commande créée, reprise après rechargement, paiement", async ({ page, context }, testInfo) => {
  await page.clock.install();
  const session = await signInAs(context, "kit-adresse-a-saisir");
  await page.goto(PATH);
  const address = page.getByRole("form", { name: "Adresse de livraison" });
  const orderIn = (zone: (typeof ZONES)[number]) => kitOrder("x", zone, SAVED_ADDRESS);
  const orders = async () => (await session.writes()).filter((write) => write === "POST /api/payments/orders/").length;

  await test.step("REC-PAR-334 · Lire une demande de kit avant l'adresse : article, taxes, « Total à payer hors livraison », réservation 30 minutes", async () => {
    await expect(page.getByText("Kit", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Pack Électronique" })).toBeVisible();
    await expect(line(page, "Pack Électronique")).toContainText(`${fcfa(KIT.items[0].unitPrice)} HT`);
    await expect(line(page, "Sous-total HT")).toContainText(fcfa(KIT.amount));
    await expect(line(page, "Total à payer hors livraison")).toContainText(fcfa(KIT.total));
    await expect(
      page.getByText("Le kit est réservé pendant 30 minutes dès que vous passez au paiement. Les frais de livraison dépendent de la zone choisie."),
    ).toBeVisible();
  });

  await test.step("REC-PAR-337 · Ouvrir une demande de kit sans adresse enregistrée : formulaire d'adresse, pas de formulaire de paiement", async () => {
    await expect(page.getByRole("heading", { level: 2, name: "Livraison du kit" })).toBeVisible();
    await expect(address.getByRole("combobox", { name: /^Pays/ })).toBeVisible();
    await expect(address.getByRole("combobox", { name: /^Ville ou zone/ })).toBeVisible();
    await expect(address.getByRole("textbox", { name: /^Ville\b/ })).toBeVisible();
    await expect(address.getByRole("textbox", { name: /^Quartier/ })).toBeVisible();
    await expect(address.getByRole("textbox", { name: /^Rue/ })).toBeVisible();
    await expect(address.getByRole("checkbox", { name: "Enregistrer comme adresse par défaut" })).not.toBeChecked();
    await expect(address.getByRole("button", { name: "Continuer vers le paiement" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Payer par Mobile Money" })).toHaveCount(0);
    await expectAccessible(page);
  });

  await test.step("REC-PAR-388 · Mobile 360 px : formulaire d'adresse sans débordement", async () => {
    if (testInfo.project.name !== "mobile") return;
    const box = (await address.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(360);
  });

  await test.step("REC-PAR-339 · Changer le pays : zones du pays rechargées (référentiel)", async () => {
    const zone = address.getByRole("combobox", { name: /^Ville ou zone/ });
    await address.getByRole("combobox", { name: /^Pays/ }).selectOption("TG");
    await expect(zone.locator("option", { hasText: "Lomé" })).toBeAttached();
    await expect(zone.locator("option", { hasText: "Porto-Novo" })).toHaveCount(0);
    await address.getByRole("combobox", { name: /^Pays/ }).selectOption("BJ");
    await expect(zone.locator("option", { hasText: "Porto-Novo" })).toBeAttached();
  });

  await test.step("REC-PAR-340 · « Continuer vers le paiement » sans rien saisir : quatre erreurs, aucune commande créée", async () => {
    await address.getByRole("button", { name: "Continuer vers le paiement" }).click();
    await expect(page.getByText("Corrigez les erreurs suivantes :")).toBeVisible();
    for (const message of [
      "Choisissez la zone de livraison.",
      "Indiquez la ville.",
      "Indiquez le quartier.",
      "Indiquez la rue ou un repère.",
    ]) {
      await expect(page.getByText(message).first()).toBeVisible();
    }
    expect(await orders()).toBe(0);
  });

  await test.step("REC-PAR-436 · Les erreurs de l'adresse reçoivent le focus et sont annoncées", async () => {
    await expect(page.getByRole("alert").filter({ hasText: "Corrigez les erreurs suivantes :" })).toBeFocused();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-341 · Adresse valide, « Enregistrer comme adresse par défaut » : commande créée, frais, taxes et total du serveur", async () => {
    await address.getByRole("combobox", { name: /^Ville ou zone/ }).selectOption("1");
    await address.getByRole("textbox", { name: /^Ville\b/ }).fill("Cotonou");
    await address.getByRole("textbox", { name: /^Quartier/ }).fill("Akpakpa");
    await address.getByRole("textbox", { name: /^Rue/ }).fill("Rue 5, maison bleue");
    await address.getByRole("checkbox", { name: "Enregistrer comme adresse par défaut" }).check();
    await address.getByRole("button", { name: "Continuer vers le paiement" }).click();
    await expect(page.getByText("Adresse de livraison", { exact: true })).toBeVisible();
    await expect(page.getByText("Marie Adjovi · Akpakpa, Rue 5, maison bleue, Cotonou")).toBeVisible();
    await expect(page.getByText(`Zone : ${ZONES[0].name} · ${ZONES[0].delayLabel}`)).toBeVisible();
    await expect(page.getByText(/Kit réservé jusqu'au 20 octobre 2026 à 09:30\./)).toBeVisible();
    await expect(line(page, `Livraison · ${ZONES[0].name}`)).toContainText(fcfa(ZONES[0].fee));
    await expect(line(page, "Total à payer")).toContainText(fcfa(orderIn(ZONES[0]).total));
    await expect(page.getByRole("heading", { level: 2, name: "Payer par Mobile Money" })).toBeVisible();
    await expect(payButton(page)).toHaveText(`Payer ${fcfa(orderIn(ZONES[0]).total)}`);
    expect(await session.writes()).toContain("PUT /api/accounts/me/delivery-address/");
    await expectAccessible(page);
  });

  await test.step("REC-PAR-342 · « Modifier » l'adresse : retour au formulaire, nouvelle commande, frais et total recalculés par le serveur", async () => {
    await page.getByRole("button", { name: "Modifier l'adresse de livraison" }).click();
    await expect(address).toBeVisible();
    await address.getByRole("combobox", { name: /^Ville ou zone/ }).selectOption("2");
    // Sans adresse enregistrée, le formulaire revient vierge : l'adresse est saisie de nouveau
    await address.getByRole("textbox", { name: /^Ville\b/ }).fill("Porto-Novo");
    await address.getByRole("textbox", { name: /^Quartier/ }).fill("Ouando");
    await address.getByRole("textbox", { name: /^Rue/ }).fill("Rue 8, maison blanche");
    await address.getByRole("button", { name: "Continuer vers le paiement" }).click();
    await expect(line(page, `Livraison · ${ZONES[1].name}`)).toContainText(fcfa(ZONES[1].fee));
    await expect(line(page, "Total à payer")).toContainText(fcfa(orderIn(ZONES[1]).total));
    expect(await orders()).toBe(2);
  });

  await test.step("REC-PAR-346 · Recharger la page après la commande : commande reprise telle quelle, sans nouvelle réservation", async () => {
    await page.reload();
    await expect(line(page, `Livraison · ${ZONES[1].name}`)).toContainText(fcfa(ZONES[1].fee));
    await expect(line(page, "Total à payer")).toContainText(fcfa(orderIn(ZONES[1]).total));
    await expect(address).toHaveCount(0);
    expect(await orders()).toBe(2);
  });

  await test.step("REC-PAR-363 · Payer la demande de kit (…01) : « Paiement réussi ! », commande confirmée, Léa prévenue", async () => {
    await freezeClock(page);
    await pay(page, "0197000001");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { name: "Paiement réussi !" })).toBeVisible();
    await expect(
      page.getByText("Votre commande est confirmée : vous pouvez suivre la livraison du kit dans vos commandes. Léa a été prévenu·e."),
    ).toBeVisible();
    await page.clock.resume();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-435 · Recharger la demande de kit payée : « Voir la commande », « Montant demandé »", async () => {
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Cette demande est réglée" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir la commande" })).toHaveAttribute("href", /^\/parent\/commandes\/CMD-501/);
    // Écart relevé : la demande payée est relue sans sa commande, le libellé reste « hors livraison » (PILOTE-FIXTURES.md)
    await expect(page.getByText(/^Montant demandé/)).toBeVisible();
  });
  await expectNoUnhandledCall(session);
});

test("à payer · kit avec adresse enregistrée : formulaire prérempli", async ({ page, context }) => {
  await signInAs(context, "kit-adresse-enregistree");
  await page.goto(PATH);
  const address = page.getByRole("form", { name: "Adresse de livraison" });

  await test.step("REC-PAR-338 · Ouvrir une demande de kit avec une adresse par défaut : zone, ville, quartier et rue préremplis", async () => {
    await expect(address.getByRole("combobox", { name: /^Ville ou zone/ })).toHaveValue(String(SAVED_ADDRESS.zoneId));
    await expect(address.getByRole("textbox", { name: /^Ville\b/ })).toHaveValue(SAVED_ADDRESS.city);
    await expect(address.getByRole("textbox", { name: /^Quartier/ })).toHaveValue(SAVED_ADDRESS.district ?? "");
    await expect(address.getByRole("textbox", { name: /^Rue/ })).toHaveValue(SAVED_ADDRESS.addressLine);
  });
});

test("à payer · kit sans taxes : total égal au prix HT hors livraison", async ({ page, context }) => {
  const request = kitRequest({}, { vat: null, aib: null });
  await signInAs(context, "kit-sans-taxes");
  await page.goto(PATH);

  await test.step("REC-PAR-433 · Lire une demande de kit sans taxe : ni sous-total ni ligne de taxe, « Total à payer hors livraison » égal au prix HT", async () => {
    await expect(line(page, "Total à payer hors livraison")).toContainText(fcfa(request.total));
    await expect(page.getByText("Sous-total HT")).toHaveCount(0);
    await expect(page.getByText(/^TVA|^AIB/)).toHaveCount(0);
  });
});

test("à payer · kit en rupture de stock : paiement impossible, refus proposé", async ({ page, context }) => {
  const session = await signInAs(context, "kit-rupture-de-stock");
  await page.goto(PATH);
  const address = page.getByRole("form", { name: "Adresse de livraison" });

  await test.step("REC-PAR-344 · Valider l'adresse alors que le kit est épuisé : « Kit en rupture de stock », pastille « Rupture », aucun formulaire de paiement", async () => {
    await address.getByRole("combobox", { name: /^Ville ou zone/ }).selectOption("1");
    await address.getByRole("textbox", { name: /^Ville\b/ }).fill("Cotonou");
    await address.getByRole("textbox", { name: /^Quartier/ }).fill("Akpakpa");
    await address.getByRole("textbox", { name: /^Rue/ }).fill("Rue 5");
    await address.getByRole("button", { name: "Continuer vers le paiement" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Kit en rupture de stock" })).toBeVisible();
    await expect(
      page.getByText(
        "Pack Électronique n'est plus disponible pour le moment : le paiement est impossible. Vous pouvez refuser la demande ; Léa en sera informé·e et pourra la renvoyer quand le kit sera de retour.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Rupture", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Refuser la demande" })).toHaveCount(1);
    await expect(page.getByRole("textbox", { name: /Numéro Mobile Money/ })).toHaveCount(0);
    await expectAccessible(page);
  });
  await expectNoUnhandledCall(session);
});

test("à payer · kit : zone devenue indisponible", async ({ page, context }) => {
  await signInAs(context, "kit-zone-indisponible");
  await page.goto(PATH);
  const address = page.getByRole("form", { name: "Adresse de livraison" });

  await test.step("REC-PAR-343 · Choisir une zone qui n'est plus desservie : « Cette zone n'est plus desservie. Choisissez-en une autre. » sous le champ zone", async () => {
    await address.getByRole("combobox", { name: /^Ville ou zone/ }).selectOption("1");
    await address.getByRole("textbox", { name: /^Ville\b/ }).fill("Cotonou");
    await address.getByRole("textbox", { name: /^Quartier/ }).fill("Akpakpa");
    await address.getByRole("textbox", { name: /^Rue/ }).fill("Rue 5");
    await address.getByRole("button", { name: "Continuer vers le paiement" }).click();
    await expect(address.locator("p", { hasText: "Cette zone n'est plus desservie. Choisissez-en une autre." })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Numéro Mobile Money/ })).toHaveCount(0);
  });
});

test("à payer · kit : réservation dépassée au paiement, retour à l'adresse", async ({ page, context }) => {
  const session = await signInAs(context, "kit-reservation-depassee");
  await page.goto(PATH);

  await test.step("REC-PAR-345 · Payer après le délai de réservation : « Le délai de réservation est dépassé… », retour au formulaire d'adresse", async () => {
    await pay(page, "0197000001");
    await expect(
      page.getByText("Le délai de réservation est dépassé : confirmez l'adresse pour réserver de nouveau le kit."),
    ).toBeVisible();
    await expect(page.getByRole("form", { name: "Adresse de livraison" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Numéro Mobile Money/ })).toHaveCount(0);
  });
  await expectNoUnhandledCall(session);
});

test("à payer · kit : commande déjà payée dans un autre onglet", async ({ page, context }) => {
  await signInAs(context, "kit-commande-deja-payee");
  await page.goto(PATH);

  await test.step("REC-PAR-347 · Payer une commande déjà réglée ailleurs : la page se relit en « Cette demande est réglée »", async () => {
    await pay(page, "0197000001");
    await expect(page.getByRole("heading", { level: 2, name: "Cette demande est réglée" })).toBeVisible();
  });
});

test("à payer · kit : commande reprise, « Modifier » verrouillé pendant la confirmation, paiement honoré", async ({ page, context }) => {
  await page.clock.install();
  const session = await signInAs(context, "kit-commande-en-attente");
  await page.goto(PATH);

  await test.step("REC-PAR-437 · Commande reprise : récapitulatif d'adresse avec « Modifier » ; pendant la confirmation, « Modifier » disparaît", async () => {
    await expect(page.getByRole("button", { name: "Modifier l'adresse de livraison" })).toBeVisible();
    await freezeClock(page);
    await pay(page, "0197000003");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Modifier l'adresse de livraison" })).toHaveCount(0);
    expect((await session.writes()).filter((write) => write === "POST /api/payments/orders/")).toHaveLength(0);
  });

  await test.step("REC-PAR-371 · Paiement reçu sur la commande reprise, encore valable : « Paiement réussi ! »", async () => {
    await settlePayment(session, "success");
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { name: "Paiement réussi !" })).toBeVisible();
  });
  await expectNoUnhandledCall(session);
});

test("paiement tardif · kit : paiement arrivé après le délai, remboursé", async ({ page, context }) => {
  await page.clock.install();
  const session = await signInAs(context, "paiement-tardif-rembourse");
  await page.goto(PATH);

  await test.step("REC-PAR-370 · Paiement reçu après l'expiration sans stock : « Paiement remboursé », pastille « Remboursé », « Voir mes commandes »", async () => {
    await freezeClock(page);
    await pay(page, "0197000001");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement remboursé" })).toBeVisible();
    await expect(
      page.getByText(
        "Votre paiement est arrivé après le délai de réservation : la commande n'a pas été validée et il vous est remboursé automatiquement.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Remboursé", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir mes commandes" })).toHaveAttribute("href", "/parent/commandes");
    await expect(page.getByRole("button", { name: /Refuser la demande/ })).toHaveCount(0);
    await page.clock.resume();
    await expectAccessible(page);
  });
  await expectNoUnhandledCall(session);
});

test("paiement · réseaux Mobile Money indisponibles : message et « Réessayer »", async ({ page, context }) => {
  await signInAs(context, "reseaux-indisponibles");
  await page.goto(PATH);

  await test.step("REC-PAR-354 · Référentiel des réseaux en échec : « Impossible de charger les réseaux Mobile Money. » puis « Réessayer »", async () => {
    await expect(page.getByText("Impossible de charger les réseaux Mobile Money.")).toBeVisible();
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("radio")).toHaveCount(2);
    await expect(page.getByText("Impossible de charger les réseaux Mobile Money.")).toHaveCount(0);
  });
});

test("paiement · erreurs à l'initiation : trop de tentatives, erreur serveur, paiement déjà en cours", async ({ page, context }) => {
  await test.step("REC-PAR-356 · Dépasser le plafond d'essais : « Trop de tentatives. Réessayez dans 45 secondes. », bouton « Réessayer dans 0:45 » désactivé", async () => {
    await signInAs(context, "paiement-trop-de-tentatives");
    await page.goto(PATH);
    await pay(page, "0197000001");
    await expect(page.getByText("Trop de tentatives. Réessayez dans 45 secondes.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Réessayer dans 0:4\d/ })).toBeDisabled();
  });

  await test.step("REC-PAR-358 · Erreur 500 à l'initiation : « Une erreur est survenue de notre côté. Réessayez dans quelques instants. »", async () => {
    await signInAs(context, "paiement-erreur-serveur");
    await page.goto(PATH);
    await pay(page, "0197000001");
    await expect(page.getByText("Une erreur est survenue de notre côté. Réessayez dans quelques instants.")).toBeVisible();
    await expect(payButton(page)).toBeEnabled();
  });

  await test.step("REC-PAR-359 · Payer pendant qu'un autre paiement de la commande est en cours : message de validation sur le téléphone", async () => {
    await signInAs(context, "paiement-deja-en-cours");
    await page.goto(PATH);
    await pay(page, "0197000001");
    await expect(
      page.getByText("Un paiement de cette commande est déjà en cours : validez-le sur votre téléphone, ou réessayez dans quelques minutes."),
    ).toBeVisible();
  });
});

test("paiement · demande close entre-temps : message puis lecture seule", async ({ page, context }) => {
  await test.step("REC-PAR-372 · Payer une demande réglée dans un autre onglet : la page se relit en lecture seule", async () => {
    await signInAs(context, "paiement-demande-close");
    await page.goto(PATH);
    await pay(page, "0197000001");
    await expect(page.getByRole("heading", { level: 2, name: "Cette demande est réglée" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Numéro Mobile Money/ })).toHaveCount(0);
  });

  await test.step("REC-PAR-439 · Payer une demande refusée dans un autre onglet : « Cette demande n'est plus en attente… » dans le formulaire", async () => {
    await signInAs(context, "paiement-demande-close-au-paiement");
    await page.goto(PATH);
    await pay(page, "0197000001");
    await expect(
      page.getByText("Cette demande n'est plus en attente : elle a été réglée, refusée, annulée ou a expiré."),
    ).toBeVisible();
  });
});

test("paiement · échec (…02) : raison du prestataire, réessayer, changer de numéro", async ({ page, context }, testInfo) => {
  await page.clock.install();
  const session = await signInAs(context, "parcours-en-attente");
  await page.goto(PATH);
  const attempts = async () => (await session.writes()).filter((write) => write.endsWith("/payments/")).length;

  await test.step("REC-PAR-364 · Payer avec un numéro en …02 : pastille « Échec », « Paiement échoué », aucun montant débité, deux boutons", async () => {
    await freezeClock(page);
    await pay(page, "0197000002");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement échoué" })).toBeVisible();
    await expect(page.getByText("La transaction n'a pas pu aboutir. Aucun montant n'a été débité.")).toBeVisible();
    await expect(page.getByText("Échec", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Changer de numéro" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer le paiement" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Refuser la demande" })).toBeVisible();
  });

  await test.step("REC-PAR-373 · Échec avec la raison du prestataire : « Raison : Solde insuffisant. »", async () => {
    await expect(page.getByText("Raison : Solde insuffisant.")).toBeVisible();
    await page.clock.resume();
    await expectAccessible(page);
  });

  await onMobile(testInfo, "REC-PAR-390 · Mobile 360 px : état « Paiement échoué », boutons empilés et lisibles", async () => {
    const [change, retry] = await Promise.all([
      page.getByRole("button", { name: "Changer de numéro" }).boundingBox(),
      page.getByRole("button", { name: "Réessayer le paiement" }).boundingBox(),
    ]);
    expect(change!.height).toBeGreaterThanOrEqual(44);
    expect(retry!.height).toBeGreaterThanOrEqual(44);
  });

  await test.step("REC-PAR-365 · « Réessayer le paiement » : une seule nouvelle initiation avec le même numéro", async () => {
    expect(await attempts()).toBe(1);
    await freezeClock(page, { ready: false });
    await page.getByRole("button", { name: "Réessayer le paiement" }).dblclick();
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    expect(await attempts()).toBe(2);
    await expect(page.getByRole("status").filter({ hasText: "Demande envoyée au +229••••02" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement échoué" })).toBeVisible();
  });

  await test.step("REC-PAR-366 · « Changer de numéro » : formulaire prérempli, pastille « À payer » ; un numéro en …01 réussit", async () => {
    await page.getByRole("button", { name: "Changer de numéro" }).click();
    await expect(page.getByText("À payer", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
    await expect(phoneField(page)).toHaveValue("01 97 00 00 02");
    await phoneField(page).fill("0197000001");
    await payButton(page).click();
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { name: "Paiement réussi !" })).toBeVisible();
  });
  await expectNoUnhandledCall(session);
});

test("paiement · échec sans certitude de débit : texte neutre", async ({ page, context }) => {
  await page.clock.install();
  await signInAs(context, "echec-sans-certitude-de-debit");
  await page.goto(PATH);

  await test.step("REC-PAR-440 · Échec dont le code n'établit pas l'absence de débit : texte neutre « Vérifiez l'état de la commande… »", async () => {
    await freezeClock(page);
    await pay(page, "0197000002");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(
      page.getByText("La transaction n'a pas pu aboutir. Vérifiez l'état de la commande dans vos commandes avant de réessayer."),
    ).toBeVisible();
    await expect(page.getByText("Aucun montant n'a été débité.")).toHaveCount(0);
  });
});

test("paiement · en attente (…03) : sondage, refus indisponible, attente prolongée, issue après abandon", async ({ page, context }, testInfo) => {
  await page.clock.install();
  const session = await signInAs(context, "parcours-en-attente");
  await page.goto(PATH);
  const polls = async () => (await session.calls()).filter((call) => /\/api\/payments\/payments\/\d+\//.test(call.path)).length;

  await test.step("REC-PAR-367 · Payer avec un numéro en …03 : l'attente reste, le statut est relu toutes les 3 secondes, puis « toujours en attente » après 2 minutes", async () => {
    await freezeClock(page);
    await pay(page, "0197000003");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    expect(await polls()).toBe(0);
    await page.clock.fastForward(3_000);
    await expect.poll(polls).toBe(1);
    await page.clock.fastForward(3_000);
    await expect.poll(polls).toBe(2);
    await expect(page.getByText(/Le paiement est toujours en attente de validation/)).toHaveCount(0);
    await page.clock.fastForward(120_000);
    await expect(
      page.getByText("Le paiement est toujours en attente de validation. Vous pouvez quitter cette page : son issue apparaîtra dans vos commandes."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir mes commandes" })).toHaveAttribute("href", "/parent/commandes");
  });

  await test.step("REC-PAR-382 · Pendant l'attente de confirmation : le lien « Refuser la demande » n'est pas proposé", async () => {
    await expect(page.getByRole("button", { name: /Refuser la demande/ })).toHaveCount(0);
  });

  await onMobile(testInfo, "REC-PAR-389 · Mobile 360 px : le panneau d'attente reste lisible, sans débordement", async () => {
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeInViewport();
    await page.clock.resume();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-368 · Quitter la page en attente, le webhook confirme, rouvrir : la demande est « Payée »", async () => {
    await settlePayment(session, "success");
    await page.clock.resume();
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Cette demande est réglée" })).toBeVisible();
    await expect(page.getByText("Payée", { exact: true })).toBeVisible();
  });
  await expectNoUnhandledCall(session);
});

test("paiement · webhook d'échec pendant l'attente : « Paiement échoué » avec sa raison", async ({ page, context }) => {
  await page.clock.install();
  const session = await signInAs(context, "parcours-en-attente");
  await page.goto(PATH);

  await test.step("REC-PAR-369 · Pendant l'attente, le prestataire notifie un échec : le panneau passe à « Paiement échoué » avec sa raison", async () => {
    await freezeClock(page);
    await pay(page, "0197000003");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await settlePayment(session, "failure");
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement échoué" })).toBeVisible();
    await expect(page.getByText("Raison : Solde insuffisant.")).toBeVisible();
  });
});

test("refus · avec motif : modale, annulation, saisie limitée, double clic, lecture seule", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "parcours-en-attente");
  await page.goto(PATH);
  const dialog = page.getByRole("dialog", { name: "Refuser la demande de Léa ?" });
  const declines = async () => (await session.writes()).filter((write) => write.endsWith("/decline/")).length;

  await test.step("REC-PAR-374 · « Refuser la demande » sous le formulaire : modale avec résumé, motif facultatif, « Annuler » et « Refuser la demande »", async () => {
    await page.getByRole("button", { name: "Refuser la demande" }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`Parcours Capteurs électroniques · ${fcfa(COURSE.total)}. Léa sera prévenu·e de votre refus.`)).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: /Motif \(facultatif\)/ })).toBeVisible();
    await expect(dialog.getByText("Il sera transmis à Léa.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Annuler" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Refuser la demande" })).toBeVisible();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-375 · « Annuler » puis Échap : modale fermée, demande inchangée, aucun appel", async () => {
    await dialog.getByRole("button", { name: "Annuler" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Refuser la demande" }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("À payer", { exact: true })).toBeVisible();
    expect(await declines()).toBe(0);
  });

  await test.step("REC-PAR-378 · Saisir plus de 500 caractères : la saisie est limitée à 500", async () => {
    await page.getByRole("button", { name: "Refuser la demande" }).click();
    const reason = dialog.getByRole("textbox", { name: /Motif/ });
    await reason.fill("x".repeat(600));
    await expect(reason).toHaveValue("x".repeat(500));
  });

  await test.step("REC-PAR-376 · Saisir un motif puis « Refuser la demande » : lecture seule « Vous avez refusé cette demande » avec le motif", async () => {
    await dialog.getByRole("textbox", { name: /Motif/ }).fill("On en reparle après les examens.");
    await dialog.getByRole("button", { name: "Refuser la demande" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Vous avez refusé cette demande" })).toBeVisible();
    await expect(page.getByText("Refusée le 21 octobre 2026. Motif transmis à Léa : « On en reparle après les examens. »")).toBeVisible();
    await expect(page.getByText("Refusée", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Payer/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/parent");
    expect(await declines()).toBe(1);
    await expectAccessible(page);
  });

  await onMobile(testInfo, "REC-PAR-390 · Mobile 360 px : états de fin lisibles, boutons empilés, sans débordement", async () => {
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toBeVisible();
    await expectAccessible(page);
  });
  await expectNoUnhandledCall(session);
});

test("refus · double clic : un seul refus", async ({ page, context }) => {
  const session = await signInAs(context, "parcours-en-attente");
  await page.goto(PATH);

  await test.step("REC-PAR-381 · Cliquer deux fois vite sur « Refuser la demande » de la modale : un seul refus envoyé", async () => {
    await page.getByRole("button", { name: "Refuser la demande" }).click();
    const dialog = page.getByRole("dialog", { name: "Refuser la demande de Léa ?" });
    await dialog.getByRole("button", { name: "Refuser la demande" }).dblclick();
    await expect(page.getByRole("heading", { level: 2, name: "Vous avez refusé cette demande" })).toBeVisible();
    expect((await session.writes()).filter((write) => write.endsWith("/decline/"))).toHaveLength(1);
  });
});

test("refus · sans motif : refus accepté, aucune phrase de motif", async ({ page, context }) => {
  await signInAs(context, "parcours-en-attente");
  await page.goto(PATH);

  await test.step("REC-PAR-377 · Refuser sans motif : « Refusée le … » sans phrase de motif", async () => {
    await page.getByRole("button", { name: "Refuser la demande" }).click();
    await page.getByRole("dialog", { name: "Refuser la demande de Léa ?" }).getByRole("button", { name: "Refuser la demande" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Vous avez refusé cette demande" })).toBeVisible();
    await expect(page.getByText("Refusée le 21 octobre 2026.", { exact: true })).toBeVisible();
    await expect(page.getByText(/Motif transmis/)).toHaveCount(0);
  });
});

test("refus · demande déjà traitée entre-temps : message dans la modale, lecture seule", async ({ page, context }) => {
  await signInAs(context, "refus-demande-close");
  await page.goto(PATH);

  await test.step("REC-PAR-379 · Refuser une demande déjà réglée ou annulée : « Cette demande n'est plus en attente… », la page se relit en lecture seule", async () => {
    await page.getByRole("button", { name: "Refuser la demande" }).click();
    const dialog = page.getByRole("dialog", { name: "Refuser la demande de Léa ?" });
    await dialog.getByRole("button", { name: "Refuser la demande" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Léa a annulé sa demande" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Payer/ })).toHaveCount(0);
  });
});

test("refus · erreur serveur : message au vouvoiement, demande non refusée", async ({ page, context }) => {
  await signInAs(context, "refus-erreur-serveur");
  await page.goto(PATH);

  await test.step("REC-PAR-380 · Refuser alors que l'API est en erreur : message d'erreur dans la modale, demande non refusée", async () => {
    await page.getByRole("button", { name: "Refuser la demande" }).click();
    const dialog = page.getByRole("dialog", { name: "Refuser la demande de Léa ?" });
    await dialog.getByRole("button", { name: "Refuser la demande" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Une erreur est survenue de notre côté. Réessayez dans quelques instants.");
    await expect(page.getByText("À payer", { exact: true })).toBeVisible();
  });
});

test("états en lecture seule : refusée, expirée, annulée, kit expiré, réglée", async ({ page, context }, testInfo) => {
  const closedAt = async (scenario: Parameters<typeof signInAs>[1]) => {
    const session = await signInAs(context, scenario);
    await page.goto(PATH);
    return session;
  };
  const noForm = async () => {
    await expect(page.getByRole("textbox", { name: /Numéro Mobile Money/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Payer/ })).toHaveCount(0);
  };

  await test.step("REC-PAR-376 · Lire une demande refusée avec motif : « Vous avez refusé cette demande », motif transmis", async () => {
    await closedAt("demande-refusee");
    await expect(page.getByRole("heading", { level: 2, name: "Vous avez refusé cette demande" })).toBeVisible();
    await expect(page.getByText("Motif transmis à Léa : « On en reparle après les examens. »")).toBeVisible();
    await noForm();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-384 · Ouvrir une demande expirée : « Cette demande a expiré », date limite, pastille « Expirée »", async () => {
    await closedAt("demande-expiree");
    await expect(page.getByRole("heading", { level: 2, name: "Cette demande a expiré" })).toBeVisible();
    await expect(
      page.getByText("Elle n'a pas été réglée avant le 27 octobre 2026 (7 jours). Léa peut vous envoyer une nouvelle demande depuis son espace."),
    ).toBeVisible();
    await expect(page.getByText("Expirée", { exact: true })).toBeVisible();
    await noForm();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-383 · Ouvrir une demande annulée par l'enfant : « Léa a annulé sa demande », « Il n'y a plus rien à régler. »", async () => {
    await closedAt("demande-annulee");
    await expect(page.getByRole("heading", { level: 2, name: "Léa a annulé sa demande" })).toBeVisible();
    await expect(page.getByText("Annulée le 21 octobre 2026. Il n'y a plus rien à régler.")).toBeVisible();
    await expect(page.getByText("Annulée", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/parent");
    await noForm();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-385 · Libellé du montant d'une demande close : « Montant demandé » ; « hors livraison » en plus pour un kit", async () => {
    await closedAt("demande-kit-expiree");
    await expect(page.getByRole("heading", { level: 2, name: "Cette demande a expiré" })).toBeVisible();
    await expect(line(page, "Montant demandé hors livraison")).toContainText(fcfa(KIT.total));
    await closedAt("demande-refusee-sans-motif");
    await expect(line(page, "Montant demandé")).toContainText(fcfa(COURSE.total));
    await expect(page.getByText("Total à payer")).toHaveCount(0);
  });

  await test.step("REC-PAR-362 · Lire une demande réglée : « Cette demande est réglée », « Voir la commande », « Retour à l'accueil »", async () => {
    await closedAt("demande-payee");
    await expect(page.getByRole("heading", { level: 2, name: "Cette demande est réglée" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir la commande" })).toHaveAttribute("href", "/parent/commandes/CMD-501");
    await noForm();
  });

  await onMobile(testInfo, "REC-PAR-390 · Mobile 360 px : états payée, refusée, expirée et annulée lisibles sans débordement", async () => {
    for (const scenario of ["demande-payee", "demande-refusee", "demande-expiree", "demande-annulee"] as const) {
      await closedAt(scenario);
      await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toBeVisible();
      await expectAccessible(page);
    }
  });
});
