import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { DEMO } from "./support/demo";
import { loginAs, logoutFromShell, openShellMenu, readApi } from "./support/session";

// LOT-5 étape 5.1 · shell de l'espace enseignant et accueil (WT01).

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

type Dashboard = {
  classroomCount: number;
  learnerCount: number;
  toReviewCount: number;
  classrooms: { id: number; name: string }[];
  toReview: { id: number; learner: { id: number }; classroom: { id: number } }[];
};

test("l'espace enseignant refuse un apprenant et un parent, renvoyés vers leur espace", async ({ page }) => {
  await loginAs(page, "learner");
  await page.goto("/enseignant");
  await expect(page).toHaveURL(DEMO.learner.home);
  await page.context().clearCookies();
  await loginAs(page, "parent");
  await page.goto("/enseignant");
  await expect(page).toHaveURL(DEMO.parent.home);
});

test("WT01 : Koffi voit ses compteurs, ses classes et ses tentatives à revoir conformes à l'API", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bonjour ${DEMO.teacher.firstName} 👋`);
  const dashboard = await readApi<Dashboard>(page, "/api/classrooms/dashboard/");

  const stats = page.getByRole("region", { name: "Vos statistiques" });
  await expect(stats.getByRole("definition")).toHaveText([
    String(dashboard.learnerCount),
    String(dashboard.classroomCount),
    String(dashboard.toReviewCount),
  ]);

  // Jeu D2 : « 4e B · Robotique » et « 3e A · Code »
  const classes = page.getByRole("list", { name: "Mes classes" });
  await expect(classes.getByRole("listitem")).toHaveCount(dashboard.classrooms.length);
  const robotics = classes.getByRole("link", { name: /4e B · Robotique/ });
  await expect(robotics).toHaveAttribute("href", /^\/enseignant\/classes\/\d+$/);
  await expect(robotics.getByRole("progressbar", { name: "Progression moyenne" })).toBeVisible();
  await expect(classes.getByRole("link", { name: /3e A · Code/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ajouter des élèves" })).toHaveAttribute("href", "/enseignant/eleves/ajouter");

  // « À revoir » : la tentative `ko` de Yao ; « Commenter » cible la tentative (WT05)
  const review = page.getByRole("list", { name: "Tentatives à revoir" });
  const first = dashboard.toReview[0];
  await expect(review.getByRole("listitem")).toHaveCount(dashboard.toReview.length);
  await expect(review.getByRole("link", { name: /^Commenter la tentative de Yao Kpadé/ }).first()).toHaveAttribute(
    "href",
    `/enseignant/eleves/${first.learner.id}?classe=${first.classroom.id}&tentative=${first.id}`,
  );

  // « Décrochage » : section présente, sans libellé « À corriger » ni « formateur »
  await expect(page.getByRole("heading", { level: 2, name: "Décrochage" })).toBeVisible();
  await expect(page.getByText(/à corriger|formateur/i).filter({ visible: true })).toHaveCount(0);
  await axe(page);
});

test("shell enseignant : navigation active, cloche vers WT12, puis déconnexion au vouvoiement", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant");
  await openShellMenu(page);
  const nav = page.getByRole("navigation", { name: "Navigation de votre espace" });
  await expect(nav.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: /notifications? non lues?|aucune non lue/ })).toHaveAttribute(
    "href",
    "/enseignant/notifications",
  );
  await logoutFromShell(page);
  await expect(page).toHaveURL("/connexion");
  await page.goto("/enseignant");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fenseignant$/);
});
