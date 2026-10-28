import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { KITS, kitsOrder, SAVED_ADDRESS, ZONES } from "../fausse-api/fixtures.ts";
import { expectAccessible } from "../support/a11y";
import { expectNoUnhandledCall, signInAs } from "../support/fausse-api";
import { freezeClock, pay, payButton } from "../support/paiement";

// Achat direct de kits par le parent : catalogue, panier, livraison et paiement (`/parent/boutique`,
// `/parent/boutique/panier`, `/parent/boutique/commande`). Tests fonctionnels sur fixtures (fausse API,
// docs/tests/FIXTURES-FAUSSE-API.md) : chaque test nomme sa fixture ; chaque scénario du cahier de recette est une étape
// `REC-PAR-xxx · …` (section « Historique de commande · Achat direct de kit par le parent » de
// apps/web/e2e/CAHIER-DE-RECETTE.md). Les montants attendus sont ceux des fixtures : rien n'est recalculé ici.

const PACK = KITS["pack-electronique"];
const BOT = KITS["steamy-bot-v1"];
const SHOP = "/parent/boutique";
const CART = "/parent/boutique/panier";
const CHECKOUT = "/parent/boutique/commande";
const PORTO_NOVO = ZONES[1];

const fcfa = (amount: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} F CFA`;
const fcfaHt = (amount: number) => `${fcfa(amount)} HT`;
const line = (page: Page, label: string) =>
  page.locator("dt").filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).locator("xpath=..").filter({ visible: true });
const quantity = (page: Page, name: string) => page.getByRole("group", { name: `Quantité de ${name}` });
const SERVER_DOWN = "Une erreur est survenue de notre côté. Réessayez dans quelques instants.";

test.beforeEach(async ({}, testInfo) => {
  testInfo.annotations.push({ type: "projet", description: testInfo.project.name });
});

async function onMobile(testInfo: TestInfo, title: string, body: () => Promise<void>) {
  if (testInfo.project.name === "mobile") await test.step(title, body);
}

test("catalogue · parent : kits en vente, prix HT, ajout au panier", async ({ page, context }) => {
  const session = await signInAs(context, "achat-panier-vide");
  await page.goto(SHOP);
  await expect(page.getByRole("heading", { level: 1, name: "Boutique de kits" })).toBeVisible();

  await test.step("REC-PAR-191 · Ouvrir /parent/boutique : titre « Boutique de kits », prix HT du serveur, bouton « Ajouter <kit> au panier » pour les kits en stock seulement", async () => {
    await expect(page.getByText(fcfaHt(PACK.price)).first()).toBeVisible();
    await expect(page.getByRole("button", { name: `Ajouter ${PACK.name} au panier` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Ajouter ${BOT.name} au panier` })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ajouter Kit Énergie Solaire/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Mon panier" })).toHaveAttribute("href", CART);
    await expectAccessible(page);
  });

  await test.step("REC-PAR-192 · Cliquer « Ajouter Pack Électronique au panier » : message « « Pack Électronique » est dans votre panier. », kit ajouté au panier du serveur", async () => {
    await page.getByRole("button", { name: `Ajouter ${PACK.name} au panier` }).click();
    await expect(page.getByText(`« ${PACK.name} » est dans votre panier.`)).toBeVisible();
    expect(await session.writes()).toEqual(["POST /api/shop/cart/items/"]);
    const [added] = (await session.calls()).filter((call) => call.method === "POST");
    expect(added.body).toEqual({ kitSlug: PACK.slug, quantity: 1 });
  });
});

test("catalogue · parent : kit épuisé entre-temps, erreur du serveur", async ({ page, context }) => {
  await signInAs(context, "achat-ajout-epuise");
  await page.goto(SHOP);

  await test.step("REC-PAR-458 · Cliquer « Ajouter » alors que le kit vient d'être épuisé : « Ce kit vient d'être épuisé. »", async () => {
    await page.getByRole("button", { name: `Ajouter ${PACK.name} au panier` }).click();
    await expect(page.getByText("Ce kit vient d'être épuisé.")).toBeVisible();
  });

  await test.step("REC-PAR-459 · Cliquer « Ajouter » alors que l'API répond en erreur 500 : message d'erreur en français", async () => {
    await signInAs(context, "achat-panier-erreur-ecriture");
    await page.goto(SHOP);
    await page.getByRole("button", { name: `Ajouter ${PACK.name} au panier` }).click();
    await expect(page.getByText(SERVER_DOWN)).toBeVisible();
  });
});

test("panier · parent : lignes, quantités, retrait, récapitulatif du serveur, accès à la commande", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "achat-panier");
  await page.goto(CART);
  await expect(page.getByRole("heading", { level: 1, name: "Mon panier" })).toBeVisible();
  const subtotal = 2 * PACK.price + BOT.price;
  const vat = Math.round((subtotal * 18) / 100);
  const aib = Math.round((subtotal * 1) / 100);

  await test.step("REC-PAR-195 · Ouvrir le panier avec des kits : lignes, « Sous-total HT », taxes du serveur, « Livraison : Calculée à l'étape suivante », « Total hors livraison », « Commander »", async () => {
    await expect(page.getByRole("link", { name: PACK.name })).toHaveAttribute("href", `${SHOP}/${PACK.slug}`);
    await expect(page.getByText(`${fcfaHt(PACK.price)} l'unité`)).toBeVisible();
    await expect(quantity(page, PACK.name)).toContainText("2");
    await expect(line(page, "Sous-total HT (3 articles)")).toContainText(fcfa(subtotal));
    await expect(line(page, "TVA (18 %)")).toContainText(fcfa(vat));
    await expect(line(page, "AIB (1 %)")).toContainText(fcfa(aib));
    await expect(line(page, "Livraison")).toContainText("Calculée à l'étape suivante");
    await expect(line(page, "Total hors livraison")).toContainText(fcfa(subtotal + vat + aib));
    await expect(page.getByText("Les taxes éventuelles sont ajoutées au moment du paiement.")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Commander" })).toHaveAttribute("href", CHECKOUT);
  });

  await onMobile(testInfo, "REC-PAR-207 · Mobile 360 px : panier lisible sans défilement horizontal, bouton « Commander » pleine largeur", async () => {
    expect((await page.getByRole("link", { name: "Commander" }).boundingBox())!.width).toBeGreaterThan(250);
  });

  await test.step("REC-PAR-460 · Accessibilité : aucune violation WCAG 2 A/AA sur le panier du parent", async () => {
    await expectAccessible(page);
  });

  await test.step("REC-PAR-461 · Cliquer « Ajouter un exemplaire de Steamy Bot v1 » : la quantité augmente, totaux relus du serveur, quantité enregistrée côté serveur", async () => {
    await page.getByRole("button", { name: `Ajouter un exemplaire de ${BOT.name}` }).click();
    await expect(quantity(page, BOT.name)).toContainText("2");
    await expect(line(page, "Sous-total HT (4 articles)")).toContainText(fcfa(subtotal + BOT.price));
    expect(await session.writes()).toEqual(["PATCH /api/shop/cart/items/2/"]);
  });

  await test.step("REC-PAR-462 · Cliquer « Retirer Steamy Bot v1 » : message « retiré du panier », focus en tête de liste, sous-total relu du serveur", async () => {
    await page.getByRole("button", { name: `Retirer ${BOT.name}` }).click();
    await expect(page.getByText(`« ${BOT.name} » retiré du panier.`)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Articles du panier" })).toBeFocused();
    await expect(line(page, "Sous-total HT (2 articles)")).toContainText(fcfa(2 * PACK.price));
    await expect(page.getByRole("link", { name: BOT.name })).toHaveCount(0);
  });

  await test.step("REC-PAR-463 · Recharger la page : mêmes lignes et quantités (panier gardé par le serveur)", async () => {
    await page.reload();
    await expect(quantity(page, PACK.name)).toContainText("2");
    await expect(page.getByRole("link", { name: BOT.name })).toHaveCount(0);
  });

  await test.step("REC-PAR-464 · Cliquer « Continuer mes achats » : retour au catalogue /parent/boutique", async () => {
    await page.getByRole("link", { name: "Continuer mes achats" }).click();
    await expect(page).toHaveURL(SHOP);
    await page.goBack();
  });

  await test.step("REC-PAR-197 · Cliquer « Commander » : arrivée sur /parent/boutique/commande", async () => {
    await page.getByRole("link", { name: "Commander" }).click();
    await expect(page).toHaveURL(CHECKOUT);
  });
  await expectNoUnhandledCall(session);
});

test("panier · parent : panier vide, taxes éteintes, kit indisponible, erreurs", async ({ page, context }) => {
  await test.step("REC-PAR-194 · Ouvrir /parent/boutique/panier avec un panier vide : « Votre panier est vide » et texte d'aide, « Voir les kits », délais de livraison par zone", async () => {
    await signInAs(context, "achat-panier-vide");
    await page.goto(CART);
    await expect(page.getByRole("heading", { level: 2, name: "Votre panier est vide" })).toBeVisible();
    await expect(page.getByText("Choisissez un kit pour construire pour de vrai, livré chez vous.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir les kits" })).toHaveAttribute("href", SHOP);
    await expect(page.getByText("Livraison selon votre zone")).toBeVisible();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-465 · Ouvrir le panier avec les taxes éteintes : aucune ligne TVA ni AIB, total hors livraison égal au sous-total HT", async () => {
    await signInAs(context, "achat-panier-sans-taxes");
    await page.goto(CART);
    await expect(line(page, "Sous-total HT (1 article)")).toContainText(fcfa(PACK.price));
    await expect(page.getByText(/^TVA|^AIB/)).toHaveCount(0);
    await expect(line(page, "Total hors livraison")).toContainText(fcfa(PACK.price));
  });

  await test.step("REC-PAR-196 · Avoir un kit devenu indisponible dans le panier : badge « Indisponible », « Retirez les kits indisponibles pour continuer. », « Commander » désactivé", async () => {
    await signInAs(context, "achat-panier-kit-indisponible");
    await page.goto(CART);
    await expect(page.getByText("Indisponible", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Retirez les kits indisponibles pour continuer." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Commander" })).toBeDisabled();
  });

  await test.step("REC-PAR-466 · Ouvrir /parent/boutique/commande avec un kit indisponible : « Un kit de votre panier n'est plus disponible : retirez-le avant de commander. » et « Retour au panier »", async () => {
    await page.goto(CHECKOUT);
    await expect(page.getByText("Un kit de votre panier n'est plus disponible : retirez-le avant de commander.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour au panier" })).toHaveAttribute("href", CART);
  });

  await test.step("REC-PAR-206 · Ouvrir le panier alors que l'API répond en erreur 500 : message d'erreur et « Réessayer », puis le panier s'affiche", async () => {
    await signInAs(context, "achat-panier-erreur");
    await page.goto(CART);
    await expect(page.getByRole("alert").filter({ hasText: SERVER_DOWN })).toBeVisible();
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("link", { name: PACK.name })).toBeVisible();
  });

  await test.step("REC-PAR-467 · Changer une quantité alors que l'API répond en erreur 500 : message d'erreur, quantité inchangée", async () => {
    await signInAs(context, "achat-panier-erreur-ecriture");
    await page.goto(CART);
    await page.getByRole("button", { name: `Ajouter un exemplaire de ${PACK.name}` }).click();
    await expect(page.getByText(SERVER_DOWN)).toBeVisible();
    await expect(quantity(page, PACK.name)).toContainText("1");
  });
});

test("panier public · parent connecté : renvoi vers le panier de son espace", async ({ page, context }) => {
  await signInAs(context, "achat-panier");

  await test.step("REC-PAR-193 · Ouvrir /boutique/panier connecté en parent : redirection vers /parent/boutique/panier", async () => {
    await page.goto("/boutique/panier");
    await expect(page).toHaveURL(CART);
    await expect(page.getByRole("heading", { level: 1, name: "Mon panier" })).toBeVisible();
  });

  await test.step("REC-APP-730 · Ouvrir /boutique/commande/coordonnees connecté en parent : redirection vers le panier du parent", async () => {
    await page.goto("/boutique/commande/coordonnees");
    await expect(page).toHaveURL(CART);
  });
});

const address = (page: Page) => page.getByRole("form", { name: "Adresse de livraison" });
const toPayment = (page: Page) => address(page).getByRole("button", { name: "Continuer vers le paiement" });
const orderWrites = async (session: Awaited<ReturnType<typeof signInAs>>) =>
  (await session.calls()).filter((call) => call.method === "POST" && call.path === "/api/payments/orders/");

async function fillAddress(page: Page) {
  await address(page).getByRole("combobox", { name: /^Ville ou zone/ }).selectOption(String(PORTO_NOVO.id));
  await address(page).getByRole("textbox", { name: /^Ville\b/ }).fill("Porto-Novo");
  await address(page).getByRole("textbox", { name: /^Quartier/ }).fill("Ouando");
  await address(page).getByRole("textbox", { name: /^Rue/ }).fill("Près du marché");
}

test("commande · parent sans adresse par défaut : récapitulatif, bénéficiaire, adresse, commande créée, paiement réussi", async ({ page, context }, testInfo) => {
  await page.clock.install();
  const session = await signInAs(context, "achat-panier");
  await page.goto(CHECKOUT);
  await expect(page.getByRole("heading", { level: 1, name: "Commande de kits" })).toBeVisible();
  const subtotal = 2 * PACK.price + BOT.price;

  await test.step("REC-PAR-197 · Lire l'étape livraison : « Votre panier » (sous-total HT, taxes, total hors livraison), « Pour quel enfant ? (facultatif) », formulaire « Adresse de livraison »", async () => {
    await expect(page.getByRole("heading", { level: 2, name: "Votre panier" })).toBeVisible();
    await expect(line(page, `${PACK.name} × 2`)).toContainText(fcfa(2 * PACK.price));
    await expect(line(page, "Sous-total HT hors livraison")).toContainText(fcfa(subtotal));
    await expect(line(page, "TVA (18 %)")).toBeVisible();
    await expect(line(page, "Total hors livraison")).toBeVisible();
    const beneficiary = page.getByRole("combobox", { name: /Pour quel enfant/ });
    await expect(beneficiary.locator("option")).toHaveText(["Pour la famille", "Léa Adjovi"]);
    await expect(page.getByText("Il recevra les Kit Codes du kit pour débloquer ses parcours.")).toBeVisible();
    await expect(address(page).getByRole("textbox", { name: /^Quartier/ })).toHaveValue("");
    await expectAccessible(page);
  });

  await onMobile(testInfo, "REC-PAR-468 · Mobile 360 px : récapitulatif et formulaire d'adresse sans débordement, bouton pleine largeur", async () => {
    expect((await toPayment(page).boundingBox())!.width).toBeGreaterThan(250);
  });

  await test.step("REC-PAR-198 · Cliquer « Continuer vers le paiement » sans zone, ville, quartier ni rue : quatre erreurs, aucune commande créée", async () => {
    await toPayment(page).click();
    const summary = page.getByRole("alert").filter({ hasText: "Corrigez les erreurs suivantes :" });
    for (const message of ["Choisissez la zone de livraison.", "Indiquez la ville.", "Indiquez le quartier.", "Indiquez la rue ou un repère."]) {
      await expect(summary).toContainText(message);
    }
    expect(await orderWrites(session)).toHaveLength(0);
  });

  await test.step("REC-PAR-199 · Choisir Léa, saisir une adresse valide, cocher « Enregistrer comme adresse par défaut » : commande créée sans prix, total, articles, livraison, taxes et heure limite du serveur, adresse enregistrée", async () => {
    await page.getByRole("combobox", { name: /Pour quel enfant/ }).selectOption({ label: "Léa Adjovi" });
    await fillAddress(page);
    await address(page).getByRole("checkbox", { name: "Enregistrer comme adresse par défaut" }).check();
    await toPayment(page).click();
    await expect(page.getByRole("heading", { level: 2, name: "Commande CMD-KIT-1" })).toBeVisible();
    const [created] = await orderWrites(session);
    expect(created.body).toEqual({
      kind: "kit",
      items: [{ kitSlug: PACK.slug, quantity: 2 }, { kitSlug: BOT.slug, quantity: 1 }],
      deliveryAddress: expect.objectContaining({ zoneId: PORTO_NOVO.id, city: "Porto-Novo", district: "Ouando", addressLine: "Près du marché" }),
      beneficiaryId: 21,
    });
    const order = kitsOrder("x", [{ kit: PACK, quantity: 2 }, { kit: BOT, quantity: 1 }], PORTO_NOVO, SAVED_ADDRESS);
    await expect(page.getByText(fcfa(order.total), { exact: true }).first()).toBeVisible();
    await expect(line(page, `${PACK.name} × 2`)).toContainText(fcfa(2 * PACK.price));
    await expect(line(page, `Livraison (${PORTO_NOVO.name})`)).toContainText(fcfa(PORTO_NOVO.fee));
    for (const tax of order.taxes) await expect(line(page, `${tax.code === "vat" ? "TVA" : "AIB"} (${tax.rate} %)`)).toContainText(fcfa(tax.amount));
    await expect(page.getByText(/Vos kits sont réservés jusqu'au \d{1,2} \w+ 2026 à \d{2}:\d{2} : payez avant cette heure\./)).toBeVisible();
    expect(await session.writes()).toContain("PUT /api/accounts/me/delivery-address/");
    await expect(payButton(page)).toHaveText(`Payer ${fcfa(order.total)}`);
  });

  await test.step("REC-PAR-200 · Payer avec un numéro en …01 : « Paiement réussi ! », « Votre commande est confirmée… », « Suivre ma commande »", async () => {
    await freezeClock(page);
    await pay(page, "0197000001");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement réussi !" })).toBeVisible();
    await expect(page.getByText("Votre commande est confirmée : suivez sa livraison et retrouvez ses Kit Codes.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Suivre ma commande" })).toHaveAttribute("href", "/parent/commandes/CMD-KIT-1");
    await page.clock.resume();
    await expectAccessible(page);
  });

  await test.step("REC-PAR-469 · Ouvrir « Suivre ma commande » puis l'historique : la commande est « Payée », pour Léa, avec ses Kit Codes, et le panier est vidé", async () => {
    await page.getByRole("link", { name: "Suivre ma commande" }).click();
    await expect(page).toHaveURL("/parent/commandes/CMD-KIT-1");
    await expect(page.getByText("pour Léa")).toBeVisible();
    await expect(page.getByRole("list", { name: "Kit Codes de la commande" }).getByRole("listitem")).toHaveCount(3);
    await page.goto(CART);
    await expect(page.getByRole("heading", { level: 2, name: "Votre panier est vide" })).toBeVisible();
  });
  await expectNoUnhandledCall(session);
});

test("commande · parent avec une adresse par défaut : formulaire prérempli", async ({ page, context }) => {
  await signInAs(context, "achat-adresse-enregistree");
  await page.goto(CHECKOUT);

  await test.step("REC-PAR-470 · Ouvrir la livraison avec une adresse par défaut : zone, ville, quartier et rue préremplis, « Pour la famille » sélectionné", async () => {
    await expect(address(page).getByRole("textbox", { name: /^Quartier/ })).toHaveValue(SAVED_ADDRESS.district ?? "");
    await expect(address(page).getByRole("textbox", { name: /^Rue/ })).toHaveValue(SAVED_ADDRESS.addressLine);
    await expect(address(page).getByRole("combobox", { name: /^Ville ou zone/ })).toHaveValue(String(SAVED_ADDRESS.zoneId));
    await expect(page.getByRole("combobox", { name: /Pour quel enfant/ })).toHaveValue("");
  });
});

test("commande · parent sans enfant : pas de choix de bénéficiaire", async ({ page, context }) => {
  await signInAs(context, "achat-sans-enfant");
  await page.goto(CHECKOUT);

  await test.step("REC-PAR-471 · Ouvrir la livraison d'un parent sans enfant actif : aucun champ « Pour quel enfant ? »", async () => {
    await expect(page.getByRole("heading", { level: 2, name: "Votre panier" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Pour quel enfant/ })).toHaveCount(0);
  });
});

test("commande · panier vide", async ({ page, context }) => {
  await signInAs(context, "achat-panier-vide");
  await page.goto(CHECKOUT);

  await test.step("REC-PAR-472 · Ouvrir la livraison avec un panier vide : « Votre panier est vide. » et « Voir la boutique »", async () => {
    await expect(page.getByText("Votre panier est vide.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir la boutique" })).toHaveAttribute("href", SHOP);
  });
});

test("commande · paiement refusé (…02) puis en attente (…03)", async ({ page, context }) => {
  await page.clock.install();
  const session = await signInAs(context, "achat-adresse-enregistree");
  await page.goto(CHECKOUT);
  await toPayment(page).click();
  await expect(page.getByRole("heading", { level: 2, name: /^Commande CMD-KIT-/ })).toBeVisible();

  await test.step("REC-PAR-201 · Payer avec un numéro en …02 : « Paiement échoué », raison, « Changer de numéro » et « Réessayer le paiement »", async () => {
    await freezeClock(page);
    await pay(page, "0197000002");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement échoué" })).toBeVisible();
    await expect(page.getByText("Raison : Solde insuffisant.")).toBeVisible();
    await page.getByRole("button", { name: "Changer de numéro" }).click();
  });

  await test.step("REC-PAR-473 · Payer avec un numéro en …03 : attente de confirmation, puis « toujours en attente » après 2 minutes", async () => {
    await pay(page, "0197000003");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await page.clock.fastForward(120_000);
    await expect(page.getByText(/Le paiement est toujours en attente de validation/)).toBeVisible();
  });
  await expectNoUnhandledCall(session);
});

test("commande · incidents à la création : rupture de stock, zone indisponible, erreur serveur", async ({ page, context }) => {
  await test.step("REC-PAR-203 · Valider la commande alors que le kit vient d'être épuisé : « Un kit vient d'être épuisé : votre panier a été relu… », aucune commande", async () => {
    const session = await signInAs(context, "achat-rupture-a-la-commande");
    await page.goto(CHECKOUT);
    await toPayment(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "Un kit vient d'être épuisé : votre panier a été relu, vérifiez-le avant de commander." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /^Commande CMD/ })).toHaveCount(0);
    expect((await orderWrites(session)).every((call) => call.status === 409)).toBe(true);
  });

  await test.step("REC-PAR-474 · Valider la commande vers une zone qui n'est plus desservie : « Cette zone n'est plus desservie. Choisissez-en une autre. » sous le champ zone", async () => {
    await signInAs(context, "achat-zone-indisponible");
    await page.goto(CHECKOUT);
    await toPayment(page).click();
    await expect(address(page).locator("p", { hasText: "Cette zone n'est plus desservie. Choisissez-en une autre." })).toBeVisible();
  });

  await test.step("REC-PAR-475 · Valider la commande alors que l'API répond en erreur 500 : message d'erreur, saisie conservée", async () => {
    await signInAs(context, "achat-commande-erreur-serveur");
    await page.goto(CHECKOUT);
    await toPayment(page).click();
    await expect(page.getByText(SERVER_DOWN)).toBeVisible();
    await expect(address(page).getByRole("textbox", { name: /^Rue/ })).toHaveValue(SAVED_ADDRESS.addressLine);
  });
});

test("commande · réservation dépassée et commande payée ailleurs", async ({ page, context }) => {
  await test.step("REC-PAR-202 · Payer après l'expiration de la réservation : « Le délai de réservation est dépassé : confirmez de nouveau l'adresse… », retour au formulaire d'adresse", async () => {
    await signInAs(context, "achat-reservation-depassee");
    await page.goto(CHECKOUT);
    await toPayment(page).click();
    await expect(page.getByRole("heading", { level: 2, name: /^Commande CMD-KIT-/ })).toBeVisible();
    await pay(page, "0197000001");
    await expect(page.getByRole("alert").filter({ hasText: "Le délai de réservation est dépassé : confirmez de nouveau l'adresse pour réserver vos kits." })).toBeVisible();
    await expect(toPayment(page)).toBeVisible();
  });

  await test.step("REC-PAR-205 · Payer une commande déjà payée dans un autre onglet : « Cette commande est déjà payée. » et « Suivre ma commande »", async () => {
    await signInAs(context, "achat-commande-deja-payee");
    await page.goto(CHECKOUT);
    await toPayment(page).click();
    await expect(page.getByRole("heading", { level: 2, name: /^Commande CMD-KIT-/ })).toBeVisible();
    await pay(page, "0197000001");
    await expect(page.getByText("Cette commande est déjà payée.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Suivre ma commande" })).toHaveAttribute("href", /\/parent\/commandes\/CMD-KIT-/);
  });
});

test("commande · une commande de kit attend déjà le paiement", async ({ page, context }) => {
  const session = await signInAs(context, "achat-commande-en-attente");
  await page.goto(CHECKOUT);

  await test.step("REC-PAR-204 · Revenir sur la commande avec une commande de kit déjà en attente et réservée : « Une commande de kit attend déjà votre paiement. », référence, heure limite, « Reprendre le paiement » et « Passer une nouvelle commande »", async () => {
    await expect(page.getByText("Une commande de kit attend déjà votre paiement.")).toBeVisible();
    await expect(page.getByText(/Commande CMD-K2, réservée jusqu'au \d{1,2} \w+ 2026 à \d{2}:\d{2} : payez-la plutôt que d'en passer une seconde\./)).toBeVisible();
    await expect(page.getByRole("link", { name: "Reprendre le paiement" })).toHaveAttribute("href", "/parent/commandes/CMD-K2");
    await expectAccessible(page);
  });

  await test.step("REC-PAR-476 · Cliquer « Passer une nouvelle commande » : le formulaire de livraison s'affiche", async () => {
    await page.getByRole("button", { name: "Passer une nouvelle commande" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Votre panier" })).toBeVisible();
    await expect(toPayment(page)).toBeVisible();
  });
  expect(await orderWrites(session)).toHaveLength(0);
});
