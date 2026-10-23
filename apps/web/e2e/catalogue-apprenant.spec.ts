import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signUpFreshLearner } from "./support/learner";
import { loginAs, openShellMenu } from "./support/session";

// LOT-3 étape 3.2 · Catalogue de l'apprenant WC01-WC03 et fiche parcours WC04-WC05 (SPEC-ECRANS-2 §5.7).
// Léa (jeu de démo) en lecture seule ; l'inscription se fait avec un apprenant neuf.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Aucun contact avec Vimeo sans intention de lecture (ADR 0004) : le lecteur est remplacé par une page factice. */
async function watchVimeo(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route("https://player.vimeo.com/**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Lecteur factice</title><p>Vidéo</p>" });
  });
  return requests;
}

test("WC01 : catalogue par défaut, compteur réel, cartes vers la fiche, sans « Niveau »", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/catalogue");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catalogue");
  await expect(page.getByText(/^\d+ parcours$/).first()).toBeVisible();
  await expect(page.getByText(/catégories? · pour les 10-17 ans/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Difficulté ·/ })).toContainText("Toutes");
  await expect(page.getByRole("link", { name: "Effacer les filtres" })).toHaveCount(0);
  const card = page.getByRole("link", { name: "Construis ton robot Bluetooth" });
  await expect(card).toHaveAttribute("href", "/apprenant/catalogue/robot-bluetooth");
  await expect(page.getByText("Niveau", { exact: false })).toHaveCount(0);
  await openShellMenu(page);
  await expect(
    page.getByRole("navigation", { name: "Navigation de ton espace" }).getByRole("link", { name: "Catalogue" }),
  ).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await axe(page);
});

test("WC02 / WC02b : filtres au clavier dans l'URL, puces retirables, recherche du header", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/catalogue?q=robot");
  await expect(page.getByRole("link", { name: "Retirer le filtre « robot »" })).toBeVisible();

  // WC02b : menu « Difficulté » ouvert, sans atténuation de la grille
  const difficulty = page.getByRole("button", { name: /^Difficulté ·/ });
  await difficulty.click();
  const menu = page.getByRole("menu", { name: "Difficulté" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitemradio")).toHaveText(["Toutes", "Débutant", "Intermédiaire", "Avancé"]);
  await axe(page);
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitemradio", { name: "Débutant" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/apprenant/catalogue?q=robot&difficulte=debutant");
  await expect(page.getByRole("button", { name: /^Difficulté ·/ })).toContainText("Débutant");

  // Catégorie et filtres actifs
  await page.getByRole("navigation", { name: "Filtrer par catégorie" }).getByRole("link", { name: "Robotique" }).click();
  await expect(page).toHaveURL("/apprenant/catalogue?q=robot&categorie=robotique&difficulte=debutant");
  await expect(page.getByRole("link", { name: "Découverte de la robotique" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Construis ton robot Bluetooth" })).toHaveCount(0);
  await axe(page);
  await page.getByRole("link", { name: "Retirer le filtre Débutant" }).click();
  await expect(page).toHaveURL("/apprenant/catalogue?q=robot&categorie=robotique");
  await page.getByRole("link", { name: "Effacer les filtres" }).click();
  await expect(page).toHaveURL("/apprenant/catalogue");
});

test("WC03 : aucun résultat, « Effacer les filtres »", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/catalogue?categorie=energie&prix=payant");
  await expect(page.getByRole("heading", { level: 3, name: "Aucun parcours ne correspond" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir toutes les catégories" })).toHaveAttribute(
    "href",
    "/apprenant/catalogue?prix=payant",
  );
  await axe(page);
  await page.getByRole("main").getByRole("link", { name: "Effacer les filtres" }).last().click();
  await expect(page).toHaveURL("/apprenant/catalogue");
  await expect(page.getByRole("heading", { level: 2, name: "Tous les parcours" })).toBeAttached();
});

test("WC04 : fiche d'un parcours suivi, « Continuer », sans note ni contact Vimeo", async ({ page }) => {
  const vimeo = await watchVimeo(page);
  await loginAs(page, "learner");
  const response = await page.goto("/apprenant/catalogue/decouverte-robotique");
  expect(response?.headers()["content-security-policy"]).toContain("frame-src https://player.vimeo.com");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Catalogue");
  await expect(page.getByRole("heading", { level: 2, name: "Découverte de la robotique" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: /^Programme · 2 projets$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuer" })).toHaveAttribute(
    "href",
    "/apprenant/parcours/decouverte-robotique",
  );
  await expect(page.getByRole("progressbar", { name: "Ta progression" })).toBeVisible();
  await expect(page.getByText(/★|inscrits/)).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  await axe(page);
  expect(vimeo).toEqual([]);
});

test("WC05 : parcours à kit sans prix de parcours → WA01 ; parcours payant déjà demandé → « Demande envoyée » (WA02)", async ({
  page,
}) => {
  await loginAs(page, "learner");
  await page.goto("/apprenant/catalogue/robot-bluetooth");
  const card = page.getByRole("complementary", { name: "Inscription au parcours" });
  await expect(card.getByText("Débloqué avec le Kit Code")).toBeVisible();
  await expect(card.getByText("Kit requis")).toBeVisible();
  await expect(card.getByText("Steamy Bot v1", { exact: true })).toBeVisible();
  await expect(card.getByText(/35\s000 F CFA HT · En stock/)).toBeVisible();
  await expect(page.getByText(/25\s000/)).toHaveCount(0);
  await expect(card.getByRole("link", { name: "J'ai un Kit Code" })).toHaveAttribute(
    "href",
    "/apprenant/catalogue/robot-bluetooth/kit-code",
  );
  await axe(page);

  await page.goto("/apprenant/catalogue/capteurs-electroniques");
  await expect(page.getByRole("complementary").getByText(/18\s000 F CFA/)).toBeVisible();
  await expect(page.getByText("Payé par ton parent · accès à vie")).toBeVisible();
  // Jeu D2 : Léa a déjà demandé ce parcours à Marie
  await expect(page.getByRole("link", { name: "Demande envoyée" })).toHaveAttribute("href", /^\/apprenant\/demandes\/\d+$/);
  await expect(page.getByText(/Acheter|Mobile Money/)).toHaveCount(0);
  await expect(page.locator('[title="Bientôt"]')).toHaveCount(0);
  await axe(page);

  await page.goto("/apprenant/catalogue/parcours-inexistant");
  await expect(page.getByRole("heading", { level: 2, name: "Ce parcours est introuvable" })).toBeVisible();
});

test("WC04 : « Commencer le parcours » inscrit un apprenant neuf et ouvre le premier projet", async ({ page }) => {
  test.setTimeout(120_000);
  await signUpFreshLearner(page);
  await page.goto("/apprenant/catalogue/initiation-scratch");
  await page.getByRole("button", { name: "Commencer le parcours" }).click();
  await expect(page).toHaveURL(/\/apprenant\/parcours\/initiation-scratch\/projets\/\d+$/);
  await page.goto("/apprenant/catalogue/initiation-scratch");
  await expect(page.getByRole("link", { name: "Continuer" })).toBeVisible();
});
