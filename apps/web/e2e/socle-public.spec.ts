import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Étape 1.0c du lot 1 : shell public (navigation, mega-menu, pied de page), enveloppes WX01 et 404.

// Routes du lot 2 (authentification), pas encore livrées : liste blanche retirée au lot 2.
const LOT2_ROUTES = ["/connexion", "/inscription", "/inscription/parent"];
// Pages du lot 1 livrées par les étapes suivantes (1.1, 1.4 à 1.6) : chaque étape retire les siennes.
const LOT1_A_VENIR = [
  "/parcours",
  "/boutique",
  "/ecoles",
  "/evenements",
  "/blog",
  "/guides",
  "/a-propos",
  "/aide",
  "/legal/",
];
// Écrans reportés ou fusionnés (S7, S8) : aucune route, aucun lien.
const NEUTRALISEES = ["/defis", "/communaute", "/tutoriels", "/classements", "/ateliers"];

async function internalLinks(page: Page) {
  const hrefs = await page.locator("a[href^='/']").evaluateAll((links) => links.map((a) => a.getAttribute("href")!));
  return [...new Set(hrefs.map((href) => href.split("#")[0].split("?")[0] || "/"))];
}

test.describe("navigation publique au clavier (bureau)", () => {
  test.skip(({ isMobile }) => isMobile, "le tiroir mobile a son propre parcours");

  test("lien d'évitement, onglets, mega-menu « Ressources » à ↓, flèches et Échap", async ({ page }) => {
    await page.goto("/");
    // Après l'hydratation, le premier Tab part du haut du document
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");

    const resources = nav.getByRole("button", { name: "Ressources" });
    await resources.focus();
    await page.keyboard.press("ArrowDown");
    await expect(resources).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "Blog" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(nav.getByRole("link", { name: "Événements" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(resources).toBeFocused();
    await expect(resources).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Enter");
    await expect(nav.getByRole("link", { name: "Guides gratuits" })).toBeVisible();
    await page.mouse.click(5, 400);
    await expect(resources).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("navigation publique (mobile)", () => {
  test.skip(({ isMobile }) => !isMobile, "parcours propre au petit écran");

  test("tiroir modal : ouverture, focus piégé, Échap rend le focus", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menu" });
    await toggle.click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer.getByRole("link", { name: "Guides gratuits" })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Fermer le menu" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(drawer.getByRole("link", { name: "Créer un compte" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(toggle).toBeFocused();
  });
});

test("WX01 : hors ligne, la page est recouverte puis se rétablit au retour du réseau", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await context.setOffline(true);
  const offline = page.getByRole("alertdialog", { name: "Tu es hors ligne" });
  await expect(offline).toBeVisible();
  await expect(offline.getByRole("button")).toHaveText(["Réessayer"]);
  await offline.getByRole("button", { name: "Réessayer" }).click();
  await expect(offline.getByText(/Toujours pas de réseau/)).toBeVisible();

  await context.setOffline(false);
  await expect(offline).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("URL inconnue → 404 dans le shell public, y compris les écrans reportés", async ({ page }) => {
  for (const path of ["/cette-page-n-existe-pas", ...NEUTRALISEES]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
  await expect(page.getByRole("heading", { level: 1, name: "Cette page est introuvable" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await page.getByRole("link", { name: "Retour à l'accueil" }).click();
  await expect(page).toHaveURL("/");
});

test("navigation et pied de page : aucun lien mort ni lien vers un écran reporté", async ({ page, request }) => {
  await page.goto("/");
  const links = await internalLinks(page);
  expect(links).toEqual(expect.arrayContaining(["/parcours", "/evenements", "/legal/cgu", "/aide"]));
  for (const path of links) {
    expect(
      NEUTRALISEES.some((n) => path.startsWith(n)),
      path,
    ).toBe(false);
    if (LOT2_ROUTES.includes(path) || LOT1_A_VENIR.some((p) => path === p || (p.endsWith("/") && path.startsWith(p)))) {
      continue;
    }
    expect((await request.get(path)).status(), path).toBe(200);
  }
  const external = page.locator("footer a[target='_blank']");
  await expect(external).toHaveCount(3);
  for (const link of await external.all()) {
    await expect(link).toHaveAttribute("rel", /noopener/);
  }
});

test("le shell public et la 404 ne présentent aucune violation d'accessibilité", async ({ page }) => {
  for (const path of ["/", "/introuvable"]) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations, path).toEqual([]);
  }
});
