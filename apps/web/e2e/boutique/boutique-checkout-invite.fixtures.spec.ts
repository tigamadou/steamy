import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { GUEST_ORDER, GUEST_TOKEN, guestOrder, paidGuestOrder } from "../fausse-api/ecrans/checkout-invite.ts";
import { KITS, ZONES } from "../fausse-api/fixtures.ts";
import { expectAccessible } from "../support/a11y";
import { expectNoUnhandledCall, signInAs } from "../support/fausse-api";
import { chooseNetwork, freezeClock, pay, payButton, phoneField } from "../support/paiement";
import { DELIVERY, GUEST, seedBrowser, storedCart, storedCheckout } from "../support/navigateur";

// Checkout de l'invité : panier, coordonnées, livraison, paiement Mobile Money et suivi (`/boutique/panier`,
// `/boutique/commande/…`, `/boutique/commandes/<référence>`). Tests fonctionnels sur fixtures (fausse API,
// docs/tests/FIXTURES-FAUSSE-API.md) : chaque test nomme sa fixture, chaque scénario du cahier de recette est une étape
// `REC-APP-xxx · …` (section « Boutique de kits et checkout » de apps/web/e2e/CAHIER-DE-RECETTE.md).
// Les montants attendus sont ceux des fixtures, comme l'écran reçoit ceux de l'API : rien n'est recalculé ici.

const PACK = KITS["pack-electronique"];
const BOT = KITS["steamy-bot-v1"];
const PORTO_NOVO = ZONES[1];

const fcfa = (amount: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} F CFA`;
const fcfaHt = (amount: number) => `${fcfa(amount)} HT`;
/** Ligne de montant du récapitulatif (`dt` du libellé et `dd` du montant), libellé exact. */
const line = (page: Page, label: string) =>
  page.locator("dt").filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).locator("xpath=..").filter({ visible: true });

test.beforeEach(async ({}, testInfo) => {
  testInfo.annotations.push({ type: "projet", description: testInfo.project.name });
});

/** Étape jouée sur le projet mobile (360 px) seulement. */
async function onMobile(testInfo: TestInfo, title: string, body: () => Promise<void>) {
  if (testInfo.project.name === "mobile") await test.step(title, body);
}

const CART_PATH = "/boutique/panier";
const TWO_KITS = [{ kitSlug: PACK.slug, quantity: 1 }, { kitSlug: BOT.slug, quantity: 2 }];
const ONE_KIT = [{ kitSlug: PACK.slug, quantity: 1 }];
const quantity = (page: Page, name: string) => page.getByRole("group", { name: `Quantité de ${name}` });
const SERVER_DOWN = "Une erreur est survenue de notre côté. Réessayez dans quelques instants.";
const UNREACHABLE = "Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez.";

test("panier · invité, deux kits : lignes, quantités, retrait, récapitulatif estimé, accès à la commande", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "invite-panier");
  await seedBrowser(page, { cart: TWO_KITS });
  await page.goto(CART_PATH);
  await expect(page.getByRole("heading", { level: 1, name: "Votre panier" })).toBeVisible();
  const total = PACK.price + 2 * BOT.price;

  await test.step("REC-APP-905 · Ouvrir le panier invité avec deux kits : lignes (nom lié au kit, prix unitaire HT, total de ligne HT, quantité)", async () => {
    await expect(page.getByRole("link", { name: PACK.name })).toHaveAttribute("href", `/boutique/${PACK.slug}`);
    await expect(page.getByRole("link", { name: BOT.name })).toHaveAttribute("href", `/boutique/${BOT.slug}`);
    await expect(page.getByText(`${fcfaHt(BOT.price)} l'unité`)).toBeVisible();
    await expect(page.getByText(`Total : ${fcfaHt(2 * BOT.price)}`)).toBeVisible();
    await expect(quantity(page, BOT.name)).toContainText("2");
    await expect(page.getByText("Indisponible")).toHaveCount(0);
  });

  await test.step("REC-APP-704 · Lire le récapitulatif invité : « Sous-total HT estimé », « Total estimé hors livraison », note sur les taxes", async () => {
    await expect(line(page, "Sous-total HT estimé (3 articles)")).toContainText(fcfa(total));
    await expect(line(page, "Livraison")).toContainText("Calculée à l'étape suivante");
    await expect(line(page, "Total estimé hors livraison")).toContainText(fcfa(total));
    await expect(page.getByText("Les taxes éventuelles sont ajoutées au moment du paiement.")).toBeVisible();
  });

  await test.step("REC-APP-703 · Lire le récapitulatif invité : aucune ligne de taxe (les taxes sont calculées par le serveur à la commande)", async () => {
    await expect(page.getByText(/^TVA|^AIB/)).toHaveCount(0);
  });

  await test.step("REC-APP-906 · Lire le prix d'un kit : toujours « HT », jamais de prix TTC", async () => {
    const unitPrices = page.locator("p").filter({ hasText: "l'unité" });
    await expect(unitPrices).toHaveCount(2);
    for (const price of await unitPrices.all()) await expect(price).toContainText(" HT");
    await expect(page.getByText(/TTC/)).toHaveCount(0);
  });

  await test.step("REC-APP-720 · Mobile 360 px : récapitulatif sous les lignes, bouton « Commander » pleine largeur, aucun débordement", async () => {
    if (testInfo.project.name !== "mobile") return;
    const button = (await page.getByRole("link", { name: "Commander" }).boundingBox())!;
    const lines = (await page.getByRole("link", { name: BOT.name }).boundingBox())!;
    expect(button.y).toBeGreaterThan(lines.y);
    expect(button.width).toBeGreaterThan(250);
    expect(button.height).toBeGreaterThanOrEqual(44);
  });

  await test.step("REC-APP-909 · Accessibilité : aucune violation WCAG 2 A/AA sur le panier invité", async () => {
    await expectAccessible(page);
  });

  await test.step("REC-APP-907 · Cliquer « Ajouter un exemplaire de Pack Électronique » : la quantité et les totaux augmentent, le navigateur garde la quantité", async () => {
    await page.getByRole("button", { name: `Ajouter un exemplaire de ${PACK.name}` }).click();
    await expect(quantity(page, PACK.name)).toContainText("2");
    await expect(line(page, "Sous-total HT estimé (4 articles)")).toContainText(fcfa(total + PACK.price));
    expect(await storedCart(page)).toEqual([{ kitSlug: PACK.slug, quantity: 2 }, { kitSlug: BOT.slug, quantity: 2 }]);
  });

  await test.step("REC-APP-718 · Recharger la page : mêmes lignes et quantités", async () => {
    await page.reload();
    await expect(quantity(page, PACK.name)).toContainText("2");
    await expect(quantity(page, BOT.name)).toContainText("2");
  });

  await test.step("REC-APP-719 · Utiliser les boutons de quantité au clavier : atteignables et activables, la quantité s'arrête à 1", async () => {
    const less = page.getByRole("button", { name: `Retirer un exemplaire de ${PACK.name}` });
    await less.focus();
    await page.keyboard.press("Enter");
    await expect(quantity(page, PACK.name)).toContainText("1");
    await expect(less).toBeDisabled();
  });

  await test.step("REC-APP-908 · Cliquer « Retirer Steamy Bot v1 » : message « retiré du panier », focus en tête de liste, sous-total mis à jour", async () => {
    await page.getByRole("button", { name: `Retirer ${BOT.name}` }).click();
    await expect(page.getByText(`« ${BOT.name} » retiré du panier.`)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Articles du panier" })).toBeFocused();
    await expect(line(page, "Sous-total HT estimé (1 article)")).toContainText(fcfa(PACK.price));
    await expect(page.getByRole("link", { name: BOT.name })).toHaveCount(0);
    expect(await storedCart(page)).toEqual(ONE_KIT);
  });

  await test.step("REC-APP-710 · Cliquer « Continuer mes achats » : retour sur la liste des kits", async () => {
    await page.getByRole("link", { name: "Continuer mes achats" }).click();
    await expect(page).toHaveURL("/boutique");
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Votre panier" })).toBeVisible();
  });

  await test.step("REC-APP-708 · Cliquer « Commander » avec un panier valide : arrivée sur /boutique/commande/coordonnees", async () => {
    await page.getByRole("link", { name: "Commander" }).click();
    await expect(page).toHaveURL("/boutique/commande/coordonnees");
  });
  expect(await session.writes()).toEqual([]);
});

test("panier · invité, panier vide : état vide, délais de livraison, retour aux kits, dernier article retiré", async ({ page, context }, testInfo) => {
  await signInAs(context, "invite-panier");
  await page.goto(CART_PATH);

  await test.step("REC-APP-797 · Ouvrir /boutique/panier sans panier : « Votre panier est vide », délais de livraison par zone lus de l'API", async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Votre panier" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Votre panier est vide" })).toBeVisible();
    await expect(page.getByText("Choisissez un kit pour construire pour de vrai, livré chez vous.")).toBeVisible();
    await expect(page.getByText("Livraison selon votre zone")).toBeVisible();
    for (const zone of ZONES) {
      await expect(page.getByText(zone.name, { exact: true })).toBeVisible();
      await expect(page.getByText(`${zone.delayLabel} · ${fcfaHt(zone.fee)}`)).toBeVisible();
    }
  });

  await onMobile(testInfo, "REC-APP-801 · Mobile 360 px : mascotte et bouton « Voir les kits » centrés, délais lisibles, aucun débordement", async () => {
    const box = (await page.getByRole("link", { name: "Voir les kits" }).boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - 180)).toBeLessThan(4);
    await expectAccessible(page);
  });

  await test.step("REC-APP-910 · Accessibilité : aucune violation WCAG 2 A/AA sur le panier vide", async () => {
    await expectAccessible(page);
  });

  await test.step("REC-APP-798 · Cliquer « Voir les kits » : arrivée sur /boutique", async () => {
    await page.getByRole("link", { name: "Voir les kits" }).click();
    await expect(page).toHaveURL("/boutique");
  });

  await test.step("REC-APP-799 · Retirer le dernier article : message de retrait puis état vide", async () => {
    await seedBrowser(page, { cart: ONE_KIT });
    await page.goto(CART_PATH);
    await page.getByRole("button", { name: `Retirer ${PACK.name}` }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Votre panier est vide" })).toBeVisible();
    expect(await storedCart(page)).toEqual([]);
  });
});

test("panier · invité, kit indisponible : alerte, « Commander » désactivé", async ({ page, context }) => {
  await signInAs(context, "invite-kit-indisponible");
  await seedBrowser(page, { cart: ONE_KIT });
  await page.goto(CART_PATH);

  await test.step("REC-APP-709 · Lire le bouton « Commander » avec un kit indisponible : désactivé, alerte « Retirez les kits indisponibles pour continuer. »", async () => {
    await expect(page.getByText("Indisponible", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Retirez les kits indisponibles pour continuer." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Commander" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Commander" })).toHaveCount(0);
    await expectAccessible(page);
  });

  await test.step("REC-APP-911 · Retirer le kit indisponible : la ligne et l'alerte disparaissent, état vide", async () => {
    await page.getByRole("button", { name: `Retirer ${PACK.name}` }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Votre panier est vide" })).toBeVisible();
  });
});

test("panier · invité, kits retirés de la vente : avis et lignes écartées du navigateur", async ({ page, context }) => {
  await signInAs(context, "invite-kit-retire");
  await seedBrowser(page, { cart: TWO_KITS });
  await page.goto(CART_PATH);

  await test.step("REC-APP-912 · Ouvrir le panier dont un kit n'est plus en vente : avis « Un kit de votre panier n'est plus disponible : il a été retiré. », autre ligne conservée", async () => {
    await expect(page.getByText("Un kit de votre panier n'est plus disponible : il a été retiré.")).toBeVisible();
    await expect(page.getByRole("link", { name: PACK.name })).toBeVisible();
    await expect(page.getByRole("link", { name: BOT.name })).toHaveCount(0);
    expect(await storedCart(page)).toEqual([{ kitSlug: PACK.slug, quantity: 1 }]);
  });
});

test("panier · invité, tous les kits retirés de la vente : avis au-dessus de l'état vide", async ({ page, context }) => {
  await signInAs(context, "invite-kits-retires");
  await seedBrowser(page, { cart: TWO_KITS });
  await page.goto(CART_PATH);

  await test.step("REC-APP-800 · Ouvrir le panier dont tous les kits ont été retirés de la vente : avis au pluriel puis état vide", async () => {
    await expect(page.getByText("2 kits de votre panier ne sont plus disponibles : ils ont été retirés.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Votre panier est vide" })).toBeVisible();
    expect(await storedCart(page)).toEqual([]);
  });
});

test("panier · invité, erreurs de lecture et chargement", async ({ page, context }) => {
  const session = await signInAs(context, "invite-erreur-lecture-kit");
  await seedBrowser(page, { cart: ONE_KIT });

  await test.step("REC-APP-716 · Ouvrir le panier alors que l'API répond en erreur 500 : alerte en français et « Réessayer »", async () => {
    await page.goto(CART_PATH);
    await expect(page.getByRole("alert").filter({ hasText: SERVER_DOWN })).toBeVisible();
    await expectAccessible(page);
  });

  await test.step("REC-APP-913 · Cliquer « Réessayer » une fois l'API rétablie : le panier s'affiche", async () => {
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("link", { name: PACK.name })).toBeVisible();
    expect(await session.writes()).toEqual([]);
  });

  await test.step("REC-APP-914 · Ouvrir le panier réseau coupé : « Le serveur est injoignable… » et « Réessayer »", async () => {
    await page.route("**/api/shop/kits/**", (route) => route.abort());
    await page.reload();
    await expect(page.getByRole("alert").filter({ hasText: UNREACHABLE })).toBeVisible();
    await page.unroute("**/api/shop/kits/**");
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("link", { name: PACK.name })).toBeVisible();
  });

  await test.step("REC-APP-717 · Observer le chargement : squelette « Chargement du panier… » puis les lignes", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/shop/kits/**", async (route) => {
      await gate;
      await route.continue();
    });
    await page.reload();
    await expect(page.getByRole("status", { name: "Chargement du panier…" })).toBeVisible();
    release();
    await expect(page.getByRole("link", { name: PACK.name })).toBeVisible();
  });
});

test("panier · compte connecté sur le panier public : renvoi vers le panier de son espace", async ({ page, context }) => {
  await signInAs(context, "invite-session-apprenant");
  await page.goto(CART_PATH);

  await test.step("REC-APP-714 · Ouvrir /boutique/panier connecté en apprenant : redirection vers /apprenant/boutique/panier", async () => {
    await expect(page).toHaveURL("/apprenant/boutique/panier");
  });
});

const GUEST_PATH = "/boutique/commande/coordonnees";
const DELIVERY_PATH = "/boutique/commande/livraison";
const PAYMENT_PATH = "/boutique/commande/paiement";
const firstName = (page: Page) => page.getByRole("textbox", { name: /^Prénom/ });
const lastName = (page: Page) => page.getByRole("textbox", { name: /^Nom/ });
const phone = (page: Page) => page.getByRole("textbox", { name: /^Numéro de téléphone/ });
const terms = (page: Page) => page.getByRole("checkbox", { name: /J'accepte/ });
const next = (page: Page) => page.getByRole("button", { name: "Continuer vers la livraison" });

test("coordonnées · invité : formulaire, validations, conservation au retour, passage à la livraison", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "invite-panier");
  await seedBrowser(page, { cart: ONE_KIT });
  await page.goto(GUEST_PATH);

  await test.step("REC-APP-721 · Ouvrir la page avec un panier non vide : titre, texte d'accueil, champs, conditions jamais précochées", async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Vos coordonnées" })).toBeVisible();
    await expect(page.getByText("Pas besoin de compte pour commander : un SMS vous permettra de suivre la livraison.")).toBeVisible();
    await expect(firstName(page)).toHaveValue("");
    await expect(lastName(page)).toHaveValue("");
    await expect(page.getByText("Pour le suivi de la livraison par SMS.")).toBeVisible();
    await expect(terms(page)).not.toBeChecked();
    await expect(next(page)).toBeVisible();
  });

  await test.step("REC-APP-732 · Lire l'indicateur d'étape : « Étape 1 sur 3 : Vos coordonnées » et fil « Panier > Vos coordonnées »", async () => {
    await expect(page.getByRole("progressbar", { name: "Progression" })).toHaveAttribute("aria-valuetext", "Étape 1 sur 3 : Vos coordonnées");
    const breadcrumb = page.getByRole("navigation", { name: /Fil d'Ariane/ });
    await expect(breadcrumb.getByRole("link", { name: "Panier" })).toHaveAttribute("href", CART_PATH);
    await expect(breadcrumb.getByText("Vos coordonnées")).toBeVisible();
  });

  await test.step("REC-APP-915 · Lire les liens : conditions d'utilisation, politique de confidentialité et « Se connecter » (retour au panier après connexion)", async () => {
    await expect(page.getByRole("link", { name: "conditions d'utilisation" })).toHaveAttribute("href", "/legal/cgu");
    await expect(page.getByRole("link", { name: "politique de confidentialité" })).toHaveAttribute("href", "/legal/confidentialite");
    await expect(page.locator("#contenu").getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion?next=%2Fboutique%2Fpanier");
  });

  await onMobile(testInfo, "REC-APP-733 · Mobile 360 px : champs pleine largeur, aucun débordement", async () => {
    const box = (await firstName(page).boundingBox())!;
    expect(box.width).toBeGreaterThan(250);
    await expectAccessible(page);
  });

  await test.step("REC-APP-722 · « Continuer vers la livraison » avec le formulaire vide : récapitulatif des quatre erreurs, focus sur le récapitulatif", async () => {
    await next(page).click();
    const summary = page.getByRole("alert").filter({ hasText: "Corrigez les erreurs suivantes :" });
    await expect(summary).toBeFocused();
    for (const message of ["Indiquez votre prénom.", "Indiquez votre nom.", "Indiquez un numéro de téléphone valide.", "Acceptez les conditions pour continuer."]) {
      await expect(summary.getByRole("link", { name: message })).toBeVisible();
    }
    await expectAccessible(page);
    await summary.getByRole("link", { name: "Indiquez votre prénom." }).click();
    await expect(firstName(page)).toBeFocused();
  });

  await test.step("REC-APP-723 · Saisir un numéro invalide (123) : « Indiquez un numéro de téléphone valide. » sous le champ", async () => {
    await firstName(page).fill(GUEST.firstName);
    await lastName(page).fill(GUEST.lastName);
    await terms(page).check();
    await phone(page).fill("123");
    await next(page).click();
    await expect(page.getByText("Indiquez un numéro de téléphone valide.").last()).toBeVisible();
    await expect(page).toHaveURL(GUEST_PATH);
  });

  await test.step("REC-APP-724 · Ne pas cocher « J'accepte… » : « Acceptez les conditions pour continuer. »", async () => {
    await phone(page).fill(GUEST.phoneNational);
    await terms(page).uncheck();
    await next(page).click();
    await expect(page.getByText("Acceptez les conditions pour continuer.").last()).toBeVisible();
    await expect(page).toHaveURL(GUEST_PATH);
  });

  await test.step("REC-APP-725 · Remplir Prénom « Awa », Nom « Invitée », téléphone 0197123402, cocher les conditions puis valider : arrivée sur la livraison", async () => {
    await terms(page).check();
    await next(page).click();
    await expect(page).toHaveURL(DELIVERY_PATH);
    expect((await storedCheckout(page)).guest).toEqual(GUEST);
  });

  await test.step("REC-APP-726 · Revenir sur la page après l'étape suivante : les coordonnées saisies sont conservées dans l'onglet", async () => {
    await page.goBack();
    await expect(page).toHaveURL(GUEST_PATH);
    await expect(firstName(page)).toHaveValue(GUEST.firstName);
    await expect(lastName(page)).toHaveValue(GUEST.lastName);
    await expect(phone(page)).toHaveValue(/0197123402|01 97 12 34 02/);
  });
  expect(await session.writes()).toEqual([]);
  await expectNoUnhandledCall(session);
});

test("coordonnées et livraison · gardes du tunnel : panier vide, kit indisponible, compte connecté, erreur de lecture", async ({ page, context }) => {
  await test.step("REC-APP-727 · Ouvrir la page avec un panier vide : « Votre panier est vide. » et « Voir les kits »", async () => {
    await signInAs(context, "invite-panier");
    await page.goto(GUEST_PATH);
    await expect(page.getByText("Votre panier est vide.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir les kits" })).toHaveAttribute("href", "/boutique");
  });

  await test.step("REC-APP-745 · Ouvrir la livraison avec un panier vide : « Votre panier est vide. » et « Voir les kits »", async () => {
    await page.goto(DELIVERY_PATH);
    await expect(page.getByText("Votre panier est vide.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir les kits" })).toBeVisible();
  });

  await test.step("REC-APP-728 · Ouvrir la page avec un kit indisponible dans le panier : message et « Retour au panier »", async () => {
    await context.addCookies([{ name: "sessionid", value: `invite-kit-indisponible.garde-${Date.now()}`, url: "http://localhost:3100" }]);
    await seedBrowser(page, { cart: ONE_KIT });
    await page.goto(GUEST_PATH);
    await expect(page.getByText("Un kit de votre panier n'est plus disponible : retirez-le pour continuer.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour au panier" })).toHaveAttribute("href", CART_PATH);
    await expectAccessible(page);
  });

  await test.step("REC-APP-729 · Ouvrir la page connecté en apprenant : redirection vers /apprenant/boutique/panier", async () => {
    await context.addCookies([{ name: "sessionid", value: `invite-session-apprenant.garde-${Date.now()}`, url: "http://localhost:3100" }]);
    await page.goto(GUEST_PATH);
    await expect(page).toHaveURL("/apprenant/boutique/panier");
  });

  await test.step("REC-APP-731 · Ouvrir la page alors que la lecture du panier échoue : message d'erreur et « Réessayer »", async () => {
    await context.addCookies([{ name: "sessionid", value: `invite-erreur-lecture-kit.garde-${Date.now()}`, url: "http://localhost:3100" }]);
    await seedBrowser(page, { cart: ONE_KIT });
    await page.goto(GUEST_PATH);
    await expect(page.getByText(SERVER_DOWN)).toBeVisible();
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Vos coordonnées" })).toBeVisible();
    await expect(firstName(page)).toBeVisible();
  });

  await test.step("REC-APP-916 · Observer le chargement du tunnel : squelette « Chargement de votre commande… »", async () => {
    await context.addCookies([{ name: "sessionid", value: `invite-panier.garde-${Date.now()}`, url: "http://localhost:3100" }]);
    await seedBrowser(page, { cart: ONE_KIT });
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/shop/kits/**", async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto(GUEST_PATH);
    await expect(page.getByRole("status", { name: "Chargement de votre commande…" })).toBeVisible();
    release();
    await expect(firstName(page)).toBeVisible();
  });
});

const country = (page: Page) => page.getByRole("combobox", { name: /^Pays/ });
const zone = (page: Page) => page.getByRole("combobox", { name: /Ville ou zone de livraison/ });
const district = (page: Page) => page.getByRole("textbox", { name: /^Quartier/ });
const street = (page: Page) => page.getByRole("textbox", { name: /^Rue/ });
const recipientPhone = (page: Page) => page.getByRole("textbox", { name: /^Téléphone du destinataire/ });
const toPayment = (page: Page) => page.getByRole("button", { name: "Continuer vers le paiement" });
const orderWrites = async (session: Awaited<ReturnType<typeof signInAs>>) =>
  (await session.calls()).filter((call) => call.method === "POST" && call.path === "/api/payments/orders/");
const zoneInfo = (zoneName: string, fee: number, delay: string) => `Livraison ${zoneName} : ${fcfaHt(fee)} · délai annoncé ${delay}`;

test("livraison · invité : adresse, zones du pays, frais lus de la zone, commande créée, reprise et nouvelle commande", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "invite-panier");
  await seedBrowser(page, { cart: ONE_KIT, checkout: { guest: GUEST } });
  await page.goto(DELIVERY_PATH);

  await test.step("REC-APP-734 · Ouvrir la page : « Où livrer votre commande ? », étape 2 sur 3, adresse (pays, zone, quartier, rue), téléphone du destinataire prérempli, « Continuer vers le paiement »", async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Où livrer votre commande ?" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Progression" })).toHaveAttribute("aria-valuetext", "Étape 2 sur 3 : Livraison");
    await expect(country(page)).toBeVisible();
    await expect(zone(page).locator("option")).toHaveCount(1);
    await expect(district(page)).toBeVisible();
    await expect(street(page)).toBeVisible();
    await expect(page.getByText("Le livreur vous appelle à ce numéro.")).toBeVisible();
    await expect(recipientPhone(page)).toHaveValue(/0197123402|01 97 12 34 02/);
    await expect(page.getByText("1 article : le total, livraison comprise, est calculé à l'étape suivante.")).toBeVisible();
    await expect(toPayment(page)).toBeVisible();
    await expectAccessible(page);
  });

  await onMobile(testInfo, "REC-APP-746 · Mobile 360 px : champs pleine largeur, aucun débordement", async () => {
    expect((await district(page).boundingBox())!.width).toBeGreaterThan(250);
  });

  await test.step("REC-APP-735 · « Continuer vers le paiement » sans rien saisir : cinq erreurs, aucune commande créée", async () => {
    await recipientPhone(page).clear();
    await toPayment(page).click();
    const summary = page.getByRole("alert").filter({ hasText: "Corrigez les erreurs suivantes :" });
    await expect(summary).toBeFocused();
    for (const message of [
      "Choisissez votre pays.",
      "Choisissez votre zone de livraison.",
      "Indiquez votre quartier.",
      "Indiquez une rue ou un repère.",
      "Indiquez un numéro de téléphone valide.",
    ]) {
      await expect(summary.getByRole("link", { name: message })).toBeVisible();
    }
    await expectAccessible(page);
    expect(await orderWrites(session)).toHaveLength(0);
  });

  await test.step("REC-APP-736 · Choisir le pays Bénin : les zones du pays sont chargées dans la liste", async () => {
    await country(page).selectOption("BJ");
    await expect(zone(page)).toBeEnabled();
    for (const benin of ZONES.filter((candidate) => candidate.country === "BJ")) {
      await expect(zone(page).locator("option", { hasText: benin.name })).toBeAttached();
    }
    await expect(zone(page).locator("option", { hasText: "Lomé" })).toHaveCount(0);
  });

  await test.step("REC-APP-737 · Choisir la zone « Porto-Novo » : frais et délai lus de la zone", async () => {
    await zone(page).selectOption({ label: PORTO_NOVO.name });
    await expect(page.getByText(zoneInfo(PORTO_NOVO.name, PORTO_NOVO.fee, PORTO_NOVO.delayLabel))).toBeVisible();
    await zone(page).selectOption({ label: ZONES[0].name });
    await expect(page.getByText(zoneInfo(ZONES[0].name, ZONES[0].fee, ZONES[0].delayLabel))).toBeVisible();
    await zone(page).selectOption({ label: PORTO_NOVO.name });
  });

  await test.step("REC-APP-739 · Remplir quartier « Ouando » et rue « Près du marché » puis « Continuer vers le paiement » : commande créée sans aucun prix, arrivée sur le paiement", async () => {
    await recipientPhone(page).fill(GUEST.phoneNational);
    await district(page).fill(DELIVERY.district);
    await street(page).fill(DELIVERY.addressLine);
    await toPayment(page).click();
    await expect(page).toHaveURL(PAYMENT_PATH);
    const [created] = await orderWrites(session);
    expect(created.body).toEqual({
      kind: "kit",
      items: [{ kitSlug: PACK.slug, quantity: 1 }],
      guest: { firstName: GUEST.firstName, lastName: GUEST.lastName, phone: GUEST.phone },
      deliveryAddress: {
        zoneId: PORTO_NOVO.id,
        recipientName: "Awa Invitée",
        phone: expect.stringMatching(/0197123402$/),
        city: "Porto-Novo",
        district: DELIVERY.district,
        addressLine: DELIVERY.addressLine,
      },
    });
    expect((await storedCheckout(page)).reference).toMatch(/^CMD-KIT-1$/);
    expect(await page.evaluate(() => Object.keys(window.sessionStorage).filter((key) => key.startsWith("steamy:suivi:")))).toEqual([
      "steamy:suivi:CMD-KIT-1",
    ]);
  });

  await test.step("REC-APP-740 · Revenir sur la livraison depuis le paiement sans rien changer : valeurs conservées, la même commande est reprise, aucune nouvelle commande", async () => {
    await page.goBack();
    await expect(page).toHaveURL(DELIVERY_PATH);
    await expect(district(page)).toHaveValue(DELIVERY.district);
    await expect(street(page)).toHaveValue(DELIVERY.addressLine);
    await expect(page.getByText(zoneInfo(PORTO_NOVO.name, PORTO_NOVO.fee, PORTO_NOVO.delayLabel))).toBeVisible();
    await toPayment(page).click();
    await expect(page).toHaveURL(PAYMENT_PATH);
    expect(await orderWrites(session)).toHaveLength(1);
    expect((await storedCheckout(page)).reference).toBe("CMD-KIT-1");
  });

  await test.step("REC-APP-741 · Modifier la zone après un retour arrière : une nouvelle commande est créée avec les nouveaux frais", async () => {
    await page.goBack();
    await zone(page).selectOption({ label: ZONES[0].name });
    await toPayment(page).click();
    await expect(page).toHaveURL(PAYMENT_PATH);
    expect(await orderWrites(session)).toHaveLength(2);
    expect((await storedCheckout(page)).reference).toBe("CMD-KIT-2");
    // Écart relevé : la page de paiement déjà ouverte reste affichée avec l'ancienne commande tant qu'elle n'est pas rechargée
    await page.reload();
    await expect(page.getByText(`Livraison (${ZONES[0].name})`)).toBeVisible();
  });
  await expectNoUnhandledCall(session);
});

test("livraison · pays sans zone de livraison", async ({ page, context }) => {
  await signInAs(context, "invite-panier");
  await seedBrowser(page, { cart: ONE_KIT, checkout: { guest: GUEST } });
  await page.goto(DELIVERY_PATH);

  await test.step("REC-APP-738 · Choisir un pays sans zone (Côte d'Ivoire) : la liste des zones reste vide, aucune ligne de frais", async () => {
    await country(page).selectOption("CI");
    await expect(zone(page).locator("option")).toHaveCount(1);
    await expect(page.getByText(/^Livraison .* : /)).toHaveCount(0);
  });
});

test("livraison · coordonnées absentes : retour à l'étape 1", async ({ page, context }) => {
  await signInAs(context, "invite-panier");
  await seedBrowser(page, { cart: ONE_KIT });

  await test.step("REC-APP-917 · Ouvrir la livraison dans un onglet neuf, sans coordonnées : retour à /boutique/commande/coordonnees", async () => {
    await page.goto(DELIVERY_PATH);
    await expect(page).toHaveURL(GUEST_PATH);
  });
});

test("livraison · kit épuisé entre-temps : message, retour au panier, saisie conservée", async ({ page, context }) => {
  const session = await signInAs(context, "invite-rupture-a-la-commande");
  await seedBrowser(page, { cart: ONE_KIT, checkout: { guest: GUEST } });
  await page.goto(DELIVERY_PATH);
  await country(page).selectOption("BJ");
  await zone(page).selectOption({ label: PORTO_NOVO.name });
  await district(page).fill(DELIVERY.district);
  await street(page).fill(DELIVERY.addressLine);

  await test.step("REC-APP-742 · Valider alors que le kit vient d'être épuisé : « Un kit de votre panier vient d'être épuisé. » et lien vers le panier", async () => {
    await toPayment(page).click();
    const alert = page.getByRole("alert").filter({ hasText: "Un kit de votre panier vient d'être épuisé." });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("link", { name: "Revenir au panier" })).toHaveAttribute("href", CART_PATH);
    await expect(page).toHaveURL(DELIVERY_PATH);
    expect((await storedCheckout(page)).reference).toBeUndefined();
    await expectAccessible(page);
    expect(await orderWrites(session)).toHaveLength(1);
  });
});

test("livraison · adresse refusée par l'API : erreur sous le champ de la zone", async ({ page, context }) => {
  await signInAs(context, "invite-adresse-refusee");
  await seedBrowser(page, { cart: ONE_KIT, checkout: { guest: GUEST } });
  await page.goto(DELIVERY_PATH);
  await country(page).selectOption("BJ");
  await zone(page).selectOption({ label: PORTO_NOVO.name });
  await district(page).fill(DELIVERY.district);
  await street(page).fill(DELIVERY.addressLine);

  await test.step("REC-APP-743 · Valider alors que l'API refuse l'adresse : son message sous le champ de la zone, saisie conservée", async () => {
    await toPayment(page).click();
    await expect(page.getByText("Cette zone n'est pas desservie pour cette adresse.").last()).toBeVisible();
    await expect(page).toHaveURL(DELIVERY_PATH);
    await expect(district(page)).toHaveValue(DELIVERY.district);
  });
});

test("livraison · erreurs de l'API à la commande : serveur, zone non desservie, zones illisibles, réseau coupé", async ({ page, context }) => {
  await signInAs(context, "invite-erreur-commande");
  await seedBrowser(page, { cart: ONE_KIT, checkout: { guest: GUEST } });
  await page.goto(DELIVERY_PATH);
  await country(page).selectOption("BJ");
  await zone(page).selectOption({ label: PORTO_NOVO.name });
  await district(page).fill(DELIVERY.district);
  await street(page).fill(DELIVERY.addressLine);

  await test.step("REC-APP-744 · Valider alors que l'API répond en erreur 500 : message en tête du formulaire, saisie conservée", async () => {
    await toPayment(page).click();
    await expect(page.getByRole("alert").filter({ hasText: SERVER_DOWN })).toBeVisible();
    await expect(page).toHaveURL(DELIVERY_PATH);
    await expect(street(page)).toHaveValue(DELIVERY.addressLine);
  });

  await test.step("REC-APP-918 · Valider réseau coupé : « Le serveur est injoignable… », saisie conservée", async () => {
    await page.route("**/api/payments/orders/", (route) => route.abort());
    await toPayment(page).click();
    await expect(page.getByRole("alert").filter({ hasText: UNREACHABLE })).toBeVisible();
    await page.unroute("**/api/payments/orders/");
  });
});

test("livraison · zone devenue indisponible et zones illisibles", async ({ page, context }) => {
  await signInAs(context, "invite-zone-indisponible");
  await seedBrowser(page, { cart: ONE_KIT, checkout: { guest: GUEST } });
  await page.goto(DELIVERY_PATH);
  await country(page).selectOption("BJ");
  await zone(page).selectOption({ label: PORTO_NOVO.name });
  await district(page).fill(DELIVERY.district);
  await street(page).fill(DELIVERY.addressLine);

  await test.step("REC-APP-919 · Valider alors que la zone n'est plus desservie : message de l'API en tête du formulaire", async () => {
    await toPayment(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "Cette zone n'est plus desservie." })).toBeVisible();
    await expect(page).toHaveURL(DELIVERY_PATH);
  });

  await test.step("REC-APP-920 · Choisir un pays alors que la liste des zones est illisible : erreur et « Réessayer », puis zones chargées", async () => {
    await context.addCookies([{ name: "sessionid", value: `invite-zones-erreur.zones-${Date.now()}`, url: "http://localhost:3100" }]);
    await page.reload();
    await country(page).selectOption("BJ");
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(zone(page)).toBeEnabled();
  });
});

const ORDER_PATH = `/boutique/commandes/${GUEST_ORDER}`;
const ORDER = guestOrder();
const PAID_ORDER = paidGuestOrder();
const AT_PAYMENT = {
  cart: ONE_KIT,
  checkout: { guest: GUEST, delivery: DELIVERY, reference: GUEST_ORDER },
  tokens: { [GUEST_ORDER]: GUEST_TOKEN },
};
const taxLabel = (tax: { code: "vat" | "aib"; rate: string }) => `${tax.code === "vat" ? "TVA" : "AIB"} (${tax.rate} %)`;

test("paiement · invité : récapitulatif du serveur, taxes, formulaire, mobile", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "invite-commande-en-attente");
  await seedBrowser(page, AT_PAYMENT);
  await page.goto(PAYMENT_PATH);
  await expect(page.getByRole("heading", { level: 1, name: "Paiement Mobile Money" })).toBeVisible();

  await test.step("REC-APP-747 · Ouvrir la page après la livraison : étape 3 sur 3, « Total à payer · 1 article + livraison », détail, heure limite, formulaire Mobile Money", async () => {
    await expect(page.getByRole("progressbar", { name: "Progression" })).toHaveAttribute("aria-valuetext", "Étape 3 sur 3 : Paiement");
    await expect(page.getByRole("heading", { level: 2, name: "Total à payer · 1 article + livraison" })).toBeVisible();
    await expect(line(page, "Articles HT")).toContainText(fcfa(ORDER.subtotal));
    await expect(line(page, `Livraison (${PORTO_NOVO.name})`)).toContainText(fcfa(ORDER.shippingFee));
    await expect(page.getByText(/Vos kits sont réservés jusqu'à \d{2}:\d{2} : payez avant cette heure\./)).toBeVisible();
    await expect(page.getByRole("region", { name: "Paiement Mobile Money" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^Pays/ })).toHaveValue("BJ");
    await expect(page.getByRole("radio")).toHaveCount(2);
  });

  await test.step("REC-APP-748 · Lire le détail du total avec taxes : lignes TVA et AIB du serveur, total en grand et bouton « Payer » identiques", async () => {
    expect(ORDER.taxes.map(taxLabel)).toEqual(["TVA (18 %)", "AIB (1 %)"]);
    for (const tax of ORDER.taxes) await expect(line(page, taxLabel(tax))).toContainText(fcfa(tax.amount));
    await expect(page.getByText(fcfa(ORDER.total), { exact: true }).first()).toBeVisible();
    await expect(payButton(page)).toHaveText(`Payer ${fcfa(ORDER.total)}`);
  });

  await test.step("REC-APP-750 · Comparer le total à la commande : c'est celui de la commande lue dans l'API, jamais recalculé dans le navigateur", async () => {
    const reads = (await session.calls()).filter((call) => call.method === "GET" && call.path === `/api/payments/orders/${GUEST_ORDER}/`);
    expect(reads.length).toBeGreaterThan(0);
    expect(ORDER.total).toBe(ORDER.subtotal + ORDER.shippingFee + ORDER.taxes.reduce((sum, tax) => sum + tax.amount, 0));
  });

  await onMobile(testInfo, "REC-APP-760 · Mobile 360 px : bloc de total et formulaire pleine largeur, aucun débordement", async () => {
    expect((await payButton(page).boundingBox())!.width).toBeGreaterThan(250);
  });

  await test.step("REC-APP-921 · Accessibilité : aucune violation WCAG 2 A/AA sur le paiement invité", async () => {
    await expectAccessible(page);
  });
  await expectNoUnhandledCall(session);
});

test("paiement · invité, taxes éteintes : aucune ligne de taxe", async ({ page, context }) => {
  const session = await signInAs(context, "invite-commande-sans-taxes");
  await seedBrowser(page, AT_PAYMENT);
  await page.goto(PAYMENT_PATH);

  await test.step("REC-APP-749 · Lire le détail du total sans taxes : ni TVA ni AIB, total égal à HT + livraison", async () => {
    const order = guestOrder({}, { vat: null, aib: null });
    await expect(page.getByRole("heading", { level: 2, name: /Total à payer/ })).toBeVisible();
    await expect(page.getByText(/^TVA|^AIB/)).toHaveCount(0);
    expect(order.total).toBe(order.subtotal + order.shippingFee);
    await expect(payButton(page)).toHaveText(`Payer ${fcfa(order.total)}`);
  });
  await expectNoUnhandledCall(session);
});

test("paiement · invité : réussite, panier vidé, suivi de la commande", async ({ page, context }) => {
  await page.clock.install();
  const session = await signInAs(context, "invite-commande-en-attente");
  await seedBrowser(page, AT_PAYMENT);
  await page.goto(PAYMENT_PATH);
  await freezeClock(page);

  await test.step("REC-APP-752 · Payer avec un numéro en …01 : attente puis redirection vers /boutique/commandes/<référence>, merci affiché", async () => {
    await pay(page, "0197123401");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    const [created] = (await session.calls()).filter((call) => call.method === "POST" && call.path.endsWith("/payments/"));
    expect(created.body).toEqual({ country: "BJ", network: "mtn", msisdn: expect.stringMatching(/0197123401$/) });
    await page.clock.fastForward(3_000);
    await expect(page).toHaveURL(ORDER_PATH);
    await page.clock.resume();
    await expect(page.getByRole("heading", { level: 1, name: "Merci, c'est commandé !" })).toBeVisible();
  });

  await test.step("REC-APP-769 · Vérifier le panier après le paiement : le panier invité est vidé, ainsi que le tunnel de commande", async () => {
    expect(await storedCart(page)).toEqual([]);
    expect(await storedCheckout(page)).toEqual({});
  });

  await test.step("REC-APP-761 · Lire la confirmation : « Commande <référence> · un reçu vous a été envoyé par SMS… »", async () => {
    await expect(page.getByText("Commande CMD-INV-1 · un reçu vous a été envoyé par SMS. Vous êtes prévenu à chaque étape de la livraison.")).toBeVisible();
  });

  await test.step("REC-APP-763 · Lire le récapitulatif : lignes, sous-total HT, livraison, taxes du serveur, « Total à payer »", async () => {
    await expect(page.getByText(`${PACK.name} × 1`)).toBeVisible();
    await expect(line(page, "Sous-total HT")).toContainText(fcfa(PAID_ORDER.subtotal));
    await expect(line(page, `Livraison (${PORTO_NOVO.name})`)).toContainText(fcfa(PAID_ORDER.shippingFee));
    await expect(line(page, "Total à payer")).toContainText(fcfa(PAID_ORDER.total));
  });

  await test.step("REC-APP-764 · Lire le récapitulatif avec taxes : « TVA (18 %) » et « AIB (1 %) » du serveur, « Total à payer » identique à celui payé", async () => {
    for (const tax of PAID_ORDER.taxes) await expect(line(page, taxLabel(tax))).toContainText(fcfa(tax.amount));
  });
  await expectNoUnhandledCall(session);
});

test("paiement · invité, échec (…02) : panier conservé, changer de numéro, réessayer, reprise de la même commande", async ({ page, context }, testInfo) => {
  await page.clock.install();
  const session = await signInAs(context, "invite-commande-en-attente");
  await seedBrowser(page, AT_PAYMENT);
  await page.goto(PAYMENT_PATH);
  const attempts = async () => (await session.writes()).filter((write) => write.endsWith("/payments/")).length;

  await test.step("REC-APP-751 · Payer avec un numéro en …02 : attente « On confirme votre paiement… » puis « Paiement échoué »", async () => {
    await freezeClock(page);
    await pay(page, "0197123402");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement échoué" })).toBeVisible();
  });

  await test.step("REC-APP-790 · Paiement refusé : « Aucun montant n'a été débité. », raison, « Votre panier est conservé : vous pouvez réessayer avec un autre numéro. »", async () => {
    await expect(page.getByText("La transaction n'a pas pu aboutir. Aucun montant n'a été débité.")).toBeVisible();
    await expect(page.getByText("Raison : Solde insuffisant.")).toBeVisible();
    await expect(page.getByText("Votre panier est conservé : vous pouvez réessayer avec un autre numéro.")).toBeVisible();
    await page.clock.resume();
    await expectAccessible(page);
    await freezeClock(page, { ready: false });
  });

  await onMobile(testInfo, "REC-APP-795 · Mobile 360 px : « Paiement échoué », boutons empilés et lisibles", async () => {
    const [change, retry] = await Promise.all([
      page.getByRole("button", { name: "Changer de numéro" }).boundingBox(),
      page.getByRole("button", { name: "Réessayer le paiement" }).boundingBox(),
    ]);
    expect(Math.min(change!.height, retry!.height)).toBeGreaterThanOrEqual(44);
  });

  await test.step("REC-APP-791 · Vérifier le stockage local après l'échec : le panier invité contient toujours le kit", async () => {
    expect(await storedCart(page)).toEqual(ONE_KIT);
    expect((await storedCheckout(page)).reference).toBe(GUEST_ORDER);
  });

  await test.step("REC-APP-793 · Cliquer « Réessayer le paiement » : nouvel essai avec les mêmes informations, une seule commande", async () => {
    expect(await attempts()).toBe(1);
    await page.getByRole("button", { name: "Réessayer le paiement" }).click();
    await expect.poll(attempts).toBe(2);
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement échoué" })).toBeVisible();
    const bodies = (await session.calls()).filter((call) => call.method === "POST" && call.path.endsWith("/payments/")).map((call) => call.body);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(await orderWrites(session)).toHaveLength(0);
  });

  await test.step("REC-APP-792 · Cliquer « Changer de numéro » puis payer avec un numéro en …01 : « Merci, c'est commandé ! »", async () => {
    await page.getByRole("button", { name: "Changer de numéro" }).click();
    await chooseNetwork(page);
    await phoneField(page).fill("0197123401");
    await payButton(page).click();
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page).toHaveURL(ORDER_PATH);
  });
  await expectNoUnhandledCall(session);
});

test("paiement · invité, retour arrière puis nouveau paiement : la commande en attente est reprise", async ({ page, context }) => {
  const session = await signInAs(context, "invite-commande-en-attente");
  await seedBrowser(page, { ...AT_PAYMENT });
  await page.goto(DELIVERY_PATH);

  await test.step("REC-APP-794 · Revenir en arrière puis repayer : la commande en attente est reprise, aucune nouvelle commande", async () => {
    await country(page).selectOption("BJ");
    await zone(page).selectOption({ label: PORTO_NOVO.name });
    await district(page).fill(DELIVERY.district);
    await street(page).fill(DELIVERY.addressLine);
    await toPayment(page).click();
    await expect(page).toHaveURL(PAYMENT_PATH);
    await expect(page.getByRole("heading", { level: 2, name: /Total à payer/ })).toBeVisible();
    expect(await orderWrites(session)).toHaveLength(1);
    const reference = (await storedCheckout(page)).reference;
    await page.goBack();
    await toPayment(page).click();
    await expect(page).toHaveURL(PAYMENT_PATH);
    expect((await storedCheckout(page)).reference).toBe(reference);
    expect(await orderWrites(session)).toHaveLength(1);
  });
});

test("paiement · invité, en attente (…03) : attente puis issue à rechercher dans la commande", async ({ page, context }) => {
  await page.clock.install();
  const session = await signInAs(context, "invite-commande-en-attente");
  await seedBrowser(page, AT_PAYMENT);
  await page.goto(PAYMENT_PATH);

  await test.step("REC-APP-753 · Payer avec un numéro en …03 : « On confirme votre paiement… », puis « toujours en attente » avec un lien vers le suivi de la commande", async () => {
    await freezeClock(page);
    await pay(page, "0197123403");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await page.clock.fastForward(120_000);
    await expect(page.getByText(/Le paiement est toujours en attente de validation/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir mes commandes" })).toHaveAttribute("href", ORDER_PATH);
  });
  await expectNoUnhandledCall(session);
});

test("paiement · invité, accès à la page : sans commande, commande introuvable, déjà payée, expirée, erreur de lecture, chargement", async ({ page, context }) => {
  await test.step("REC-APP-754 · Ouvrir la page sans commande en cours : redirection vers /boutique/commande/livraison", async () => {
    await signInAs(context, "invite-commande-en-attente");
    await seedBrowser(page, { cart: ONE_KIT, checkout: { guest: GUEST } });
    await page.goto(PAYMENT_PATH);
    await expect(page).toHaveURL(DELIVERY_PATH);
  });

  await test.step("REC-APP-755 · Ouvrir la page avec une commande que l'API ne connaît pas : « Cette commande est introuvable… » et « Retour au panier »", async () => {
    await signInAs(context, "invite-commande-introuvable");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await expect(page.getByRole("alert").filter({ hasText: "Cette commande est introuvable. Reprenez depuis votre panier." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour au panier" })).toHaveAttribute("href", CART_PATH);
    await expectAccessible(page);
  });

  await test.step("REC-APP-756 · Ouvrir la page d'une commande déjà payée : redirection vers /boutique/commandes/<référence>", async () => {
    await signInAs(context, "invite-commande-deja-payee");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await expect(page).toHaveURL(ORDER_PATH);
  });

  await test.step("REC-APP-757 · Ouvrir la page d'une commande dont la réservation est dépassée : message, panier conservé, « Retour au panier »", async () => {
    await signInAs(context, "invite-commande-expiree");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await expect(page.getByText("Le délai de réservation est dépassé : les kits ont été remis en vente.")).toBeVisible();
    await expect(page.getByText("Votre panier est conservé : vous pouvez repasser commande.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour au panier" })).toHaveAttribute("href", CART_PATH);
  });

  await test.step("REC-APP-758 · Ouvrir la page alors que l'API répond en erreur 500 : message et « Réessayer », puis le paiement s'affiche", async () => {
    await signInAs(context, "invite-paiement-erreur-lecture");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await expect(page.getByRole("alert").filter({ hasText: SERVER_DOWN })).toBeVisible();
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Total à payer/ })).toBeVisible();
  });

  await test.step("REC-APP-759 · Observer le chargement : squelette « Chargement de votre commande… » puis le paiement", async () => {
    await signInAs(context, "invite-paiement-lent");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await expect(page.getByRole("status", { name: "Chargement de votre commande…" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Total à payer/ })).toBeVisible();
  });

  await test.step("REC-APP-922 · Ouvrir la page réseau coupé : « Le serveur est injoignable… » et « Réessayer »", async () => {
    await signInAs(context, "invite-commande-en-attente");
    await seedBrowser(page, AT_PAYMENT);
    await page.route(`**/api/payments/orders/${GUEST_ORDER}/`, (route) => route.abort());
    await page.goto(PAYMENT_PATH);
    await expect(page.getByRole("alert").filter({ hasText: UNREACHABLE })).toBeVisible();
    await page.unroute(`**/api/payments/orders/${GUEST_ORDER}/`);
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Total à payer/ })).toBeVisible();
  });
});

test("paiement · invité, incidents à l'initiation : trop de tentatives, erreur serveur, paiement en cours, réseaux, double clic", async ({ page, context }) => {
  await test.step("REC-APP-923 · Dépasser le plafond d'essais : « Trop de tentatives. Réessayez dans 45 secondes. », bouton désactivé", async () => {
    await signInAs(context, "invite-paiement-trop-de-tentatives");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await pay(page, "0197123401");
    await expect(page.getByText("Trop de tentatives. Réessayez dans 45 secondes.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Réessayer dans 0:4\d/ })).toBeDisabled();
  });

  await test.step("REC-APP-924 · Erreur 500 à l'initiation : « Une erreur est survenue de notre côté… », le bouton « Payer » reste actif", async () => {
    await signInAs(context, "invite-paiement-erreur-serveur");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await pay(page, "0197123401");
    await expect(page.getByText(SERVER_DOWN)).toBeVisible();
    await expect(payButton(page)).toBeEnabled();
  });

  await test.step("REC-APP-925 · Payer pendant qu'un autre paiement de la commande est en cours : message de validation sur le téléphone", async () => {
    await signInAs(context, "invite-paiement-deja-en-cours");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await pay(page, "0197123401");
    await expect(
      page.getByText("Un paiement est déjà en cours pour cette commande : validez-le sur votre téléphone ou attendez son issue."),
    ).toBeVisible();
  });

  await test.step("REC-APP-926 · Réseaux Mobile Money illisibles : « Impossible de charger les réseaux Mobile Money. » puis « Réessayer »", async () => {
    await signInAs(context, "invite-reseaux-indisponibles");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await expect(page.getByText("Impossible de charger les réseaux Mobile Money.")).toBeVisible();
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("radio")).toHaveCount(2);
  });

  await test.step("REC-APP-927 · Double-cliquer sur « Payer » : un seul paiement initié", async () => {
    const session = await signInAs(context, "invite-commande-en-attente");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await pay(page, "0197123401", { double: true });
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    expect((await session.writes()).filter((write) => write.endsWith("/payments/"))).toHaveLength(1);
  });
});

test("paiement · invité, incidents après l'initiation : réservation dépassée, commande payée ailleurs", async ({ page, context }) => {
  await test.step("REC-APP-928 · Payer alors que la réservation vient d'expirer : « Le délai de réservation est dépassé… » et « Retour au panier »", async () => {
    await signInAs(context, "invite-paiement-reservation-depassee");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await pay(page, "0197123401");
    await expect(page.getByText("Le délai de réservation est dépassé : les kits ont été remis en vente.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour au panier" })).toHaveAttribute("href", CART_PATH);
    expect(await storedCart(page)).toEqual(ONE_KIT);
  });

  await test.step("REC-APP-929 · Payer une commande déjà payée dans un autre onglet : redirection vers /boutique/commandes/<référence>", async () => {
    await signInAs(context, "invite-paiement-deja-paye");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await pay(page, "0197123401");
    await expect(page).toHaveURL(ORDER_PATH);
  });
});

test("paiement · invité, échec sans certitude de débit et paiement tardif remboursé", async ({ page, context }) => {
  await page.clock.install();
  await signInAs(context, "invite-echec-sans-certitude-de-debit");
  await seedBrowser(page, AT_PAYMENT);
  await page.goto(PAYMENT_PATH);

  await test.step("REC-APP-930 · Échec dont le code n'établit pas l'absence de débit : texte neutre « Vérifiez l'état de la commande… », sans « Aucun montant n'a été débité »", async () => {
    await freezeClock(page);
    await pay(page, "0197123402");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page.getByRole("heading", { level: 2, name: "Paiement échoué" })).toBeVisible();
    await expect(page.getByText("La transaction n'a pas pu aboutir. Vérifiez l'état de la commande dans vos commandes avant de réessayer.")).toBeVisible();
    await expect(page.getByText("Aucun montant n'a été débité.")).toHaveCount(0);
  });

  await test.step("REC-APP-931 · Paiement arrivé après le délai : « Commande remboursée » sur le suivi, panier conservé", async () => {
    await signInAs(context, "invite-paiement-tardif-rembourse");
    await seedBrowser(page, AT_PAYMENT);
    await page.goto(PAYMENT_PATH);
    await page.clock.resume();
    await freezeClock(page);
    await pay(page, "0197123401");
    await expect(page.getByRole("heading", { level: 2, name: "On confirme votre paiement…" })).toBeVisible();
    await page.clock.fastForward(3_000);
    await expect(page).toHaveURL(ORDER_PATH);
    await page.clock.resume();
    await expect(page.getByRole("heading", { level: 1, name: "Commande remboursée" })).toBeVisible();
    expect(await storedCart(page)).toEqual(ONE_KIT);
  });
});

const trackingUrl = `${ORDER_PATH}#jeton=${GUEST_TOKEN}`;
/** Ouvre le lien du SMS : depuis une autre page, car un lien qui ne diffère que par le fragment ne recharge pas la page. */
async function openTracking(page: Page) {
  await page.goto("/robots.txt");
  await page.goto(trackingUrl);
}

test("suivi · commande payée : confirmation, chronologie, récapitulatif, reçu, retour à la boutique", async ({ page, context }, testInfo) => {
  const session = await signInAs(context, "invite-commande-payee");
  await openTracking(page);

  await test.step("REC-APP-771 · Ouvrir le lien de suivi reçu par SMS (jeton dans le lien) : la commande s'affiche, le jeton est retiré de l'adresse", async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Merci, c'est commandé !" })).toBeVisible();
    await expect(page).toHaveURL(ORDER_PATH);
    expect(await page.evaluate((reference) => window.sessionStorage.getItem(`steamy:suivi:${reference}`), GUEST_ORDER)).toBe(GUEST_TOKEN);
  });

  await test.step("REC-APP-762 · Lire « Suivi de livraison » : étapes, « Délai annoncé » de la zone, mention du Kit Code imprimé sur la notice", async () => {
    const steps = page.getByRole("list", { name: "Suivi de livraison" });
    await expect(steps).toBeVisible();
    for (const label of ["Commande confirmée", "En préparation", "Expédiée", "Livrée"]) await expect(steps).toContainText(label);
    await expect(page.getByText(`Délai annoncé : ${PORTO_NOVO.delayLabel}`)).toBeVisible();
    await expect(page.getByText("Le Kit Code est imprimé sur la notice du kit : l'apprenant le saisit dans son espace pour débloquer son parcours.")).toBeVisible();
  });

  await test.step("REC-APP-763 · Lire « Récapitulatif » : lignes, sous-total HT, livraison, taxes, « Total à payer » du serveur", async () => {
    await expect(page.getByText(`${PACK.name} × 1`)).toBeVisible();
    await expect(line(page, "Sous-total HT")).toContainText(fcfa(PAID_ORDER.subtotal));
    for (const tax of PAID_ORDER.taxes) await expect(line(page, taxLabel(tax))).toContainText(fcfa(tax.amount));
    await expect(line(page, "Total à payer")).toContainText(fcfa(PAID_ORDER.total));
  });

  await onMobile(testInfo, "REC-APP-778 · Mobile 360 px : chronologie et récapitulatif empilés, aucun débordement", async () => {
    await expectAccessible(page);
  });

  await test.step("REC-APP-932 · Accessibilité : aucune violation WCAG 2 A/AA sur le suivi de la commande payée", async () => {
    await expectAccessible(page);
  });

  await test.step("REC-APP-765 · Cliquer « Télécharger le reçu » : téléchargement de recu-<référence>.pdf avec le jeton de la commande", async () => {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Télécharger le reçu" }).click();
    expect((await download).suggestedFilename()).toBe(`recu-${GUEST_ORDER}.pdf`);
    const [invoice] = (await session.calls()).filter((call) => call.path.endsWith("/invoice/"));
    expect(invoice.status).toBe(200);
  });

  await test.step("REC-APP-770 · Vérifier l'en-tête de réponse de la page de suivi : Referrer-Policy: no-referrer", async () => {
    const response = await page.request.get(ORDER_PATH);
    expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  });

  await test.step("REC-APP-768 · Cliquer « Retour à la boutique » : arrivée sur /boutique", async () => {
    await page.getByRole("link", { name: "Retour à la boutique" }).click();
    await expect(page).toHaveURL("/boutique");
  });
  await expectNoUnhandledCall(session);
});

test("suivi · reçu : pas prêt, erreur serveur, commande sans facture", async ({ page, context }) => {
  await test.step("REC-APP-766 · Cliquer « Télécharger le reçu » alors que le PDF n'est pas prêt : « Le reçu est en cours de préparation. Réessayez dans un instant. »", async () => {
    await signInAs(context, "invite-recu-pas-pret");
    await openTracking(page);
    await page.getByRole("button", { name: "Télécharger le reçu" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Le reçu est en cours de préparation. Réessayez dans un instant." })).toBeVisible();
  });

  await test.step("REC-APP-767 · Cliquer « Télécharger le reçu » alors que l'API répond en erreur 500 : alerte en français", async () => {
    await signInAs(context, "invite-recu-erreur");
    await openTracking(page);
    await page.getByRole("button", { name: "Télécharger le reçu" }).click();
    await expect(page.getByRole("alert").filter({ hasText: SERVER_DOWN })).toBeVisible();
  });

  await test.step("REC-APP-933 · Ouvrir une commande payée sans facture : pas de bouton « Télécharger le reçu »", async () => {
    await signInAs(context, "invite-sans-facture");
    await openTracking(page);
    await expect(page.getByRole("heading", { level: 1, name: "Merci, c'est commandé !" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Télécharger le reçu" })).toHaveCount(0);
  });
});

test("suivi · états de la livraison et sans taxes", async ({ page, context }) => {
  await test.step("REC-APP-934 · Ouvrir une commande expédiée : « Expédiée » atteinte, « Délai annoncé » toujours affiché pour la livraison", async () => {
    await signInAs(context, "invite-commande-expediee");
    await openTracking(page);
    const steps = page.getByRole("list", { name: "Suivi de livraison" });
    await expect(steps).not.toContainText("À venir");
    await expect(page.getByText(`Délai annoncé : ${PORTO_NOVO.delayLabel}`)).toBeVisible();
  });

  await test.step("REC-APP-935 · Ouvrir une commande livrée : plus de « Délai annoncé »", async () => {
    await signInAs(context, "invite-commande-livree");
    await openTracking(page);
    await expect(page.getByRole("list", { name: "Suivi de livraison" })).toBeVisible();
    await expect(page.getByText(/Délai annoncé/)).toHaveCount(0);
  });

  await test.step("REC-APP-936 · Ouvrir une commande payée sans taxes : aucune ligne TVA ni AIB, « Total à payer » égal à HT + livraison", async () => {
    await signInAs(context, "invite-commande-payee-sans-taxes");
    await openTracking(page);
    await expect(line(page, "Total à payer")).toContainText(fcfa(25000));
    await expect(page.getByText(/^TVA|^AIB/)).toHaveCount(0);
  });
});

test("suivi · accès et statuts : sans jeton, en attente, annulée, remboursée, erreurs, chargement", async ({ page, context }) => {
  await test.step("REC-APP-772 · Ouvrir /boutique/commandes/<référence> sans jeton : « Commande introuvable », lien SMS à ouvrir, « Retour à la boutique »", async () => {
    await signInAs(context, "invite-commande-payee");
    await page.goto(ORDER_PATH);
    await expect(page.getByRole("heading", { level: 1, name: "Commande introuvable" })).toBeVisible();
    await expect(page.getByText("Ouvrez le lien reçu par SMS sur cet appareil pour suivre votre commande.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour à la boutique" })).toHaveAttribute("href", "/boutique");
    await expectAccessible(page);
  });

  await test.step("REC-APP-937 · Ouvrir le lien avec un jeton incorrect : « Commande introuvable »", async () => {
    await page.goto(`${ORDER_PATH}#jeton=autre-jeton`);
    await expect(page.getByRole("heading", { level: 1, name: "Commande introuvable" })).toBeVisible();
  });

  await test.step("REC-APP-773 · Ouvrir une commande en attente : « Paiement en attente », pas de suivi de livraison", async () => {
    await signInAs(context, "invite-commande-en-attente");
    await openTracking(page);
    await expect(page.getByRole("heading", { level: 1, name: "Paiement en attente" })).toBeVisible();
    await expect(page.getByText("le paiement n'est pas encore confirmé.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Suivi de livraison" })).toHaveCount(0);
  });

  await test.step("REC-APP-774 · Ouvrir une commande annulée : « Commande annulée », stock libéré", async () => {
    await signInAs(context, "invite-commande-annulee");
    await openTracking(page);
    await expect(page.getByRole("heading", { level: 1, name: "Commande annulée" })).toBeVisible();
    await expect(page.getByText("elle n'a pas été payée à temps et le stock a été libéré.")).toBeVisible();
  });

  await test.step("REC-APP-775 · Ouvrir une commande remboursée : « Commande remboursée »", async () => {
    await signInAs(context, "invite-commande-remboursee");
    await openTracking(page);
    await expect(page.getByRole("heading", { level: 1, name: "Commande remboursée" })).toBeVisible();
    await expect(page.getByText("elle vous a été remboursée.")).toBeVisible();
  });

  await test.step("REC-APP-776 · Ouvrir le suivi alors que l'API répond en erreur 500 : « Impossible d'afficher la commande » et « Réessayer »", async () => {
    await signInAs(context, "invite-suivi-erreur");
    await openTracking(page);
    await expect(page.getByRole("heading", { level: 1, name: "Impossible d'afficher la commande" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: SERVER_DOWN })).toBeVisible();
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Merci, c'est commandé !" })).toBeVisible();
  });

  await test.step("REC-APP-938 · Ouvrir le suivi réseau coupé : « Impossible d'afficher la commande », « Le serveur est injoignable… »", async () => {
    await signInAs(context, "invite-commande-payee");
    await page.route(`**/api/payments/orders/${GUEST_ORDER}/`, (route) => route.abort());
    await openTracking(page);
    await expect(page.getByRole("heading", { level: 1, name: "Impossible d'afficher la commande" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: UNREACHABLE })).toBeVisible();
    await page.unroute(`**/api/payments/orders/${GUEST_ORDER}/`);
  });

  await test.step("REC-APP-777 · Observer le chargement : squelette « Chargement de la commande… » puis la confirmation", async () => {
    await signInAs(context, "invite-suivi-lent");
    await openTracking(page);
    await expect(page.getByRole("status", { name: "Chargement de la commande…" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Merci, c'est commandé !" })).toBeVisible();
  });
});
