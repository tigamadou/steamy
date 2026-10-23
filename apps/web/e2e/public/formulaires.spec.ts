import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { waitForMessage } from "../support/mailpit";

// Étape 1.6 du lot 1 : formulaires B2B (WL11) et d'aide (WL24), envoyés à l'API (`POST public/*`).

// Destinataire des notifications de l'équipe (`TEAM_EMAIL` par défaut de l'API)
const TEAM_EMAIL = "contact@steamy.local";

test("devis : offre choisie → formulaire présélectionné → envoi → confirmation et email à l'équipe", async ({
  page,
}) => {
  const school = `Collège e2e ${Date.now()}`;
  const since = new Date();
  await page.goto("/ecoles");
  await page.getByRole("link", { name: "Choisir l'offre École" }).click();
  await expect(page).toHaveURL("/ecoles?offre=ecole#devis");
  await expect(page.getByRole("combobox", { name: "Offre" })).toHaveValue("ecole");

  await page.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Indiquez le nom de l'établissement.");

  await page.getByLabel(/Nom de l'établissement/).fill(school);
  await page.getByLabel(/Personne à contacter/).fill("Awa Houngbo");
  await page.getByLabel(/^Email/).fill("direction@college.test");
  await page.getByRole("textbox", { name: /Téléphone/ }).fill("0197000000");
  await page.getByLabel(/^Message/).fill("Trois classes de 4e à la rentrée.");
  await page.getByRole("button", { name: "Envoyer la demande" }).click();

  await expect(page.getByRole("heading", { name: "Demande envoyée" })).toBeVisible();
  await expect(page.getByText("direction@college.test")).toBeVisible();
  const mail = await waitForMessage(TEAM_EMAIL, { since, contains: school });
  expect(mail.Subject).toContain("Nouvelle demande de devis");
  expect(mail.Text).toContain("+2290197000000");
});

test("contact : « Rejoindre l'équipe » → sujet « Candidature » → envoi → confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Rejoindre l'équipe" }).click();
  await expect(page).toHaveURL("/aide?sujet=candidature#contact");
  await expect(page.getByRole("combobox", { name: /Sujet/ })).toHaveValue("candidature");

  await page.getByLabel(/^Nom/).fill("Marie Adjovi");
  await page.getByLabel(/Email ou téléphone/).fill("marie.e2e@example.com");
  await page.getByLabel(/^Message/).fill("Bonjour");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("au moins 20 caractères");
  await expect(page.getByLabel(/^Nom/)).toHaveValue("Marie Adjovi");

  await page.getByLabel(/^Message/).fill("Bonjour, je suis ingénieure et j'aimerais animer des ateliers Steamy.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("heading", { name: "Message envoyé" })).toBeVisible();
  await expect(page.getByText(/Merci Marie Adjovi/)).toBeVisible();
});

test("aide : FAQ par thème et recherche, ancres #faq et #contact", async ({ page }) => {
  await page.goto("/aide#faq");
  await expect(page.getByRole("heading", { name: "Questions fréquentes" })).toBeInViewport();
  await page
    .getByRole("navigation", { name: "Dans cette page" })
    .getByRole("link", { name: "Kits et livraison" })
    .click();
  await expect(page).toHaveURL("/aide#faq-kits");
  await expect(page.getByRole("heading", { level: 3, name: "Kits et livraison" })).toBeInViewport();
  await page.getByRole("searchbox", { name: "Rechercher une question" }).fill("kit code");
  await expect(page.getByText("À quoi sert le Kit Code ?")).toBeVisible();
  await expect(page.getByText("Quels moyens de paiement acceptez-vous ?")).toHaveCount(0);

  await page.getByRole("contentinfo").getByRole("link", { name: "Nous contacter" }).click();
  await expect(page).toHaveURL("/aide#contact");
  await expect(page.getByRole("heading", { name: "Nous contacter" })).toBeInViewport();
});

for (const path of ["/ecoles", "/aide"]) {
  test(`WL11 et WL24 ne présentent aucune violation d'accessibilité : ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations, path).toEqual([]);
  });
}
