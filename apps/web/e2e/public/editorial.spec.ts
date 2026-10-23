import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Étape 1.5 du lot 1 : pages éditoriales statiques WL09, WL10, WL17, WL18, WL20 (D10).

test("pied de page → CGU, section « Consentement parental » (D17)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Consentement parent" }).click();
  await expect(page).toHaveURL("/legal/cgu#consentement-parental");
  const section = page.getByRole("heading", { level: 2, name: "3. Consentement parental" });
  await expect(section).toBeInViewport();
  await expect(page.getByText(/expire au bout de/)).toContainText("7 jours");
});

test("WL09 : chaque onglet légal est adressable par son URL", async ({ page }) => {
  await page.goto("/legal/mentions-legales");
  const tabs = page.getByRole("navigation", { name: "Documents légaux" });
  await expect(tabs.getByRole("link", { name: "Mentions légales" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 2, name: "Mentions légales" })).toBeVisible();

  await tabs.getByRole("link", { name: "Confidentialité" }).click();
  await expect(page).toHaveURL("/legal/confidentialite");
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Politique de confidentialité" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/Dernière mise à jour/)).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/moins de 16 ans/i);
});

test("WL17 → WL18 : du blog à l'article, puis retour par le fil d'Ariane", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { level: 1, name: "Le blog Steamy" })).toBeVisible();
  const featured = page.getByRole("heading", { level: 2 }).getByRole("link");
  const title = await featured.textContent();
  await featured.click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!);
  // La page quittée reste montée, masquée (état préservé par Next 16) : on ne vise que le contenu visible.
  await expect(page.getByText(/min de lecture/).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Partager sur X/ })).toHaveAttribute("target", "_blank");
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(jsonLd["@type"]).toBe("Article");

  await page.getByRole("navigation", { name: "Fil d'Ariane" }).getByRole("link", { name: "Blog" }).click();
  await expect(page).toHaveURL("/blog");
});

test("WL18 : un article inconnu affiche la 404", async ({ page }) => {
  await page.goto("/blog/article-inconnu");
  await expect(page.getByRole("heading", { level: 1, name: "Cette page est introuvable" })).toBeVisible();
});

test("WL20 : téléchargement libre d'un guide PDF, sans email (D14)", async ({ page }) => {
  await page.goto("/guides");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /^Télécharger « Le guide du jeune roboticien »/ }).click();
  expect((await download).suggestedFilename()).toBe("guide-du-jeune-roboticien.pdf");
});

test("WL20 : newsletter facultative, réservée aux adultes, consentement explicite (D14, C12)", async ({ page }) => {
  await page.goto("/guides");
  const box = page.getByRole("complementary", { name: "Recevez nos nouveaux guides" });
  await box.getByLabel(/Votre email/).fill(`parent.${Date.now()}@example.com`);
  await box.getByRole("button", { name: "Recevoir les guides" }).click();
  await expect(box.getByRole("alert")).toContainText("Votre consentement est nécessaire.");

  await box.getByRole("checkbox", { name: /18 ans ou plus/ }).check();
  await box.getByRole("checkbox", { name: /recevoir la newsletter/ }).check();
  await box.getByRole("button", { name: "Recevoir les guides" }).click();
  await expect(box.getByRole("status")).toContainText("C'est noté !");
});

test("WL10 : mission, chiffres et équipe, sans donnée de mineur", async ({ page }) => {
  await page.goto("/a-propos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Former les inventeurs de demain");
  await expect(page.getByRole("region", { name: "Steamy en chiffres" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer un compte" }).last()).toHaveAttribute("href", "/inscription");
});

for (const path of ["/legal/cgu", "/a-propos", "/blog", "/blog/debuter-en-robotique", "/guides"]) {
  test(`les pages éditoriales ne présentent aucune violation d'accessibilité : ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations, path).toEqual([]);
  });
}
