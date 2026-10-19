import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Étape 1.4 du lot 1 : Steamy Events (WL21, WL23) et boutique en vitrine (WL07), sur le jeu D2 :
// atelier gratuit ouvert, défi payant, hackathon complet, fête de la science passée ; 3 kits dont 1 épuisé.

test("événements : WL21 → WL23 → CTA visiteur vers la connexion avec retour", async ({ page }) => {
  await page.goto("/evenements");
  await expect(page.getByRole("link", { name: "Fête de la science Steamy" })).toHaveCount(0);
  await page.getByRole("link", { name: "Atelier Électronique débutant" }).click();
  await expect(page).toHaveURL("/evenements/atelier-electronique");
  await expect(page.getByRole("heading", { level: 1, name: "Atelier Électronique débutant" })).toBeVisible();

  const action = page.getByRole("complementary", { name: "Participer à l'événement" });
  await expect(action.getByText(/places restantes/)).toBeVisible();
  await expect(action.getByText("Participation soumise à l'accord du parent.")).toBeVisible();
  await action.getByRole("link", { name: "Participer" }).click();
  await expect(page).toHaveURL("/connexion?next=%2Fevenements%2Fatelier-electronique");
});

test("événements : complet ou passé → CTA désactivé avec motif", async ({ page }) => {
  await page.goto("/evenements");
  const full = page.getByRole("article").filter({ hasText: "Hackathon IA junior" });
  await expect(full.getByText("Complet")).toBeVisible();
  await full.getByRole("link").click();
  await expect(page).toHaveURL("/evenements/hackathon-ia");
  await expect(page.getByRole("button", { name: "Complet" })).toBeDisabled();
  await expect(page.getByText(/Les 30 places sont prises/)).toBeVisible();

  await page.goto("/evenements/fete-de-la-science");
  await expect(page.getByRole("button", { name: "Événement terminé" })).toBeDisabled();
  await expect(page.getByText(/Cet événement a eu lieu le/)).toBeVisible();
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(jsonLd).toMatchObject({ "@type": "Event", name: "Fête de la science Steamy" });

  await page.goto("/evenements/evenement-inconnu");
  await expect(page.getByRole("heading", { level: 1, name: "Cet événement est introuvable" })).toBeVisible();
});

test("boutique : prix, disponibilité, fiches, « Ajouter » si en stock, filtre dans l'URL", async ({ page }) => {
  await page.goto("/boutique");
  await expect(page.getByRole("article")).toHaveCount(3);
  const solar = page.getByRole("article").filter({ hasText: "Kit Énergie Solaire" });
  await expect(solar.getByText("Épuisé")).toBeVisible();
  await expect(solar.getByRole("button", { name: /Ajouter/ })).toHaveCount(0);
  await expect(solar.getByRole("link", { name: "Kit Énergie Solaire" })).toHaveAttribute(
    "href",
    "/boutique/kit-energie-solaire",
  );
  await expect(page.getByRole("button", { name: /^Ajouter .* au panier$/ })).toHaveCount(2);

  await page
    .getByRole("navigation", { name: "Filtrer par catégorie" })
    .getByRole("link", { name: "Électronique" })
    .click();
  await expect(page).toHaveURL("/boutique?categorie=electronique");
  await page.reload();
  await expect(page.getByRole("article")).toHaveText([/Pack Électronique/]);

  await page.goto("/boutique?categorie=mecanique");
  await expect(page.getByText("Aucun kit dans cette catégorie")).toBeVisible();
});

for (const path of ["/evenements", "/evenements/atelier-electronique", "/evenements/hackathon-ia", "/boutique"]) {
  test(`WL21, WL23 et WL07 ne présentent aucune violation d'accessibilité : ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations, path).toEqual([]);
  });
}
