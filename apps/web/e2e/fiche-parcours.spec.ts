import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Étape 1.3 du lot 1 : fiche parcours publique WL22 (D11) sur le jeu D2.

test("WL06 → WL22 → CTA : inscription avec retour sur la fiche", async ({ page }) => {
  await page.goto("/parcours");
  await page.getByRole("link", { name: "Initiation à Scratch" }).click();
  await expect(page).toHaveURL("/parcours/initiation-scratch");
  await expect(page.getByRole("heading", { level: 1, name: "Initiation à Scratch" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Fil d'Ariane" }).getByRole("link", { name: "Code" }),
  ).toBeVisible();

  const aside = page.getByRole("complementary", { name: "S'inscrire au parcours" });
  await expect(aside.getByRole("link", { name: "J'ai déjà un compte · Se connecter" })).toHaveAttribute(
    "href",
    "/connexion?next=%2Fparcours%2Finitiation-scratch",
  );
  await aside.getByRole("link", { name: "Commencer" }).click();
  await expect(page).toHaveURL("/inscription?next=%2Fparcours%2Finitiation-scratch");
});

test("WL22 : aucun contenu de mission ni identifiant Vimeo dans la page (D11)", async ({ page, request }) => {
  const html = await (await request.get("/parcours/decouverte-robotique")).text();
  expect(html).toContain("Brancher un moteur");
  expect(html.toLowerCase()).not.toContain("vimeo");
  // Corps des missions du jeu D2 (`blocks`) : jamais exposé
  expect(html).not.toContain("suis les étapes pas à pas");
  expect(html).not.toContain("Prends ton temps et teste à chaque étape");
  await page.goto("/parcours/decouverte-robotique");
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(jsonLd).toMatchObject({ "@type": "Course", name: "Découverte de la robotique" });
});

test("WL22 : le plan s'ouvre et se ferme au clavier", async ({ page }) => {
  await page.goto("/parcours/decouverte-robotique");
  // Fiche diffusée en streaming puis hydratée : on attend la page stable avant d'agir au clavier
  await page.waitForLoadState("networkidle");
  const second = page.locator("details").nth(1);
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
  await expect(second).not.toHaveAttribute("open");
  await second.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(second).toHaveAttribute("open", "");
  await expect(second.getByText("Le capteur infrarouge")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(second).not.toHaveAttribute("open");
});

test("WL22 : parcours exigeant un kit (D36) et parcours en brouillon (404)", async ({ page }) => {
  await page.goto("/parcours/robot-bluetooth");
  await expect(page.getByText(/s'obtient avec le/)).toContainText("Steamy Bot v1");

  await page.goto("/parcours/ia-pour-les-curieux");
  await expect(page.getByRole("heading", { level: 1, name: "Ce parcours est introuvable" })).toBeVisible();
  await page.getByRole("link", { name: "Voir tous les parcours" }).click();
  await expect(page).toHaveURL("/parcours");
});

test("WL22 ne présente aucune violation d'accessibilité", async ({ page }) => {
  for (const path of [
    "/parcours/initiation-scratch",
    "/parcours/capteurs-electroniques",
    "/parcours/robot-bluetooth",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations, path).toEqual([]);
  }
});
