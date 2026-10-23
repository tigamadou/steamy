import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { waitForMessage } from "./support/mailpit";
import { loginAs } from "./support/session";

// LOT-5 étape 5.8 · paramètres (WT08), notifications (WT12) et aide (WT11) de l'enseignant. Le changement de mot de
// passe puis la reconnexion se jouent sur un compte à usage unique : activation.spec.ts.

const TEAM_EMAIL = "contact@steamy.local";

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

const bell = (page: Page) => page.getByRole("link", { name: /notifications? non lues?|aucune non lue/ });

test("WT08 : profil, connexion, notifications, légal et fermeture du compte", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/parametres");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paramètres");

  const profile = page.getByRole("heading", { level: 2, name: "Profil" });
  await expect(profile).toBeVisible();
  await expect(page.getByText("Koffi Adékambi")).toBeVisible();
  // Établissement en lecture seule, pas de « Bio » ni de téléphone de connexion
  await expect(page.getByText("Établissement")).toBeVisible();
  await expect(page.getByText(/^Bio$|Téléphone/)).toHaveCount(0);
  await expect(page.getByText("koffi.adekambi@steamy.test")).toBeVisible();
  await axe(page);

  // Notifications : un interrupteur enregistré aussitôt, puis remis comme il était
  const events = page.getByRole("switch", { name: /Steamy Events\s*par email/ });
  const before = await events.isChecked();
  await events.click();
  await expect(page.getByText("Préférence enregistrée.")).toBeVisible();
  await expect(events).toBeChecked({ checked: !before });
  await events.click();
  await expect(events).toBeChecked({ checked: before });

  await expect(page.getByRole("link", { name: "Conditions générales d'utilisation" })).toHaveAttribute(
    "href",
    "/legal/cgu",
  );

  // Fermeture du compte : message au support, aucune suppression
  const since = new Date();
  await page.getByRole("button", { name: "Demander la fermeture du compte" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page.getByText(/Votre demande est envoyée/)).toBeVisible();
  const mail = await waitForMessage(TEAM_EMAIL, { since, contains: "fermeture du compte enseignant" });
  expect(mail.Text).toContain("koffi.adekambi@steamy.test");
  await page.goto("/enseignant");
  await expect(page).toHaveURL("/enseignant");
});

test("WT12 : onglets dans l'URL, « Tout marquer comme lu » remet la cloche à zéro", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/notifications");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Notifications");
  await axe(page);
  const tabs = page.getByRole("navigation", { name: "Filtrer les notifications" });
  if (await tabs.isVisible()) {
    await expect(tabs.getByRole("link", { name: "Toutes" })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: /^Non lues/ }).click();
    await expect(page).toHaveURL("/enseignant/notifications?onglet=non-lues");
    const markAll = page.getByRole("button", { name: "Tout marquer comme lu" });
    if (await markAll.isEnabled()) {
      await markAll.click();
      await expect(bell(page)).toHaveAccessibleName("Notifications, aucune non lue");
      await page.reload();
      await expect(bell(page)).toHaveAccessibleName("Notifications, aucune non lue");
    }
  } else {
    await expect(page.getByText(/Vous n'avez aucune notification/)).toBeVisible();
  }
});

test("WT11 : FAQ des quatre sujets, recherche locale et formulaire de contact dans le shell", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/aide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aide & support");
  for (const theme of ["Créer une classe", "Ajouter des élèves", "Revoir une tentative échouée", "Échanger avec un parent"]) {
    await expect(page.getByText(theme, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }
  await expect(page.getByText(/corriger une évaluation|contacter le parent/i)).toHaveCount(0);
  await axe(page);

  const search = page.getByRole("searchbox", { name: "Rechercher une question" });
  await search.fill("zzzz");
  await expect(page.getByText(/Aucune question ne correspond/)).toBeVisible();
  await search.fill("quota");
  await expect(page.getByText("Combien de classes et d'élèves puis-je avoir ?")).toBeVisible();

  const since = new Date();
  const message = `Question e2e de l'enseignant ${Date.now()}`;
  await page.getByLabel(/^Nom/).fill("Koffi Adékambi");
  await page.getByLabel(/Email ou téléphone/).fill("koffi.adekambi@steamy.test");
  await page.getByRole("combobox", { name: /Sujet/ }).selectOption("question");
  await page.getByLabel(/^Message/).fill(message);
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Message envoyé" })).toBeVisible();
  const mail = await waitForMessage(TEAM_EMAIL, { since, contains: message });
  expect(mail.Text).toContain("koffi.adekambi@steamy.test");
});
