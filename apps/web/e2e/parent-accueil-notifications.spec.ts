import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { createParent } from "./support/api";
import { closeFamily, createFamily } from "./support/family";
import { DEMO } from "./support/demo";
import { loginAs, loginViaApi, logoutFromShell, openShellMenu } from "./support/session";

// LOT-4 étape 4.1 · socle de l'espace parent, accueil et « À valider » (WPD01), notifications (WPD14).

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

const bell = (page: Page) => page.getByRole("link", { name: /notifications? non lues?|aucune non lue/ });

test("l'espace parent refuse un apprenant et un enseignant, renvoyés vers leur espace", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/parent");
  await expect(page).toHaveURL(DEMO.learner.home);
  await page.context().clearCookies();
  await loginAs(page, "teacher");
  await page.goto("/parent/notifications");
  await expect(page).toHaveURL(DEMO.teacher.home);
});

test("WPD01 : Marie voit « À valider » conforme au jeu D2, ses statistiques et ses enfants", async ({ page }) => {
  await loginAs(page, "parent");
  await page.goto("/parent");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bonjour ${DEMO.parent.firstName} 👋`);
  // Au moins Léa et Noé : d'autres parcours rattachent des enfants à Marie pendant le même passage (P4)
  await expect(page.getByRole("heading", { level: 2, name: /^\d+ enfants accompagnés sur Steamy$/ })).toBeVisible();

  // Jeu D2 : suppression demandée par Noé, paiement demandé par Léa, candidature de Léa à un événement
  const pending = page.getByRole("list", { name: "Demandes à valider" });
  const deletion = pending.getByRole("article", { name: "Demande de suppression du compte · Noé Adjovi" });
  await expect(deletion.getByRole("link", { name: /^Examiner/ })).toHaveAttribute(
    "href",
    /^\/parent\/enfants\/\d+\/supprimer\?demande=\d+$/,
  );
  const payment = pending.getByRole("article", { name: "Demande de paiement · Léa Adjovi" });
  await expect(payment.getByRole("link", { name: /^Payer/ })).toHaveAttribute("href", /^\/parent\/demandes\/[\w-]+$/);
  const application = pending.getByRole("article", { name: "Candidature à un Steamy Event · Léa Adjovi" });
  await expect(application.getByRole("link", { name: /^Examiner/ })).toHaveAttribute("href", /^\/parent\/evenements(\?|$)/);

  // Stat « À valider » = longueur de la liste renvoyée par l'API
  const rows = await pending.getByRole("listitem").count();
  const stats = page.getByRole("region", { name: "Vos statistiques" });
  await expect(stats.getByRole("definition")).toHaveText([/^\d+$/, /^\d+$/, String(rows)]);

  const kids = page.getByRole("list", { name: "Mes enfants" });
  await expect(kids.getByRole("link", { name: /Léa Adjovi/ })).toHaveAttribute("href", /^\/parent\/enfants\/\d+$/);
  await expect(kids.getByRole("link", { name: /Noé Adjovi/ })).toBeVisible();
  // Aucune alerte de connexion (D56)
  await expect(page.getByText(/alerte/i).filter({ visible: true })).toHaveCount(0);
  await axe(page);
});

test("WPD01 et WPD14 : un parent sans enfant voit l'état vide et aucune notification", async ({ page }) => {
  const { phone } = await createParent({ firstName: "Afi" });
  await loginViaApi(page, phone);
  await page.goto("/parent");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour Afi 👋");
  await expect(page.getByText(/Aucune demande en attente/)).toBeVisible();
  const children = page.getByRole("region", { name: "Mes enfants" });
  await expect(children.getByRole("link", { name: "Ajouter un enfant" })).toHaveAttribute("href", "/parent/enfants/ajouter");
  await axe(page);

  await bell(page).click();
  await expect(page).toHaveURL("/parent/notifications");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Notifications");
  await expect(page.getByText(/Vous n'avez aucune notification/)).toBeVisible();
  await axe(page);
});

test("WPD14 : onglets dans l'URL et « Tout marquer comme lu » remet la cloche à 0", async ({ page }) => {
  // Famille neuve : la demande de suppression de l'enfant notifie le parent, sans dépendre du jeu de démo partagé
  const family = await createFamily();
  await family.childSession.post("/api/accounts/me/deletion-request/", { note: "" });
  await loginViaApi(page, family.parentPhone);
  await page.goto("/parent/notifications");
  const tabs = page.getByRole("navigation", { name: "Filtrer les notifications" });
  await expect(tabs.getByRole("link", { name: "Toutes" })).toHaveAttribute("aria-current", "page");
  await axe(page);
  await tabs.getByRole("link", { name: /^Non lues \([1-9]\d*\)$/ }).click();
  await expect(page).toHaveURL("/parent/notifications?onglet=non-lues");

  await page.goto("/parent/notifications");
  const markAll = page.getByRole("button", { name: "Tout marquer comme lu" });
  await expect(markAll).toBeEnabled();
  await markAll.click();
  await expect(bell(page)).toHaveAccessibleName("Notifications, aucune non lue");
  await expect(page.getByRole("link", { name: "Non lues (0)" })).toBeVisible();
  await page.reload();
  await expect(bell(page)).toHaveAccessibleName("Notifications, aucune non lue");
  await closeFamily(family);
});

test("shell parent : navigation active, puis déconnexion au vouvoiement", async ({ page }) => {
  await loginAs(page, "parent");
  await page.goto("/parent");
  await openShellMenu(page);
  const nav = page.getByRole("navigation", { name: "Navigation de votre espace" });
  await expect(nav.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await logoutFromShell(page);
  await expect(page).toHaveURL("/connexion");
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fparent$/);
});
