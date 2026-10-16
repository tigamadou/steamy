import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signUpFreshLearner } from "./support/learner";
import { loginViaApi, logoutFromShell } from "./support/session";

// LOT-3 étape 3.7a · Boutique WK01-WK03, WK10, WK11 (SPEC-ECRANS-3 §5.13) et partie panier du parcours P5 :
// WK01 → WK03, panier serveur qui survit à une reconnexion, fusion d'un panier invité à la connexion.
// Un apprenant neuf par test (panier modifié) ; jeu D2 : Steamy Bot v1 et Pack Électronique en stock, Kit Énergie
// Solaire en rupture.

const PASSWORD = "Robot2026x";

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Élément visible seulement : Next garde la page précédente masquée dans le DOM (Activity). */
const visible = (page: Page, role: Parameters<Page["getByRole"]>[0], name: string | RegExp) =>
  page.getByRole(role, { name }).filter({ visible: true });

test("P5 panier : WK10 → WK01 → WK02 → WK03, quantité, le panier serveur survit à une reconnexion", async ({ page }) => {
  test.setTimeout(180_000);
  const username = await signUpFreshLearner(page);

  // WK10 : panier vide
  await page.goto("/apprenant/boutique/panier");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mon panier");
  await expect(visible(page, "heading", "Ton panier est vide")).toBeVisible();
  await expect(page.getByText("Livraison selon ta zone")).toBeVisible();
  await axe(page);
  await visible(page, "link", "Voir les kits").click();

  // WK01 : cartes focusables, « Ajouter » → toast
  await expect(page).toHaveURL("/apprenant/boutique");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Boutique de kits");
  await visible(page, "button", "Ajouter Pack Électronique au panier").click();
  await expect(page.getByRole("status").filter({ hasText: "« Pack Électronique » est dans ton panier." })).toBeVisible();
  await axe(page);

  // WK02 : fiche, parcours compatibles vers WC05, délais par zone
  await visible(page, "link", "Steamy Bot v1").click();
  await expect(page).toHaveURL("/apprenant/boutique/steamy-bot-v1");
  await expect(page.getByRole("heading", { level: 2, name: "Steamy Bot v1" })).toBeVisible();
  await expect(visible(page, "link", "Découverte de la robotique")).toHaveAttribute(
    "href",
    "/apprenant/catalogue/decouverte-robotique",
  );
  await expect(page.getByText("Livraison selon ta zone")).toBeVisible();
  await axe(page);
  await visible(page, "button", "Acheter maintenant").click();

  // WK03 : deux lignes, quantité enregistrée côté serveur
  await expect(page).toHaveURL("/apprenant/boutique/panier");
  await expect(visible(page, "link", "Steamy Bot v1")).toBeVisible();
  await expect(visible(page, "link", "Pack Électronique")).toBeVisible();
  await visible(page, "button", "Ajouter un exemplaire de Pack Électronique").click();
  await expect(page.getByText("Sous-total (3 articles)").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Calculée à l'étape suivante").filter({ visible: true })).toBeVisible();
  await axe(page);

  // Reconnexion : le panier est toujours là
  await logoutFromShell(page);
  await expect(page).toHaveURL(/\/connexion/);
  await loginViaApi(page, username, PASSWORD);
  await page.goto("/apprenant/boutique/panier");
  await expect(page.getByText("Sous-total (3 articles)")).toBeVisible();

  // Retrait d'une ligne
  await visible(page, "button", "Retirer Steamy Bot v1").click();
  await expect(page.getByRole("status").filter({ hasText: "« Steamy Bot v1 » retiré du panier." })).toBeVisible();
  await expect(page.getByText("Sous-total (2 articles)")).toBeVisible();
});

test("P5 fusion : le panier invité rejoint celui de l'apprenant à la connexion (W16 ?next=)", async ({ page }) => {
  test.setTimeout(180_000);
  const username = await signUpFreshLearner(page);
  await logoutFromShell(page);
  await expect(page).toHaveURL(/\/connexion/);

  // Invité : WL07 → WK03, panier dans le navigateur
  await page.goto("/boutique");
  await visible(page, "button", "Ajouter Steamy Bot v1 au panier").click();
  await expect(page.getByRole("status").filter({ hasText: "« Steamy Bot v1 » est dans votre panier." })).toBeVisible();
  await page.goto("/boutique/panier");
  await expect(page.getByRole("heading", { level: 1, name: "Votre panier" })).toBeVisible();
  await expect(visible(page, "link", "Steamy Bot v1")).toBeVisible();
  await expect(visible(page, "link", "Commander")).toHaveAttribute("href", "/boutique/commande/coordonnees");
  await axe(page);

  // W16 avec retour au panier : fusion puis panier de l'apprenant
  await page.goto("/connexion?next=%2Fboutique%2Fpanier");
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(username);
  await page.getByLabel(/^Mot de passe/).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/apprenant/boutique/panier");
  await expect(visible(page, "link", "Steamy Bot v1")).toBeVisible();
  await expect(page.getByText("Sous-total (1 article)")).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("steamy:panier"))).toBeNull();

  // Le panier public renvoie l'apprenant connecté vers le sien
  await page.goto("/boutique/panier");
  await expect(page).toHaveURL("/apprenant/boutique/panier");
});

test("WK10 et WK11 invité : panier vide, kit en rupture avec alerte de réassort par SMS", async ({ page }) => {
  await page.goto("/boutique/panier");
  await expect(visible(page, "heading", "Votre panier est vide")).toBeVisible();
  await expect(page.getByText("Livraison selon votre zone")).toBeVisible();
  await axe(page);

  await page.goto("/boutique/kit-energie-solaire");
  await expect(page.getByRole("heading", { level: 1, name: "Kit Énergie Solaire" })).toBeVisible();
  await expect(page.getByText("Indisponible", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajouter au panier" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Voir des kits similaires" })).toHaveAttribute(
    "href",
    "/boutique?categorie=energie",
  );
  await page.getByRole("textbox", { name: /Votre numéro de téléphone/ }).fill("0197000001");
  await page.getByRole("button", { name: "Me prévenir" }).click();
  await expect(page.getByRole("status").filter({ hasText: "un SMS vous sera envoyé" })).toBeVisible();
  await axe(page);
});

test("WK11 apprenant : alerte dans l'application, sans champ téléphone (D30)", async ({ page }) => {
  test.setTimeout(150_000);
  await signUpFreshLearner(page);
  await page.goto("/apprenant/boutique/kit-energie-solaire");
  await expect(page.getByRole("heading", { level: 2, name: "Kit Énergie Solaire" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /téléphone/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Préviens-moi" }).click();
  await expect(page.getByRole("status").filter({ hasText: "tu recevras une notification" })).toBeVisible();
  await axe(page);
});
