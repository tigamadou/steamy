import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { apiSession, createParent, uniqueSuffix, type ApiSession } from "../support/api";
import { DEMO_PASSWORD } from "../support/demo";
import { loginViaApi } from "../support/session";
import { birthDateFor } from "../support/signup";

// LOT-4 étape 4.2 · enfants : Mes enfants (WPD02), détail et réinitialisation du mot de passe (WPD03), ajout (WPD04),
// modification du profil (WPD10). Chaque test crée sa propre famille : le jeu D2 de Marie reste intact.

const W11 = "/inscription/apprenant/profil/infos";

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

/** Enfant créé par l'API au nom du parent de la session (WPD04 sans l'écran). */
async function createChild(session: ApiSession, age = 12): Promise<{ id: number; username: string }> {
  const [relationship] = (await session.get("/api/referentials/relationships/")) as { code: string }[];
  const username = `ines.${uniqueSuffix()}`;
  const { id } = (await session.post("/api/accounts/children/", {
    firstName: "Inès",
    lastName: "Test",
    birthDate: birthDateFor(age),
    relationship: relationship.code,
    username,
    password: DEMO_PASSWORD,
  })) as { id: number };
  return { id, username };
}

/** W16 · connexion par l'écran. */
async function signIn(page: Page, identifier: string, password: string) {
  await page.goto("/connexion");
  await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(identifier);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

test("WPD02 · WPD04 · WPD03 : le parent crée un enfant, qui se connecte sur W16 et arrive sur W11", async ({ page }) => {
  const { phone } = await createParent({ firstName: "Afi" });
  // Demande de consentement reçue (D50) : l'enfant n'est pas encore rattaché
  const learner = await apiSession();
  await learner.post("/api/auth/learner-signup/", {
    firstName: "Kossi",
    lastName: "Test",
    username: `kossi.${uniqueSuffix()}`,
    age: 13,
    privacyAccepted: true,
  });
  const [relationship] = (await learner.get("/api/referentials/relationships/")) as { code: string }[];
  await learner.post("/api/accounts/consent-requests/", { parentPhone: phone, relationship: relationship.code });
  await learner.api.dispose();

  await loginViaApi(page, phone);
  await page.goto("/parent/enfants");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes enfants");
  const request = page.getByRole("article", { name: "Kossi Test" });
  await expect(request.getByText("Demande à examiner")).toBeVisible();
  await expect(request.getByText(/^Reçue le/)).toBeVisible();
  await expect(request.getByRole("link", { name: /^Examiner/ })).toHaveAttribute("href", /^\/parent\/consentements\/[\w-]+$/);
  await expect(page.getByText(/Relancer/)).toHaveCount(0);
  await axe(page);

  // WPD04
  await page.getByRole("link", { name: "Ajouter un enfant" }).first().click();
  await expect(page).toHaveURL("/parent/enfants/ajouter");
  const username = `ines.${uniqueSuffix()}`;
  await page.getByRole("textbox", { name: /^Prénom/ }).fill("Inès");
  await page.getByRole("textbox", { name: /^Nom/ }).fill("Test");
  await page.getByLabel(/^Date de naissance/).fill(birthDateFor(12));
  await page.getByRole("combobox", { name: /^Lien de parenté/ }).selectOption({ index: 1 });
  await page.getByRole("textbox", { name: /^Identifiant/ }).fill(username);
  await page.getByLabel(/^Mot de passe initial/).fill("robot2026");
  await axe(page);
  await page.getByRole("button", { name: "Créer le compte" }).click();

  // WPD03 avec le rappel de l'identifiant
  await expect(page).toHaveURL(/\/parent\/enfants\/\d+\?confirmation=cree$/);
  await expect(page.getByRole("status").filter({ hasText: "Le compte de Inès est créé." })).toContainText(username);
  const crumb = page.getByRole("navigation", { name: "Fil d'Ariane" });
  await expect(crumb.getByRole("link", { name: "Mes enfants" })).toHaveAttribute("href", "/parent/enfants");
  await expect(crumb.getByText("Inès Test")).toHaveAttribute("aria-current", "page");
  await axe(page);

  await page.goto("/parent/enfants");
  await expect(page.getByRole("article", { name: "Inès Test" }).getByRole("link", { name: /^Voir le profil/ })).toHaveAttribute(
    "href",
    /^\/parent\/enfants\/\d+$/,
  );

  // L'enfant se connecte (W16) et complète son profil (W11, D51)
  await page.context().clearCookies();
  await signIn(page, username, "robot2026");
  await expect(page).toHaveURL(W11);
});

test("WPD03 : réinitialisation du mot de passe, l'ancien est refusé et le nouveau accepté", async ({ page }) => {
  const { phone, session } = await createParent({ firstName: "Afi", keep: true });
  const { id, username } = await createChild(session as ApiSession);
  await (session as ApiSession).api.dispose();

  await loginViaApi(page, phone);
  await page.goto(`/parent/enfants/${id}`);
  await page.getByRole("button", { name: "Réinitialiser le mot de passe" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouveau mot de passe pour Inès" });
  await expect(dialog).toContainText(`Identifiant : ${username}`);
  await expect(dialog).toContainText("Communiquez-le à votre enfant.");
  await dialog.getByLabel(/^Nouveau mot de passe/).fill("fusee2027");
  await dialog.getByLabel(/^Confirmation/).fill("fusee2027");
  await axe(page);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Le mot de passe de Inès est modifié. Communiquez-le-lui.")).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, username, DEMO_PASSWORD);
  await expect(page.getByRole("alert").filter({ hasText: "Connexion impossible" })).toContainText(
    "Identifiant ou mot de passe incorrect.",
  );
  await signIn(page, username, "fusee2027");
  await expect(page).toHaveURL(W11);
});

test("WPD10 : modification du profil, date de naissance incohérente refusée, retour à WPD03", async ({ page }) => {
  const { phone, session } = await createParent({ firstName: "Afi", keep: true });
  const { id, username } = await createChild(session as ApiSession, 12);
  await (session as ApiSession).api.dispose();

  await loginViaApi(page, phone);
  await page.goto(`/parent/enfants/${id}`);
  await page.getByRole("link", { name: "Modifier le profil" }).click();
  await expect(page).toHaveURL(`/parent/enfants/${id}/modifier`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Modifier le profil");
  // Identifiant non modifiable (C12)
  await expect(page.getByText(/il ne peut pas être modifié/)).toContainText(username);
  await expect(page.getByRole("textbox", { name: /^Identifiant/ })).toHaveCount(0);

  // D23 : l'âge déclaré à la création (12 ans) ne change pas
  const birthDate = page.getByLabel(/^Date de naissance/);
  await birthDate.fill(birthDateFor(15));
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // Récapitulatif d'erreurs et message sous le champ
  await expect(
    page.getByRole("alert").filter({ hasText: "La date de naissance ne correspond pas à l'âge indiqué" }).first(),
  ).toBeVisible();
  await expect(birthDate).toHaveAccessibleDescription(/La date de naissance ne correspond pas/);

  await birthDate.fill(birthDateFor(12));
  await page.getByRole("textbox", { name: /^Prénom/ }).fill("Inès-Marie");
  await page.getByRole("combobox", { name: /^Classe/ }).selectOption({ index: 1 });
  await page.getByRole("combobox", { name: /^Pays/ }).selectOption("BJ");
  await page.getByRole("combobox", { name: /^Localité/ }).selectOption({ index: 1 });
  await page.getByRole("radio", { name: "Fille" }).check({ force: true });
  await page.getByRole("combobox", { name: /^Situation de handicap/ }).selectOption({ index: 1 });
  await expect(page.getByText(/servent seulement à adapter les parcours/)).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page).toHaveURL(`/parent/enfants/${id}?confirmation=modifie`);
  await expect(page.getByText("Le profil de Inès-Marie est enregistré.")).toBeVisible();
  const card = page.getByRole("region", { name: "Inès-Marie Test" });
  await expect(card).toContainText("12 ans · ");
  await expect(page.getByRole("definition").filter({ hasText: "Aucune" })).toHaveCount(0);
});

test("WPD03 et WPD10 : l'enfant d'un autre parent est introuvable", async ({ page }) => {
  const other = await createParent({ firstName: "Autre", keep: true });
  const { id } = await createChild(other.session as ApiSession);
  await (other.session as ApiSession).api.dispose();
  const { phone } = await createParent({ firstName: "Afi" });

  await loginViaApi(page, phone);
  for (const path of [`/parent/enfants/${id}`, `/parent/enfants/${id}/modifier`, "/parent/enfants/abc"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 2, name: "Cet enfant est introuvable" })).toBeVisible();
    await expect(page.getByText("Inès")).toHaveCount(0);
  }
  await expect(page.getByRole("link", { name: "Voir mes enfants" })).toHaveAttribute("href", "/parent/enfants");
});
